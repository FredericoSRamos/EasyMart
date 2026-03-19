# EasyMart

A supermarket price comparison app. Scrapes product and pricing data from three local supermarkets and exposes it through a searchable, filterable web UI. 

It can be easily expanded to any market that suits your needs. Market web applications usually follow one of the two patterns already covered here: a public API (like Instabuy) or simple token-based authentication per request (like VIP Commerce). Find the API your target market uses, define its categories, and drop in a new scraper class, the rest of the pipeline picks it up automatically.

## Adding a new market

1. **Find the API.** Open the market's website, check the network tab while browsing products. Look for JSON responses, most platforms expose a REST API, often under `/api/` or a subdomain like `api.market.com`.

2. **Create a scraper.** If the market uses a public API with no auth, subclass `BaseScraper` directly (see `market_365.py`). If it requires login + session token, subclass `VIPCommerceScraper` (see `bramil.py` or `royal.py`) and fill in the abstract properties:

    ```python
    # backend/markets/scrapers/mymarket.py
    from .vip_base import VIPCommerceScraper

    class MyMarketScraper(VIPCommerceScraper):
        API_BASE   = "https://api.mymarket.com/v1"
        ORG_ID     = 123
        DOMAIN_KEY = "mymarket.com.br"
        FILIAL_ID  = 1
        DIST_ID    = 1
        MARKET_NAME  = "My Market"
        MARKET_SLUG  = "mymarket"
        DEPARTMENTS  = ["Bebidas", "Carnes", "Mercearia", ...]
    ```

3. **Register it.** Add the scraper to `SCRAPERS` in `scrape_all.py` and to `SCRAPER_REGISTRY` in `scrape_market.py`, and add a seed entry in `reset_db.py` so `reset_db` creates its categories.

4. **Seed and scrape.**

    ```bash
    python manage.py reset_db
    python manage.py scrape_market --market mymarket
    ```

The new market and its products will appear in the UI immediately, no frontend changes needed.

## Stack

- **Backend** — Django + Django REST Framework, SQLite
- **Frontend** — React 19, TypeScript, Tailwind CSS v4, Vite
- **Testing** — pytest + Hypothesis (backend), Vitest + fast-check (frontend)

## Supermarkets

| Market | Platform |
|---|---|
| 365 Supermercados | Instabuy API |
| Bramil Supermercados | VIP Commerce |
| Royal Supermercados | VIP Commerce |

## Features

- Search products across all markets simultaneously
- Filter by market, category, and promotions
- Sort by price (asc/desc) or name
- Browse by market with per-market category sidebar
- Paginated product grid (12 per page)

## Project Structure

```
backend/
  config/          Django settings, URLs, WSGI/ASGI
  markets/
    models.py      Market, Category, Product, ScrapeLog
    views.py       DRF viewsets + filters
    serializers.py
    scrapers/      market_365.py, vip_base.py, bramil.py, royal.py
    management/
      commands/    scrape_all, scrape_market, reset_db, clean_db
    tests/

frontend/
  src/
    pages/         ProductsPage, SupermarketsPage
    components/    Layout, ProductCard, CategorySidebar, SearchBar, ...
    services/      api.ts (axios client)
    utils/         formatPrice, formatRelativeTime, categoryIcon
    context/       SearchContext
```

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py reset_db   # creates DB and seeds categories
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies `/api` requests to `http://localhost:8000`.

## Scraping

Run all scrapers in parallel (clears DB first):

```bash
python manage.py scrape_all
```

Scrape a single market:

```bash
python manage.py scrape_market --market 365
python manage.py scrape_market --market bramil
python manage.py scrape_market --market royal
```

Dry run (skip DB clear):

```bash
python manage.py scrape_all --dry-run
```

## API

Base URL: `http://localhost:8000/api/`

| Endpoint | Description |
|---|---|
| `GET /api/markets/` | List markets |
| `GET /api/categories/` | List categories (filter: `?market__slug=`) |
| `GET /api/products/` | List products (see filters below) |

Product filters: `?search=`, `?market_slug=`, `?market_ids=1,2`, `?category_id=`, `?on_promo=true`, `?ordering=price` / `-price` / `name` / `-name`

## Tests

Project is fully covered with unit tests to help catch errors and asserts no fixed issues return.

```bash
# Backend
cd backend && .venv/Scripts/python -m pytest

# Frontend
cd frontend && npm test
```