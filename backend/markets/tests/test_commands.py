from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command

from markets.management.commands.reset_db import _seed_all_categories
from markets.models import Category, Market
from markets.scrapers.bramil import BramilScraper
from markets.scrapers.market_365 import CATEGORIES_365
from markets.scrapers.royal import RoyalScraper


EXPECTED_CATEGORIES = {
    "365": set(CATEGORIES_365),
    "royal": set(RoyalScraper.DEPARTMENTS),
    "bramil": set(BramilScraper.DEPARTMENTS),
}


@pytest.mark.django_db
class TestResetDbCommand:
    def test_reset_db_completes_without_error(self):
        out = StringIO()
        # Patch the destructive parts so the test DB is not wiped
        with patch(
            "markets.management.commands.reset_db._delete_db_and_migrations"
        ), patch(
            "markets.management.commands.reset_db.call_command"
        ) as mock_call:
            # Re-invoke the real handle but with mocked destructive steps
            from markets.management.commands.reset_db import Command

            cmd = Command(stdout=out)
            cmd.handle()

        output = out.getvalue()
        assert "DB reset complete" in output

    def test_reset_db_seeds_all_markets(self):
        """After reset_db seeding, all expected category names exist for each market slug"""
        _seed_all_categories()

        for slug, expected_names in EXPECTED_CATEGORIES.items():
            market = Market.objects.get(slug=slug)
            actual_names = set(
                Category.objects.filter(market=market).values_list("name", flat=True)
            )
            assert expected_names == actual_names, (
                f"Market '{slug}' category mismatch.\n"
                f"Missing: {expected_names - actual_names}\n"
                f"Extra: {actual_names - expected_names}"
            )

    def test_reset_db_seeding_is_idempotent(self):
        """Running _seed_all_categories twice produces the same DB state"""
        _seed_all_categories()
        _seed_all_categories()

        for slug, expected_names in EXPECTED_CATEGORIES.items():
            market = Market.objects.get(slug=slug)
            actual_names = set(
                Category.objects.filter(market=market).values_list("name", flat=True)
            )
            assert expected_names == actual_names

    def test_reset_db_creates_correct_market_records(self):
        """After seeding, each market has the correct name, api_base_url, and domain."""
        _seed_all_categories()

        market_365 = Market.objects.get(slug="365")
        assert market_365.name == "365 Supermercados"
        assert market_365.api_base_url == "https://api.instabuy.com.br/apiv3"
        assert market_365.domain == "365supermercados.com.br"

        market_royal = Market.objects.get(slug="royal")
        assert market_royal.name == "Royal Supermercados"
        assert market_royal.api_base_url == "https://services.vipcommerce.com.br/api-admin/v1"
        assert market_royal.domain == "royaleemporio.com.br"

        market_bramil = Market.objects.get(slug="bramil")
        assert market_bramil.name == "Bramil Supermercados"
        assert market_bramil.api_base_url == "https://services-beta.vipcommerce.com.br/api-admin/v1"
        assert market_bramil.domain == "bramilemcasa.com.br"

    def test_reset_db_365_category_count(self):
        """365 market should have exactly len(CATEGORIES_365) categories."""
        _seed_all_categories()
        market = Market.objects.get(slug="365")
        count = Category.objects.filter(market=market).count()
        assert count == len(CATEGORIES_365)

    def test_reset_db_royal_category_count(self):
        """Royal market should have exactly len(RoyalScraper.DEPARTMENTS) categories."""
        _seed_all_categories()
        market = Market.objects.get(slug="royal")
        count = Category.objects.filter(market=market).count()
        assert count == len(RoyalScraper.DEPARTMENTS)

    def test_reset_db_bramil_category_count(self):
        """Bramil market should have exactly len(BramilScraper.DEPARTMENTS) categories."""
        _seed_all_categories()
        market = Market.objects.get(slug="bramil")
        count = Category.objects.filter(market=market).count()
        assert count == len(BramilScraper.DEPARTMENTS)
