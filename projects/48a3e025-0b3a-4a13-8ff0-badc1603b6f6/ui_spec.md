### Context Snapshot
- **Core Goal**: Building a full-stack e-commerce storefront for customers to browse products and complete purchases
- **Key Constraints**: Must use Next.js framework, Stripe for payments, SQLite with Prisma ORM
- **UI Summary**: 6 pages (Home, Product Catalog, Product Details, Shopping Cart, Checkout, Login), 12 components (Header, ProductCard, SearchBar, CartItem, CheckoutForm, etc.), modern e-commerce design with clean typography and intuitive navigation

### Design System
- **Style**: Modern Flat
- **Primary Color**: #3B82F6 (Blue)
- **Secondary Color**: #10B981 (Emerald)
- **Background Color**: #FFFFFF
- **Text Color**: #1F2937
- **Accent Color**: #F59E0B (Amber)
- **Font Family**: "Inter, system-ui, sans-serif"
- **Font Sizes**: "14px body, 18px headings, 24px title"
- **Spacing Unit**: 8px base grid
- **Border Radius**: 8px for cards, 4px for buttons
- **Responsive Strategy**: Mobile-first. Single column on mobile, two columns on tablet, three columns on desktop

### Pages
**Home Page**
- Route: /
- Purpose: User browses featured products and categories on the homepage
- Supports Features: Product Catalog, Search Functionality, Category Filtering
- Layout: Header + Hero Banner + Featured Products Grid + Categories Section
- Components Used: Header, ProductCard, SearchBar, CategoryFilter

**Product Catalog Page**
- Route: /products
- Purpose: User views all products in a searchable and filterable grid
- Supports Features: Product Catalog, Search Functionality, Category Filtering
- Layout: Header + Search Bar + Filter Sidebar + Products Grid
- Components Used: Header, ProductCard, SearchBar, CategoryFilter, SortSelector

**Product Details Page**
- Route: /products/[id]
- Purpose: User views detailed information about a specific product
- Supports Features: Product Details Page, Shopping Cart
- Layout: Header + Product Image Gallery + Product Info + Add to Cart Button
- Components Used: Header, ProductImageGallery, ProductInfo, AddToCartButton

**Shopping Cart Page**
- Route: /cart
- Purpose: User reviews items in cart and proceeds to checkout
- Supports Features: Shopping Cart
- Layout: Header + Cart Items List + Order Summary + Checkout Button
- Components Used: Header, CartItem, CartSummary, CheckoutButton

**Checkout Page**
- Route: /checkout
- Purpose: User enters payment details and completes purchase
- Supports Features: Stripe Checkout Integration
- Layout: Header + Payment Form + Order Review + Submit Button
- Components Used: Header, CheckoutForm, OrderReview, SubmitButton

**Login Page**
- Route: /login
- Purpose: User authenticates to access account features
- Supports Features: User Authentication
- Layout: Header + Login Form + Sign Up Link
- Components Used: Header, LoginForm, SignUpLink

### Components
**Header**
- Type: Navigation
- Purpose: Provides site navigation and user actions
- Used On: All Pages
- Props/Inputs: isLoggedIn: boolean, cartItemCount: number
- Visual Description: A fixed top bar with logo on left, navigation links in center, and cart/user icons on right. Uses primary color for active states.
- API Dependencies: None

**ProductCard**
- Type: Display
- Purpose: Shows product information in a compact card format
- Used On: Home Page, Product Catalog Page
- Props/Inputs: product: object (id, name, price, image), onClick: function
- Visual Description: A rectangular card with product image, name, and price. Includes hover effect that darkens the image.
- API Dependencies: /api/products

**SearchBar**
- Type: Form
- Purpose: Allows users to search for products by keyword
- Used On: Home Page, Product Catalog Page
- Props/Inputs: onSearch: function, placeholder: string
- Visual Description: A rounded input field with search icon. Includes clear button.
- API Dependencies: /api/products/search

**CategoryFilter**
- Type: Interactive
- Purpose: Filters products by category
- Used On: Product Catalog Page
- Props/Inputs: categories: array, selectedCategory: string, onChange: function
- Visual Description: A vertical list of category buttons with active state highlighting. Responsive to screen size.
- API Dependencies: /api/categories

**CartItem**
- Type: Display
- Purpose: Shows individual item in shopping cart
- Used On: Shopping Cart Page
- Props/Inputs: item: object (product, quantity), onUpdateQuantity: function, onRemove: function
- Visual Description: A row with product image, name, price, quantity selector, and remove button. Uses subtle hover effect.
- API Dependencies: None

**CheckoutForm**
- Type: Form
- Purpose: Collects user payment information
- Used On: Checkout Page
- Props/Inputs: onSubmit: function, loading: boolean
- Visual Description: A form with fields for name, email, address, and card details. Includes validation states.
- API Dependencies: /api/stripe/checkout

**OrderReview**
- Type: Display
- Purpose: Shows order summary before checkout
- Used On: Checkout Page
- Props/Inputs: items: array, total: number
- Visual Description: A summary section with product list, subtotal, tax, and total. Clean typography.
- API Dependencies: None

**AddToCartButton**
- Type: Interactive
- Purpose: Adds product to shopping cart
- Used On: Product Details Page
- Props/Inputs: productId: string, onClick: function
- Visual Description: A prominent button with cart icon and "Add to Cart" text. Changes to "Added" state after click.
- API Dependencies: /api/cart/add

**SortSelector**
- Type: Interactive
- Purpose: Allows users to sort products by different criteria
- Used On: Product Catalog Page
- Props/Inputs: options: array, value: string, onChange: function
- Visual Description: A dropdown menu with sorting options. Uses primary color for selected option.
- API Dependencies: None

**SubmitButton**
- Type: Interactive
- Purpose: Submits checkout form
- Used On: Checkout Page
- Props/Inputs: loading: boolean, onClick: function
- Visual Description: A large primary button with loading spinner. Changes to success state after submission.
- API Dependencies: /api/stripe/checkout

**LoginForm**
- Type: Form
- Purpose: Allows users to log in
- Used On: Login Page
- Props/Inputs: onSubmit: function, error: string
- Visual Description: A centered card with email and password fields. Includes forgot password link.
- API Dependencies: /api/auth/login

**SignUpLink**
- Type: Navigation
- Purpose: Provides link to sign up page
- Used On: Login Page
- Props/Inputs: onClick: function
- Visual Description: A text link styled in primary color. Appears below login form.
- API Dependencies: None

### Navigation
- **Type**: Top Nav
- **Entry Point**: /
- **User Flows**:
  - Browse Products: Home Page → Product Catalog Page → Product Details Page
  - Shop and Checkout: Product Catalog Page → Product Details Page → Shopping Cart Page → Checkout Page
  - Account Access: Login Page → Dashboard (not implemented in scope)

### Interaction Design
- **Loading States**: Spinner overlay on data fetch, skeleton loaders for product cards
- **Empty States**: "No products found" message with search suggestions, empty cart with call-to-action
- **Error States**: Red error messages below form fields, toast notifications for API errors
- **Success Feedback**: Green confirmation messages, cart item count updates immediately, success toast after checkout
- **Hover Effects**: Buttons darken 10%, product cards lift slightly on hover
- **Active/Press Effects**: Buttons depress 2% on press, cart items highlight on interaction