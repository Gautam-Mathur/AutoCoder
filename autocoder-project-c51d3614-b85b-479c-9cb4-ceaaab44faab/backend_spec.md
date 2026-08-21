### Context Snapshot
- **Core Goal**: Building a full-stack e-commerce storefront for customers to browse products and complete purchases
- **Key Constraints**: Must use Next.js framework, Stripe for payments, SQLite with Prisma ORM, Plain HTML/CSS/JS for frontend components
- **Backend Summary**: 4 entities (Product, CartItem, Order, User), 12 REST endpoints, AuthService + ProductService + CartService + OrderService

### Database Design
**User**
- Purpose: Stores registered user accounts
- Fields:
  - id: string (primary key, auto-generated)
  - email: string — user's login email, must be unique
  - passwordHash: string — bcrypt hash of user's password
  - name: string — user's display name
  - createdAt: Date
  - updatedAt: Date
- Relationships:
  - User has many Orders (one-to-many)

**Product**
- Purpose: Stores product information for the catalog
- Fields:
  - id: string (primary key, auto-generated)
  - name: string — product name
  - description: string — detailed product description
  - price: number — product price in cents
  - category: string — product category for filtering
  - imageUrl: string — URL to product image
  - stockQuantity: number — available inventory count
  - createdAt: Date
  - updatedAt: Date
- Relationships:
  - Product has many CartItems (one-to-many)
  - Product has many OrderItems (one-to-many)

**CartItem**
- Purpose: Represents items in a user's shopping cart
- Fields:
  - id: string (primary key, auto-generated)
  - userId: string — references User.id
  - productId: string — references Product.id
  - quantity: number — number of items in cart
  - createdAt: Date
  - updatedAt: Date
- Relationships:
  - CartItem belongs to User (many-to-one)
  - CartItem belongs to Product (many-to-one)

**Order**
- Purpose: Stores completed purchase orders
- Fields:
  - id: string (primary key, auto-generated)
  - userId: string — references User.id
  - stripePaymentIntentId: string — Stripe payment intent ID
  - totalAmount: number — order total in cents
  - status: string — order status (e.g., "pending", "completed", "cancelled")
  - shippingAddress: string — customer's shipping address
  - createdAt: Date
  - updatedAt: Date
- Relationships:
  - Order belongs to User (many-to-one)
  - Order has many OrderItems (one-to-many)

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

**GET /api/products** — Get paginated product catalog
- Request Body: None
- Query Params: page: number (optional), limit: number (optional), category: string (optional), search: string (optional)
- Response: { products: Product[], total: number }
- Auth Required: No
- Supports Feature: Product Catalog

**GET /api/products/:id** — Get specific product details
- Request Body: None
- Query Params: None
- Response: { product: Product }
- Auth Required: No
- Supports Feature: Product Details Page

**POST /api/cart/items** — Add item to user's cart
- Request Body: productId: string, quantity: number
- Query Params: None
- Response: { id: string, userId: string, productId: string, quantity: number }
- Auth Required: Yes
- Supports Feature: Shopping Cart

**GET /api/cart/items** — Get all items in user's cart
- Request Body: None
- Query Params: None
- Response: { items: CartItem[], totalItems: number, totalPrice: number }
- Auth Required: Yes
- Supports Feature: Shopping Cart

**DELETE /api/cart/items/:id** — Remove item from user's cart
- Request Body: None
- Query Params: None
- Response: { message: string }
- Auth Required: Yes
- Supports Feature: Shopping Cart

**POST /api/orders** — Create a new order from cart items
- Request Body: shippingAddress: string, stripePaymentIntentId: string
- Query Params: None
- Response: { id: string, userId: string, stripePaymentIntentId: string, totalAmount: number, status: string }
- Auth Required: Yes
- Supports Feature: Stripe Checkout Integration

**GET /api/orders** — Get all orders for current user
- Request Body: None
- Query Params: None
- Response: { orders: Order[] }
- Auth Required: Yes
- Supports Feature: Stripe Checkout Integration

**GET /api/orders/:id** — Get specific order details
- Request Body: None
- Query Params: None
- Response: { order: Order }
- Auth Required: Yes
- Supports Feature: Stripe Checkout Integration

**DELETE /api/orders/:id** — Cancel an order (if pending)
- Request Body: None
- Query Params: None
- Response: { message: string }
- Auth Required: Yes
- Supports Feature: Stripe Checkout Integration

### Backend Services
**AuthService**
- Responsibility: Handles user registration, login, password hashing, and JWT token generation
- Used By APIs: POST /api/auth/register, POST /api/auth/login
- Uses Entities: User

**ProductService**
- Responsibility: Manages product catalog operations including search, filtering, and retrieval
- Used By APIs: GET /api/products, GET /api/products/:id
- Uses Entities: Product

**CartService**
- Responsibility: Handles cart item management for authenticated users
- Used By APIs: POST /api/cart/items, GET /api/cart/items, DELETE /api/cart/items/:id
- Uses Entities: CartItem, Product, User

**OrderService**
- Responsibility: Processes order creation, retrieval, and status updates using Stripe integration
- Used By APIs: POST /api/orders, GET /api/orders, GET /api/orders/:id, DELETE /api/orders/:id
- Uses Entities: Order, CartItem, User, Product

### Middleware
**AuthenticationMiddleware**
- Purpose: Verifies JWT tokens for protected routes and attaches user info to request object
- Applies To: All /api/* routes except auth endpoints

**CORSMiddleware**
- Purpose: Enables cross-origin requests from frontend to backend API
- Applies To: All /api/* routes

No middleware required for this project.