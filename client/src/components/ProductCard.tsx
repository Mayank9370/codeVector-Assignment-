import React from 'react';
import { Product } from '../types/products';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(product.price));

  const formattedDate = new Date(product.created_at).toLocaleString();

  return (
    <div className="product-card">
      <h3 className="product-name">{product.name}</h3>
      <div className="product-meta">
        <span className="product-category">{product.category}</span>
        <span className="product-price">{formattedPrice}</span>
      </div>
      <div className="product-timestamp">Created: {formattedDate}</div>
    </div>
  );
};
