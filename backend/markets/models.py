from django.db import models
from django.utils import timezone


class Market(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    api_base_url = models.URLField()
    domain = models.CharField(
        max_length=255,
        help_text="Domain identifier sent as custom_domain / host param.",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Category(models.Model):
    market = models.ForeignKey(
        Market, on_delete=models.CASCADE, related_name="categories"
    )
    name = models.CharField(max_length=200)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"
        unique_together = [("market", "name")]

    def __str__(self):
        return f"{self.market.slug}: {self.name}"


class Product(models.Model):
    market = models.ForeignKey(
        Market, on_delete=models.CASCADE, related_name="products"
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    name = models.CharField(max_length=300)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    promo_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    last_scraped_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("market", "name")]

    def __str__(self):
        return self.name

    @property
    def on_promo(self) -> bool:
        return self.promo_price is not None and self.promo_price < self.price


class ScrapeLog(models.Model):
    """Tracks individual scrape runs."""

    class Status(models.TextChoices):
        RUNNING = "running", "Running"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    market = models.ForeignKey(
        Market, on_delete=models.CASCADE, related_name="scrape_logs"
    )
    started_at = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.RUNNING
    )
    items_count = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.market.slug} @ {self.started_at:%Y-%m-%d %H:%M} — {self.status}"
