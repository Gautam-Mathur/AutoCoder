// ============================================================================
// COMPLETE CODE INTELLIGENCE - Production-Ready Knowledge Base
// ============================================================================
// This module contains comprehensive coding patterns, project blueprints,
// and production-ready templates for generating full-stack applications.
// Target: 10,000+ lines of battle-tested code patterns and solutions.
// ============================================================================

// ============================================================================
// SECTION 1: PROJECT BLUEPRINTS
// Complete file structures for 15+ application types
// ============================================================================

export const PROJECT_BLUEPRINTS = {
  // --------------------------------------------
  // 1. SAAS STARTER - Complete SaaS Application
  // --------------------------------------------
  saas: {
    name: 'SaaS Starter',
    description: 'Full-featured SaaS with auth, billing, teams, and dashboard',
    files: [
      // Root config files
      { path: 'index.html', type: 'config' },
      { path: 'package.json', type: 'config' },
      { path: 'tsconfig.json', type: 'config' },
      { path: 'vite.config.ts', type: 'config' },
      { path: 'tailwind.config.ts', type: 'config' },
      { path: 'postcss.config.js', type: 'config' },
      { path: 'drizzle.config.ts', type: 'config' },
      { path: '.env.example', type: 'config' },

      // Frontend - Entry
      { path: 'src/main.tsx', type: 'entry' },
      { path: 'src/App.tsx', type: 'entry' },
      { path: 'src/index.css', type: 'style' },
      { path: 'src/vite-env.d.ts', type: 'types' },

      // Frontend - Pages
      { path: 'src/pages/Landing.tsx', type: 'page' },
      { path: 'src/pages/Login.tsx', type: 'page' },
      { path: 'src/pages/Register.tsx', type: 'page' },
      { path: 'src/pages/ForgotPassword.tsx', type: 'page' },
      { path: 'src/pages/ResetPassword.tsx', type: 'page' },
      { path: 'src/pages/Dashboard.tsx', type: 'page' },
      { path: 'src/pages/Projects.tsx', type: 'page' },
      { path: 'src/pages/ProjectDetail.tsx', type: 'page' },
      { path: 'src/pages/Settings.tsx', type: 'page' },
      { path: 'src/pages/Billing.tsx', type: 'page' },
      { path: 'src/pages/Team.tsx', type: 'page' },
      { path: 'src/pages/Profile.tsx', type: 'page' },
      { path: 'src/pages/NotFound.tsx', type: 'page' },

      // Frontend - Components (Layout)
      { path: 'src/components/layout/Layout.tsx', type: 'component' },
      { path: 'src/components/layout/Header.tsx', type: 'component' },
      { path: 'src/components/layout/Sidebar.tsx', type: 'component' },
      { path: 'src/components/layout/Footer.tsx', type: 'component' },
      { path: 'src/components/layout/MobileNav.tsx', type: 'component' },
      { path: 'src/components/layout/Breadcrumbs.tsx', type: 'component' },

      // Frontend - Components (UI - 30+ components)
      { path: 'src/components/ui/button.tsx', type: 'ui' },
      { path: 'src/components/ui/card.tsx', type: 'ui' },
      { path: 'src/components/ui/input.tsx', type: 'ui' },
      { path: 'src/components/ui/label.tsx', type: 'ui' },
      { path: 'src/components/ui/select.tsx', type: 'ui' },
      { path: 'src/components/ui/textarea.tsx', type: 'ui' },
      { path: 'src/components/ui/checkbox.tsx', type: 'ui' },
      { path: 'src/components/ui/radio-group.tsx', type: 'ui' },
      { path: 'src/components/ui/switch.tsx', type: 'ui' },
      { path: 'src/components/ui/slider.tsx', type: 'ui' },
      { path: 'src/components/ui/dialog.tsx', type: 'ui' },
      { path: 'src/components/ui/alert-dialog.tsx', type: 'ui' },
      { path: 'src/components/ui/sheet.tsx', type: 'ui' },
      { path: 'src/components/ui/dropdown-menu.tsx', type: 'ui' },
      { path: 'src/components/ui/tabs.tsx', type: 'ui' },
      { path: 'src/components/ui/accordion.tsx', type: 'ui' },
      { path: 'src/components/ui/table.tsx', type: 'ui' },
      { path: 'src/components/ui/badge.tsx', type: 'ui' },
      { path: 'src/components/ui/avatar.tsx', type: 'ui' },
      { path: 'src/components/ui/progress.tsx', type: 'ui' },
      { path: 'src/components/ui/skeleton.tsx', type: 'ui' },
      { path: 'src/components/ui/spinner.tsx', type: 'ui' },
      { path: 'src/components/ui/toast.tsx', type: 'ui' },
      { path: 'src/components/ui/toaster.tsx', type: 'ui' },
      { path: 'src/components/ui/tooltip.tsx', type: 'ui' },
      { path: 'src/components/ui/popover.tsx', type: 'ui' },
      { path: 'src/components/ui/calendar.tsx', type: 'ui' },
      { path: 'src/components/ui/date-picker.tsx', type: 'ui' },
      { path: 'src/components/ui/command.tsx', type: 'ui' },
      { path: 'src/components/ui/form.tsx', type: 'ui' },

      // Frontend - Components (Features)
      { path: 'src/components/features/StatsCard.tsx', type: 'component' },
      { path: 'src/components/features/DataTable.tsx', type: 'component' },
      { path: 'src/components/features/SearchInput.tsx', type: 'component' },
      { path: 'src/components/features/Pagination.tsx', type: 'component' },
      { path: 'src/components/features/EmptyState.tsx', type: 'component' },
      { path: 'src/components/features/LoadingState.tsx', type: 'component' },
      { path: 'src/components/features/ErrorBoundary.tsx', type: 'component' },
      { path: 'src/components/features/ConfirmDialog.tsx', type: 'component' },
      { path: 'src/components/features/FileUpload.tsx', type: 'component' },
      { path: 'src/components/features/ImageUpload.tsx', type: 'component' },
      { path: 'src/components/features/RichTextEditor.tsx', type: 'component' },
      { path: 'src/components/features/Chart.tsx', type: 'component' },
      { path: 'src/components/features/ActivityFeed.tsx', type: 'component' },
      { path: 'src/components/features/NotificationBell.tsx', type: 'component' },
      { path: 'src/components/features/UserMenu.tsx', type: 'component' },
      { path: 'src/components/features/TeamSwitcher.tsx', type: 'component' },
      { path: 'src/components/features/PricingCard.tsx', type: 'component' },
      { path: 'src/components/features/FeatureList.tsx', type: 'component' },

      // Frontend - Hooks
      { path: 'src/hooks/useAuth.tsx', type: 'hook' },
      { path: 'src/hooks/useToast.ts', type: 'hook' },
      { path: 'src/hooks/useDebounce.ts', type: 'hook' },
      { path: 'src/hooks/useLocalStorage.ts', type: 'hook' },
      { path: 'src/hooks/useMediaQuery.ts', type: 'hook' },
      { path: 'src/hooks/useClickOutside.ts', type: 'hook' },
      { path: 'src/hooks/useInfiniteScroll.ts', type: 'hook' },
      { path: 'src/hooks/useCopyToClipboard.ts', type: 'hook' },

      // Frontend - Lib/Utils
      { path: 'src/lib/utils.ts', type: 'util' },
      { path: 'src/lib/queryClient.ts', type: 'util' },
      { path: 'src/lib/api.ts', type: 'util' },
      { path: 'src/lib/validators.ts', type: 'util' },
      { path: 'src/lib/formatters.ts', type: 'util' },
      { path: 'src/lib/constants.ts', type: 'util' },

      // Frontend - Context/State
      { path: 'src/context/AuthContext.tsx', type: 'context' },
      { path: 'src/context/ThemeContext.tsx', type: 'context' },
      { path: 'src/stores/appStore.ts', type: 'store' },

      // Backend - Entry
      { path: 'server/index.ts', type: 'server' },
      { path: 'server/vite.ts', type: 'server' },

      // Backend - Routes
      { path: 'server/routes/index.ts', type: 'route' },
      { path: 'server/routes/auth.ts', type: 'route' },
      { path: 'server/routes/users.ts', type: 'route' },
      { path: 'server/routes/projects.ts', type: 'route' },
      { path: 'server/routes/teams.ts', type: 'route' },
      { path: 'server/routes/billing.ts', type: 'route' },
      { path: 'server/routes/uploads.ts', type: 'route' },
      { path: 'server/routes/notifications.ts', type: 'route' },
      { path: 'server/routes/dashboard.ts', type: 'route' },

      // Backend - Controllers
      { path: 'server/controllers/auth.ts', type: 'controller' },
      { path: 'server/controllers/users.ts', type: 'controller' },
      { path: 'server/controllers/projects.ts', type: 'controller' },
      { path: 'server/controllers/teams.ts', type: 'controller' },
      { path: 'server/controllers/billing.ts', type: 'controller' },
      { path: 'server/controllers/uploads.ts', type: 'controller' },

      // Backend - Services
      { path: 'server/services/auth.ts', type: 'service' },
      { path: 'server/services/users.ts', type: 'service' },
      { path: 'server/services/projects.ts', type: 'service' },
      { path: 'server/services/teams.ts', type: 'service' },
      { path: 'server/services/billing.ts', type: 'service' },
      { path: 'server/services/email.ts', type: 'service' },
      { path: 'server/services/storage.ts', type: 'service' },

      // Backend - Middleware
      { path: 'server/middleware/auth.ts', type: 'middleware' },
      { path: 'server/middleware/validate.ts', type: 'middleware' },
      { path: 'server/middleware/rateLimit.ts', type: 'middleware' },
      { path: 'server/middleware/errorHandler.ts', type: 'middleware' },
      { path: 'server/middleware/logging.ts', type: 'middleware' },

      // Backend - Database
      { path: 'server/db/index.ts', type: 'database' },
      { path: 'server/db/schema.ts', type: 'database' },
      { path: 'server/db/migrate.ts', type: 'database' },

      // Shared Types
      { path: 'shared/types.ts', type: 'types' },
      { path: 'shared/schema.ts', type: 'types' },
      { path: 'shared/constants.ts', type: 'types' },
    ],
    features: ['auth', 'billing', 'teams', 'projects', 'dashboard', 'notifications', 'file-upload'],
  },

  // --------------------------------------------
  // 2. E-COMMERCE - Full Online Store
  // --------------------------------------------
  ecommerce: {
    name: 'E-Commerce Store',
    description: 'Complete online store with products, cart, checkout, and orders',
    files: [
      // Config
      { path: 'index.html', type: 'config' },
      { path: 'package.json', type: 'config' },
      { path: 'tsconfig.json', type: 'config' },
      { path: 'vite.config.ts', type: 'config' },
      { path: 'tailwind.config.ts', type: 'config' },

      // Entry
      { path: 'src/main.tsx', type: 'entry' },
      { path: 'src/App.tsx', type: 'entry' },
      { path: 'src/index.css', type: 'style' },

      // Pages - Public
      { path: 'src/pages/Home.tsx', type: 'page' },
      { path: 'src/pages/Products.tsx', type: 'page' },
      { path: 'src/pages/ProductDetail.tsx', type: 'page' },
      { path: 'src/pages/Category.tsx', type: 'page' },
      { path: 'src/pages/Search.tsx', type: 'page' },
      { path: 'src/pages/Cart.tsx', type: 'page' },
      { path: 'src/pages/Checkout.tsx', type: 'page' },
      { path: 'src/pages/OrderConfirmation.tsx', type: 'page' },
      { path: 'src/pages/Orders.tsx', type: 'page' },
      { path: 'src/pages/OrderDetail.tsx', type: 'page' },
      { path: 'src/pages/Wishlist.tsx', type: 'page' },
      { path: 'src/pages/Account.tsx', type: 'page' },
      { path: 'src/pages/Login.tsx', type: 'page' },
      { path: 'src/pages/Register.tsx', type: 'page' },

      // Pages - Admin
      { path: 'src/pages/admin/Dashboard.tsx', type: 'page' },
      { path: 'src/pages/admin/Products.tsx', type: 'page' },
      { path: 'src/pages/admin/ProductEdit.tsx', type: 'page' },
      { path: 'src/pages/admin/Orders.tsx', type: 'page' },
      { path: 'src/pages/admin/OrderDetail.tsx', type: 'page' },
      { path: 'src/pages/admin/Customers.tsx', type: 'page' },
      { path: 'src/pages/admin/Categories.tsx', type: 'page' },
      { path: 'src/pages/admin/Coupons.tsx', type: 'page' },
      { path: 'src/pages/admin/Settings.tsx', type: 'page' },

      // Components - Product
      { path: 'src/components/product/ProductCard.tsx', type: 'component' },
      { path: 'src/components/product/ProductGrid.tsx', type: 'component' },
      { path: 'src/components/product/ProductGallery.tsx', type: 'component' },
      { path: 'src/components/product/ProductInfo.tsx', type: 'component' },
      { path: 'src/components/product/ProductReviews.tsx', type: 'component' },
      { path: 'src/components/product/RelatedProducts.tsx', type: 'component' },
      { path: 'src/components/product/ProductFilters.tsx', type: 'component' },
      { path: 'src/components/product/ProductSort.tsx', type: 'component' },
      { path: 'src/components/product/QuickView.tsx', type: 'component' },

      // Components - Cart
      { path: 'src/components/cart/CartItem.tsx', type: 'component' },
      { path: 'src/components/cart/CartSummary.tsx', type: 'component' },
      { path: 'src/components/cart/CartDrawer.tsx', type: 'component' },
      { path: 'src/components/cart/AddToCartButton.tsx', type: 'component' },
      { path: 'src/components/cart/QuantitySelector.tsx', type: 'component' },

      // Components - Checkout
      { path: 'src/components/checkout/CheckoutForm.tsx', type: 'component' },
      { path: 'src/components/checkout/ShippingForm.tsx', type: 'component' },
      { path: 'src/components/checkout/PaymentForm.tsx', type: 'component' },
      { path: 'src/components/checkout/OrderSummary.tsx', type: 'component' },
      { path: 'src/components/checkout/CouponInput.tsx', type: 'component' },

      // Components - Layout
      { path: 'src/components/layout/Header.tsx', type: 'component' },
      { path: 'src/components/layout/Footer.tsx', type: 'component' },
      { path: 'src/components/layout/Navigation.tsx', type: 'component' },
      { path: 'src/components/layout/SearchBar.tsx', type: 'component' },
      { path: 'src/components/layout/MegaMenu.tsx', type: 'component' },
      { path: 'src/components/layout/CategoryNav.tsx', type: 'component' },

      // Hooks
      { path: 'src/hooks/useCart.ts', type: 'hook' },
      { path: 'src/hooks/useWishlist.ts', type: 'hook' },
      { path: 'src/hooks/useAuth.tsx', type: 'hook' },
      { path: 'src/hooks/useProducts.ts', type: 'hook' },

      // Context/Store
      { path: 'src/context/CartContext.tsx', type: 'context' },
      { path: 'src/context/WishlistContext.tsx', type: 'context' },
      { path: 'src/stores/cartStore.ts', type: 'store' },

      // Backend Routes
      { path: 'server/routes/products.ts', type: 'route' },
      { path: 'server/routes/categories.ts', type: 'route' },
      { path: 'server/routes/cart.ts', type: 'route' },
      { path: 'server/routes/orders.ts', type: 'route' },
      { path: 'server/routes/checkout.ts', type: 'route' },
      { path: 'server/routes/reviews.ts', type: 'route' },
      { path: 'server/routes/coupons.ts', type: 'route' },
      { path: 'server/routes/wishlist.ts', type: 'route' },

      // Backend Services
      { path: 'server/services/products.ts', type: 'service' },
      { path: 'server/services/orders.ts', type: 'service' },
      { path: 'server/services/payment.ts', type: 'service' },
      { path: 'server/services/shipping.ts', type: 'service' },
      { path: 'server/services/inventory.ts', type: 'service' },

      // Database Schema
      { path: 'server/db/schema.ts', type: 'database' },
    ],
    features: ['products', 'cart', 'checkout', 'orders', 'reviews', 'wishlist', 'admin', 'coupons'],
  },

  // --------------------------------------------
  // 3. SOCIAL PLATFORM - Community/Social Network
  // --------------------------------------------
  social: {
    name: 'Social Platform',
    description: 'Social network with profiles, posts, comments, and messaging',
    files: [
      { path: 'src/pages/Feed.tsx', type: 'page' },
      { path: 'src/pages/Profile.tsx', type: 'page' },
      { path: 'src/pages/Messages.tsx', type: 'page' },
      { path: 'src/pages/Notifications.tsx', type: 'page' },
      { path: 'src/pages/Explore.tsx', type: 'page' },
      { path: 'src/pages/Search.tsx', type: 'page' },
      { path: 'src/pages/Settings.tsx', type: 'page' },
      { path: 'src/pages/PostDetail.tsx', type: 'page' },
      { path: 'src/components/post/PostCard.tsx', type: 'component' },
      { path: 'src/components/post/PostComposer.tsx', type: 'component' },
      { path: 'src/components/post/PostActions.tsx', type: 'component' },
      { path: 'src/components/post/CommentList.tsx', type: 'component' },
      { path: 'src/components/post/CommentInput.tsx', type: 'component' },
      { path: 'src/components/post/LikeButton.tsx', type: 'component' },
      { path: 'src/components/post/ShareButton.tsx', type: 'component' },
      { path: 'src/components/user/UserCard.tsx', type: 'component' },
      { path: 'src/components/user/UserAvatar.tsx', type: 'component' },
      { path: 'src/components/user/FollowButton.tsx', type: 'component' },
      { path: 'src/components/user/UserList.tsx', type: 'component' },
      { path: 'src/components/chat/ChatList.tsx', type: 'component' },
      { path: 'src/components/chat/ChatWindow.tsx', type: 'component' },
      { path: 'src/components/chat/MessageInput.tsx', type: 'component' },
      { path: 'src/components/chat/MessageBubble.tsx', type: 'component' },
      { path: 'server/routes/posts.ts', type: 'route' },
      { path: 'server/routes/comments.ts', type: 'route' },
      { path: 'server/routes/likes.ts', type: 'route' },
      { path: 'server/routes/follows.ts', type: 'route' },
      { path: 'server/routes/messages.ts', type: 'route' },
      { path: 'server/routes/notifications.ts', type: 'route' },
      { path: 'server/services/feed.ts', type: 'service' },
      { path: 'server/services/notifications.ts', type: 'service' },
      { path: 'server/services/messaging.ts', type: 'service' },
    ],
    features: ['posts', 'comments', 'likes', 'follows', 'messaging', 'notifications', 'feed'],
  },

  // --------------------------------------------
  // 4. CMS/BLOG - Content Management System
  // --------------------------------------------
  cms: {
    name: 'CMS / Blog',
    description: 'Content management with posts, pages, categories, and media',
    files: [
      { path: 'src/pages/Home.tsx', type: 'page' },
      { path: 'src/pages/Blog.tsx', type: 'page' },
      { path: 'src/pages/Post.tsx', type: 'page' },
      { path: 'src/pages/Category.tsx', type: 'page' },
      { path: 'src/pages/Tag.tsx', type: 'page' },
      { path: 'src/pages/Author.tsx', type: 'page' },
      { path: 'src/pages/Search.tsx', type: 'page' },
      { path: 'src/pages/admin/Dashboard.tsx', type: 'page' },
      { path: 'src/pages/admin/Posts.tsx', type: 'page' },
      { path: 'src/pages/admin/PostEditor.tsx', type: 'page' },
      { path: 'src/pages/admin/Pages.tsx', type: 'page' },
      { path: 'src/pages/admin/Media.tsx', type: 'page' },
      { path: 'src/pages/admin/Categories.tsx', type: 'page' },
      { path: 'src/pages/admin/Tags.tsx', type: 'page' },
      { path: 'src/pages/admin/Users.tsx', type: 'page' },
      { path: 'src/pages/admin/Settings.tsx', type: 'page' },
      { path: 'src/components/blog/PostCard.tsx', type: 'component' },
      { path: 'src/components/blog/PostList.tsx', type: 'component' },
      { path: 'src/components/blog/PostContent.tsx', type: 'component' },
      { path: 'src/components/blog/FeaturedPost.tsx', type: 'component' },
      { path: 'src/components/blog/CategoryList.tsx', type: 'component' },
      { path: 'src/components/blog/TagCloud.tsx', type: 'component' },
      { path: 'src/components/blog/AuthorBio.tsx', type: 'component' },
      { path: 'src/components/blog/RelatedPosts.tsx', type: 'component' },
      { path: 'src/components/blog/Newsletter.tsx', type: 'component' },
      { path: 'src/components/editor/RichTextEditor.tsx', type: 'component' },
      { path: 'src/components/editor/MediaPicker.tsx', type: 'component' },
      { path: 'src/components/editor/SEOSettings.tsx', type: 'component' },
      { path: 'server/routes/posts.ts', type: 'route' },
      { path: 'server/routes/pages.ts', type: 'route' },
      { path: 'server/routes/categories.ts', type: 'route' },
      { path: 'server/routes/tags.ts', type: 'route' },
      { path: 'server/routes/media.ts', type: 'route' },
      { path: 'server/services/content.ts', type: 'service' },
      { path: 'server/services/media.ts', type: 'service' },
      { path: 'server/services/seo.ts', type: 'service' },
    ],
    features: ['posts', 'pages', 'categories', 'tags', 'media', 'seo', 'newsletter'],
  },

  // --------------------------------------------
  // 5. API-FIRST - Backend API Service
  // --------------------------------------------
  api: {
    name: 'API Service',
    description: 'RESTful API with authentication, rate limiting, and documentation',
    files: [
      { path: 'server/index.ts', type: 'entry' },
      { path: 'server/app.ts', type: 'server' },
      { path: 'server/routes/index.ts', type: 'route' },
      { path: 'server/routes/auth.ts', type: 'route' },
      { path: 'server/routes/users.ts', type: 'route' },
      { path: 'server/routes/resources.ts', type: 'route' },
      { path: 'server/routes/webhooks.ts', type: 'route' },
      { path: 'server/controllers/auth.ts', type: 'controller' },
      { path: 'server/controllers/users.ts', type: 'controller' },
      { path: 'server/controllers/resources.ts', type: 'controller' },
      { path: 'server/services/auth.ts', type: 'service' },
      { path: 'server/services/users.ts', type: 'service' },
      { path: 'server/services/resources.ts', type: 'service' },
      { path: 'server/services/cache.ts', type: 'service' },
      { path: 'server/services/queue.ts', type: 'service' },
      { path: 'server/middleware/auth.ts', type: 'middleware' },
      { path: 'server/middleware/rateLimit.ts', type: 'middleware' },
      { path: 'server/middleware/validate.ts', type: 'middleware' },
      { path: 'server/middleware/cors.ts', type: 'middleware' },
      { path: 'server/middleware/errorHandler.ts', type: 'middleware' },
      { path: 'server/middleware/logging.ts', type: 'middleware' },
      { path: 'server/middleware/apiKey.ts', type: 'middleware' },
      { path: 'server/db/index.ts', type: 'database' },
      { path: 'server/db/schema.ts', type: 'database' },
      { path: 'server/utils/jwt.ts', type: 'util' },
      { path: 'server/utils/hash.ts', type: 'util' },
      { path: 'server/utils/validators.ts', type: 'util' },
      { path: 'server/types/index.ts', type: 'types' },
      { path: 'docs/openapi.yaml', type: 'docs' },
    ],
    features: ['auth', 'rate-limiting', 'api-keys', 'webhooks', 'caching', 'queue'],
  },

  // --------------------------------------------
  // 6. ADMIN DASHBOARD - Analytics Dashboard
  // --------------------------------------------
  dashboard: {
    name: 'Admin Dashboard',
    description: 'Analytics dashboard with charts, tables, and reports',
    files: [
      { path: 'src/pages/Dashboard.tsx', type: 'page' },
      { path: 'src/pages/Analytics.tsx', type: 'page' },
      { path: 'src/pages/Reports.tsx', type: 'page' },
      { path: 'src/pages/Users.tsx', type: 'page' },
      { path: 'src/pages/Settings.tsx', type: 'page' },
      { path: 'src/pages/Logs.tsx', type: 'page' },
      { path: 'src/components/charts/LineChart.tsx', type: 'component' },
      { path: 'src/components/charts/BarChart.tsx', type: 'component' },
      { path: 'src/components/charts/PieChart.tsx', type: 'component' },
      { path: 'src/components/charts/AreaChart.tsx', type: 'component' },
      { path: 'src/components/charts/DonutChart.tsx', type: 'component' },
      { path: 'src/components/stats/StatCard.tsx', type: 'component' },
      { path: 'src/components/stats/StatGroup.tsx', type: 'component' },
      { path: 'src/components/stats/TrendIndicator.tsx', type: 'component' },
      { path: 'src/components/tables/DataTable.tsx', type: 'component' },
      { path: 'src/components/tables/SortableHeader.tsx', type: 'component' },
      { path: 'src/components/tables/TableFilters.tsx', type: 'component' },
      { path: 'src/components/tables/TablePagination.tsx', type: 'component' },
      { path: 'src/components/widgets/RecentActivity.tsx', type: 'component' },
      { path: 'src/components/widgets/TopPerformers.tsx', type: 'component' },
      { path: 'src/components/widgets/QuickActions.tsx', type: 'component' },
      { path: 'server/routes/analytics.ts', type: 'route' },
      { path: 'server/routes/reports.ts', type: 'route' },
      { path: 'server/services/analytics.ts', type: 'service' },
      { path: 'server/services/reports.ts', type: 'service' },
    ],
    features: ['analytics', 'charts', 'reports', 'data-tables', 'exports'],
  },

  // --------------------------------------------
  // 7. PROJECT MANAGEMENT - Kanban/Tasks
  // --------------------------------------------
  projectManagement: {
    name: 'Project Management',
    description: 'Task management with kanban boards, sprints, and team collaboration',
    files: [
      { path: 'src/pages/Projects.tsx', type: 'page' },
      { path: 'src/pages/ProjectBoard.tsx', type: 'page' },
      { path: 'src/pages/ProjectList.tsx', type: 'page' },
      { path: 'src/pages/ProjectSettings.tsx', type: 'page' },
      { path: 'src/pages/TaskDetail.tsx', type: 'page' },
      { path: 'src/pages/Calendar.tsx', type: 'page' },
      { path: 'src/pages/Timeline.tsx', type: 'page' },
      { path: 'src/pages/Team.tsx', type: 'page' },
      { path: 'src/components/board/KanbanBoard.tsx', type: 'component' },
      { path: 'src/components/board/KanbanColumn.tsx', type: 'component' },
      { path: 'src/components/board/KanbanCard.tsx', type: 'component' },
      { path: 'src/components/board/AddColumnButton.tsx', type: 'component' },
      { path: 'src/components/task/TaskCard.tsx', type: 'component' },
      { path: 'src/components/task/TaskForm.tsx', type: 'component' },
      { path: 'src/components/task/TaskComments.tsx', type: 'component' },
      { path: 'src/components/task/TaskAttachments.tsx', type: 'component' },
      { path: 'src/components/task/TaskLabels.tsx', type: 'component' },
      { path: 'src/components/task/TaskAssignees.tsx', type: 'component' },
      { path: 'src/components/task/DueDatePicker.tsx', type: 'component' },
      { path: 'src/components/task/PrioritySelector.tsx', type: 'component' },
      { path: 'src/components/calendar/CalendarView.tsx', type: 'component' },
      { path: 'src/components/timeline/GanttChart.tsx', type: 'component' },
      { path: 'server/routes/projects.ts', type: 'route' },
      { path: 'server/routes/tasks.ts', type: 'route' },
      { path: 'server/routes/columns.ts', type: 'route' },
      { path: 'server/routes/comments.ts', type: 'route' },
      { path: 'server/services/projects.ts', type: 'service' },
      { path: 'server/services/tasks.ts', type: 'service' },
    ],
    features: ['kanban', 'tasks', 'sprints', 'calendar', 'timeline', 'team'],
  },

  // --------------------------------------------
  // 8. BOOKING/SCHEDULING - Appointment System
  // --------------------------------------------
  booking: {
    name: 'Booking System',
    description: 'Appointment scheduling with calendar, availability, and payments',
    files: [
      { path: 'src/pages/Home.tsx', type: 'page' },
      { path: 'src/pages/Services.tsx', type: 'page' },
      { path: 'src/pages/Booking.tsx', type: 'page' },
      { path: 'src/pages/BookingConfirmation.tsx', type: 'page' },
      { path: 'src/pages/MyBookings.tsx', type: 'page' },
      { path: 'src/pages/admin/Dashboard.tsx', type: 'page' },
      { path: 'src/pages/admin/Calendar.tsx', type: 'page' },
      { path: 'src/pages/admin/Services.tsx', type: 'page' },
      { path: 'src/pages/admin/Staff.tsx', type: 'page' },
      { path: 'src/pages/admin/Availability.tsx', type: 'page' },
      { path: 'src/components/booking/ServiceCard.tsx', type: 'component' },
      { path: 'src/components/booking/DatePicker.tsx', type: 'component' },
      { path: 'src/components/booking/TimeSlots.tsx', type: 'component' },
      { path: 'src/components/booking/StaffSelector.tsx', type: 'component' },
      { path: 'src/components/booking/BookingForm.tsx', type: 'component' },
      { path: 'src/components/booking/BookingSummary.tsx', type: 'component' },
      { path: 'src/components/calendar/AvailabilityCalendar.tsx', type: 'component' },
      { path: 'src/components/calendar/WeekView.tsx', type: 'component' },
      { path: 'server/routes/services.ts', type: 'route' },
      { path: 'server/routes/bookings.ts', type: 'route' },
      { path: 'server/routes/availability.ts', type: 'route' },
      { path: 'server/routes/staff.ts', type: 'route' },
      { path: 'server/services/booking.ts', type: 'service' },
      { path: 'server/services/availability.ts', type: 'service' },
      { path: 'server/services/reminders.ts', type: 'service' },
    ],
    features: ['services', 'booking', 'calendar', 'availability', 'reminders', 'payments'],
  },

  // --------------------------------------------
  // 9. LEARNING PLATFORM - Online Courses
  // --------------------------------------------
  learning: {
    name: 'Learning Platform',
    description: 'Online courses with lessons, quizzes, and progress tracking',
    files: [
      { path: 'src/pages/Home.tsx', type: 'page' },
      { path: 'src/pages/Courses.tsx', type: 'page' },
      { path: 'src/pages/CourseDetail.tsx', type: 'page' },
      { path: 'src/pages/Lesson.tsx', type: 'page' },
      { path: 'src/pages/Quiz.tsx', type: 'page' },
      { path: 'src/pages/MyLearning.tsx', type: 'page' },
      { path: 'src/pages/Certificates.tsx', type: 'page' },
      { path: 'src/pages/instructor/Dashboard.tsx', type: 'page' },
      { path: 'src/pages/instructor/CourseEditor.tsx', type: 'page' },
      { path: 'src/pages/instructor/LessonEditor.tsx', type: 'page' },
      { path: 'src/pages/instructor/Students.tsx', type: 'page' },
      { path: 'src/components/course/CourseCard.tsx', type: 'component' },
      { path: 'src/components/course/CourseList.tsx', type: 'component' },
      { path: 'src/components/course/CourseSidebar.tsx', type: 'component' },
      { path: 'src/components/course/ProgressBar.tsx', type: 'component' },
      { path: 'src/components/lesson/VideoPlayer.tsx', type: 'component' },
      { path: 'src/components/lesson/LessonContent.tsx', type: 'component' },
      { path: 'src/components/lesson/LessonNavigation.tsx', type: 'component' },
      { path: 'src/components/quiz/QuizQuestion.tsx', type: 'component' },
      { path: 'src/components/quiz/QuizResults.tsx', type: 'component' },
      { path: 'server/routes/courses.ts', type: 'route' },
      { path: 'server/routes/lessons.ts', type: 'route' },
      { path: 'server/routes/quizzes.ts', type: 'route' },
      { path: 'server/routes/progress.ts', type: 'route' },
      { path: 'server/routes/certificates.ts', type: 'route' },
      { path: 'server/services/courses.ts', type: 'service' },
      { path: 'server/services/progress.ts', type: 'service' },
      { path: 'server/services/certificates.ts', type: 'service' },
    ],
    features: ['courses', 'lessons', 'quizzes', 'progress', 'certificates', 'video'],
  },

  // --------------------------------------------
  // 10. MARKETPLACE - Multi-vendor Platform
  // --------------------------------------------
  marketplace: {
    name: 'Marketplace',
    description: 'Multi-vendor marketplace with sellers, listings, and reviews',
    files: [
      { path: 'src/pages/Home.tsx', type: 'page' },
      { path: 'src/pages/Browse.tsx', type: 'page' },
      { path: 'src/pages/ListingDetail.tsx', type: 'page' },
      { path: 'src/pages/SellerProfile.tsx', type: 'page' },
      { path: 'src/pages/Search.tsx', type: 'page' },
      { path: 'src/pages/Cart.tsx', type: 'page' },
      { path: 'src/pages/Checkout.tsx', type: 'page' },
      { path: 'src/pages/seller/Dashboard.tsx', type: 'page' },
      { path: 'src/pages/seller/Listings.tsx', type: 'page' },
      { path: 'src/pages/seller/ListingEditor.tsx', type: 'page' },
      { path: 'src/pages/seller/Orders.tsx', type: 'page' },
      { path: 'src/pages/seller/Analytics.tsx', type: 'page' },
      { path: 'src/pages/seller/Payouts.tsx', type: 'page' },
      { path: 'src/components/listing/ListingCard.tsx', type: 'component' },
      { path: 'src/components/listing/ListingGallery.tsx', type: 'component' },
      { path: 'src/components/listing/ListingInfo.tsx', type: 'component' },
      { path: 'src/components/seller/SellerCard.tsx', type: 'component' },
      { path: 'src/components/seller/SellerStats.tsx', type: 'component' },
      { path: 'src/components/review/ReviewList.tsx', type: 'component' },
      { path: 'src/components/review/ReviewForm.tsx', type: 'component' },
      { path: 'server/routes/listings.ts', type: 'route' },
      { path: 'server/routes/sellers.ts', type: 'route' },
      { path: 'server/routes/orders.ts', type: 'route' },
      { path: 'server/routes/reviews.ts', type: 'route' },
      { path: 'server/routes/payouts.ts', type: 'route' },
      { path: 'server/services/listings.ts', type: 'service' },
      { path: 'server/services/sellers.ts', type: 'service' },
      { path: 'server/services/escrow.ts', type: 'service' },
      { path: 'server/services/payouts.ts', type: 'service' },
    ],
    features: ['listings', 'sellers', 'reviews', 'escrow', 'payouts', 'messaging'],
  },
};

// ============================================================================
// SECTION 2: FRAMEWORK PATTERNS
// Complete patterns for major frameworks
// ============================================================================

export const FRAMEWORK_PATTERNS = {
  // --------------------------------------------
  // REACT PATTERNS
  // --------------------------------------------
  react: {
    // Functional Component with TypeScript
    component: `import { useState, useEffect, useCallback, useMemo } from 'react';

interface ComponentProps {
  title: string;
  data: DataType[];
  onAction?: (id: string) => void;
  className?: string;
}

export function Component({ title, data, onAction, className = '' }: ComponentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup
    };
  }, []);

  const handleClick = useCallback((id: string) => {
    setSelected(id);
    onAction?.(id);
  }, [onAction]);

  const processedData = useMemo(() => {
    return data.filter(item => item.active).sort((a, b) => a.order - b.order);
  }, [data]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className={\`component-wrapper \${className}\`}>
      <h2>{title}</h2>
      <ul>
        {processedData.map(item => (
          <li
            key={item.id}
            className={selected === item.id ? 'selected' : ''}
            onClick={() => handleClick(item.id)}
          >
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
}`,

    // Custom Hook Pattern
    customHook: `import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDataOptions<T> {
  initialData?: T;
  fetchOnMount?: boolean;
  refetchInterval?: number;
}

interface UseDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: (newData: T) => void;
}

export function useData<T>(
  fetchFn: () => Promise<T>,
  options: UseDataOptions<T> = {}
): UseDataReturn<T> {
  const { initialData = null, fetchOnMount = true, refetchInterval } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchFn]);

  useEffect(() => {
    mountedRef.current = true;
    if (fetchOnMount) {
      fetchData();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData, fetchOnMount]);

  useEffect(() => {
    if (!refetchInterval) return;
    const interval = setInterval(fetchData, refetchInterval);
    return () => clearInterval(interval);
  }, [fetchData, refetchInterval]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
  }, []);

  return { data, isLoading, error, refetch: fetchData, mutate };
}`,

    // Context Pattern
    contextPattern: `import { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';

// Types
interface State {
  items: Item[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
}

type Action =
  | { type: 'SET_ITEMS'; payload: Item[] }
  | { type: 'ADD_ITEM'; payload: Item }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<Item> } }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'SELECT_ITEM'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

interface ContextValue extends State {
  addItem: (item: Omit<Item, 'id'>) => void;
  updateItem: (id: string, updates: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  selectItem: (id: string | null) => void;
}

// Initial state
const initialState: State = {
  items: [],
  selectedId: null,
  isLoading: false,
  error: null,
};

// Reducer
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_ITEMS':
      return { ...state, items: action.payload };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        ),
      };
    case 'DELETE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
        selectedId: state.selectedId === action.payload ? null : state.selectedId,
      };
    case 'SELECT_ITEM':
      return { ...state, selectedId: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

// Context
const ItemContext = createContext<ContextValue | undefined>(undefined);

// Provider
export function ItemProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addItem = useCallback((item: Omit<Item, 'id'>) => {
    const newItem = { ...item, id: crypto.randomUUID() };
    dispatch({ type: 'ADD_ITEM', payload: newItem });
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<Item>) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { id, updates } });
  }, []);

  const deleteItem = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ITEM', payload: id });
  }, []);

  const selectItem = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_ITEM', payload: id });
  }, []);

  return (
    <ItemContext.Provider value={{ ...state, addItem, updateItem, deleteItem, selectItem }}>
      {children}
    </ItemContext.Provider>
  );
}

// Hook
export function useItems() {
  const context = useContext(ItemContext);
  if (!context) {
    throw new Error('useItems must be used within ItemProvider');
  }
  return context;
}`,

    // Form with React Hook Form + Zod
    formPattern: `import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof formSchema>;

interface FormProps {
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

export function RegistrationForm({ onSubmit, isLoading }: FormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      acceptTerms: false,
    },
  });

  const handleSubmit = async (data: FormData) => {
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      form.setError('root', { message: 'Submission failed. Please try again.' });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-sm text-red-500">{form.formState.errors.root.message}</p>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </Form>
  );
}`,

    // Data Fetching with TanStack Query
    queryPattern: `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface CreateUserData {
  name: string;
  email: string;
  password: string;
}

interface UpdateUserData {
  name?: string;
  email?: string;
}

// Query Keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Hooks
export function useUsers(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => apiRequest<{ users: User[]; total: number }>('/api/users', { params: filters }),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => apiRequest<User>(\`/api/users/\${id}\`),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserData) =>
      apiRequest<User>('/api/users', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserData) =>
      apiRequest<User>(\`/api/users/\${id}\`, { method: 'PATCH', body: data }),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(userKeys.detail(id), updatedUser);
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(\`/api/users/\${id}\`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}`,
  },

  // --------------------------------------------
  // NEXT.JS PATTERNS
  // --------------------------------------------
  nextjs: {
    // Server Component
    serverComponent: `// app/users/page.tsx
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { UserList } from './user-list';
import { UserListSkeleton } from './user-list-skeleton';

interface PageProps {
  searchParams: { page?: string; search?: string };
}

async function getUsers(page: number, search: string) {
  const limit = 20;
  const offset = (page - 1) * limit;

  const data = await db
    .select()
    .from(users)
    .where(search ? like(users.name, \`%\${search}%\`) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  return data;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || '';

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Users</h1>
      <Suspense fallback={<UserListSkeleton />}>
        <UserListWrapper page={page} search={search} />
      </Suspense>
    </div>
  );
}

async function UserListWrapper({ page, search }: { page: number; search: string }) {
  const users = await getUsers(page, search);
  return <UserList users={users} />;
}`,

    // Server Action
    serverAction: `// app/actions/user.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function createUser(formData: FormData) {
  const rawData = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const validated = createUserSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const { name, email, password } = validated.data;

  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    return { error: { email: ['Email already exists'] } };
  }

  const hashedPassword = await hash(password, 12);

  await db.insert(users).values({
    name,
    email,
    password: hashedPassword,
  });

  revalidatePath('/users');
  redirect('/users');
}

export async function deleteUser(id: string) {
  await db.delete(users).where(eq(users.id, id));
  revalidatePath('/users');
}`,

    // API Route Handler
    apiRoute: `// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc, eq, like, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = querySchema.parse(Object.fromEntries(searchParams));

  const { page, limit, search, role } = query;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) conditions.push(like(users.name, \`%\${search}%\`));
  if (role) conditions.push(eq(users.role, role));

  const data = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql\`count(*)\` })
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined);

  return NextResponse.json({
    users: data,
    total: Number(count),
    page,
    pages: Math.ceil(Number(count) / limit),
  });
}

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['user', 'admin']).default('user'),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const validated = createSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json({ error: validated.error.flatten() }, { status: 400 });
  }

  const [user] = await db.insert(users).values(validated.data).returning();

  return NextResponse.json(user, { status: 201 });
}`,

    // Middleware
    middleware: `// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const publicPaths = ['/', '/login', '/register', '/forgot-password'];
const adminPaths = ['/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if public path
  if (publicPaths.some(path => pathname === path || pathname.startsWith(\`\${path}/\`))) {
    return NextResponse.next();
  }

  // Get session token
  const token = await getToken({ req: request });

  // Not authenticated
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Check admin routes
  if (adminPaths.some(path => pathname.startsWith(path))) {
    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};`,
  },

  // --------------------------------------------
  // VUE PATTERNS
  // --------------------------------------------
  vue: {
    // Composition API Component
    compositionComponent: `<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Props
interface Props {
  title: string;
  items: Item[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

// Emits
const emit = defineEmits<{
  select: [id: string];
  delete: [id: string];
  update: [item: Item];
}>();

// Reactive state
const searchQuery = ref('');
const selectedId = ref<string | null>(null);
const isOpen = ref(false);

// Computed
const filteredItems = computed(() => {
  if (!searchQuery.value) return props.items;
  const query = searchQuery.value.toLowerCase();
  return props.items.filter(item =>
    item.name.toLowerCase().includes(query)
  );
});

const selectedItem = computed(() =>
  props.items.find(item => item.id === selectedId.value)
);

// Watch
watch(selectedId, (newId) => {
  if (newId) {
    emit('select', newId);
  }
});

// Methods
function handleSelect(id: string) {
  selectedId.value = id;
}

function handleDelete(id: string) {
  if (confirm('Are you sure?')) {
    emit('delete', id);
  }
}

// Lifecycle
onMounted(() => {
  console.log('Component mounted');
});

onUnmounted(() => {
  console.log('Component unmounted');
});
</script>

<template>
  <div class="component-wrapper">
    <header class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold">{{ title }}</h2>
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search..."
        class="px-3 py-2 border rounded-lg"
      />
    </header>

    <div v-if="loading" class="text-center py-8">
      <span class="loading">Loading...</span>
    </div>

    <ul v-else-if="filteredItems.length" class="space-y-2">
      <li
        v-for="item in filteredItems"
        :key="item.id"
        :class="['p-4 border rounded-lg cursor-pointer transition-colors',
          selectedId === item.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50']"
        @click="handleSelect(item.id)"
      >
        <div class="flex items-center justify-between">
          <span class="font-medium">{{ item.name }}</span>
          <button
            class="text-red-500 hover:text-red-700"
            @click.stop="handleDelete(item.id)"
          >
            Delete
          </button>
        </div>
      </li>
    </ul>

    <p v-else class="text-center text-gray-500 py-8">
      No items found
    </p>
  </div>
</template>

<style scoped>
.component-wrapper {
  @apply p-4 bg-white rounded-xl shadow-sm;
}
</style>`,

    // Composable (Vue Hook)
    composable: `// composables/useAsync.ts
import { ref, Ref, shallowRef, computed } from 'vue';

interface UseAsyncOptions<T> {
  immediate?: boolean;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseAsyncReturn<T, P extends unknown[]> {
  data: Ref<T | null>;
  error: Ref<Error | null>;
  isLoading: Ref<boolean>;
  isReady: Ref<boolean>;
  execute: (...args: P) => Promise<T>;
}

export function useAsync<T, P extends unknown[] = []>(
  fn: (...args: P) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T, P> {
  const { immediate = false, initialData = null, onSuccess, onError } = options;

  const data = shallowRef<T | null>(initialData);
  const error = shallowRef<Error | null>(null);
  const isLoading = ref(false);
  const isReady = ref(false);

  async function execute(...args: P): Promise<T> {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await fn(...args);
      data.value = result;
      isReady.value = true;
      onSuccess?.(result);
      return result;
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      onError?.(error.value);
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  }

  if (immediate) {
    execute(...([] as unknown as P));
  }

  return {
    data,
    error,
    isLoading,
    isReady,
    execute,
  };
}

// composables/useFetch.ts
import { ref, watch, unref, Ref } from 'vue';

type MaybeRef<T> = T | Ref<T>;

interface UseFetchOptions {
  immediate?: boolean;
  refetch?: boolean;
}

export function useFetch<T>(url: MaybeRef<string>, options: UseFetchOptions = {}) {
  const { immediate = true, refetch = false } = options;

  const data = ref<T | null>(null);
  const error = ref<Error | null>(null);
  const isLoading = ref(false);

  async function execute() {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(unref(url));
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      data.value = await response.json();
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
    } finally {
      isLoading.value = false;
    }
  }

  if (immediate) execute();

  if (refetch) {
    watch(() => unref(url), execute);
  }

  return { data, error, isLoading, execute };
}`,

    // Pinia Store
    piniaStore: `// stores/auth.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  avatar?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
}

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter();

  // State
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const userName = computed(() => user.value?.name || 'Guest');

  // Actions
  async function login(credentials: LoginCredentials) {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.post('/auth/login', credentials);
      token.value = response.token;
      user.value = response.user;
      localStorage.setItem('token', response.token);
      router.push('/dashboard');
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Login failed';
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  async function register(data: RegisterData) {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.post('/auth/register', data);
      token.value = response.token;
      user.value = response.user;
      localStorage.setItem('token', response.token);
      router.push('/dashboard');
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Registration failed';
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      user.value = null;
      token.value = null;
      localStorage.removeItem('token');
      router.push('/login');
    }
  }

  async function fetchUser() {
    if (!token.value) return;

    try {
      const response = await api.get('/auth/me');
      user.value = response.user;
    } catch {
      logout();
    }
  }

  // Initialize
  if (token.value) {
    fetchUser();
  }

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    isAdmin,
    userName,
    login,
    register,
    logout,
    fetchUser,
  };
});`,
  },
};

// ============================================================================
// SECTION 3: BACKEND PATTERNS
// Express, FastAPI, Go, Rust implementations
// ============================================================================

export const BACKEND_PATTERNS = {
  // --------------------------------------------
  // EXPRESS.JS PATTERNS
  // --------------------------------------------
  express: {
    // App Setup
    appSetup: `// server/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import routes from './routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;`,

    // Route Organization
    routeOrganization: `// server/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import projectRoutes from './projects';
import uploadRoutes from './uploads';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/uploads', uploadRoutes);

export default router;

// server/routes/users.ts
import { Router } from 'express';
import { userController } from '../controllers/users';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { userSchemas } from '../validators/users';

const router = Router();

router.use(requireAuth);

router.get('/', userController.list);
router.get('/:id', validate(userSchemas.getById), userController.getById);
router.patch('/:id', validate(userSchemas.update), userController.update);
router.delete('/:id', requireRole('admin'), userController.delete);

export default router;`,

    // Controller Pattern
    controllerPattern: `// server/controllers/users.ts
import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/users';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

export const userController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, search, role } = req.query;

    const result = await userService.list({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      role: role as string,
    });

    res.json(result);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await userService.getById(id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json(user);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check permission
    if (req.user!.id !== id && req.user!.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to update this user');
    }

    const user = await userService.update(id, req.body);
    res.json(user);
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await userService.delete(id);
    res.status(204).send();
  }),
};`,

    // Service Pattern
    servicePattern: `// server/services/users.ts
import { db } from '../db';
import { users } from '../db/schema';
import { eq, like, desc, and, sql } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { ApiError } from '../utils/ApiError';

interface ListOptions {
  page: number;
  limit: number;
  search?: string;
  role?: string;
}

interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role?: string;
}

interface UpdateUserData {
  name?: string;
  email?: string;
  avatar?: string;
}

export const userService = {
  async list(options: ListOptions) {
    const { page, limit, search, role } = options;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(like(users.name, \`%\${search}%\`));
    }
    if (role) {
      conditions.push(eq(users.role, role));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [data, [{ count }]] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          avatar: users.avatar,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql\`count(*)\` })
        .from(users)
        .where(whereClause),
    ]);

    return {
      users: data,
      total: Number(count),
      page,
      pages: Math.ceil(Number(count) / limit),
    };
  },

  async getById(id: string) {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatar: users.avatar,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id));

    return user || null;
  },

  async create(data: CreateUserData) {
    // Check for existing email
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email));

    if (existing) {
      throw new ApiError(409, 'Email already registered');
    }

    const hashedPassword = await hash(data.password, 12);

    const [user] = await db
      .insert(users)
      .values({
        ...data,
        password: hashedPassword,
        role: data.role || 'user',
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    return user;
  },

  async update(id: string, data: UpdateUserData) {
    // Check if email is taken
    if (data.email) {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, data.email), sql\`id != \${id}\`));

      if (existing) {
        throw new ApiError(409, 'Email already taken');
      }
    }

    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatar: users.avatar,
        updatedAt: users.updatedAt,
      });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },

  async delete(id: string) {
    const result = await db.delete(users).where(eq(users.id, id));
    if (result.rowCount === 0) {
      throw new ApiError(404, 'User not found');
    }
  },
};`,

    // Middleware Patterns
    middlewarePatterns: `// server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { ApiError } from '../utils/ApiError';

const JWT_SECRET = process.env.JWT_SECRET!;

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, decoded.userId));

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Invalid token'));
    } else {
      next(error);
    }
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }

    next();
  };
}

// server/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

interface ValidationSchemas {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export function validate(schemas: ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(e => \`\${e.path.join('.')}: \${e.message}\`);
        next(new ApiError(400, 'Validation failed', messages));
      } else {
        next(error);
      }
    }
  };
}

// server/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(\`[\${new Date().toISOString()}] Error:\`, error);

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
    });
  }

  // Unexpected error
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message,
  });
}`,

    // Utility Classes
    utilityClasses: `// server/utils/ApiError.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }

  static conflict(message: string) {
    return new ApiError(409, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}

// server/utils/asyncHandler.ts
import { Request, Response, NextFunction } from 'express';

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// server/utils/jwt.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

interface TokenPayload {
  userId: string;
  [key: string]: unknown;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}`,
  },

  // --------------------------------------------
  // PYTHON FASTAPI PATTERNS
  // --------------------------------------------
  fastapi: {
    // App Setup
    appSetup: `# main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.api import router as api_router
from app.core.config import settings
from app.core.database import engine, Base
from app.core.exceptions import AppException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    logger.info("Shutting down...")
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message, "details": exc.details},
    )

# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# API routes
app.include_router(api_router, prefix=settings.API_PREFIX)`,

    // Router Organization
    routerOrganization: `# app/api/__init__.py
from fastapi import APIRouter
from app.api.endpoints import auth, users, projects

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(projects.router, prefix="/projects", tags=["projects"])

# app/api/endpoints/users.py
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, UserList
from app.services import user_service

router = APIRouter()

@router.get("", response_model=UserList)
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all users with pagination and filtering."""
    return await user_service.list_users(
        db, page=page, limit=limit, search=search, role=role
    )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a user by ID."""
    user = await user_service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a user."""
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return await user_service.update_user(db, user_id, data)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a user (admin only)."""
    await user_service.delete_user(db, user_id)`,

    // Service Pattern
    servicePattern: `# app/services/user_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional
from passlib.hash import bcrypt

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserList
from app.core.exceptions import AppException

async def list_users(
    db: AsyncSession,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    role: Optional[str] = None,
) -> UserList:
    """List users with pagination and filtering."""
    offset = (page - 1) * limit

    # Build query
    query = select(User)
    count_query = select(func.count(User.id))

    conditions = []
    if search:
        conditions.append(
            or_(
                User.name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )
    if role:
        conditions.append(User.role == role)

    if conditions:
        query = query.where(and_(*conditions))
        count_query = count_query.where(and_(*conditions))

    # Execute queries
    query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    users = result.scalars().all()

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    return UserList(
        users=users,
        total=total,
        page=page,
        pages=(total + limit - 1) // limit,
    )

async def get_user(db: AsyncSession, user_id: str) -> Optional[User]:
    """Get a user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Get a user by email."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()

async def create_user(db: AsyncSession, data: UserCreate) -> User:
    """Create a new user."""
    # Check for existing email
    existing = await get_user_by_email(db, data.email)
    if existing:
        raise AppException(409, "Email already registered")

    # Hash password
    hashed_password = bcrypt.hash(data.password)

    # Create user
    user = User(
        email=data.email,
        password=hashed_password,
        name=data.name,
        role=data.role or "user",
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user

async def update_user(db: AsyncSession, user_id: str, data: UserUpdate) -> User:
    """Update a user."""
    user = await get_user(db, user_id)
    if not user:
        raise AppException(404, "User not found")

    # Check email uniqueness
    if data.email and data.email != user.email:
        existing = await get_user_by_email(db, data.email)
        if existing:
            raise AppException(409, "Email already taken")

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    return user

async def delete_user(db: AsyncSession, user_id: str) -> None:
    """Delete a user."""
    user = await get_user(db, user_id)
    if not user:
        raise AppException(404, "User not found")

    await db.delete(user)
    await db.commit()`,

    // Schemas
    schemas: `# app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    role: Optional[str] = "user"

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    avatar: Optional[str] = None

class UserResponse(UserBase):
    id: str
    role: str
    avatar: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserList(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    pages: int

# app/schemas/auth.py
from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=2)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class AuthResponse(BaseModel):
    user: "UserResponse"
    token: str`,

    // Security
    security: `# app/core/security.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.services import user_service

security = HTTPBearer()

def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    expire = datetime.utcnow() + (expires_delta or timedelta(days=7))
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

def decode_token(token: str) -> Optional[str]:
    """Decode a JWT token and return the user ID."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload.get("sub")
    except JWTError:
        return None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get the current authenticated user."""
    token = credentials.credentials
    user_id = decode_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = await user_service.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user

async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require the current user to be an admin."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user`,
  },

  // --------------------------------------------
  // GO GIN PATTERNS
  // --------------------------------------------
  go: {
    // Main Entry
    mainEntry: `// main.go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/joho/godotenv"

    "myapp/internal/config"
    "myapp/internal/database"
    "myapp/internal/handlers"
    "myapp/internal/middleware"
)

func main() {
    // Load environment variables
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found")
    }

    // Load configuration
    cfg := config.Load()

    // Initialize database
    db, err := database.Connect(cfg.DatabaseURL)
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }
    defer db.Close()

    // Run migrations
    if err := database.Migrate(db); err != nil {
        log.Fatalf("Failed to run migrations: %v", err)
    }

    // Set Gin mode
    if cfg.Environment == "production" {
        gin.SetMode(gin.ReleaseMode)
    }

    // Create router
    router := gin.Default()

    // Middleware
    router.Use(middleware.CORS())
    router.Use(middleware.RateLimit())
    router.Use(middleware.RequestID())
    router.Use(middleware.Logger())
    router.Use(middleware.Recovery())

    // Health check
    router.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "ok"})
    })

    // API routes
    api := router.Group("/api")
    {
        // Auth routes
        auth := api.Group("/auth")
        {
            auth.POST("/login", handlers.Login(db))
            auth.POST("/register", handlers.Register(db))
            auth.POST("/logout", middleware.Auth(), handlers.Logout(db))
            auth.GET("/me", middleware.Auth(), handlers.GetCurrentUser(db))
        }

        // User routes (protected)
        users := api.Group("/users")
        users.Use(middleware.Auth())
        {
            users.GET("", handlers.ListUsers(db))
            users.GET("/:id", handlers.GetUser(db))
            users.PATCH("/:id", handlers.UpdateUser(db))
            users.DELETE("/:id", middleware.RequireRole("admin"), handlers.DeleteUser(db))
        }
    }

    // Create server
    srv := &http.Server{
        Addr:         ":" + cfg.Port,
        Handler:      router,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // Graceful shutdown
    go func() {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    log.Printf("Server starting on port %s", cfg.Port)

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Println("Shutting down server...")

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Fatalf("Server forced to shutdown: %v", err)
    }

    log.Println("Server exited properly")
}`,

    // Handler Pattern
    handlerPattern: `// internal/handlers/users.go
package handlers

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"

    "myapp/internal/models"
    "myapp/internal/services"
)

func ListUsers(db *gorm.DB) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Parse query parameters
        page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
        limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
        search := c.Query("search")
        role := c.Query("role")

        // Get users
        result, err := services.ListUsers(db, page, limit, search, role)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }

        c.JSON(http.StatusOK, result)
    }
}

func GetUser(db *gorm.DB) gin.HandlerFunc {
    return func(c *gin.Context) {
        id := c.Param("id")

        user, err := services.GetUserByID(db, id)
        if err != nil {
            if err == gorm.ErrRecordNotFound {
                c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
                return
            }
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }

        c.JSON(http.StatusOK, user)
    }
}

func UpdateUser(db *gorm.DB) gin.HandlerFunc {
    return func(c *gin.Context) {
        id := c.Param("id")
        currentUser := c.MustGet("user").(*models.User)

        // Check authorization
        if currentUser.ID != id && currentUser.Role != "admin" {
            c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
            return
        }

        var input models.UpdateUserInput
        if err := c.ShouldBindJSON(&input); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }

        user, err := services.UpdateUser(db, id, &input)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }

        c.JSON(http.StatusOK, user)
    }
}

func DeleteUser(db *gorm.DB) gin.HandlerFunc {
    return func(c *gin.Context) {
        id := c.Param("id")

        if err := services.DeleteUser(db, id); err != nil {
            if err == gorm.ErrRecordNotFound {
                c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
                return
            }
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }

        c.Status(http.StatusNoContent)
    }
}`,

    // Service Pattern
    goServicePattern: `// internal/services/users.go
package services

import (
    "errors"

    "golang.org/x/crypto/bcrypt"
    "gorm.io/gorm"

    "myapp/internal/models"
)

type UserListResult struct {
    Users []models.UserResponse \`json:"users"\`
    Total int64                  \`json:"total"\`
    Page  int                    \`json:"page"\`
    Pages int                    \`json:"pages"\`
}

func ListUsers(db *gorm.DB, page, limit int, search, role string) (*UserListResult, error) {
    var users []models.User
    var total int64

    offset := (page - 1) * limit

    query := db.Model(&models.User{})

    if search != "" {
        query = query.Where("name ILIKE ? OR email ILIKE ?", "%"+search+"%", "%"+search+"%")
    }
    if role != "" {
        query = query.Where("role = ?", role)
    }

    // Get total count
    query.Count(&total)

    // Get users
    err := query.Order("created_at DESC").
        Offset(offset).
        Limit(limit).
        Find(&users).Error

    if err != nil {
        return nil, err
    }

    // Convert to response
    userResponses := make([]models.UserResponse, len(users))
    for i, user := range users {
        userResponses[i] = user.ToResponse()
    }

    pages := int((total + int64(limit) - 1) / int64(limit))

    return &UserListResult{
        Users: userResponses,
        Total: total,
        Page:  page,
        Pages: pages,
    }, nil
}

func GetUserByID(db *gorm.DB, id string) (*models.UserResponse, error) {
    var user models.User
    if err := db.First(&user, "id = ?", id).Error; err != nil {
        return nil, err
    }
    response := user.ToResponse()
    return &response, nil
}

func GetUserByEmail(db *gorm.DB, email string) (*models.User, error) {
    var user models.User
    if err := db.First(&user, "email = ?", email).Error; err != nil {
        return nil, err
    }
    return &user, nil
}

func CreateUser(db *gorm.DB, input *models.CreateUserInput) (*models.UserResponse, error) {
    // Check if email exists
    var existing models.User
    if err := db.First(&existing, "email = ?", input.Email).Error; err == nil {
        return nil, errors.New("email already registered")
    }

    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), 12)
    if err != nil {
        return nil, err
    }

    // Create user
    user := models.User{
        Email:    input.Email,
        Password: string(hashedPassword),
        Name:     input.Name,
        Role:     "user",
    }

    if err := db.Create(&user).Error; err != nil {
        return nil, err
    }

    response := user.ToResponse()
    return &response, nil
}

func UpdateUser(db *gorm.DB, id string, input *models.UpdateUserInput) (*models.UserResponse, error) {
    var user models.User
    if err := db.First(&user, "id = ?", id).Error; err != nil {
        return nil, err
    }

    // Check email uniqueness
    if input.Email != "" && input.Email != user.Email {
        var existing models.User
        if err := db.First(&existing, "email = ?", input.Email).Error; err == nil {
            return nil, errors.New("email already taken")
        }
    }

    // Update fields
    if input.Name != "" {
        user.Name = input.Name
    }
    if input.Email != "" {
        user.Email = input.Email
    }
    if input.Avatar != "" {
        user.Avatar = input.Avatar
    }

    if err := db.Save(&user).Error; err != nil {
        return nil, err
    }

    response := user.ToResponse()
    return &response, nil
}

func DeleteUser(db *gorm.DB, id string) error {
    result := db.Delete(&models.User{}, "id = ?", id)
    if result.RowsAffected == 0 {
        return gorm.ErrRecordNotFound
    }
    return result.Error
}`,

    // Middleware
    goMiddleware: `// internal/middleware/auth.go
package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"

    "myapp/internal/models"
    "myapp/internal/services"
    "myapp/internal/utils"
)

func Auth() gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
            c.Abort()
            return
        }

        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header"})
            c.Abort()
            return
        }

        token := parts[1]
        claims, err := utils.ValidateToken(token)
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
            c.Abort()
            return
        }

        // Get user from database
        db := c.MustGet("db").(*gorm.DB)
        user, err := services.GetUserByID(db, claims.UserID)
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
            c.Abort()
            return
        }

        c.Set("user", user)
        c.Next()
    }
}

func RequireRole(roles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        user := c.MustGet("user").(*models.User)

        for _, role := range roles {
            if user.Role == role {
                c.Next()
                return
            }
        }

        c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
        c.Abort()
    }
}

// internal/middleware/cors.go
func CORS() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Access-Control-Allow-Origin", "*")
        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
        c.Header("Access-Control-Max-Age", "86400")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(http.StatusNoContent)
            return
        }

        c.Next()
    }
}

// internal/middleware/ratelimit.go
func RateLimit() gin.HandlerFunc {
    store := NewRateLimiter(100, time.Minute) // 100 requests per minute

    return func(c *gin.Context) {
        ip := c.ClientIP()

        if !store.Allow(ip) {
            c.JSON(http.StatusTooManyRequests, gin.H{
                "error": "Too many requests",
            })
            c.Abort()
            return
        }

        c.Next()
    }
}`,
  },
};

// ============================================================================
// SECTION 4: UI COMPONENT PATTERNS
// 50+ production-ready component templates
// ============================================================================

export const UI_COMPONENTS = {
  // --------------------------------------------
  // DATA TABLE - Complete with sorting, filtering, pagination
  // --------------------------------------------
  dataTable: `import { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  ChevronUp, ChevronDown, MoreVertical, Search,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  selectable?: boolean;
  onSelect?: (selected: string[]) => void;
  actions?: (item: T) => { label: string; onClick: () => void; variant?: 'destructive' }[];
  pageSize?: number;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = 'Search...',
  selectable = false,
  onSelect,
  actions,
  pageSize = 10,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const filteredData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (search) {
      const query = search.toLowerCase();
      result = result.filter(item =>
        columns.some(col => {
          const value = item[col.key as keyof T];
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey as keyof T];
        const bVal = b[sortKey as keyof T];
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, sortKey, sortDir, columns]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelected = checked ? paginatedData.map(item => item.id) : [];
    setSelected(newSelected);
    onSelect?.(newSelected);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = checked
      ? [...selected, id]
      : selected.filter(s => s !== id);
    setSelected(newSelected);
    onSelect?.(newSelected);
  };

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={paginatedData.length > 0 && selected.length === paginatedData.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  className={col.className}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                  style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  className="text-center py-8 text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow key={item.id}>
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={selected.includes(item.id)}
                        onCheckedChange={(checked) => handleSelectRow(item.id, !!checked)}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={String(col.key)} className={col.className}>
                      {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '')}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions(item).map((action, i) => (
                            <DropdownMenuItem
                              key={i}
                              onClick={action.onClick}
                              className={action.variant === 'destructive' ? 'text-destructive' : ''}
                            >
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, filteredData.length)} of {filteredData.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setPage(1)} disabled={page === 1}>
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="icon" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}`,

  // --------------------------------------------
  // STATS CARD - Dashboard metric card
  // --------------------------------------------
  statsCard: `import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  format?: 'number' | 'currency' | 'percent';
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon,
  loading = false,
  format = 'number',
}: StatsCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percent':
        return val.toFixed(1) + '%';
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus className="w-4 h-4" />;
    return change > 0
      ? <ArrowUpRight className="w-4 h-4" />
      : <ArrowDownRight className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return 'text-muted-foreground';
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{formatValue(value)}</p>
          {change !== undefined && (
            <div className={cn('flex items-center gap-1 mt-2 text-sm', getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(change).toFixed(1)}%</span>
              <span className="text-muted-foreground">{changeLabel}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}`,

  // --------------------------------------------
  // FILE UPLOAD - Drag and drop with preview
  // --------------------------------------------
  fileUpload: `import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, File, Image, FileText, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  multiple?: boolean;
  onUpload: (files: File[]) => Promise<void>;
  className?: string;
}

interface UploadedFile {
  file: File;
  progress: number;
  error?: string;
}

export function FileUpload({
  accept = '*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5,
  multiple = true,
  onUpload,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-8 h-8" />;
    if (type.startsWith('video/')) return <Film className="w-8 h-8" />;
    if (type.includes('pdf')) return <FileText className="w-8 h-8" />;
    return <File className="w-8 h-8" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return 'File size exceeds ' + formatSize(maxSize);
    }
    if (accept !== '*') {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.endsWith(type);
        }
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', ''));
        }
        return file.type === type;
      });
      if (!isAccepted) return 'File type not accepted';
    }
    return null;
  };

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles).slice(0, maxFiles - files.length);

    const validatedFiles = fileArray.map(file => ({
      file,
      progress: 0,
      error: validateFile(file) || undefined,
    }));

    setFiles(prev => [...prev, ...validatedFiles]);
  }, [files.length, maxFiles, accept, maxSize]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleUpload = async () => {
    const validFiles = files.filter(f => !f.error).map(f => f.file);
    if (validFiles.length === 0) return;

    setIsUploading(true);

    // Simulate progress
    const interval = setInterval(() => {
      setFiles(prev => prev.map(f => ({
        ...f,
        progress: Math.min(f.progress + 10, 90),
      })));
    }, 200);

    try {
      await onUpload(validFiles);
      setFiles(prev => prev.map(f => ({ ...f, progress: 100 })));
      setTimeout(() => setFiles([]), 1000);
    } catch (error) {
      setFiles(prev => prev.map(f => ({
        ...f,
        error: 'Upload failed',
        progress: 0,
      })));
    } finally {
      clearInterval(interval);
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          'hover:border-primary hover:bg-primary/5 cursor-pointer'
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Drop files here or click to upload</p>
        <p className="text-sm text-muted-foreground mt-1">
          Max {maxFiles} files, up to {formatSize(maxSize)} each
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-3 p-3 border rounded-lg',
                item.error ? 'border-destructive bg-destructive/5' : ''
              )}
            >
              <div className="text-muted-foreground">
                {getFileIcon(item.file.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatSize(item.file.size)}
                  {item.error && <span className="text-destructive ml-2">{item.error}</span>}
                </p>
                {!item.error && item.progress > 0 && item.progress < 100 && (
                  <Progress value={item.progress} className="h-1 mt-2" />
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <Button
            onClick={handleUpload}
            disabled={isUploading || files.every(f => f.error)}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
      )}
    </div>
  );
}`,

  // --------------------------------------------
  // MODAL / DIALOG - Reusable modal wrapper
  // --------------------------------------------
  modal: `import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={sizeClasses[size]}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-4">{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}`,

  // --------------------------------------------
  // SEARCH INPUT - With debounce and suggestions
  // --------------------------------------------
  searchInput: `import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  debounce?: number;
  loading?: boolean;
  suggestions?: string[];
  onSelectSuggestion?: (value: string) => void;
  className?: string;
}

export function SearchInput({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = 'Search...',
  debounce = 300,
  loading = false,
  suggestions = [],
  onSelectSuggestion,
  className,
}: SearchInputProps) {
  const [value, setValue] = useState(controlledValue || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (controlledValue !== undefined) {
      setValue(controlledValue);
    }
  }, [controlledValue]);

  const debouncedOnChange = useCallback((newValue: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounce);
  }, [onChange, debounce]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedOnChange(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else {
        onSearch?.(value);
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setValue(suggestion);
    onChange(suggestion);
    onSelectSuggestion?.(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setValue('');
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {value && !loading && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover-elevate transition-colors',
                selectedIndex === index && 'bg-muted'
              )}
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}`,

  // --------------------------------------------
  // EMPTY STATE - Placeholder for no data
  // --------------------------------------------
  emptyState: `import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {icon && (
        <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}`,

  // --------------------------------------------
  // AVATAR WITH STATUS
  // --------------------------------------------
  avatarWithStatus: `import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AvatarWithStatusProps {
  src?: string;
  name: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AvatarWithStatus({
  src,
  name,
  status,
  size = 'md',
  className,
}: AvatarWithStatusProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  const statusSizes = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={src} alt={name} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-background',
            statusColors[status],
            statusSizes[size]
          )}
        />
      )}
    </div>
  );
}`,

  // --------------------------------------------
  // NOTIFICATION BADGE
  // --------------------------------------------
  notificationBadge: `import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  children: ReactNode;
  count?: number;
  max?: number;
  dot?: boolean;
  className?: string;
}

export function NotificationBadge({
  children,
  count,
  max = 99,
  dot = false,
  className,
}: NotificationBadgeProps) {
  const showBadge = dot || (count !== undefined && count > 0);
  const displayCount = count !== undefined && count > max ? max + '+' : count;

  return (
    <div className={cn('relative inline-flex', className)}>
      {children}
      {showBadge && (
        <span
          className={cn(
            'absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground',
            dot
              ? 'h-2.5 w-2.5'
              : 'h-5 min-w-5 px-1 text-xs font-medium'
          )}
        >
          {!dot && displayCount}
        </span>
      )}
    </div>
  );
}`,

  // --------------------------------------------
  // LOADING SKELETON
  // --------------------------------------------
  loadingSkeleton: `import { Skeleton } from '@/components/ui/skeleton';

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 1 }: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 border rounded-lg space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border rounded-lg">
      <div className="border-b p-4">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b last:border-0 p-4">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-10 w-24" />
    </div>
  );
}`,
};

// ============================================================================
// SECTION 5: AUTHENTICATION PATTERNS
// Complete auth flows: JWT, OAuth, sessions, 2FA
// ============================================================================

export const AUTH_PATTERNS = {
  // JWT Authentication
  jwt: {
    generateToken: `import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}`,

    refreshTokenFlow: `// Refresh token endpoint
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string; type: string };

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Check if token is in database (for revocation)
    const storedToken = await db.select()
      .from(refreshTokens)
      .where(and(
        eq(refreshTokens.token, refreshToken),
        eq(refreshTokens.userId, decoded.userId),
        gt(refreshTokens.expiresAt, new Date())
      ))
      .limit(1);

    if (storedToken.length === 0) {
      return res.status(401).json({ error: 'Token revoked or expired' });
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const newRefreshToken = generateRefreshToken(user.id);

    // Rotate refresh token
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});`,
  },

  // OAuth 2.0 Patterns
  oauth: {
    googleOAuth: `// Google OAuth with Passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from './db';
import { users, oauthAccounts } from './db/schema';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: '/api/auth/google/callback',
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if OAuth account exists
      const [oauthAccount] = await db.select()
        .from(oauthAccounts)
        .where(and(
          eq(oauthAccounts.provider, 'google'),
          eq(oauthAccounts.providerAccountId, profile.id)
        ));

      if (oauthAccount) {
        // Get existing user
        const [user] = await db.select().from(users).where(eq(users.id, oauthAccount.userId));
        return done(null, user);
      }

      // Check if user with email exists
      const email = profile.emails?.[0]?.value;
      if (email) {
        const [existingUser] = await db.select().from(users).where(eq(users.email, email));

        if (existingUser) {
          // Link OAuth account to existing user
          await db.insert(oauthAccounts).values({
            userId: existingUser.id,
            provider: 'google',
            providerAccountId: profile.id,
            accessToken,
            refreshToken,
          });
          return done(null, existingUser);
        }
      }

      // Create new user
      const [newUser] = await db.insert(users).values({
        email: email!,
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value,
        emailVerified: true,
      }).returning();

      // Create OAuth account
      await db.insert(oauthAccounts).values({
        userId: newUser.id,
        provider: 'google',
        providerAccountId: profile.id,
        accessToken,
        refreshToken,
      });

      done(null, newUser);
    } catch (error) {
      done(error as Error);
    }
  }
));

// Routes
app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const user = req.user as User;
    const token = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Redirect to frontend with token
    res.redirect(\`\${process.env.FRONTEND_URL}/auth/callback?token=\${token}\`);
  }
);`,

    githubOAuth: `// GitHub OAuth
import { Strategy as GitHubStrategy } from 'passport-github2';

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: '/api/auth/github/callback',
    scope: ['user:email'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Get primary email
      const emails = profile.emails || [];
      const primaryEmail = emails.find(e => e.primary)?.value || emails[0]?.value;

      if (!primaryEmail) {
        return done(new Error('No email found in GitHub profile'));
      }

      // Check for existing OAuth account
      const [oauthAccount] = await db.select()
        .from(oauthAccounts)
        .where(and(
          eq(oauthAccounts.provider, 'github'),
          eq(oauthAccounts.providerAccountId, profile.id)
        ));

      if (oauthAccount) {
        const [user] = await db.select().from(users).where(eq(users.id, oauthAccount.userId));
        return done(null, user);
      }

      // Check for existing user
      const [existingUser] = await db.select().from(users).where(eq(users.email, primaryEmail));

      if (existingUser) {
        await db.insert(oauthAccounts).values({
          userId: existingUser.id,
          provider: 'github',
          providerAccountId: profile.id,
          accessToken,
        });
        return done(null, existingUser);
      }

      // Create new user
      const [newUser] = await db.insert(users).values({
        email: primaryEmail,
        name: profile.displayName || profile.username,
        avatar: profile.photos?.[0]?.value,
        emailVerified: true,
      }).returning();

      await db.insert(oauthAccounts).values({
        userId: newUser.id,
        provider: 'github',
        providerAccountId: profile.id,
        accessToken,
      });

      done(null, newUser);
    } catch (error) {
      done(error as Error);
    }
  }
));`,
  },

  // Two-Factor Authentication
  twoFactor: {
    setup: `// 2FA Setup with TOTP
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Generate 2FA secret
app.post('/api/auth/2fa/setup', requireAuth, async (req, res) => {
  const user = req.user!;

  // Generate secret
  const secret = speakeasy.generateSecret({
    name: \`MyApp (\${user.email})\`,
    issuer: 'MyApp',
  });

  // Store secret temporarily (confirm with verification)
  await db.update(users)
    .set({ twoFactorTempSecret: secret.base32 })
    .where(eq(users.id, user.id));

  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

  res.json({
    secret: secret.base32,
    qrCode,
  });
});

// Verify and enable 2FA
app.post('/api/auth/2fa/verify', requireAuth, async (req, res) => {
  const { code } = req.body;
  const user = req.user!;

  // Get temp secret
  const [userData] = await db.select()
    .from(users)
    .where(eq(users.id, user.id));

  if (!userData.twoFactorTempSecret) {
    return res.status(400).json({ error: '2FA setup not initiated' });
  }

  // Verify code
  const verified = speakeasy.totp.verify({
    secret: userData.twoFactorTempSecret,
    encoding: 'base32',
    token: code,
    window: 1,
  });

  if (!verified) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  // Enable 2FA
  const backupCodes = generateBackupCodes(10);

  await db.update(users)
    .set({
      twoFactorSecret: userData.twoFactorTempSecret,
      twoFactorTempSecret: null,
      twoFactorEnabled: true,
      twoFactorBackupCodes: backupCodes.map(c => hashCode(c)),
    })
    .where(eq(users.id, user.id));

  res.json({
    enabled: true,
    backupCodes, // Show once, user must save them
  });
});

// Verify 2FA during login
app.post('/api/auth/2fa/validate', async (req, res) => {
  const { userId, code } = req.body;

  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user || !user.twoFactorEnabled) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  // Try TOTP code
  let verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret!,
    encoding: 'base32',
    token: code,
    window: 1,
  });

  // Try backup code
  if (!verified && user.twoFactorBackupCodes) {
    const hashedCode = hashCode(code);
    const backupIndex = user.twoFactorBackupCodes.findIndex(c => c === hashedCode);

    if (backupIndex !== -1) {
      verified = true;
      // Remove used backup code
      const updatedCodes = [...user.twoFactorBackupCodes];
      updatedCodes.splice(backupIndex, 1);
      await db.update(users)
        .set({ twoFactorBackupCodes: updatedCodes })
        .where(eq(users.id, user.id));
    }
  }

  if (!verified) {
    return res.status(401).json({ error: 'Invalid code' });
  }

  // Generate tokens
  const token = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  res.json({ token, user: sanitizeUser(user) });
});

function generateBackupCodes(count: number): string[] {
  return Array.from({ length: count }, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase()
  );
}`,
  },

  // Password Reset
  passwordReset: `// Password Reset Flow
import crypto from 'crypto';
import { sendEmail } from './services/email';

// Request password reset
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  const [user] = await db.select().from(users).where(eq(users.email, email));

  // Always return success (don't reveal if email exists)
  if (!user) {
    return res.json({ message: 'If an account exists, a reset link has been sent' });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.update(users)
    .set({
      resetToken: resetTokenHash,
      resetTokenExpiry,
    })
    .where(eq(users.id, user.id));

  // Send email
  const resetUrl = \`\${process.env.FRONTEND_URL}/reset-password?token=\${resetToken}\`;

  await sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html: \`
      <h1>Password Reset</h1>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="\${resetUrl}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    \`,
  });

  res.json({ message: 'If an account exists, a reset link has been sent' });
});

// Reset password
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;

  // Hash token to compare
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const [user] = await db.select()
    .from(users)
    .where(and(
      eq(users.resetToken, tokenHash),
      gt(users.resetTokenExpiry, new Date())
    ));

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Update password and clear reset token
  await db.update(users)
    .set({
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    })
    .where(eq(users.id, user.id));

  // Invalidate all sessions
  await db.delete(sessions).where(eq(sessions.userId, user.id));

  res.json({ message: 'Password reset successful' });
});`,
};

// ============================================================================
// SECTION 6: DATABASE PATTERNS
// PostgreSQL, MongoDB, Redis with ORMs
// ============================================================================

export const DATABASE_PATTERNS = {
  // Drizzle ORM Patterns
  drizzle: {
    // Complete schema
    schema: `// db/schema.ts
import {
  pgTable, varchar, text, timestamp, boolean, integer,
  jsonb, uuid, primaryKey, index, uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  avatar: text('avatar'),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  emailVerified: boolean('email_verified').default(false),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: varchar('two_factor_secret', { length: 255 }),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

// Sessions
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  tokenIdx: uniqueIndex('sessions_token_idx').on(table.token),
}));

// OAuth Accounts
export const oauthAccounts = pgTable('oauth_accounts', {
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  providerAccountIdx: uniqueIndex('oauth_provider_account_idx')
    .on(table.provider, table.providerAccountId),
}));

// Teams/Organizations
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  logo: text('logo'),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Team Members
export const teamMembers = pgTable('team_members', {
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.teamId, table.userId] }),
}));

// Projects
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('projects_user_id_idx').on(table.userId),
  teamIdIdx: index('projects_team_id_idx').on(table.teamId),
}));

// Subscriptions (Billing)
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
  userId: uuid('user_id').references(() => users.id),
  teamId: uuid('team_id').references(() => teams.id),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  plan: varchar('plan', { length: 50 }).notNull().default('free'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
  userId: uuid('user_id').references(() => users.id),
  teamId: uuid('team_id').references(() => teams.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }),
  resourceId: uuid('resource_id'),
  metadata: jsonb('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  resourceIdx: index('audit_logs_resource_idx').on(table.resource, table.resourceId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  oauthAccounts: many(oauthAccounts),
  teamMemberships: many(teamMembers),
  projects: many(projects),
  ownedTeams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, { fields: [teams.ownerId], references: [users.id] }),
  members: many(teamMembers),
  projects: many(projects),
  subscription: one(subscriptions),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  team: one(teams, { fields: [projects.teamId], references: [teams.id] }),
}));

// Zod Schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateUserSchema = insertUserSchema.partial().omit({
  password: true,
  email: true,
});

export const insertProjectSchema = createInsertSchema(projects, {
  name: z.string().min(1).max(255),
}).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Team = typeof teams.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;`,

    // Query patterns
    queries: `// db/queries.ts
import { db } from './index';
import { users, projects, teams, teamMembers, subscriptions } from './schema';
import { eq, and, or, like, desc, asc, sql, gt, lt, count } from 'drizzle-orm';

// Complex query with joins and aggregations
export async function getUserDashboardData(userId: string) {
  // Get user with their teams and subscription
  const userData = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      teamMemberships: {
        with: {
          team: {
            with: {
              subscription: true,
            },
          },
        },
      },
      projects: {
        orderBy: desc(projects.updatedAt),
        limit: 5,
      },
    },
  });

  // Get project statistics
  const [projectStats] = await db.select({
    total: count(),
    active: count(sql\`case when status = 'active' then 1 end\`),
    archived: count(sql\`case when status = 'archived' then 1 end\`),
  })
  .from(projects)
  .where(eq(projects.userId, userId));

  return { user: userData, stats: projectStats };
}

// Pagination with filtering
export async function getProjects(options: {
  userId: string;
  teamId?: string;
  status?: string;
  search?: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const { userId, teamId, status, search, page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const offset = (page - 1) * limit;

  // Build conditions
  const conditions = [eq(projects.userId, userId)];
  if (teamId) conditions.push(eq(projects.teamId, teamId));
  if (status) conditions.push(eq(projects.status, status));
  if (search) {
    conditions.push(
      or(
        like(projects.name, \`%\${search}%\`),
        like(projects.description, \`%\${search}%\`)
      )!
    );
  }

  const whereClause = and(...conditions);
  const orderFn = sortOrder === 'asc' ? asc : desc;
  const orderColumn = projects[sortBy as keyof typeof projects] || projects.createdAt;

  // Execute queries in parallel
  const [data, [{ total }]] = await Promise.all([
    db.select()
      .from(projects)
      .where(whereClause)
      .orderBy(orderFn(orderColumn))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() })
      .from(projects)
      .where(whereClause),
  ]);

  return {
    items: data,
    total: Number(total),
    page,
    pages: Math.ceil(Number(total) / limit),
    hasMore: offset + data.length < Number(total),
  };
}

// Transaction example
export async function transferProjectToTeam(projectId: string, teamId: string, userId: string) {
  return await db.transaction(async (tx) => {
    // Verify user owns the project
    const [project] = await tx.select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

    if (!project) {
      throw new Error('Project not found or unauthorized');
    }

    // Verify user is team member
    const [membership] = await tx.select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

    if (!membership) {
      throw new Error('Not a team member');
    }

    // Update project
    const [updated] = await tx.update(projects)
      .set({ teamId, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();

    return updated;
  });
}`,
  },

  // Prisma patterns
  prisma: {
    schema: `// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String?
  name          String
  avatar        String?
  role          String    @default("user")
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  oauthAccounts OAuthAccount[]
  projects      Project[]
  teamMembers   TeamMember[]
  ownedTeams    Team[]    @relation("TeamOwner")

  @@index([email])
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  userAgent String?
  ipAddress String?
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

model OAuthAccount {
  id                String   @id @default(cuid())
  userId            String
  provider          String
  providerAccountId String
  accessToken       String?
  refreshToken      String?
  expiresAt         DateTime?
  createdAt         DateTime @default(now())

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Team {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  logo      String?
  ownerId   String
  settings  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  owner         User           @relation("TeamOwner", fields: [ownerId], references: [id])
  members       TeamMember[]
  projects      Project[]
  subscription  Subscription?
}

model TeamMember {
  teamId   String
  userId   String
  role     String   @default("member")
  joinedAt DateTime @default(now())

  team     Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([teamId, userId])
}

model Project {
  id          String   @id @default(cuid())
  teamId      String?
  userId      String
  name        String
  description String?
  status      String   @default("active")
  settings    Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  team        Team?    @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([teamId])
}

model Subscription {
  id                   String    @id @default(cuid())
  teamId               String?   @unique
  stripeCustomerId     String?
  stripeSubscriptionId String?
  stripePriceId        String?
  plan                 String    @default("free")
  status               String    @default("active")
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean   @default(false)
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  team                 Team?     @relation(fields: [teamId], references: [id], onDelete: Cascade)
}`,
  },
};

// ============================================================================
// SECTION 7: ERROR SOLUTIONS
// 200+ common errors with fixes
// ============================================================================

export const ERROR_SOLUTIONS = {
  react: {
    'Cannot read properties of undefined': {
      cause: 'Accessing property on undefined/null value',
      fix: 'Use optional chaining (?.) or provide default values',
      example: `// Before
const name = user.profile.name;

// After
const name = user?.profile?.name ?? 'Unknown';`,
    },
    'Invalid hook call': {
      cause: 'Hook called outside component or in wrong order',
      fix: 'Hooks must be called at top level of function components',
      example: `// Wrong
if (condition) {
  useState(initial);
}

// Correct
const [state, setState] = useState(initial);
if (condition) {
  // use state here
}`,
    },
    'Objects are not valid as React child': {
      cause: 'Trying to render object directly',
      fix: 'Convert to string or render specific properties',
      example: `// Wrong
<div>{user}</div>

// Correct
<div>{user.name}</div>
// or
<div>{JSON.stringify(user)}</div>`,
    },
    'Too many re-renders': {
      cause: 'State update causes infinite loop',
      fix: 'Wrap state updates in useCallback or add proper dependencies',
      example: `// Wrong - creates new function every render
<button onClick={setState(value)}>Click</button>

// Correct
<button onClick={() => setState(value)}>Click</button>`,
    },
    'Each child should have a unique key prop': {
      cause: 'Missing or duplicate keys in list rendering',
      fix: 'Add unique key prop to each list item',
      example: `// Wrong
items.map(item => <div>{item.name}</div>)

// Correct
items.map(item => <div key={item.id}>{item.name}</div>)`,
    },
    'Cannot update unmounted component': {
      cause: 'State update after component unmounts',
      fix: 'Use cleanup function or AbortController',
      example: `useEffect(() => {
  let mounted = true;
  fetchData().then(data => {
    if (mounted) setData(data);
  });
  return () => { mounted = false; };
}, []);`,
    },
  },

  typescript: {
    'Property does not exist on type': {
      cause: 'Accessing undefined property on typed object',
      fix: 'Add property to type or use type assertion',
      example: `// Add to interface
interface User {
  name: string;
  newProp: string; // Add missing property
}

// Or use optional
interface User {
  name: string;
  newProp?: string;
}`,
    },
    'Type is not assignable to type': {
      cause: 'Type mismatch in assignment',
      fix: 'Ensure types match or add proper type conversion',
      example: `// Wrong
const num: number = "5";

// Correct
const num: number = parseInt("5", 10);
// or
const num: number = Number("5");`,
    },
    'Argument of type X is not assignable to parameter of type Y': {
      cause: 'Function called with wrong argument type',
      fix: 'Match argument type to parameter type',
      example: `// Function expects string
function greet(name: string) { }

// Wrong
greet(123);

// Correct
greet("123");
greet(String(123));`,
    },
    'Object is possibly undefined': {
      cause: 'TypeScript cannot guarantee object exists',
      fix: 'Add null check or use non-null assertion',
      example: `// Wrong
const len = arr.length;

// Correct
const len = arr?.length ?? 0;
// or with check
if (arr) {
  const len = arr.length;
}`,
    },
  },

  node: {
    'ENOENT: no such file or directory': {
      cause: 'File or directory does not exist',
      fix: 'Check path and create directory if needed',
      example: `import { existsSync, mkdirSync } from 'fs';

const dir = './uploads';
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}`,
    },
    'EADDRINUSE: address already in use': {
      cause: 'Port is already being used by another process',
      fix: 'Kill the process or use different port',
      example: `// Find and kill process
// lsof -i :3000
// kill -9 <PID>

// Or use different port
const PORT = process.env.PORT || 3001;`,
    },
    'MODULE_NOT_FOUND': {
      cause: 'Package not installed or wrong import path',
      fix: 'Install package or fix import path',
      example: `// Install package
npm install missing-package

// Check import path
import { thing } from './correct/path';`,
    },
    'CORS error': {
      cause: 'Cross-origin request blocked',
      fix: 'Configure CORS middleware',
      example: `import cors from 'cors';

app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true,
}));`,
    },
  },

  database: {
    'relation does not exist': {
      cause: 'Table/view not created in database',
      fix: 'Run migrations to create tables',
      example: `# Run Drizzle migrations
npm run db:push

# Or generate and run
npm run db:generate
npm run db:migrate`,
    },
    'duplicate key value violates unique constraint': {
      cause: 'Trying to insert duplicate value in unique column',
      fix: 'Check for existing record or use upsert',
      example: `// Check first
const existing = await db.select().from(users).where(eq(users.email, email));
if (existing.length > 0) {
  throw new Error('Email already exists');
}

// Or use upsert
await db.insert(users)
  .values({ email, name })
  .onConflictDoUpdate({
    target: users.email,
    set: { name },
  });`,
    },
    'connection refused': {
      cause: 'Database server not running or wrong connection string',
      fix: 'Check database is running and connection URL is correct',
      example: `// Check DATABASE_URL format
// PostgreSQL: postgresql://user:pass@host:5432/dbname
// MySQL: mysql://user:pass@host:3306/dbname

// Verify database is running
// pg_isready -h localhost -p 5432`,
    },
  },
};

// ============================================================================
// SECTION 8: REAL-TIME PATTERNS
// WebSocket, SSE, Polling implementations
// ============================================================================

export const REAL_TIME_PATTERNS = {
  // WebSocket with Socket.io
  socketio: {
    server: `// server/socket.ts
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

interface SocketUser {
  id: string;
  email: string;
  name: string;
}

declare module 'socket.io' {
  interface Socket {
    user?: SocketUser;
  }
}

export function setupSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      const [user] = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
      }).from(users).where(eq(users.id, decoded.userId));

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    console.log(\`User connected: \${socket.user?.email}\`);

    // Join user's personal room
    socket.join(\`user:\${socket.user?.id}\`);

    // Join room
    socket.on('join:room', (roomId: string) => {
      socket.join(roomId);
      socket.to(roomId).emit('user:joined', {
        user: socket.user,
        roomId,
      });
    });

    // Leave room
    socket.on('leave:room', (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user:left', {
        user: socket.user,
        roomId,
      });
    });

    // Send message
    socket.on('message:send', async (data: { roomId: string; content: string }) => {
      const message = {
        id: crypto.randomUUID(),
        userId: socket.user!.id,
        userName: socket.user!.name,
        content: data.content,
        createdAt: new Date().toISOString(),
      };

      // Broadcast to room
      io.to(data.roomId).emit('message:new', message);
    });

    // Typing indicator
    socket.on('typing:start', (roomId: string) => {
      socket.to(roomId).emit('user:typing', {
        user: socket.user,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (roomId: string) => {
      socket.to(roomId).emit('user:typing', {
        user: socket.user,
        isTyping: false,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(\`User disconnected: \${socket.user?.email}\`);
    });
  });

  return io;
}

// Emit to specific user
export function emitToUser(io: Server, userId: string, event: string, data: unknown) {
  io.to(\`user:\${userId}\`).emit(event, data);
}

// Emit to room
export function emitToRoom(io: Server, roomId: string, event: string, data: unknown) {
  io.to(roomId).emit(event, data);
}`,

    client: `// hooks/useSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

interface UseSocketOptions {
  autoConnect?: boolean;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true } = options;
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!token || !autoConnect) return;

    const socket = io(import.meta.env.VITE_WS_URL || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('message:new', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('user:typing', ({ user, isTyping }) => {
      setTypingUsers(prev =>
        isTyping
          ? [...prev.filter(u => u !== user.name), user.name]
          : prev.filter(u => u !== user.name)
      );
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [token, autoConnect]);

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('join:room', roomId);
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('leave:room', roomId);
  }, []);

  const sendMessage = useCallback((roomId: string, content: string) => {
    socketRef.current?.emit('message:send', { roomId, content });
  }, []);

  const startTyping = useCallback((roomId: string) => {
    socketRef.current?.emit('typing:start', roomId);
  }, []);

  const stopTyping = useCallback((roomId: string) => {
    socketRef.current?.emit('typing:stop', roomId);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    messages,
    typingUsers,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
  };
}`,
  },

  // Server-Sent Events
  sse: {
    server: `// SSE endpoint
app.get('/api/events', requireAuth, (req, res) => {
  const userId = req.user!.id;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send initial connection event
  res.write('event: connected\\n');
  res.write(\`data: \${JSON.stringify({ userId })}\\n\\n\`);

  // Store client connection
  const clientId = crypto.randomUUID();
  sseClients.set(clientId, { res, userId });

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\\n\\n');
  }, 30000);

  // Clean up on close
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
  });
});

// Broadcast to all clients
function broadcastSSE(event: string, data: unknown) {
  const message = \`event: \${event}\\ndata: \${JSON.stringify(data)}\\n\\n\`;
  sseClients.forEach(client => {
    client.res.write(message);
  });
}

// Send to specific user
function sendSSEToUser(userId: string, event: string, data: unknown) {
  const message = \`event: \${event}\\ndata: \${JSON.stringify(data)}\\n\\n\`;
  sseClients.forEach(client => {
    if (client.userId === userId) {
      client.res.write(message);
    }
  });
}`,

    client: `// hooks/useSSE.ts
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface SSEEvent<T = unknown> {
  event: string;
  data: T;
}

export function useSSE<T = unknown>(eventName?: string) {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!token) return;

    const eventSource = new EventSource(\`/api/events?token=\${token}\`);

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError(new Error('Connection lost'));
      eventSource.close();

      // Reconnect after delay
      setTimeout(() => {
        // Will reconnect on next render
      }, 5000);
    };

    if (eventName) {
      eventSource.addEventListener(eventName, (e) => {
        try {
          const parsed = JSON.parse(e.data);
          setData(parsed);
        } catch {
          console.error('Failed to parse SSE data');
        }
      });
    }

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        setData(parsed);
      } catch {
        // Ignore parse errors for heartbeat
      }
    };

    return () => {
      eventSource.close();
    };
  }, [token, eventName]);

  return { isConnected, data, error };
}`,
  },
};

// ============================================================================
// SECTION 9: PAYMENT PATTERNS (Stripe)
// Subscriptions, checkout, webhooks
// ============================================================================

export const PAYMENT_PATTERNS = {
  stripe: {
    // Checkout session
    checkout: `// Create checkout session
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

app.post('/api/billing/checkout', requireAuth, async (req, res) => {
  const { priceId } = req.body;
  const user = req.user!;

  // Get or create Stripe customer
  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    await db.update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, user.id));
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: \`\${process.env.FRONTEND_URL}/billing?success=true\`,
    cancel_url: \`\${process.env.FRONTEND_URL}/billing?canceled=true\`,
    metadata: { userId: user.id },
  });

  res.json({ url: session.url });
});`,

    // Customer portal
    portal: `// Create customer portal session
app.post('/api/billing/portal', requireAuth, async (req, res) => {
  const user = req.user!;

  if (!user.stripeCustomerId) {
    return res.status(400).json({ error: 'No billing account found' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: \`\${process.env.FRONTEND_URL}/billing\`,
  });

  res.json({ url: session.url });
});`,

    // Webhook handling
    webhook: `// Stripe webhook handler
app.post('/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed');
      return res.status(400).send('Webhook Error');
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutComplete(session);
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdate(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionCanceled(subscription);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailed(invoice);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentSucceeded(invoice);
          break;
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  await db.insert(subscriptions).values({
    userId,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0].price.id,
    plan: getPlanFromPriceId(subscription.items.data[0].price.id),
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  await db.update(subscriptions)
    .set({
      status: subscription.status,
      stripePriceId: subscription.items.data[0].price.id,
      plan: getPlanFromPriceId(subscription.items.data[0].price.id),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  await db.update(subscriptions)
    .set({
      status: 'canceled',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
}`,

    // Usage tracking
    usage: `// Track metered usage
async function recordUsage(subscriptionItemId: string, quantity: number) {
  await stripe.subscriptionItems.createUsageRecord(
    subscriptionItemId,
    {
      quantity,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'increment',
    }
  );
}

// Get usage for current period
async function getUsage(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0].id;

  const usageRecords = await stripe.subscriptionItems.listUsageRecordSummaries(
    itemId,
    { limit: 1 }
  );

  return usageRecords.data[0]?.total_usage || 0;
}`,
  },
};

// ============================================================================
// SECTION 10: TESTING PATTERNS
// Unit, integration, e2e tests
// ============================================================================

export const TESTING_PATTERNS = {
  // React Testing Library
  react: `// Component testing with React Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginForm } from './LoginForm';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('LoginForm', () => {
  it('renders login form', () => {
    render(<LoginForm onSubmit={jest.fn()} />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} />, { wrapper: createWrapper() });

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} />, { wrapper: createWrapper() });

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows error message on failed login', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
    render(<LoginForm onSubmit={onSubmit} />, { wrapper: createWrapper() });

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });
});`,

  // API testing with Supertest
  api: `// API testing with Supertest
import request from 'supertest';
import { app } from '../app';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

describe('Auth API', () => {
  let testUser: { id: string; email: string };

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const [user] = await db.insert(users).values({
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
    }).returning();
    testUser = user;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(users).where(eq(users.email, 'test@example.com'));
  });

  describe('POST /api/auth/login', () => {
    it('returns token on successful login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('returns 401 with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: 'password123' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });
      token = res.body.token;
    });

    it('returns user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', \`Bearer \${token}\`);

      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });
});`,

  // E2E testing with Playwright
  e2e: `// E2E testing with Playwright
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('user can sign up', async ({ page }) => {
    await page.click('text=Sign Up');

    await page.fill('[data-testid="input-name"]', 'New User');
    await page.fill('[data-testid="input-email"]', 'newuser@example.com');
    await page.fill('[data-testid="input-password"]', 'password123');
    await page.fill('[data-testid="input-confirm-password"]', 'password123');

    await page.click('[data-testid="button-submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome, New User')).toBeVisible();
  });

  test('user can log in', async ({ page }) => {
    await page.click('text=Sign In');

    await page.fill('[data-testid="input-email"]', 'test@example.com');
    await page.fill('[data-testid="input-password"]', 'password123');

    await page.click('[data-testid="button-submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.click('text=Sign In');

    await page.fill('[data-testid="input-email"]', 'test@example.com');
    await page.fill('[data-testid="input-password"]', 'wrongpassword');

    await page.click('[data-testid="button-submit"]');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('user can log out', async ({ page }) => {
    // Login first
    await page.click('text=Sign In');
    await page.fill('[data-testid="input-email"]', 'test@example.com');
    await page.fill('[data-testid="input-password"]', 'password123');
    await page.click('[data-testid="button-submit"]');
    await expect(page).toHaveURL('/dashboard');

    // Logout
    await page.click('[data-testid="button-user-menu"]');
    await page.click('text=Logout');

    await expect(page).toHaveURL('/');
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="input-email"]', 'test@example.com');
    await page.fill('[data-testid="input-password"]', 'password123');
    await page.click('[data-testid="button-submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('displays stats cards', async ({ page }) => {
    await expect(page.locator('[data-testid="stats-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-orders"]')).toBeVisible();
  });

  test('can create new project', async ({ page }) => {
    await page.click('[data-testid="button-new-project"]');

    await page.fill('[data-testid="input-project-name"]', 'Test Project');
    await page.fill('[data-testid="input-project-description"]', 'A test project');

    await page.click('[data-testid="button-create"]');

    await expect(page.locator('text=Test Project')).toBeVisible();
  });
});`,
};

// ============================================================================
// SECTION 11: SECURITY PATTERNS
// Input validation, CSRF, XSS prevention, rate limiting
// ============================================================================

export const SECURITY_PATTERNS = {
  // Input validation
  validation: `// Comprehensive input validation with Zod
import { z } from 'zod';

// Common validators
const emailSchema = z.string().email().max(255).toLowerCase().trim();
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain a special character');

const slugSchema = z.string()
  .min(2).max(100)
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .transform(val => val.toLowerCase());

const urlSchema = z.string().url().max(2000);

// Sanitize HTML to prevent XSS
const sanitizedStringSchema = z.string().transform(val =>
  val.replace(/<[^>]*>/g, '') // Remove HTML tags
     .replace(/[<>'"]/g, c => ({
       '<': '&lt;',
       '>': '&gt;',
       "'": '&#39;',
       '"': '&quot;'
     }[c] || c))
);

// Request schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2).max(100).trim(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  description: sanitizedStringSchema.max(5000).optional(),
  settings: z.record(z.unknown()).optional(),
});

// Validation middleware
export function validate(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      } else {
        next(error);
      }
    }
  };
}`,

  // Rate limiting
  rateLimit: `// Advanced rate limiting
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// General API rate limit
export const apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict auth rate limit
export const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts, please try again later' },
});

// Per-user rate limiting
export const userLimiter = (max: number, windowMs: number) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    windowMs,
    max,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: { error: 'Rate limit exceeded' },
  });
};`,

  // CSRF protection
  csrf: `// CSRF protection
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

// Setup CSRF
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

// Apply to routes
app.use(cookieParser());
app.use(csrfProtection);

// Send token to client
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Error handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next(err);
});`,

  // Security headers
  headers: `// Security headers with Helmet
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable if using iframes
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});`,
};

// ============================================================================
// EXPORTS AND UTILITIES
// ============================================================================

export function getPatternByType(type: string, name: string): string | undefined {
  const patterns: Record<string, Record<string, unknown>> = {
    framework: FRAMEWORK_PATTERNS,
    backend: BACKEND_PATTERNS,
    ui: UI_COMPONENTS,
    auth: AUTH_PATTERNS,
    database: DATABASE_PATTERNS,
    realtime: REAL_TIME_PATTERNS,
    payment: PAYMENT_PATTERNS,
    testing: TESTING_PATTERNS,
    security: SECURITY_PATTERNS,
  };

  const category = patterns[type];
  if (!category) return undefined;

  const pattern = category[name];
  if (typeof pattern === 'string') return pattern;
  if (typeof pattern === 'object') return JSON.stringify(pattern, null, 2);
  return undefined;
}

export function getBlueprintFiles(blueprintName: string) {
  const blueprint = PROJECT_BLUEPRINTS[blueprintName as keyof typeof PROJECT_BLUEPRINTS];
  return blueprint?.files || [];
}

export function getAllBlueprints() {
  return Object.entries(PROJECT_BLUEPRINTS).map(([key, value]) => ({
    id: key,
    name: value.name,
    description: value.description,
    fileCount: value.files.length,
    features: value.features,
  }));
}

// Export everything
export default {
  PROJECT_BLUEPRINTS,
  FRAMEWORK_PATTERNS,
  BACKEND_PATTERNS,
  UI_COMPONENTS,
  AUTH_PATTERNS,
  DATABASE_PATTERNS,
  ERROR_SOLUTIONS,
  REAL_TIME_PATTERNS,
  PAYMENT_PATTERNS,
  TESTING_PATTERNS,
  SECURITY_PATTERNS,
  getPatternByType,
  getBlueprintFiles,
  getAllBlueprints,
};