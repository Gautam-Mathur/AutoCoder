import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFilter {
  categoryId?: string;
  searchQuery?: string;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Fetch all products from the database with optional filtering and pagination
 * @param filter - Optional filter parameters
 * @returns Promise resolving to array of products
 */
export async function getProducts(filter: ProductFilter = {}): Promise<Product[]> {
  try {
    const { 
      categoryId, 
      searchQuery, 
      sortBy = 'createdAt', 
      sortOrder = 'desc', 
      page = 1, 
      limit = 20 
    } = filter;

    // Build where clause for filtering
    const where: any = {};
    
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } }
      ];
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Fetch products with pagination and filtering
    const products = await prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    });

    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw new Error('Failed to fetch products');
  }
}

/**
 * Fetch a specific product by its ID
 * @param id - Product ID
 * @returns Promise resolving to product or null if not found
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    return product;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    throw new Error('Failed to fetch product');
  }
}

/**
 * Search products by name or description
 * @param query - Search query string
 * @returns Promise resolving to array of matching products
 */
export async function searchProducts(query: string): Promise<Product[]> {
  try {
    if (!query.trim()) {
      return [];
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    return products;
  } catch (error) {
    console.error('Error searching products:', error);
    throw new Error('Failed to search products');
  }
}

/**
 * Get products filtered by category
 * @param categoryId - Category ID to filter by
 * @returns Promise resolving to array of products in that category
 */
export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  try {
    const products = await prisma.product.findMany({
      where: { categoryId },
      orderBy: {
        createdAt: 'desc',
      }
    });

    return products;
  } catch (error) {
    console.error('Error fetching products by category:', error);
    throw new Error('Failed to fetch products by category');
  }
}