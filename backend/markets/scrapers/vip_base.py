import logging
import os
import re
import unicodedata
from abc import abstractmethod
from functools import cached_property

import requests
from django.utils import timezone

from markets.models import Category, Market, Product
from .base import BaseScraper

logger = logging.getLogger(__name__)

class VIPCommerceScraper(BaseScraper):
    """Scraper for markets using the VIP Commerce platform."""

    PLATFORM_KEY = os.environ.get("VIP_PLATFORM_KEY", "df072f85df9bf7dd71b6811c34bdbaa4f219d98775b56cff9dfa5f8ca1bf8469")

    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.sessao_id = None
        self.api_headers = {}

    @cached_property
    def market(self):
        return self._ensure_market()

    @property
    @abstractmethod
    def API_BASE(self) -> str:
        ...

    @property
    @abstractmethod
    def ORG_ID(self) -> int:
        ...

    @property
    @abstractmethod
    def DOMAIN_KEY(self) -> str:
        ...

    @property
    @abstractmethod
    def FILIAL_ID(self) -> int:
        ...

    @property
    @abstractmethod
    def DIST_ID(self) -> int:
        ...

    @property
    @abstractmethod
    def MARKET_NAME(self) -> str:
        ...

    @property
    @abstractmethod
    def MARKET_SLUG(self) -> str:
        ...

    @property
    @abstractmethod
    def DEPARTMENTS(self) -> list[str]:
        ...

    def _ensure_market(self) -> Market:
        market, _ = Market.objects.update_or_create(
            slug=self.MARKET_SLUG,
            defaults={
                "name": self.MARKET_NAME,
                "api_base_url": self.API_BASE,
                "domain": self.DOMAIN_KEY,
            },
        )
        return market

    def _slugify(self, text: str) -> str:
        text = text.lower()
        text = "".join(
            c for c in unicodedata.normalize("NFD", text)
            if unicodedata.category(c) != "Mn"
        )
        text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
        return text

    def _authenticate(self):
        login_url = f"{self.API_BASE}/org/{self.ORG_ID}/auth/loja/login"
        payload = {
            "domain": self.DOMAIN_KEY,
            "username": "loja",
            "key": self.PLATFORM_KEY
        }
        headers = {
            "domainkey": self.DOMAIN_KEY,
            "organizationid": str(self.ORG_ID),
            "Content-Type": "application/json"
        }
        
        resp = self.session.post(login_url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        self.token = resp.json()["data"]

        session_url = f"{self.API_BASE}/org/{self.ORG_ID}/loja/sessao_cliente"
        headers["authorization"] = f"Bearer {self.token}"
        
        resp = self.session.get(session_url, headers=headers, timeout=30)
        resp.raise_for_status()
        self.sessao_id = resp.json()["data"]["sessao_id"]

        self.api_headers = {
            "domainkey": self.DOMAIN_KEY,
            "organizationid": str(self.ORG_ID),
            "authorization": f"Bearer {self.token}",
            "sessao-id": self.sessao_id,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
        logger.info("Authenticated %s (sessao-id: %s)", self.MARKET_NAME, self.sessao_id)

    def fetch_categories(self) -> list[dict]:
        if not self.token:
            self._authenticate()

        tree_url = f"{self.API_BASE}/org/{self.ORG_ID}/filial/{self.FILIAL_ID}/centro_distribuicao/{self.DIST_ID}/loja/classificacoes_mercadologicas/departamentos/arvore"
        resp = self.session.get(tree_url, headers=self.api_headers, timeout=30)
        resp.raise_for_status()
        full_tree = resp.json().get("data", [])

        requested_slugs = {self._slugify(d): d for d in self.DEPARTMENTS}
        categories: list[dict] = []

        for dept in full_tree:
            api_name = dept.get("descricao", "")
            slug = self._slugify(api_name)

            if slug in requested_slugs:
                canonical_name = requested_slugs[slug]
                obj, _ = Category.objects.update_or_create(
                    market=self.market,
                    name=canonical_name,
                    defaults={},
                )
                categories.append({
                    "id": obj.id,
                    "api_dept_id": dept.get("classificacao_mercadologica_id"),
                    "name": canonical_name,
                    "slug": slug
                })
        
        logger.info("Matched %d categories for %s", len(categories), self.MARKET_SLUG)
        return categories

    def fetch_products_for_category(self, category_ext_id: str) -> list[dict]:
        page = 1
        products: list[dict] = []
        
        while True:
            url = f"{self.API_BASE}/org/{self.ORG_ID}/filial/{self.FILIAL_ID}/centro_distribuicao/{self.DIST_ID}/loja/classificacoes_mercadologicas/departamentos/{category_ext_id}/produtos"
            params = {"page": page}
            
            resp = self.session.get(url, headers=self.api_headers, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            
            if not data.get("success"):
                break
                
            items = data.get("data", [])
            if not items:
                break
                
            for item in items:
                external_id = str(item.get("id") or item.get("produto_id"))
                name = item.get("descricao", "")
                price = float(item.get("preco", 0))
                
                promo_price = None
                if item.get("em_oferta") and item.get("oferta"):
                    promo_price = float(item["oferta"].get("preco_oferta", price))
                
                image_url = ""
                if item.get("imagem"):
                    image_url = item["imagem"]

                products.append({
                    "external_id": external_id,
                    "name": name,
                    "brand": item.get("marca_id", ""),
                    "price": price,
                    "promo_price": promo_price,
                    "stock": 1 if item.get("disponivel") else 0,
                    "image_url": image_url,
                    "category_id": category_ext_id
                })
            
            paginator = data.get("paginator", {})
            total_pages = paginator.get("total_pages", 1)
            
            logger.info("Category %s - Page %d/%d: fetched %d items", category_ext_id, page, total_pages, len(items))
            
            if page >= total_pages:
                break
            page += 1
            
        return products

    def run(self, stdout=None) -> int:
        categories = self.fetch_categories()
        total_stored = 0
        now = timezone.now()

        for cat in categories:
            if stdout:
                stdout.write(f"  Scraping category: {cat['name']}...")
            products = self.fetch_products_for_category(cat["api_dept_id"])

            cat_obj = Category.objects.get(id=cat["id"])

            existing = {
                p.name: p
                for p in Product.objects.filter(market=self.market)
            }

            seen = {}
            for p in products:
                seen[p["name"]] = p
            unique_products = list(seen.values())

            to_create = []
            to_update = []

            for p in unique_products:
                if p["name"] in existing:
                    obj = existing[p["name"]]
                    obj.price = p["price"]
                    obj.promo_price = p["promo_price"]
                    obj.category = cat_obj
                    obj.last_scraped_at = now
                    to_update.append(obj)
                else:
                    to_create.append(
                        Product(
                            market=self.market,
                            name=p["name"],
                            price=p["price"],
                            promo_price=p["promo_price"],
                            category=cat_obj,
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

            total_stored += len(to_create) + len(to_update)

            if stdout:
                stdout.write(f"    → {len(products)} products")

        return total_stored
