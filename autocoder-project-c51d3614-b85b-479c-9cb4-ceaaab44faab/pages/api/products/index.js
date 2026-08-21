import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { search, category, page = 1, limit = 12 } = req.query;
    
    // Convert page and limit to numbers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // Validate pagination parameters
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ message: 'Invalid page number' });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ message: 'Invalid limit. Must be between 1 and 100' });
    }
    
    // Build where clause for filtering
    const whereClause = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    // Calculate pagination offset
    const skip = (pageNum - 1) * limitNum;
    
    // Fetch products with pagination and filtering
    const products = await prisma.product.findMany({
      where: whereClause,
      skip,
      take: limitNum,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Get total count for pagination info
    const totalCount = await prisma.product.count({
      where: whereClause
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limitNum);
    
    res.status(200).json({
      products,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}