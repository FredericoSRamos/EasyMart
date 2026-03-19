import logging
import re
import time
import unicodedata

import requests

from markets.models import Category, Market, Product

from .base import BaseScraper

logger = logging.getLogger(__name__)

API_BASE = "https://api.instabuy.com.br/apiv3"

CATEGORIES_365 = [
    "Frutas, Legumes e Verduras",
    "Açougue, Aves e Peixaria",
    "Laticínios",
    "Alimentos Básicos",
    "Bebidas Alcoólicas",
    "Bebidas Não Alcoólicas",
    "Matinais",
    "Mercearia",
    "Frios",
    "Vinhos e Espumantes",
    "Padaria",
    "Congelados",
    "Higiene e Perfumaria",
    "Bebê & Criança",
    "Pet Shop",
    "Lavagem de Roupas",
    "Cuidados com o Lar",
    "Bazar e Utilidades",
    "Outros",
]


def _slugify_category(name: str) -> str:
    """Derive a URL slug from a category name."""
    text = name.lower()
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text


class Market365Scraper(BaseScraper):
    DOMAIN = "365supermercados.com.br"
    SUBDOMAIN = "365supermercados"
    MARKET_SLUG = "365"
    API_BASE = "https://api.instabuy.com.br/apiv3"

    def __init__(self):
        self.market = self._ensure_market()
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "application/json",
        })

    def _ensure_market(self) -> Market:
        market, _ = Market.objects.update_or_create(
            slug=self.MARKET_SLUG,
            defaults={
                "name": "365 Supermercados",
                "api_base_url": API_BASE,
                "domain": self.DOMAIN,
            },
        )
        return market

    def _get(self, endpoint: str, extra_params: dict | None = None) -> dict:
        params = {**(extra_params or {})}
        url = f"{self.API_BASE}/{endpoint}"
        for attempt in range(5):
            resp = self.session.get(url, params=params, timeout=30)
            if resp.status_code == 429:
                wait = 10 * (attempt + 1)
                logger.warning("Rate limited (429). Waiting %ds before retry %d/5...", wait, attempt + 1)
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()
        resp.raise_for_status()
        return resp.json()

    def fetch_categories(self) -> list[dict]:
        results = []
        for name in CATEGORIES_365:
            obj, _ = Category.objects.update_or_create(
                market=self.market,
                name=name,
                defaults={},
            )
            results.append({"id": obj.id, "name": name})
        Category.objects.filter(market=self.market).exclude(
            name__in=CATEGORIES_365
        ).delete()
        return results

    def fetch_products_for_category(self, category: Category, stdout) -> list[dict]:
        slug = _slugify_category(category.name)
        page = 1
        products: list[dict] = []

        params = {
            "category_slug": slug,
            "subdomain": self.SUBDOMAIN,
            "custom_domain": self.DOMAIN,
            "host": self.DOMAIN,
        }
        
        stdout.write(f"Using params {params}")

        data = self._get("layout", params)
        if not data:
            return products
        
        groups = data.get("data", [])

        for group in groups:
            subcategory_id = group.get("id")
            total_count = group.get("count", 0)

            if not subcategory_id:
                continue

            page = 1
            per_page = 30  # API max

            fetched = 0

            stdout.write(f"Fetching {total_count} products from {group.get("title", "Unknown")}")

            while True:
                item_params = {
                    "subcategory_id": subcategory_id,
                    "page": page,
                    "N": per_page,
                    "subdomain": self.SUBDOMAIN,
                    "custom_domain": self.DOMAIN,
                    "host": self.DOMAIN,
                }

                resp = self._get("item", item_params)

                if not resp:
                    break

                items = resp.get("data", [])
                if not items:
                    break

                for item in items:
                    products.append(self._normalise(item))

                fetched += len(items)

                if len(items) < per_page or fetched >= total_count:
                    break

                page += 1

                time.sleep(0.1)
       
        return products

    def _normalise(self, item: dict) -> dict:
        price_config = item.get("price_config", {})
        price = price_config.get("price", 0)
        promo_price = None
        discount = price_config.get("price_discount")
        if discount:
            promo_price = discount.get("discount_value")
        if promo_price is None:
            prices_list = item.get("prices", [])
            if prices_list:
                promo_price = prices_list[0].get("promo_price")
        return {
            "name": item.get("name", ""),
            "price": price,
            "promo_price": promo_price,
        }

    def _save_products(self, products: list[dict], category: Category) -> int:
        count = 0
        for p in products:
            obj, _ = Product.objects.update_or_create(
                market=self.market,
                name=p["name"],
                defaults={
                    "price": p["price"],
                    "promo_price": p["promo_price"],
                },
            )
            obj.categories.add(category)
            count += 1
        return count

    def run(self, stdout=None) -> int:
        categories = self.fetch_categories()
        total = 0
        for cat_dict in categories:
            cat_obj = Category.objects.get(id=cat_dict["id"])
            if stdout:
                stdout.write(f"  Scraping category: {cat_obj.name}...")
            products = self.fetch_products_for_category(cat_obj, stdout=stdout)
            saved = self._save_products(products, cat_obj)
            total += saved
            if stdout:
                stdout.write(f"\n{saved} products saved\n\n")
            time.sleep(0.1)
        return total
