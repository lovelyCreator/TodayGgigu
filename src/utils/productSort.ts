import { Product } from '../types';

/**
 * Sort products locally based on sort type
 * @param products - Array of products to sort
 * @param sortType - Sort type: 'best_match', 'price_high', 'price_low', 'high_sales', 'low_sales'
 * @returns Sorted array of products
 */
export const sortProducts = (products: Product[], sortType: string): Product[] => {
  // Create a copy to avoid mutating the original array
  const sortedProducts = [...products];

  switch (sortType) {
    case 'best_match':
      // Keep original order (best match from API)
      return sortedProducts;

    case 'price_high':
      // Sort by price descending
      return sortedProducts.sort((a, b) => {
        const priceA = a.price || 0;
        const priceB = b.price || 0;
        return priceB - priceA;
      });

    case 'price_low':
      // Sort by price ascending
      return sortedProducts.sort((a, b) => {
        const priceA = a.price || 0;
        const priceB = b.price || 0;
        return priceA - priceB;
      });

    case 'high_sales':
      // Sort by sales (orderCount) descending
      return sortedProducts.sort((a, b) => {
        const salesA = a.orderCount || 0;
        const salesB = b.orderCount || 0;
        return salesB - salesA;
      });

    case 'low_sales':
      // Sort by sales (orderCount) ascending
      return sortedProducts.sort((a, b) => {
        const salesA = a.orderCount || 0;
        const salesB = b.orderCount || 0;
        return salesA - salesB;
      });

    default:
      // Default to best match (original order)
      return sortedProducts;
  }
};

