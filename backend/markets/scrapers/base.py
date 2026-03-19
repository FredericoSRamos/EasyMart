from abc import ABC, abstractmethod


class BaseScraper(ABC):
    """Interface that every market scraper must implement."""

    @abstractmethod
    def fetch_categories(self) -> list[dict]:
        """Return a list of category dicts with at least 'id' and 'name'."""
        ...

    @abstractmethod
    def fetch_products_for_category(self) -> list[dict]:
        """Return a list of normalised product dicts for a category."""
        ...

    @abstractmethod
    def run(self, stdout=None) -> int:
        """Execute the full scrape pipeline. Returns the number of items stored."""
        ...
