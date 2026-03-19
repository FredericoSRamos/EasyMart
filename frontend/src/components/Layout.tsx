import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, Store } from 'lucide-react';
import { useSearch } from '../context/SearchContext';
import SearchBar from './SearchBar';

interface LayoutProps {
    children: React.ReactNode;
}

const NAV_ITEMS = [
    { to: '/supermarkets', label: 'Supermercados', Icon: Store },
    { to: '/products', label: 'Produtos', Icon: Package },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { query, setQuery } = useSearch();

    function handleSearch(q: string) {
        setQuery(q);
        const onSearchablePage = location.pathname === '/products' || location.pathname === '/supermarkets';
        if (q.trim() && !onSearchablePage) {
            navigate('/products');
        }
    }

    return (
        <div className="min-h-screen flex flex-col">
            <header className="glass sticky top-0 z-[100] border-b border-border">
                <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center gap-6">
                    <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight shrink-0">
                        <div className="bg-accent-gradient p-1.5 rounded-lg">
                            <ShoppingCart size={20} className="text-white" />
                        </div>
                        <span>Easy<span className="text-accent-primary">Mart</span></span>
                    </Link>

                    <nav className="flex items-center gap-1 shrink-0">
                        {NAV_ITEMS.map(({ to, label, Icon }) => {
                            const isActive = location.pathname === to;
                            return (
                                <Link
                                    key={to}
                                    to={to}
                                    className={`nav-link flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                                        isActive
                                            ? 'bg-accent-primary/15 text-accent-primary'
                                            : 'text-text-secondary hover:bg-white/6 hover:text-text-primary'
                                    }`}
                                >
                                    <Icon size={15} />
                                    <span className="hidden sm:inline">{label}</span>
                                    {isActive && <span className="nav-active-dot" />}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex-1 flex justify-end">
                        <SearchBar
                            query={query}
                            setQuery={handleSearch}
                            placeholder="Buscar produtos, marcas..."
                        />
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col min-h-0">
                {children}
            </main>

            <footer className="py-8 border-t border-border">
                <div className="max-w-[1280px] mx-auto px-6 text-center text-text-muted text-sm">
                    <p>© {new Date().getFullYear()} EasyMart. Built with React & Django.</p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
