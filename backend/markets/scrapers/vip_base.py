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
        super().__init__()
        self.session = requests.Session()
        self.token = None
        self.sessao_id = None
        self.api_headers = {}
        self._category_map = {}

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

        requested_slugs = {self.slugify(d): d for d in self.DEPARTMENTS}
        categories: list[dict] = []

        for dept in full_tree:
            api_name = dept.get("descricao", "")
            slug = self.slugify(api_name)

            if slug in requested_slugs:
                canonical_name = requested_slugs[slug]
                obj, _ = Category.objects.update_or_create(
                    market=self.market,
                    name=canonical_name,
                    defaults={},
                )
                categories.append({
                    "id": obj.id,
                    "name": canonical_name,
                })
                self._category_map[obj.id] = dept.get("classificacao_mercadologica_id")
        
        logger.info("Matched %d categories for %s", len(categories), self.MARKET_SLUG)
        return categories

    def fetch_products_for_category(self, category: Category) -> list[dict]:
        category_ext_id = self._category_map.get(category.id)
        if not category_ext_id:
            logger.warning("No API department ID found for category %s", category.name)
            return []

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

