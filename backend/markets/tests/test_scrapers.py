import pytest
from io import StringIO
from hypothesis import given, settings
from hypothesis import strategies as st

from markets.models import Category, Market, Product
from markets.scrapers.market_365 import (
    CATEGORIES_365,
    Market365Scraper,
    _slugify_category,
)
from unittest.mock import MagicMock, patch
import re


def make_scraper() -> Market365Scraper:
    with patch("requests.Session"):
        scraper = Market365Scraper()
    return scraper


def make_category(scraper: Market365Scraper, name: str = "Alimentos Básicos") -> Category:
    obj, _ = Category.objects.get_or_create(market=scraper.market, name=name)
    return obj


@pytest.mark.django_db
class TestFetchCategoriesNoHTTP:
    def test_fetch_categories_does_not_call_get(self):
        scraper = make_scraper()
        mock_get = MagicMock()
        scraper._get = mock_get

        scraper.fetch_categories()

        mock_get.assert_not_called()

    def test_fetch_categories_returns_all_19_names(self):
        scraper = make_scraper()
        results = scraper.fetch_categories()

        returned_names = [r["name"] for r in results]
        assert returned_names == CATEGORIES_365
        assert len(returned_names) == 19


@pytest.mark.django_db
class TestFetchProductsForCategory:
    def test_correct_params_sent_to_get(self):
        scraper = make_scraper()
        category = make_category(scraper, "Alimentos Básicos")

        calls = []

        def fake_get(endpoint, params=None):
            calls.append((endpoint, params or {}))
            # Return only one page
            if len(calls) == 1:
                return {"data": [{"items": [{"name": "Arroz", "price_config": {"price": 5}, "prices": []}]}]}
            return {"data": []}

        scraper._get = fake_get
        scraper.fetch_products_for_category(category, StringIO())

        assert len(calls) == 1
        first_endpoint, first_params = calls[0]
        assert first_endpoint == "layout"
        assert first_params["category_slug"] == "alimentos-basicos"
        assert first_params["custom_domain"] == "365supermercados.com.br"
        assert first_params["subdomain"] == "365supermercados"
        assert first_params["host"] == "365supermercados.com.br"


@pytest.mark.django_db
class TestSaveProducts:
    def test_product_associated_with_category(self):
        scraper = make_scraper()
        category = make_category(scraper, "Mercearia")

        products = [{"name": "Feijão 1kg", "price": 8.50, "promo_price": None}]
        scraper._save_products(products, category)

        product = Product.objects.get(market=scraper.market, name="Feijão 1kg")
        assert category in product.categories.all()

    def test_save_products_twice_no_duplicate(self):
        scraper = make_scraper()
        category = make_category(scraper, "Mercearia")

        products = [{"name": "Feijão 1kg", "price": 8.50, "promo_price": None}]
        scraper._save_products(products, category)
        scraper._save_products(products, category)

        assert Product.objects.filter(market=scraper.market, name="Feijão 1kg").count() == 1


SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$")


@given(name=st.text(min_size=1))
@settings(max_examples=50)
def test_slugify_output_charset(name):
    slug = _slugify_category(name)
    # If the input has no alphanumeric content the slug may be empty
    if slug:
        assert re.fullmatch(r"[a-z0-9][a-z0-9-]*", slug), (
            f"Slug {slug!r} contains invalid characters (input: {name!r})"
        )


@pytest.mark.django_db
@given(n_pages=st.integers(min_value=1, max_value=5))
@settings(max_examples=50, deadline=None)
def test_fetch_products_for_category_collects_all_pages(n_pages):
    scraper = make_scraper()
    category = make_category(scraper, "Padaria")

    page_size = 30

    def fake_get(endpoint, params=None):
        page = (params or {}).get("page", 1)
        if endpoint == "layout":
            return {
                "data": [
                    {"id": 123, "count": n_pages * 30, "title": "Padaria"}
                ]
            }
        elif endpoint == "item":
            if page > n_pages:
                return {"data": []}
            items = [
                {"name": f"item-p{page}-{i}", "price_config": {"price": 1}, "prices": []}
                for i in range(30)
            ]
            return {"data": items}
        return {"data": []}

    scraper._get = fake_get
    with patch("markets.scrapers.market_365.time.sleep"):
        products = scraper.fetch_products_for_category(category, StringIO())

    assert len(products) == n_pages * page_size


@pytest.mark.django_db
@given(
    product_names=st.lists(
        st.text(alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd")), min_size=1, max_size=30),
        min_size=1,
        max_size=10,
        unique=True,
    )
)
@settings(max_examples=50)
def test_save_products_associates_category(product_names):
    scraper = make_scraper()
    category = make_category(scraper, "Frios")

    products = [{"name": name, "price": 1.0, "promo_price": None} for name in product_names]
    scraper._save_products(products, category)

    for name in product_names:
        product = Product.objects.get(market=scraper.market, name=name)
        assert category in product.categories.all(), (
            f"Product {name!r} missing category {category.name!r}"
        )


@pytest.mark.django_db
def test_save_products_accumulates_multiple_categories():
    scraper = make_scraper()
    cat_a = make_category(scraper, "Frios")
    cat_b = make_category(scraper, "Laticínios")

    product_data = [{"name": "Queijo Minas", "price": 12.0, "promo_price": None}]
    scraper._save_products(product_data, cat_a)
    scraper._save_products(product_data, cat_b)

    product = Product.objects.get(market=scraper.market, name="Queijo Minas")
    cats = set(product.categories.all())
    assert cat_a in cats
    assert cat_b in cats


@pytest.mark.django_db
def test_fetch_categories_returns_exactly_hardcoded_list():
    scraper = make_scraper()
    results = scraper.fetch_categories()
    assert [r["name"] for r in results] == CATEGORIES_365


@pytest.mark.django_db
@given(extra=st.integers(min_value=0, max_value=3))
@settings(max_examples=50)
def test_fetch_categories_idempotent(extra):
    scraper = make_scraper()

    # Call once
    scraper.fetch_categories()
    for _ in range(extra):
        scraper.fetch_categories()

    db_names = sorted(
        Category.objects.filter(market=scraper.market).values_list("name", flat=True)
    )
    expected = sorted(CATEGORIES_365)
    assert db_names == expected


from unittest.mock import patch as _patch
from markets.scrapers.royal import RoyalScraper


def make_royal_scraper() -> RoyalScraper:
    with _patch("requests.Session"):
        scraper = RoyalScraper()
    scraper.token = "fake-token"
    scraper.sessao_id = "fake-sessao"
    scraper.api_headers = {}
    return scraper


@pytest.mark.django_db
class TestVIPFetchCategories:
    def _tree_response(self):
        return {
            "data": [
                {"classificacao_mercadologica_id": 1, "descricao": "Bebidas"},
                {"classificacao_mercadologica_id": 2, "descricao": "Mercearia"},
                {"classificacao_mercadologica_id": 99, "descricao": "NotInDepartments"},
            ]
        }

    def test_only_departments_are_created(self):
        scraper = make_royal_scraper()
        mock_resp = MagicMock()
        mock_resp.json.return_value = self._tree_response()
        mock_resp.raise_for_status = MagicMock()
        scraper.session.get = MagicMock(return_value=mock_resp)

        results = scraper.fetch_categories()

        returned_names = {r["name"] for r in results}
        assert "NotInDepartments" not in returned_names
        for name in returned_names:
            assert scraper._slugify(name) in {scraper._slugify(d) for d in scraper.DEPARTMENTS}

    def test_non_department_category_not_in_db(self):
        scraper = make_royal_scraper()
        mock_resp = MagicMock()
        mock_resp.json.return_value = self._tree_response()
        mock_resp.raise_for_status = MagicMock()
        scraper.session.get = MagicMock(return_value=mock_resp)

        scraper.fetch_categories()

        assert not Category.objects.filter(
            market=scraper.market, name="NotInDepartments"
        ).exists()


@pytest.mark.django_db
class TestVIPProductUpsert:
    def _make_product_response(self, name: str = "Leite Integral 1L"):
        return {
            "success": True,
            "data": [
                {
                    "id": 42,
                    "descricao": name,
                    "preco": 4.99,
                    "em_oferta": False,
                    "oferta": None,
                    "disponivel": True,
                    "imagem": "",
                    "marca_id": "",
                }
            ],
            "paginator": {"total_pages": 1},
        }

    def test_run_twice_no_duplicate_products(self):
        scraper = make_royal_scraper()

        # Pre-create a category so fetch_categories can be mocked simply
        cat = Category.objects.create(market=scraper.market, name="Bebidas")

        with _patch.object(scraper, "fetch_categories", return_value=[{"id": cat.id, "name": cat.name, "slug": "bebidas", "api_dept_id": 1}]):
            def fake_fetch_products(cat_id):
                return [
                    {
                        "name": "Leite Integral 1L",
                        "price": 4.99,
                        "promo_price": None,
                    }
                ]

            with _patch.object(scraper, "fetch_products_for_category", side_effect=fake_fetch_products):
                scraper.run()
                scraper.run()

        count = Product.objects.filter(market=scraper.market, name="Leite Integral 1L").count()
        assert count == 1, f"Expected 1 product, got {count}"

    def test_product_upsert_updates_price(self):
        scraper = make_royal_scraper()
        cat = Category.objects.create(market=scraper.market, name="Bebidas")

        def make_fetch(price):
            def fake_fetch(cat_id):
                return [{"name": "Leite Integral 1L", "price": price, "promo_price": None}]
            return fake_fetch

        with _patch.object(scraper, "fetch_categories", return_value=[{"id": cat.id, "name": cat.name, "slug": "bebidas", "api_dept_id": 1}]):
            with _patch.object(scraper, "fetch_products_for_category", side_effect=make_fetch(4.99)):
                scraper.run()

        with _patch.object(scraper, "fetch_categories", return_value=[{"id": cat.id, "name": cat.name, "slug": "bebidas", "api_dept_id": 1}]):
            with _patch.object(scraper, "fetch_products_for_category", side_effect=make_fetch(3.50)):
                scraper.run()

        product = Product.objects.get(market=scraper.market, name="Leite Integral 1L")
        assert float(product.price) == 3.50


@pytest.mark.django_db
@given(
    dept_indices=st.lists(
        st.integers(min_value=0, max_value=len(RoyalScraper.DEPARTMENTS) - 1),
        min_size=0,
        max_size=len(RoyalScraper.DEPARTMENTS),
        unique=True,
    )
)
@settings(max_examples=50)
def test_vip_fetch_categories_only_from_departments(dept_indices):
    scraper = make_royal_scraper()

    # Build a tree that includes the selected DEPARTMENTS plus one extra not in DEPARTMENTS
    tree_data = [
        {"classificacao_mercadologica_id": i + 1, "descricao": RoyalScraper.DEPARTMENTS[idx]}
        for i, idx in enumerate(dept_indices)
    ]
    tree_data.append({"classificacao_mercadologica_id": 999, "descricao": "OutsiderCategory"})

    mock_resp = MagicMock()
    mock_resp.json.return_value = {"data": tree_data}
    mock_resp.raise_for_status = MagicMock()
    scraper.session.get = MagicMock(return_value=mock_resp)

    results = scraper.fetch_categories()

    department_slugs = {scraper._slugify(d) for d in scraper.DEPARTMENTS}
    for cat in results:
        assert scraper._slugify(cat["name"]) in department_slugs, (
            f"Category {cat['name']!r} is not in DEPARTMENTS"
        )

    returned_names = {r["name"] for r in results}
    assert "OutsiderCategory" not in returned_names


@pytest.mark.django_db
def test_fetch_categories_removes_stale_categories():
    scraper = make_scraper()
    # Manually insert a stale category
    stale = Category.objects.create(market=scraper.market, name="Categoria Fantasma")

    scraper.fetch_categories()

    assert not Category.objects.filter(market=scraper.market, name="Categoria Fantasma").exists()
    # All 19 categories must still be present
    db_names = set(Category.objects.filter(market=scraper.market).values_list("name", flat=True))
    assert db_names == set(CATEGORIES_365)


@pytest.mark.django_db
def test_vip_fetch_categories_stores_canonical_casing():
    from markets.scrapers.royal import RoyalScraper

    scraper = make_royal_scraper()

    # Simulate API returning names in uppercase
    tree_data = [
        {"classificacao_mercadologica_id": 1, "descricao": "BEBIDAS"},
        {"classificacao_mercadologica_id": 2, "descricao": "MERCEARIA"},
    ]
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"data": tree_data}
    mock_resp.raise_for_status = MagicMock()
    scraper.session.get = MagicMock(return_value=mock_resp)

    results = scraper.fetch_categories()

    # Names stored in DB must match DEPARTMENTS casing, not API casing
    for cat in results:
        assert cat["name"] in RoyalScraper.DEPARTMENTS, (
            f"Stored name {cat['name']!r} not in DEPARTMENTS (expected canonical casing)"
        )
        assert cat["name"] != cat["name"].upper() or cat["name"] == cat["name"].title(), (
            f"Name {cat['name']!r} appears to be stored in ALL CAPS"
        )

    # Verify DB rows also have canonical casing
    for cat in results:
        db_cat = Category.objects.get(market=scraper.market, name=cat["name"])
        assert db_cat.name in RoyalScraper.DEPARTMENTS


@pytest.mark.django_db
def test_product_search_filter():
    from django.test import RequestFactory
    from markets.views import ProductViewSet
    from markets.models import Market, Product

    market, _ = Market.objects.get_or_create(
        slug="test-search",
        defaults={"name": "Test Market", "api_base_url": "http://x.com", "domain": "x.com"},
    )
    Product.objects.create(market=market, name="Arroz Branco 1kg", price=5)
    Product.objects.create(market=market, name="Feijão Preto 500g", price=4)
    Product.objects.create(market=market, name="Macarrão Espaguete", price=3)

    factory = RequestFactory()
    request = factory.get("/api/products/", {"search": "arroz"})

    # Attach DRF format negotiation attributes
    from rest_framework.request import Request
    from rest_framework.parsers import JSONParser
    drf_request = Request(request, parsers=[JSONParser()])

    view = ProductViewSet.as_view({"get": "list"})
    response = view(drf_request._request)
    response.accepted_renderer = __import__("rest_framework.renderers", fromlist=["JSONRenderer"]).JSONRenderer()
    response.accepted_media_type = "application/json"
    response.renderer_context = {}
    response.render()

    import json
    data = json.loads(response.content)
    names = [p["name"] for p in data["results"]]
    assert any("Arroz" in n for n in names), f"Expected 'Arroz' in results, got: {names}"
    assert not any("Feijão" in n for n in names), f"'Feijão' should not appear in results"
