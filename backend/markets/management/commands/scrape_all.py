"""
Clears the database and re-scrapes all markets in parallel.
Each market runs in its own thread.

Usage:
    python manage.py scrape_all
    python manage.py scrape_all --workers 3
    python manage.py scrape_all --dry-run
"""

import logging
import re
import threading
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

import requests
from django.core.management.base import BaseCommand
from django.utils import timezone

from markets.models import Category, Market, Product, ScrapeLog
from markets.scrapers.market_365 import Market365Scraper
from markets.scrapers.bramil import BramilScraper
from markets.scrapers.royal import RoyalScraper

logger = logging.getLogger(__name__)

_print_lock = threading.Lock()

def tprint(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    with _print_lock:
        print(f"[{ts}] {msg}", flush=True)


MAX_PAGES = 200  # Prevent infinite loops


def _get_with_retry(session: requests.Session, url: str, params: dict, headers: dict,
                    market: str, category: str, page: int) -> dict | None:
    tprint(f"  [{market}] [{category}] page {page} → GET {url.split('?')[0]}")
    for attempt in range(5):
        try:
            resp = session.get(url, params=params, headers=headers, timeout=30)
            if resp.status_code == 429:
                wait = 15 * (attempt + 1)
                tprint(f"  [{market}] [{category}] page {page} — rate limited, waiting {wait}s (attempt {attempt+1}/5)")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            tprint(f"  [{market}] [{category}] page {page} — request error: {exc} (attempt {attempt+1}/5)")
            if attempt < 4:
                time.sleep(5 * (attempt + 1))
    tprint(f"  [{market}] [{category}] page {page} — FAILED after 5 attempts, skipping.")
    return None


def scrape_365(scraper_cls, stdout) -> int:
    scraper = scraper_cls()
    return scraper.run(stdout=stdout)


def scrape_vip(scraper_cls, stdout) -> int:
    scraper = scraper_cls()
    MARKET = scraper.MARKET_SLUG

    tprint(f"[{MARKET}] Starting scrape")

    # Authenticate
    scraper._authenticate()
    tprint(f"[{MARKET}] Authenticated")

    # Fetch categories
    categories = scraper.fetch_categories()
    tprint(f"[{MARKET}] {len(categories)} categories matched")

    total = 0
    for cat in categories:
        cat_name = cat["name"]
        dept_id = cat["api_dept_id"]
        cat_obj = Category.objects.get(id=cat["id"])

        tprint(f"[{MARKET}] [{cat_name}] starting (dept_id={dept_id})")
        page = 1
        cat_total = 0

        while page <= MAX_PAGES:
            url = (
                f"{scraper.API_BASE}/org/{scraper.ORG_ID}"
                f"/filial/{scraper.FILIAL_ID}"
                f"/centro_distribuicao/{scraper.DIST_ID}"
                f"/loja/classificacoes_mercadologicas/departamentos/{dept_id}/produtos"
            )
            data = _get_with_retry(
                scraper.session, url, {"page": page}, scraper.api_headers,
                MARKET, cat_name, page
            )
            if data is None or not data.get("success"):
                break

            items = data.get("data", [])
            if not items:
                tprint(f"[{MARKET}] [{cat_name}] page {page} — empty, done")
                break

            paginator = data.get("paginator", {})
            total_pages = paginator.get("total_pages", 1)

            page_count = 0
            for item in items:
                name = item.get("descricao", "")
                if not name:
                    continue
                price = float(item.get("preco", 0))
                promo_price = None
                if item.get("em_oferta") and item.get("oferta"):
                    promo_price = float(item["oferta"].get("preco_oferta", price))

                obj, _ = Product.objects.update_or_create(
                    market=scraper.market,
                    name=name,
                    defaults={"price": price, "promo_price": promo_price},
                )
                obj.categories.add(cat_obj)
                page_count += 1

            tprint(f"[{MARKET}] [{cat_name}] page {page}/{total_pages} — {page_count} products")
            cat_total += page_count

            if page >= total_pages:
                break
            page += 1

        if page > MAX_PAGES:
            tprint(f"[{MARKET}] [{cat_name}] WARNING: hit MAX_PAGES ({MAX_PAGES}), stopping early")

        tprint(f"[{MARKET}] [{cat_name}] done — {cat_total} total")
        total += cat_total

    tprint(f"[{MARKET}] Finished — {total} products total")
    return total


SCRAPERS = {
    "365":    (scrape_365, Market365Scraper),
    "bramil": (scrape_vip, BramilScraper),
    "royal":  (scrape_vip, RoyalScraper)
}


class Command(BaseCommand):
    help = "Clear DB and re-scrape all markets in parallel."

    def add_arguments(self, parser):
        parser.add_argument(
            "--workers", type=int, default=3,
            help="Number of parallel scraper threads (default: 3).",
        )
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Skip the DB clear step (useful for testing).",
        )
        parser.add_argument(
            "--market", type=str, default=None,
            help="Scrape only one market slug (e.g. 365, bramil, royal).",
        )

    def handle(self, *args, **options):
        workers = options["workers"]
        dry_run = options["dry_run"]
        only_market = options["market"]

        if not dry_run:
            tprint("Clearing products and categories from DB...")
            Product.objects.all().delete()
            Category.objects.all().delete()
            tprint("DB cleared.")
        else:
            tprint("--dry-run: skipping DB clear.")

        targets = {
            slug: cfg for slug, cfg in SCRAPERS.items()
            if only_market is None or slug == only_market
        }
        if not targets:
            self.stderr.write(self.style.ERROR(
                f"Unknown market '{only_market}'. Available: {', '.join(SCRAPERS)}"
            ))
            return

        tprint(f"Launching {len(targets)} scraper(s) with {workers} worker thread(s)...")
        start = time.time()
        results: dict[str, int | Exception] = {}

        def run_one(slug: str, fn, cls) -> tuple[str, int]:
            log = ScrapeLog.objects.create(
                market=Market.objects.get_or_create(
                    slug=slug,
                    defaults={"name": slug, "api_base_url": "", "domain": ""},
                )[0]
            )
            try:
                count = fn(cls, self.stdout)
                log.status = ScrapeLog.Status.SUCCESS
                log.items_count = count
                return slug, count
            except Exception as exc:
                log.status = ScrapeLog.Status.FAILED
                log.error_message = str(exc)
                tprint(f"[{slug}] ERROR: {exc}")
                return slug, exc
            finally:
                log.finished_at = timezone.now()
                log.save()

        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(run_one, slug, fn, cls): slug
                for slug, (fn, cls) in targets.items()
            }
            for future in as_completed(futures):
                slug, result = future.result()
                results[slug] = result

        elapsed = time.time() - start
        tprint(f"\n{'─'*50}")
        tprint(f"Scrape complete in {elapsed:.1f}s")
        for slug, result in results.items():
            if isinstance(result, Exception):
                tprint(f"  {slug}: FAILED — {result}")
            else:
                tprint(f"  {slug}: {result} products")
        tprint(f"{'─'*50}")
