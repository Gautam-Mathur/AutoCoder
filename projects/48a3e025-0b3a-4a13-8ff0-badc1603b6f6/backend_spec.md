### Context Snapshot
- **Core Goal**: Building a full-stack e-commerce storefront for customers to browse products and complete purchases
- **Key Constraints**: Must use Next.js framework, Stripe for payments, SQLite with Prisma ORM, React Server Components
- **Backend Summary**: 4 entities (User, Product, Cart, Order), 12 REST endpoints, AuthService + ProductService + CartService + OrderService

### Database Design
**User**
- Purpose: Stores registered user accounts
- Fields:
  - id: string (primary key, auto-generated)
  - email: string — user's login email, must be unique
  - passwordHash: string — bcrypt hash of user's password
  - name: string — user's display name
  - stripeCustomerId: string — Stripe customer ID for payment integration
  - createdAt: Date
  - updatedAt: Date
- Relationships:
  - User has many Orders (one-to-many)
  - User has one Cart (one-to-one)

**Product**
- Purpose: Stores product information and inventory details
- Fields:
  - id: string (primary key, auto-generated)
  - name: string — product name
  - description: string — detailed product description
  - price: number — product price in cents
  - imageUrls: string[] — array of product image URLs
  - category: string — product category for filtering
  - inStock: boolean — indicates if product is available
  - stockQuantity: number — number of items available
  - createdAt: Date
  - updatedAt: Date
- Relationships:
  - Product has many CartItems (one-to-many)
  - Product has many OrderItems (one-to-many)

**Cart**
- Purpose: Stores user's selected products before checkout
- Fields:
  - id: string (primary key, auto-generated)
  - userId: string — references User.id
  - createdAt: Date
  - updatedAt: Date
- Relationships:
  - Cart belongs to one User (many-to-one)
  - Cart has many CartItems (one-to-many)

**CartItem**
- Purpose: Links products to user carts with quantities
- Fields:
  - id: string (primary key, auto-generated)
  - cartId: string — references Cart.id
  - productId: string — references Product.id
  - quantity: number — number of items in cart
  - createdAt: Date
  - updatedAt: Date
- Relationships:
  - CartItem belongs to one Cart (many-to-one)
  - CartItem belongs to one Product (many-to-one)

**Order**
- Purpose: Stores completed purchase information
- Fields:
  - id: string (primary key, auto-generated)
  - userId: string — references User.id
  - stripePaymentIntentId: string — Stripe payment intent ID
  - totalAmount: number — total order amount in cents
  - status: string — order status (e.g., "pending", "completed", "failed")
  - shippingAddress: string — customer's shipping address
  - createdAt: Date
  - updatedAt: Date
- Relationships:
  - Order belongs to one User (many-to-one)
  - Order has many OrderItems (one-to-many)

**OrderItem**
- Purpose: Links products to completed orders with quantities
- Fields:
  - id: string (primary key, auto-generated)
  - orderId: string — references Order.id
  - productId: string — references Product.id
  - quantity: number — number of items ordered
  - priceAtTimeOfOrder: number — product price at time of order in cents
  - createdAt: Date
  - updatedAt: Date
- Relationships:
  - OrderItem belongs to one Order (many-to-one)
  - OrderItem belongs to one Product (many-to-one)

### API Endpoints
**POST /api/auth/register** — Create a new user account
- Request Body: email: string, password: string, name: string
- Query Params: None
- Response: { id: string, email: string, name: string, token: string }
- Auth Required: No
- Supports Feature: User Authentication

**POST /api/auth/login** — Authenticate user and generate JWT token
- Request Body: email: string, password: string
- Query Params: None
- Response: { id: string, email: string, name: string, token: string }
- Auth Required: No
- Supports Feature: User Authentication

**GET /api/products** — Get paginated list of products with optional search and category filtering
- Request Body: None
- Query Params: page: number (optional), limit: number (optional), search: string (optional), category: string (optional)
- Response: { products: Product[], total: number }
- Auth Required: No
- Supports Feature: Product Catalog

**GET /api/products/:id** — Get specific product details
- Request Body: None
- Query Params: None
- Response: { product: Product }
- Auth Required: No
- Supports Feature: Product Details Page

**POST /api/cart/add** — Add a product to the user's cart
- Request Body: productId: string, quantity: number
- Query Params: None
- Response: { success: boolean }
- Auth Required: Yes
- Supports Feature: Shopping Cart

**DELETE /api/cart/remove/:itemId** — Remove an item from the user's cart
- Request Body: None
- Query Params: None
- Response: { success: boolean }
- Auth Required: Yes
- Supports Feature: Shopping Cart

**GET /api/cart** — Get all items in the user's cart with product details
- Request Body: None
- Query Params: None
- Response: { items: CartItem[], total: number }
- Auth Required: Yes
- Supports Feature: Shopping Cart

**POST /api/checkout** — Create Stripe checkout session for order processing
- Request Body: None
- Query Params: None
- Response: { sessionId: string, url: string }
- Auth Required: Yes
- Supports Feature: Stripe Checkout Integration

**GET /api/orders** — Get all orders for the current user
- Request Body: None
- Query Params: None
- Response: { orders: Order[] }
- Auth Required: Yes
- Supports Feature: Shopping Cart

**GET /api/orders/:id** — Get specific order details
- Request Body: None
- Query Params: None
- Response: { order: Order }
- Auth Required: Yes
- Supports Feature: Shopping Cart

**POST /api/orders/webhook** — Handle Stripe webhook events for order updates
- Request Body: { event: string, data: object }
- Query Params: None
- Response: { success: boolean }
- Auth Required: No
- Supports Feature: Stripe Checkout Integration

### Backend Services
**AuthService**
- Responsibility: Handles user registration, login, password hashing, and JWT token generation
- Used By APIs: POST /api/auth/register, POST /api/auth/login
- Uses Entities: User

**ProductService**
- Responsibility: Manages product catalog operations including search, filtering, and inventory updates
- Used By APIs: GET /api/products, GET /api/products/:id
- Uses Entities: Product

**CartService**
- Responsibility: Handles cart operations including adding/removing items and calculating totals
- Used By APIs: POST /api/cart/add, DELETE /api/cart/remove/:itemId, GET /api/cart
- Uses Entities: Cart, CartItem, Product

**OrderService**
- Responsibility: Manages order creation, checkout processing, and Stripe webhook handling
- Used By APIs: POST /api/checkout, GET /api/orders, GET /api/orders/:id, POST /api/orders/webhook
- Uses Entities: Order, OrderItem, User, Product

### Middleware
**AuthenticationMiddleware**
- Purpose: Verifies JWT tokens for protected routes and attaches user to request object
- Applies To: All /api/* routes that require authentication

**CorsMiddleware**
- Purpose: Enables cross-origin requests from frontend to backend API
- Applies To: All /api/* routes

No middleware required for this project.