import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProductsPage from './pages/ProductsPage';
import SupermarketsPage from './pages/SupermarketsPage';
import { SearchProvider } from './context/SearchContext';

function App() {
  return (
    <SearchProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/supermarkets" replace />} />
            <Route path="/supermarkets" element={<SupermarketsPage />} />
            <Route path="/products" element={<ProductsPage />} />
          </Routes>
        </Layout>
      </Router>
    </SearchProvider>
  );
}

export default App;
