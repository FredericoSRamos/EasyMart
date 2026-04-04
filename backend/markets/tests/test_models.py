import pytest
from decimal import Decimal
from django.db import IntegrityError
from hypothesis import given, settings
from hypothesis import strategies as st

from markets.models import Category, Market, Product


def make_market(slug="test-market", name="Test Market"):
    return Market.objects.create(
        name=name,
        slug=slug,
        api_base_url="https://example.com/api",
        domain="example.com",
    )


@pytest.mark.django_db
class TestProductModel:
    def _make_product(self, market, name="Test Product"):
        return Product.objects.create(
            market=market,
            name=name,
            price="9.99",
        )

    def test_product_has_no_external_id(self):
        market = make_market()
        product = self._make_product(market)
        assert not hasattr(product, "external_id")

    def test_product_has_no_brand(self):
        market = make_market()
        product = self._make_product(market)
        assert not hasattr(product, "brand")

    def test_product_has_no_stock(self):
        market = make_market()
        product = self._make_product(market)
        assert not hasattr(product, "stock")

    def test_product_image_url_defaults_to_empty_string(self):
        market = make_market()
        product = self._make_product(market)
        assert product.image_url == ""

    def test_on_promo_true_when_promo_price_less_than_price(self):
        market = make_market()
        product = Product.objects.create(
            market=market,
            name="Promo Product",
            price=Decimal("10.00"),
            promo_price=Decimal("7.99"),
        )
        product.refresh_from_db()
        assert product.on_promo is True

    def test_on_promo_false_when_no_promo_price(self):
        market = make_market()
        product = Product.objects.create(
            market=market,
            name="Regular Product",
            price=Decimal("10.00"),
            promo_price=None,
        )
        assert product.on_promo is False

    def test_on_promo_false_when_promo_price_equals_price(self):
        market = make_market()
        product = Product.objects.create(
            market=market,
            name="Equal Price Product",
            price=Decimal("10.00"),
            promo_price=Decimal("10.00"),
        )
        product.refresh_from_db()
        assert product.on_promo is False

    def test_on_promo_false_when_promo_price_greater_than_price(self):
        market = make_market()
        product = Product.objects.create(
            market=market,
            name="Higher Promo Product",
            price=Decimal("10.00"),
            promo_price=Decimal("12.00"),
        )
        product.refresh_from_db()
        assert product.on_promo is False


@pytest.mark.django_db
class TestCategoryModel:
    def test_category_has_no_external_id(self):
        market = make_market()
        category = Category.objects.create(market=market, name="Bebidas")
        assert not hasattr(category, "external_id")

    def test_unique_constraint_same_market_same_name_raises(self):
        market = make_market()
        Category.objects.create(market=market, name="Bebidas")
        with pytest.raises(IntegrityError):
            Category.objects.create(market=market, name="Bebidas")

    def test_same_name_different_markets_allowed(self):
        market_a = make_market(slug="market-a", name="Market A")
        market_b = make_market(slug="market-b", name="Market B")
        cat_a = Category.objects.create(market=market_a, name="Bebidas")
        cat_b = Category.objects.create(market=market_b, name="Bebidas")
        assert cat_a.pk != cat_b.pk
        assert Category.objects.filter(name="Bebidas").count() == 2


@pytest.mark.django_db(transaction=True)
class TestCategoryIdempotency:
    """Category unique constraint is (market, name); upsert is idempotent"""

    @given(name=st.text(min_size=1, max_size=100))
    @settings(max_examples=50)
    def test_get_or_create_idempotent(self, name):
        """For any (market, name) pair, calling get_or_create twice produces exactly one Category row"""
        market, _ = Market.objects.get_or_create(
            slug="idempotency-market",
            defaults={
                "name": "Idempotency Market",
                "api_base_url": "https://example.com/api",
                "domain": "example.com",
            },
        )

        cat1, created1 = Category.objects.get_or_create(market=market, name=name)
        cat2, created2 = Category.objects.get_or_create(market=market, name=name)

        # Same object returned both times
        assert cat1.pk == cat2.pk
        # Second call never creates again
        assert created2 is False
        # Exactly one row in DB for this (market, name)
        assert Category.objects.filter(market=market, name=name).count() == 1
