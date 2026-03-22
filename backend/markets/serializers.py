from rest_framework import serializers

from .models import Category, Market, Product


class MarketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Market
        fields = ["id", "name", "slug", "domain"]


class CategorySerializer(serializers.ModelSerializer):
    market_slug = serializers.CharField(source="market.slug", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "market", "market_slug"]


class ProductSerializer(serializers.ModelSerializer):
    market_slug = serializers.CharField(source="market.slug", read_only=True)
    category_name = serializers.SerializerMethodField()
    on_promo = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "price",
            "promo_price",
            "on_promo",
            "market",
            "market_slug",
            "category",
            "category_name",
            "last_scraped_at",
        ]

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None
