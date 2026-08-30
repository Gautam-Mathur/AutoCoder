### Context Snapshot
- **Core Goal**: Building a full-stack e-commerce storefront for customers to browse products and complete purchases
- **Key Constraints**: Must use Next.js framework, Stripe for payments, SQLite with Prisma ORM, React Server Components
- **Architecture Summary**: 15+ files across multiple modules (Pages, API Routes, Components, Lib, Prisma), entry point: pages/_app.tsx

### Tech Stack
- **Frontend**: Next.js
- **Frontend Entry Point**: pages/_app.tsx
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: None — no auth needed
- **Build Tool**: Next.js built-in build system
- **Additional**: Stripe for payments, React Server Components

### Project Folder Structure
project-root/
├── pages/
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── index.tsx
│   ├── products/
│   │   └── [id].tsx
│   ├── cart/
│   │   └── index.tsx
│   ├── search/
│   │   └── index.tsx
│   └── api/
│       └── checkout/
│           └── create-checkout-session.ts
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── product/
│   │   ├── ProductCard.tsx
│   │   └── ProductList.tsx
│   ├── cart/
│   │   └── CartItem.tsx
│   └── search/
│       └── SearchBar.tsx
├── lib/
│   ├── prisma.ts
│   └── stripe.ts
├── public/
│   └── images/
│       └── placeholder.png
├── styles/
│   └── globals.css
├── package.json
├── tsconfig.json
└── README.md

### Modules
**Pages**
- Responsibility: Defines the main application pages and routing structure
- Owned Files: pages/_app.tsx, pages/_document.tsx, pages/index.tsx, pages/products/[id].tsx, pages/cart/index.tsx, pages/search/index.tsx
- Depends On: Components, Lib
- Supports Features: Product Catalog, Product Details Page, Shopping Cart, Search Functionality

**API Routes**
- Responsibility: Handles backend logic for checkout and payment processing
- Owned Files: pages/api/checkout/create-checkout-session.ts
- Depends On: Lib
- Supports Features: Stripe Checkout Integration

**Components**
- Responsibility: Reusable UI elements for the storefront
- Owned Files: components/layout/Header.tsx, components/layout/Footer.tsx, components/product/ProductCard.tsx, components/product/ProductList.tsx, components/cart/CartItem.tsx, components/search/SearchBar.tsx
- Depends On: None
- Supports Features: Product Catalog, Shopping Cart, Search Functionality, Product Details Page

**Lib**
- Responsibility: Contains shared libraries for database and payment integrations
- Owned Files: lib/prisma.ts, lib/stripe.ts
- Depends On: None
- Supports Features: Product Catalog, Stripe Checkout Integration

### Conventions
- **File Naming**: camelCase for TypeScript files, kebab-case for component files
- **Function Naming**: camelCase for functions, PascalCase for React components
- **Import Style**: ES6 import/export
- **Entry Point**: pages/_app.tsx is the main Next.js entry point that loads all pages and components