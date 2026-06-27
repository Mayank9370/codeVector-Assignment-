import { useProducts } from './hooks/useProducts';
import { FilterBar } from './components/FilterBar';
import { ProductList } from './components/ProductList';
import { Pagination } from './components/Pagination';
import './styles/App.css';

export default function App() {
  const {
    products,
    loading,
    error,
    hasMore,
    category,
    limit,
    currentPage,
    nextPage,
    prevPage,
    changeCategory,
    changeLimit,
  } = useProducts();

  // Compute items index range dynamically
  const startIndex = products.length > 0 ? (currentPage - 1) * limit + 1 : 0;
  const endIndex = startIndex + products.length - 1;

  // Format category string for display
  const categoryLabel = category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1);

  // Generate placeholders for skeleton state matching the current limit
  const skeletons = Array.from({ length: limit }, (_, i) => i);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-meta-row">
          <h1 className="app-title">Product Browser</h1>
          <span className="status-badge">Backend Ready</span>
        </div>
        <p className="app-subtitle">
          Browse and filter 200,000+ products using high-performance cursor pagination.
        </p>
      </header>

      <main className="app-content">
        <FilterBar
          currentCategory={category}
          onCategoryChange={changeCategory}
          currentLimit={limit}
          onLimitChange={changeLimit}
        />

        <div className="info-cards-container">
          <div className="info-card">
            <span className="info-card-label">Total Products</span>
            <span className="info-card-value">200,000+</span>
          </div>
          <div className="info-card">
            <span className="info-card-label">Current Category</span>
            <span className="info-card-value">{categoryLabel}</span>
          </div>
          <div className="info-card">
            <span className="info-card-label">Page Size</span>
            <span className="info-card-value">{limit}</span>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <span className="error-title">⚠️ Error Loading Data</span>
            <p className="error-message">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="product-grid">
            {skeletons.map((idx) => (
              <div key={idx} className="product-card skeleton-card">
                <div className="skeleton-title"></div>
                <div className="skeleton-meta">
                  <div className="skeleton-badge"></div>
                  <div className="skeleton-price"></div>
                </div>
                <div className="skeleton-date"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-state-title">No products found.</h3>
            <p className="empty-state-text">
              Try another category.
            </p>
          </div>
        ) : (
          <>
            <ProductList products={products} />
            <Pagination
              onPrev={prevPage}
              onNext={nextPage}
              disablePrev={currentPage === 1}
              disableNext={!hasMore}
              currentPage={currentPage}
              loading={loading}
              startIndex={startIndex}
              endIndex={endIndex}
            />
          </>
        )}
      </main>
    </div>
  );
}


