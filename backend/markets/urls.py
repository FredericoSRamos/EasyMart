from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, MarketViewSet, ProductViewSet

router = DefaultRouter()
router.register("markets", MarketViewSet, basename="market")
router.register("categories", CategoryViewSet, basename="category")
router.register("products", ProductViewSet, basename="product")

urlpatterns = router.urls
