import React from 'react';

interface FilterBarProps {
  currentCategory: string;
  onCategoryChange: (category: string) => void;
  currentLimit: number;
  onLimitChange: (limit: number) => void;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'home', label: 'Home' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'sports', label: 'Sports' },
  { value: 'books', label: 'Books' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'toys', label: 'Toys' },
];

const LIMITS = [10, 20, 50];

export const FilterBar: React.FC<FilterBarProps> = ({
  currentCategory,
  onCategoryChange,
  currentLimit,
  onLimitChange,
}) => {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label htmlFor="category-select" className="filter-label">
          Category
        </label>
        <select
          id="category-select"
          value={currentCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="filter-control"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="limit-select" className="filter-label">
          Page Size
        </label>
        <select
          id="limit-select"
          value={currentLimit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="filter-control"
        >
          {LIMITS.map((lim) => (
            <option key={lim} value={lim}>
              {lim} products
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
