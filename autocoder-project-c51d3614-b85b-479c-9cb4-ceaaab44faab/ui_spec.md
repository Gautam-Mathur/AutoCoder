### Context Snapshot
- **Core Goal**: Building a full-stack e-commerce storefront for customers to browse products and complete purchases
- **Key Constraints**: Must use Next.js framework, Stripe for payments, SQLite with Prisma ORM
- **UI Summary**: 6 pages (Home, Product Catalog, Product Details, Shopping Cart, Checkout, Login), 15 components (Header, ProductCard, SearchBar, CartIcon, etc.), modern e-commerce design with clean typography and consistent spacing

### Design System
- **Style**: Modern e-commerce design with clean typography and consistent spacing
- **Primary Color**: #3B82F6 (Blue)
- **Secondary Color**: #10B981 (Emerald)
- **Background Color**: #FFFFFF
- **Text Color**: #1F2937
- **Accent Color**: #F59E0B (Amber)
- **Font Family**: "Inter, system-ui, sans-serif"
- **Font Sizes**: "14px body, 18px headings, 24px title"
- **Spacing Unit**: "8px base grid"
- **Border Radius**: "8px for cards, 4px for buttons"
- **Responsive Strategy**: "Mobile-first. Single column on mobile, two columns on tablet, three columns on desktop."

### Pages
**Home Page**
- Route: /
- Purpose: User browses featured products and categories on the homepage
- Supports Features: Product Catalog, Search Functionality, Category Filtering
- Layout: Header + Hero banner + Featured Products grid + Categories section
- Components Used: Header, HeroBanner, ProductCard, CategoryFilter

**Product Catalog Page**
- Route: /products
- Purpose: User views all products with search and filtering capabilities
- Supports Features: Product Catalog, Search Functionality, Category Filtering
- Layout: Header + Search Bar + Filter sidebar + Product grid
- Components Used: Header, SearchBar, CategoryFilter, ProductCard, Pagination

**Product Details Page**
- Route: /products/[id]
- Purpose: User views detailed information about a specific product
- Supports Features: Product Details Page, Shopping Cart
- Layout: Header + Breadcrumb + Product image gallery + Product info + Add to cart button
- Components Used: Header, Breadcrumb, ProductImageGallery, ProductInfo, AddToCartButton

**Shopping Cart Page**
- Route: /cart
- Purpose: User reviews items in cart and proceeds to checkout
- Supports Features: Shopping Cart, Stripe Checkout Integration
- Layout: Header + Cart item list + Order summary + Checkout button
- Components Used: Header, CartItem, CartSummary, CheckoutButton

**Checkout Page**
- Route: /checkout
- Purpose: User enters shipping information and completes payment via Stripe
- Supports Features: Stripe Checkout Integration
- Layout: Header + Shipping form + Payment method + Order review + Place order button
- Components Used: Header, ShippingForm, PaymentMethod, OrderReview, PlaceOrderButton

**Login Page**
- Route: /login
- Purpose: User authenticates to access account features
- Supports Features: User Authentication
- Layout: Header + Login form + Sign up link
- Components Used: Header, LoginForm, SignUpLink

### Components
**Header**
- Type: Navigation
- Purpose: Provides navigation links and cart icon at the top of every page
- Used On: Home Page, Product Catalog Page, Product Details Page, Shopping Cart Page, Checkout Page, Login Page
- Props/Inputs: cartItemCount: number
- Visual Description: A fixed header with logo on left, navigation links in center, cart icon with badge on right. Background is white with subtle shadow.
- API Dependencies: None

**ProductCard**
- Type: Display
- Purpose: Shows a single product's image, name, and price in a grid layout
- Used On: Home Page, Product Catalog Page
- Props/Inputs: product: object (id, name, price, image), onClick: function
- Visual Description: A square card with rounded corners, white background, shadow effect. Displays product image, name, and price in a vertical stack.
- API Dependencies: /api/products

**SearchBar**
- Type: Form
- Purpose: Allows users to search for products by keyword
- Used On: Product Catalog Page
- Props/Inputs: onSearch: function (callback with search term)
- Visual Description: A rounded input field with search icon inside, placed above product grid.
- API Dependencies: /api/products/search

**CategoryFilter**
- Type: Interactive
- Purpose: Lets users filter products by category
- Used On: Product Catalog Page
- Props/Inputs: categories: array of strings, selectedCategory: string, onSelect: function
- Visual Description: A vertical list of category buttons with active state highlighting.
- API Dependencies: /api/categories

**CartItem**
- Type: Display
- Purpose: Shows individual items in the shopping cart with quantity controls
- Used On: Shopping Cart Page
- Props/Inputs: item: object (product, quantity), onUpdateQuantity: function, onRemove: function
- Visual Description: A horizontal card with product image, name, price, quantity selector, and remove button.
- API Dependencies: /api/cart

**CartSummary**
- Type: Display
- Purpose: Shows subtotal, tax, shipping, and total for the cart
- Used On: Shopping Cart Page
- Props/Inputs: subtotal: number, tax: number, shipping: number, total: number
- Visual Description: A summary box with light background and clear breakdown of costs.
- API Dependencies: None

**CheckoutButton**
- Type: Interactive
- Purpose: Triggers the checkout process to Stripe
- Used On: Shopping Cart Page
- Props/Inputs: onClick: function
- Visual Description: A prominent primary button with blue background and white text, centered at bottom of cart summary.
- API Dependencies: /api/checkout

**ShippingForm**
- Type: Form
- Purpose: Collects user's shipping address information
- Used On: Checkout Page
- Props/Inputs: onSubmit: function (callback with form data)
- Visual Description: A form with fields for name, address, city, state, zip code, and country.
- API Dependencies: /api/orders

**PaymentMethod**
- Type: Form
- Purpose: Allows user to select payment method (Stripe)
- Used On: Checkout Page
- Props/Inputs: selectedMethod: string, onSelect: function
- Visual Description: A section with Stripe payment option and credit card form.
- API Dependencies: None

**OrderReview**
- Type: Display
- Purpose: Shows a summary of items and totals before placing order
- Used On: Checkout Page
- Props/Inputs: items: array of cart items, total: number
- Visual Description: A detailed review section showing each item with quantity and price.
- API Dependencies: None

**PlaceOrderButton**
- Type: Interactive
- Purpose: Submits the order to backend for processing
- Used On: Checkout Page
- Props/Inputs: onClick: function
- Visual Description: A large primary button with green background, centered at bottom of checkout form.
- API Dependencies: /api/orders

**LoginForm**
- Type: Form
- Purpose: Allows users to log in with email and password
- Used On: Login Page
- Props/Inputs: onSubmit: function (callback with credentials)
- Visual Description: A centered card with email and password fields, login button, and forgot password link.
- API Dependencies: /api/auth/login

**SignUpLink**
- Type: Navigation
- Purpose: Provides link to sign up page for new users
- Used On: Login Page
- Props/Inputs: onClick: function
- Visual Description: A small text link below the login form that says "Don't have an account? Sign Up".
- API Dependencies: None

**Breadcrumb**
- Type: Navigation
- Purpose: Shows current location in site hierarchy for product details page
- Used On: Product Details Page
- Props/Inputs: path: array of objects (name, url)
- Visual Description: A horizontal line of links with chevron separators.
- API Dependencies: None

**ProductImageGallery**
- Type: Display
- Purpose: Shows multiple images of a product in a gallery layout
- Used On: Product Details Page
- Props/Inputs: images: array of strings, selectedImage: string, onSelect: function
- Visual Description: A main image display area with thumbnail previews below.
- API Dependencies: None

**ProductInfo**
- Type: Display
- Purpose: Shows detailed product information including description and specifications
- Used On: Product Details Page
- Props/Inputs: product: object (name, description, specs)
- Visual Description: A vertical stack of text elements with clear headings for title, description, and specs.
- API Dependencies: None

**AddToCartButton**
- Type: Interactive
- Purpose: Adds current product to shopping cart
- Used On: Product Details Page
- Props/Inputs: onClick: function
- Visual Description: A prominent button with green background and white text, labeled "Add to Cart".
- API Dependencies: /api/cart

### Navigation
- **Type**: Top Nav
- **Entry Point**: /
- **User Flows**:
  - Browse Products: Home Page → Product Catalog Page
  - View Product Details: Product Catalog Page → Product Details Page
  - Checkout Flow: Shopping Cart Page → Checkout Page → Order Confirmation

### Interaction Design
- **Loading States**: Spinner overlay during data fetch operations, skeleton loaders for product cards
- **Empty States**: "No products found" message with search suggestions when search returns no results
- **Error States**: Red toast notification at top of page for failed API calls or checkout errors
- **Success Feedback**: Green confirmation toast when item added to cart or order placed successfully
- **Hover Effects**: Buttons lighten 10% on hover, product cards lift slightly on hover
- **Active/Press Effects**: Buttons depress 2% on press, cart icon pulses when items are added