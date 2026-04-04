import pytest
from decimal import Decimal
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st

from markets.models import Category, Market, Product
from markets.serializers import CategorySerializer, ProductSerializer

REMOVED_PRODUCT_FIELDS = {"external_id", "brand", "stock"}
EXPECTED_PRODUCT_KEYS = {
    "id", "name", "price", "promo_price", "on_promo",
    "market", "market_slug", "category", "category_name", "last_scraped_at", "image_url",
}
REMOVED_CATEGORY_FIELDS = {"external_id"}
EXPECTED_CATEGORY_KEYS = {"id", "name", "market", "market_slug"}


def make_market(slug="test-market"):
    return Market.objects.create(
        name="Test Market",
        slug=slug,
        api_base_url="https://example.com/api",
        domain="example.com",
    )


@pytest.mark.django_db
def test_product_serializer_excludes_removed_fields():
    market = make_market(slug="unit-market-prod")
    product = Product.objects.create(
        market=market,
        name="Leite Integral 1L",
        price=Decimal("4.99"),
        promo_price=Decimal("3.99"),
    )
    data = ProductSerializer(product).data
    assert REMOVED_PRODUCT_FIELDS.isdisjoint(data.keys()), (
        f"Serializer output contains removed fields: {REMOVED_PRODUCT_FIELDS & set(data.keys())}"
    )


@pytest.mark.django_db
def test_category_serializer_excludes_external_id():
    market = make_market(slug="unit-market-cat")
    category = Category.objects.create(market=market, name="Bebidas")
    data = CategorySerializer(category).data
    assert "external_id" not in data.keys(), (
        "CategorySerializer output must not contain 'external_id'"
    )


@pytest.mark.django_db
def test_product_serializer_exact_shape():
    market = make_market(slug="royal")
    cat = Category.objects.create(market=market, name="Laticínios")
    product = Product.objects.create(
        market=market,
        name="Leite Integral 1L",
        price=Decimal("4.99"),
        promo_price=Decimal("3.99"),
        category=cat,
    )

    data = ProductSerializer(product).data
    assert set(data.keys()) == EXPECTED_PRODUCT_KEYS, (
        f"Key mismatch. Extra: {set(data.keys()) - EXPECTED_PRODUCT_KEYS}, "
        f"Missing: {EXPECTED_PRODUCT_KEYS - set(data.keys())}"
    )
    assert data["name"] == "Leite Integral 1L"
    assert Decimal(data["price"]) == Decimal("4.99")
    assert Decimal(data["promo_price"]) == Decimal("3.99")
    assert data["on_promo"] is True
    assert data["market"] == market.id
    assert data["market_slug"] == "royal"
    assert data["category"] == cat.id
    assert data["category_name"] == "Laticínios"


@pytest.mark.django_db
def test_category_serializer_exact_shape():
    market = make_market(slug="royal-cat")
    category = Category.objects.create(market=market, name="Bebidas")
    data = CategorySerializer(category).data
    assert set(data.keys()) == EXPECTED_CATEGORY_KEYS, (
        f"Key mismatch. Extra: {set(data.keys()) - EXPECTED_CATEGORY_KEYS}, "
        f"Missing: {EXPECTED_CATEGORY_KEYS - set(data.keys())}"
    )
    assert data["name"] == "Bebidas"
    assert data["market"] == market.id
    assert data["market_slug"] == "royal-cat"


product_names = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N", "P")),
    min_size=1,
    max_size=100,
).filter(lambda s: s.strip())

positive_decimals = st.decimals(
    min_value="0.01",
    max_value="9999.99",
    places=2,
    allow_nan=False,
    allow_infinity=False,
)


@pytest.mark.django_db
@given(
    name=product_names,
    price=positive_decimals,
    has_promo=st.booleans(),
)
@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_product_serializer_never_includes_removed_fields(name, price, has_promo):
    market, _ = Market.objects.get_or_create(
        slug="prop-market-prod",
        defaults={
            "name": "Prop Market",
            "api_base_url": "https://example.com/api",
            "domain": "example.com",
        },
    )
    promo_price = price * Decimal("0.9") if has_promo else None
    product, _ = Product.objects.update_or_create(
        market=market,
        name=name.strip(),
        defaults={"price": price, "promo_price": promo_price},
    )
    data = ProductSerializer(product).data
    assert REMOVED_PRODUCT_FIELDS.isdisjoint(data.keys()), (
        f"Removed fields found in serializer output: {REMOVED_PRODUCT_FIELDS & set(data.keys())}"
    )


@pytest.mark.django_db
@given(
    name=st.text(
        alphabet=st.characters(whitelist_categories=("L", "N")),
        min_size=1,
        max_size=100,
    ).filter(lambda s: s.strip()),
)
@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_category_serializer_never_includes_external_id(name):
    market, _ = Market.objects.get_or_create(
        slug="prop-market-cat",
        defaults={
            "name": "Prop Market Cat",
            "api_base_url": "https://example.com/api",
            "domain": "example.com",
        },
    )
    category, _ = Category.objects.get_or_create(
        market=market,
        name=name.strip(),
    )
    data = CategorySerializer(category).data
    assert "external_id" not in data.keys(), (
        "CategorySerializer must not expose 'external_id'"
    )
