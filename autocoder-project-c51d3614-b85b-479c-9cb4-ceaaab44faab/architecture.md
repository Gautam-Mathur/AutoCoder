### Context Snapshot
- **Core Goal**: Building a full-stack e-commerce storefront for customers to browse products and complete purchases
- **Key Constraints**: Must use Next.js framework, Stripe for payments, SQLite with Prisma ORM, Plain HTML/CSS/JS for frontend components
- **Architecture Summary**: 15+ files across multiple modules (Pages, Components, API Routes, Lib, Styles), entry point: pages/_app.js

### Tech Stack
- **Frontend**: Next.js
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: None — no user accounts or authentication required per requirements
- **Build Tool**: Next.js built-in build system
- **Additional**: Stripe for payment processing

### Project Folder Structure
project-root/
├── pages/
│   ├── _app.js
│   ├── _document.js
│   ├── index.js
│   ├── products/
│   │   ├── [id].js
│   │   └── index.js
│   ├── cart/
│   │   └── index.js
│   └── api/
│       └── checkout/
│           └── create-checkout-session.js
├── components/
│   ├── layout/
│   │   └── Header.js
│   ├── product/
│   │   ├── ProductCard.js
│   │   └── ProductList.js
│   ├── cart/
│   │   └── CartItem.js
│   └── search/
│       └── SearchBar.js
├── lib/
│   ├── prisma.js
│   └── stripe.js
├── styles/
│   ├── globals.css
│   └── Home.module.css
├── public/
│   └── next.svg
├── package.json
├── next.config.js
├── prisma/
│   └── schema.prisma
└── README.md

### Modules
**Pages**
- Responsibility: Defines the main application pages and routes
- Owned Files: pages/_app.js, pages/_document.js, pages/index.js, pages/products/[id].js, pages/products/index.js, pages/cart/index.js, pages/api/checkout/create-checkout-session.js
- Depends On: Components, Lib
- Supports Features: Product Catalog, Product Details Page, Shopping Cart, Stripe Checkout Integration

**Components**
- Responsibility: Reusable UI elements for the storefront
- Owned Files: components/layout/Header.js, components/product/ProductCard.js, components/product/ProductList.js, components/cart/CartItem.js, components/search/SearchBar.js
- Depends On: None
- Supports Features: Product Catalog, Search Functionality, Shopping Cart, Product Details Page, Category Filtering

**Lib**
- Responsibility: Contains database and payment integration logic
- Owned Files: lib/prisma.js, lib/stripe.js
- Depends On: None
- Supports Features: Product Catalog, Shopping Cart, Stripe Checkout Integration

**Styles**
- Responsibility: Manages global and page-specific styling
- Owned Files: styles/globals.css, styles/Home.module.css
- Depends On: None
- Supports Features: All UI elements

### Conventions
- **File Naming**: camelCase for JS/TS files, kebab-case for CSS modules
- **Function Naming**: camelCase for functions, PascalCase for React components
- **Import Style**: ES6 import/export syntax
- **Entry Point**: pages/_app.js serves as the main application entry point in Next.js