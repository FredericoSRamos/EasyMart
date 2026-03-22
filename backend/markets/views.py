from django.db.models import F, Q
from django_filters import rest_framework as django_filters
from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Category, Market, Product
from .serializers import CategorySerializer, MarketSerializer, ProductSerializer


def on_promo_q() -> Q:
    """Mirrors Product.on_promo"""
    return Q(promo_price__isnull=False, promo_price__lt=F("price"))


class ProductFilter(django_filters.FilterSet):
    on_promo = django_filters.BooleanFilter(method="filter_on_promo")
    market_slug = django_filters.CharFilter(field_name="market__slug")
    category_id = django_filters.NumberFilter(field_name="category__id")
    market_ids = django_filters.BaseInFilter(field_name="market__id", lookup_expr="in")

    class Meta:
        model = Product
        fields = ["market", "category", "market_slug", "category_id", "on_promo", "market_ids"]

    def filter_on_promo(self, queryset, name, value):
        if value:
            return queryset.filter(on_promo_q())
        return queryset


class MarketViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Market.objects.all()
    serializer_class = MarketSerializer
    lookup_field = "slug"


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.select_related("market").all()
    serializer_class = CategorySerializer
    filterset_fields = ["market", "market__slug"]


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.select_related("market", "category").all()
    serializer_class = ProductSerializer
    filter_backends = [django_filters.DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ["name"]
    ordering_fields = ["name", "price", "promo_price", "last_scraped_at"]
