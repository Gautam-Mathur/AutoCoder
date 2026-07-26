// Product type definitions

class Product {
  constructor(id, name, description, price, category, tags, images, stock, createdAt, updatedAt) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.price = price;
    this.category = category;
    this.tags = tags || [];
    this.images = images || [];
    this.stock = stock;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

// Product category type
const ProductCategory = {
  ELECTRONICS: 'electronics',
  CLOTHING: 'clothing',
  HOME: 'home',
  BOOKS: 'books',
  SPORTS: 'sports',
  BEAUTY: 'beauty',
  TOYS: 'toys',
  AUTOMOTIVE: 'automotive',
  GROCERY: 'grocery',
  FURNITURE: 'furniture'
};

// Product tag type
const ProductTag = {
  NEW: 'new',
  SALE: 'sale',
  FEATURED: 'featured',
  BESTSELLER: 'bestseller',
  LIMITED: 'limited'
};

// Product image type
class ProductImage {
  constructor(url, alt, isPrimary = false) {
    this.url = url;
    this.alt = alt;
    this.isPrimary = isPrimary;
  }
}

// Product stock status type
const StockStatus = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock'
};

// Product search filter type
class ProductFilter {
  constructor(category = null, minPrice = null, maxPrice = null, tags = [], sortBy = 'name', sortOrder = 'asc') {
    this.category = category;
    this.minPrice = minPrice;
    this.maxPrice = maxPrice;
    this.tags = tags;
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
  }
}

// Product API response type
class ProductResponse {
  constructor(success, data = null, message = '', error = null) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.error = error;
  }
}

// Product list response type
class ProductListResponse extends ProductResponse {
  constructor(success, data = [], message = '', error = null, totalCount = 0, currentPage = 1, totalPages = 1) {
    super(success, data, message, error);
    this.totalCount = totalCount;
    this.currentPage = currentPage;
    this.totalPages = totalPages;
  }
}

// Product creation request type
class ProductCreateRequest {
  constructor(name, description, price, category, tags = [], images = []) {
    this.name = name;
    this.description = description;
    this.price = price;
    this.category = category;
    this.tags = tags;
    this.images = images;
  }
}

// Product update request type
class ProductUpdateRequest {
  constructor(name = null, description = null, price = null, category = null, tags = null, images = null, stock = null) {
    this.name = name;
    this.description = description;
    this.price = price;
    this.category = category;
    this.tags = tags;
    this.images = images;
    this.stock = stock;
  }
}

// Export all types
module.exports = {
  Product,
  ProductCategory,
  ProductTag,
  ProductImage,
  StockStatus,
  ProductFilter,
  ProductResponse,
  ProductListResponse,
  ProductCreateRequest,
  ProductUpdateRequest
};