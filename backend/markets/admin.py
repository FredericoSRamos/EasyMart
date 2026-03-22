from django.contrib import admin

from .models import Category, Market, Product, ScrapeLog


@admin.register(Market)
class MarketAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "domain"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "market"]
    list_filter = ["market"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "price", "promo_price", "on_promo", "market"]
    list_filter = ["market", "category"]
    search_fields = ["name"]


@admin.register(ScrapeLog)
class ScrapeLogAdmin(admin.ModelAdmin):
    list_display = ["market", "started_at", "finished_at", "status", "items_count"]
    list_filter = ["market", "status"]
