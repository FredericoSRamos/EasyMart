"""
Management command to scrape product data from a market.

Usage:
    python manage.py scrape_market --market 365
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from markets.models import ScrapeLog
from markets.scrapers.market_365 import Market365Scraper
from markets.scrapers.bramil import BramilScraper
from markets.scrapers.royal import RoyalScraper

SCRAPER_REGISTRY: dict[str, type] = {
    "365": Market365Scraper,
    "bramil": BramilScraper,
    "royal": RoyalScraper,
}


class Command(BaseCommand):
    help = "Scrape products from a market and store them in the database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--market",
            type=str,
            required=True,
            help="Market slug to scrape (e.g. '365').",
        )

    def handle(self, *args, **options):
        slug = options["market"]

        scraper_cls = SCRAPER_REGISTRY.get(slug)
        if scraper_cls is None:
            raise CommandError(
                f"No scraper registered for '{slug}'. "
                f"Available: {', '.join(SCRAPER_REGISTRY)}"
            )

        self.stdout.write(f"Starting scrape for market '{slug}'...")

        scraper = scraper_cls()
        market = scraper.market
        log = ScrapeLog.objects.create(market=market)

        try:
            count = scraper.run(stdout=self.stdout)
            log.status = ScrapeLog.Status.SUCCESS
            log.items_count = count
            self.stdout.write(
                self.style.SUCCESS(f"Done! {count} products scraped and stored.")
            )
        except Exception as exc:
            log.status = ScrapeLog.Status.FAILED
            log.error_message = str(exc)
            self.stderr.write(self.style.ERROR(f"Scrape failed: {exc}"))
            raise
        finally:
            log.finished_at = timezone.now()
            log.save()
