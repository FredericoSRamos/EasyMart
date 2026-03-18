"""Reset the SQLite and seed categories for all markets"""

import os
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand

from markets.models import Category, Market
from markets.scrapers.bramil import BramilScraper
from markets.scrapers.market_365 import CATEGORIES_365
from markets.scrapers.royal import RoyalScraper

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

MARKET_SEEDS = [
    (
        "365",
        "365 Supermercados",
        "https://api.instabuy.com.br/apiv3",
        "365supermercados.com.br",
        CATEGORIES_365,
    ),
    (
        "royal",
        "Royal Supermercados",
        "https://services.vipcommerce.com.br/api-admin/v1",
        "royaleemporio.com.br",
        RoyalScraper.DEPARTMENTS,
    ),
    (
        "bramil",
        "Bramil Supermercados",
        "https://services-beta.vipcommerce.com.br/api-admin/v1",
        "bramilemcasa.com.br",
        BramilScraper.DEPARTMENTS,
    ),
]


def _delete_db_and_migrations(base_dir: Path) -> None:
    db_path = base_dir / "db.sqlite3"
    if db_path.exists():
        db_path.unlink()

    migrations_dir = base_dir / "markets" / "migrations"
    if migrations_dir.exists():
        for f in migrations_dir.glob("*.py"):
            if f.name != "__init__.py":
                f.unlink()


def _seed_all_categories() -> None:
    for slug, name, api_base_url, domain, categories in MARKET_SEEDS:
        market, _ = Market.objects.get_or_create(
            slug=slug,
            defaults={
                "name": name,
                "api_base_url": api_base_url,
                "domain": domain,
            },
        )
        for cat_name in categories:
            Category.objects.get_or_create(market=market, name=cat_name)


class Command(BaseCommand):
    help = "Delete the SQLite DB, recreate schema from migrations, and seed categories."

    def handle(self, *args, **options):
        _delete_db_and_migrations(BASE_DIR)
        call_command("makemigrations", "markets", interactive=False)
        call_command("migrate", interactive=False)
        _seed_all_categories()
        self.stdout.write(self.style.SUCCESS("DB reset complete."))
