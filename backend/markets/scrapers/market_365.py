import logging
import re
import time
import unicodedata

import requests
from django.utils import timezone

from markets.models import Category, Market, Product

from .base import BaseScraper

logger = logging.getLogger(__name__)

API_BASE = "https://api.instabuy.com.br/apiv3"
INSTABUY_CDN = "https://assets.instabuy.app.br/ib.item.image.medium"

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

class Market365Scraper(BaseScraper):
    MARKET_NAME = "365 Supermercados"
    DOMAIN = "365supermercados.com.br"
    SUBDOMAIN = "365supermercados"
    MARKET_SLUG = "365"
    API_BASE = "https://api.instabuy.com.br/apiv3"

    def __init__(self):
        super().__init__()
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "application/json",
        })

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

    def fetch_products_for_category(self, category: Category) -> list[dict]:
        slug = self.slugify(category.name)
        page = 1
        products: list[dict] = []

        params = {
            "category_slug": slug,
            "subdomain": self.SUBDOMAIN,
            "custom_domain": self.DOMAIN,
            "host": self.DOMAIN,
        }
        
        if self.stdout:
            self.stdout.write(f"Using params {params}")

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

            if self.stdout:
                self.stdout.write(f"Fetching {total_count} products from {group.get('title', 'Unknown')}")

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
                    if item.get("stock_infos", {}).get("stock_balance", 0) > 0:
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
        
        image_url = ""
        images = item.get("images", [])
        if images:
            image_url = f"{INSTABUY_CDN}/m-{images[0]}"

        return {
            "name": item.get("name", ""),
            "price": price,
            "promo_price": promo_price,
            "image_url": image_url,
        }
