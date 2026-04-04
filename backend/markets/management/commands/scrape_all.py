"""
Clears the database and re-scrapes all markets in parallel.
Each market runs in its own thread.

Usage:
    python manage.py scrape_all
    python manage.py scrape_all --workers 3
    python manage.py scrape_all --dry-run
"""

import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from markets.models import Category, Market, Product, ScrapeLog
from markets.scrapers import SCRAPER_REGISTRY

logger = logging.getLogger(__name__)

_print_lock = threading.Lock()

def tprint(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    with _print_lock:
        print(f"[{ts}] {msg}", flush=True)


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
            slug: cls for slug, cls in SCRAPER_REGISTRY.items()
            if only_market is None or slug == only_market
        }
        if not targets:
            self.stderr.write(self.style.ERROR(
                f"Unknown market '{only_market}'. Available: {', '.join(SCRAPER_REGISTRY)}"
            ))
            return

        tprint(f"Launching {len(targets)} scraper(s) with {workers} worker thread(s)...")
        start = time.time()
        results: dict[str, int | Exception] = {}

        def run_one(slug: str, cls_scraper) -> tuple[str, int]:
            market_obj, _ = Market.objects.get_or_create(
                slug=slug,
                defaults={"name": slug, "api_base_url": "", "domain": ""},
            )
            log = ScrapeLog.objects.create(market=market_obj)
            try:
                scraper = cls_scraper()
                # Update market_obj to ensure we have the fully initialized one from the scraper
                log.market = scraper.market
                log.save(update_fields=['market'])

                count = scraper.run(self.stdout)
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
                pool.submit(run_one, slug, cls): slug
                for slug, cls in targets.items()
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
