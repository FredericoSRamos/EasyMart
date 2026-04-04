from .market_365 import Market365Scraper
from .bramil import BramilScraper
from .royal import RoyalScraper

SCRAPER_REGISTRY: dict[str, type] = {
    "365": Market365Scraper,
    "bramil": BramilScraper,
    "royal": RoyalScraper,
}
