import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface Market {
    id: number;
    name: string;
    slug: string;
    domain: string;
}

export interface Category {
    id: number;
    name: string;
    market: number;
    market_slug: string;
}

export interface Product {
    id: number;
    name: string;
    price: string;
    promo_price: string | null;
    image_url: string;
    on_promo: boolean;
    market: number;
    market_slug: string;
    categories: number[];
    categories_names: string[];
    last_scraped_at: string;
}

export const marketService = {
    getMarkets: () => api.get<PaginatedResponse<Market>>('/markets/'),
    getMarket: (slug: string) => api.get<Market>(`/markets/${slug}/`),
};

export const categoryService = {
    getCategories: (marketId?: number, marketSlug?: string) => {
        const params: any = {};
        if (marketId) params.market = marketId;
        if (marketSlug) params.market__slug = marketSlug;
        return api.get<PaginatedResponse<Category>>('/categories/', { params });
    },
};

export const productService = {
    getProducts: (params: {
        market_slug?: string;
        market_ids?: number[];
        category_id?: number;
        search?: string;
        ordering?: string;
        on_promo?: boolean;
        page?: number;
        page_size?: number;
    }) => {
        const { market_ids, ...rest } = params;
        const finalParams: Record<string, unknown> = { ...rest };
        if (market_ids && market_ids.length > 0) {
            finalParams.market_ids = market_ids.join(',');
        }
        return api.get<PaginatedResponse<Product>>('/products/', { params: finalParams });
    },
};

export default api;
