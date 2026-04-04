import re
import time
import unicodedata
from abc import ABC, abstractmethod

from django.utils import timezone

from markets.models import Category, Market, Product


class BaseScraper(ABC):
    """Interface that every market scraper must implement."""

    # These should be defined by subclasses
    MARKET_NAME: str = ""
    MARKET_SLUG: str = ""
    API_BASE: str = ""
    DOMAIN: str = ""

    def __init__(self):
        self.market = self._ensure_market()
        self.stdout = None

    def _ensure_market(self) -> Market:
        market, _ = Market.objects.update_or_create(
            slug=self.MARKET_SLUG,
            defaults={
                "name": self.MARKET_NAME,
                "api_base_url": self.API_BASE,
                "domain": getattr(self, "DOMAIN_KEY", getattr(self, "DOMAIN", "")),
            },
        )
        return market

    @staticmethod
    def slugify(text: str) -> str:
        """Derive a URL slug from a text/category name."""
        text = text.lower()
        text = "".join(
            c for c in unicodedata.normalize("NFD", text)
            if unicodedata.category(c) != "Mn"
        )
        text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
        return text

    @abstractmethod
    def fetch_categories(self) -> list[dict]:
        """Return a list of category dicts with at least 'id' and 'name'."""
        ...

    @abstractmethod
    def fetch_products_for_category(self, category: Category) -> list[dict]:
        """Return a list of normalised product dicts for a category.
        Expected keys: name, price, promo_price.
        """
        ...

    def _save_products(self, products: list[dict], category: Category) -> int:
        now = timezone.now()

        seen = {}
        for p in products:
            seen[p["name"]] = p
        unique_products = list(seen.values())

        existing = {
            p.name: p
            for p in Product.objects.filter(market=self.market)
        }

        to_create = []
        to_update = []

        for p in unique_products:
            if p["name"] in existing:
                obj = existing[p["name"]]
                obj.price = p["price"]
                obj.promo_price = p["promo_price"]
                obj.category = category
                obj.last_scraped_at = now
                to_update.append(obj)
            else:
                to_create.append(
                    Product(
                        market=self.market,
                        name=p["name"],
                        price=p["price"],
                        promo_price=p["promo_price"],
                        category=category,
                        last_scraped_at=now,
                    )
                )

        if to_create:
            Product.objects.bulk_create(to_create)
        if to_update:
            Product.objects.bulk_update(
                to_update,
                fields=["price", "promo_price", "category", "last_scraped_at"],
            )

        return len(to_create) + len(to_update)

    def run(self, stdout=None) -> int:
        """Execute the full scrape pipeline. Returns the number of items stored."""
        self.stdout = stdout
        categories = self.fetch_categories()
        total = 0
        for cat_dict in categories:
            cat_obj = Category.objects.get(id=cat_dict["id"])
            if self.stdout:
                self.stdout.write(f"  Scraping category: {cat_obj.name}...")
            products = self.fetch_products_for_category(cat_obj)
            saved = self._save_products(products, cat_obj)
            total += saved
            if self.stdout:
                self.stdout.write(f"    → {saved} products saved\n")
            time.sleep(0.1)
        return total
