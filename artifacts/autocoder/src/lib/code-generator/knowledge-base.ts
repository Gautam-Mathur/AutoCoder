// Sage Knowledge Base - The wisdom of a thousand developers
// Teaches the AI to understand ANY request like a seasoned expert

export interface ConceptDefinition {
  keywords: string[];
  type: string;
  template: string;
  description: string;
  features: string[];
  relatedConcepts: string[];
}

export interface RequestIntent {
  type: 'create' | 'modify' | 'explain' | 'fix';
  subject: string;
  template: string;
  confidence: number;
  extractedName: string | null;
  extractedFeatures: string[];
  industry: string | null;
  complexity: 'simple' | 'medium' | 'complex';
}

// ========================================
// THE SAGE'S LIBRARY OF KNOWLEDGE
// ========================================

export const conceptLibrary: Record<string, ConceptDefinition> = {

  // ==========================================
  // BUSINESS & ENTERPRISE APPLICATIONS
  // ==========================================

  "erp": {
    keywords: ["erp", "enterprise resource planning", "enterprise resource", "business management system", "resource planning", "enterprise system"],
    type: "business-app",
    template: "html-dashboard",
    description: "Enterprise Resource Planning - complete business management",
    features: ["inventory", "sales", "purchases", "accounting", "hr", "reports", "analytics"],
    relatedConcepts: ["crm", "inventory", "dashboard", "admin", "accounting"]
  },
  "crm": {
    keywords: ["crm", "customer relationship", "customer management", "sales management", "client management", "lead management", "sales pipeline"],
    type: "business-app",
    template: "html-dashboard",
    description: "Customer Relationship Management system",
    features: ["contacts", "leads", "deals", "pipeline", "reports", "activities"],
    relatedConcepts: ["erp", "dashboard", "sales", "marketing"]
  },
  "hrms": {
    keywords: ["hrms", "hris", "hr system", "human resource", "employee management", "workforce", "personnel", "staff management"],
    type: "business-app",
    template: "html-dashboard",
    description: "Human Resource Management System",
    features: ["employees", "payroll", "attendance", "leave", "recruitment", "performance"],
    relatedConcepts: ["erp", "payroll", "attendance"]
  },
  "payroll": {
    keywords: ["payroll", "salary", "wages", "compensation", "pay slip", "paycheck"],
    type: "business-app",
    template: "html-dashboard",
    description: "Payroll management system",
    features: ["salaries", "deductions", "taxes", "reports", "payslips"],
    relatedConcepts: ["hrms", "accounting", "finance"]
  },
  "inventory": {
    keywords: ["inventory", "stock", "warehouse", "products", "stock management", "goods", "items", "sku"],
    type: "business-app",
    template: "html-dashboard",
    description: "Inventory management system",
    features: ["products", "stock levels", "orders", "suppliers", "categories"],
    relatedConcepts: ["erp", "dashboard", "ecommerce", "pos"]
  },
  "pos": {
    keywords: ["pos", "point of sale", "cash register", "checkout", "retail", "billing system"],
    type: "business-app",
    template: "html-dashboard",
    description: "Point of Sale system",
    features: ["products", "cart", "payments", "receipts", "inventory sync"],
    relatedConcepts: ["inventory", "ecommerce", "retail"]
  },
  "accounting": {
    keywords: ["accounting", "bookkeeping", "ledger", "finance system", "accounts", "financial management"],
    type: "business-app",
    template: "html-dashboard",
    description: "Accounting and financial management",
    features: ["ledger", "invoices", "expenses", "reports", "taxes", "balance sheet"],
    relatedConcepts: ["erp", "invoicing", "finance"]
  },
  "invoicing": {
    keywords: ["invoice", "invoicing", "billing", "quotation", "estimate", "receipt"],
    type: "business-app",
    template: "html-dashboard",
    description: "Invoice and billing system",
    features: ["create invoices", "track payments", "client management", "reports"],
    relatedConcepts: ["accounting", "crm", "finance"]
  },
  "project-management": {
    keywords: ["project management", "project tracker", "task management", "kanban", "scrum", "agile", "sprint", "jira", "trello", "asana"],
    type: "business-app",
    template: "html-dashboard",
    description: "Project and task management",
    features: ["projects", "tasks", "boards", "timelines", "team", "milestones"],
    relatedConcepts: ["todo", "collaboration", "team"]
  },
  "helpdesk": {
    keywords: ["helpdesk", "support ticket", "ticketing", "customer support", "service desk", "zendesk", "freshdesk"],
    type: "business-app",
    template: "html-dashboard",
    description: "Help desk and support ticketing",
    features: ["tickets", "agents", "categories", "sla", "knowledge base"],
    relatedConcepts: ["crm", "support", "customer service"]
  },

  // ==========================================
  // E-COMMERCE & RETAIL
  // ==========================================

  "ecommerce": {
    keywords: ["ecommerce", "e-commerce", "online store", "shop", "marketplace", "amazon", "shopify", "store", "shopping"],
    type: "ecommerce",
    template: "html-card-grid",
    description: "E-commerce and online store",
    features: ["products", "cart", "checkout", "categories", "search", "reviews"],
    relatedConcepts: ["inventory", "pos", "products", "shopping"]
  },
  "products": {
    keywords: ["product listing", "product catalog", "product page", "shop products", "merchandise"],
    type: "ecommerce",
    template: "html-card-grid",
    description: "Product listing and catalog",
    features: ["grid layout", "filters", "sorting", "images", "prices"],
    relatedConcepts: ["ecommerce", "cards", "catalog"]
  },
  "cart": {
    keywords: ["shopping cart", "cart page", "basket", "checkout cart"],
    type: "ecommerce",
    template: "html-form",
    description: "Shopping cart interface",
    features: ["items", "quantities", "totals", "checkout button"],
    relatedConcepts: ["ecommerce", "checkout"]
  },

  // ==========================================
  // HEALTHCARE & MEDICAL
  // ==========================================

  "healthcare": {
    keywords: ["healthcare", "medical", "hospital", "clinic", "health system", "patient management"],
    type: "healthcare",
    template: "html-dashboard",
    description: "Healthcare management system",
    features: ["patients", "appointments", "doctors", "records", "billing"],
    relatedConcepts: ["ehr", "appointments", "medical"]
  },
  "ehr": {
    keywords: ["ehr", "emr", "electronic health record", "patient records", "medical records", "health records"],
    type: "healthcare",
    template: "html-dashboard",
    description: "Electronic Health Records system",
    features: ["patient history", "diagnoses", "prescriptions", "lab results"],
    relatedConcepts: ["healthcare", "patients", "medical"]
  },
  "appointment": {
    keywords: ["appointment", "booking", "schedule", "reservation", "calendar booking", "book appointment"],
    type: "healthcare",
    template: "html-form",
    description: "Appointment booking system",
    features: ["calendar", "time slots", "confirmation", "reminders"],
    relatedConcepts: ["healthcare", "calendar", "booking"]
  },
  "pharmacy": {
    keywords: ["pharmacy", "drugstore", "medicine", "prescriptions", "pharmaceutical"],
    type: "healthcare",
    template: "html-dashboard",
    description: "Pharmacy management system",
    features: ["medicines", "inventory", "prescriptions", "sales"],
    relatedConcepts: ["healthcare", "inventory", "medical"]
  },

  // ==========================================
  // EDUCATION & LEARNING
  // ==========================================

  "lms": {
    keywords: ["lms", "learning management", "e-learning", "online course", "education platform", "udemy", "coursera", "moodle"],
    type: "education",
    template: "html-dashboard",
    description: "Learning Management System",
    features: ["courses", "lessons", "quizzes", "progress", "certificates"],
    relatedConcepts: ["courses", "education", "training"]
  },
  "school": {
    keywords: ["school", "school management", "student management", "education", "academic", "university", "college"],
    type: "education",
    template: "html-dashboard",
    description: "School/Academic management system",
    features: ["students", "teachers", "classes", "grades", "attendance", "timetable"],
    relatedConcepts: ["lms", "students", "education"]
  },
  "exam": {
    keywords: ["exam", "test", "quiz", "assessment", "examination", "mcq", "online test"],
    type: "education",
    template: "html-form",
    description: "Exam and quiz system",
    features: ["questions", "timer", "scoring", "results"],
    relatedConcepts: ["lms", "education", "assessment"]
  },

  // ==========================================
  // REAL ESTATE & PROPERTY
  // ==========================================

  "real-estate": {
    keywords: ["real estate", "property", "listings", "homes", "houses", "apartments", "zillow", "redfin", "rental"],
    type: "real-estate",
    template: "html-card-grid",
    description: "Real estate and property listings",
    features: ["listings", "search", "filters", "maps", "details", "contact"],
    relatedConcepts: ["listings", "property", "housing"]
  },
  "property-management": {
    keywords: ["property management", "tenant", "landlord", "rental management", "lease"],
    type: "real-estate",
    template: "html-dashboard",
    description: "Property management system",
    features: ["properties", "tenants", "leases", "maintenance", "payments"],
    relatedConcepts: ["real-estate", "rentals", "management"]
  },

  // ==========================================
  // FOOD & RESTAURANT
  // ==========================================

  "restaurant": {
    keywords: ["restaurant", "food ordering", "menu", "dining", "cafe", "eatery", "food service"],
    type: "food",
    template: "html-card-grid",
    description: "Restaurant and food ordering",
    features: ["menu", "categories", "cart", "ordering", "specials"],
    relatedConcepts: ["food-delivery", "menu", "ordering"]
  },
  "food-delivery": {
    keywords: ["food delivery", "uber eats", "doordash", "grubhub", "delivery app", "order food"],
    type: "food",
    template: "html-card-grid",
    description: "Food delivery platform",
    features: ["restaurants", "menu", "cart", "tracking", "reviews"],
    relatedConcepts: ["restaurant", "delivery", "ecommerce"]
  },
  "recipe": {
    keywords: ["recipe", "cooking", "recipes", "cookbook", "food blog"],
    type: "food",
    template: "html-card-grid",
    description: "Recipe collection and cooking site",
    features: ["recipes", "ingredients", "steps", "categories", "search"],
    relatedConcepts: ["blog", "food", "cooking"]
  },

  // ==========================================
  // TRAVEL & HOSPITALITY
  // ==========================================

  "travel": {
    keywords: ["travel", "booking", "flights", "hotels", "vacation", "trip", "tourism", "expedia", "booking.com"],
    type: "travel",
    template: "html-landing",
    description: "Travel booking platform",
    features: ["search", "booking", "destinations", "reviews", "itinerary"],
    relatedConcepts: ["hotel", "flights", "tourism"]
  },
  "hotel": {
    keywords: ["hotel", "accommodation", "resort", "lodging", "rooms", "airbnb", "vrbo"],
    type: "travel",
    template: "html-card-grid",
    description: "Hotel and accommodation booking",
    features: ["rooms", "availability", "booking", "amenities", "reviews"],
    relatedConcepts: ["travel", "booking", "hospitality"]
  },

  // ==========================================
  // SOCIAL & COMMUNICATION
  // ==========================================

  "social-media": {
    keywords: ["social media", "social network", "facebook", "twitter", "instagram", "linkedin", "feed", "posts", "timeline"],
    type: "social",
    template: "html-card-grid",
    description: "Social media platform",
    features: ["feed", "posts", "likes", "comments", "profiles", "followers"],
    relatedConcepts: ["feed", "profile", "community"]
  },
  "chat": {
    keywords: ["chat", "messaging", "messenger", "slack", "discord", "whatsapp", "instant message", "im"],
    type: "social",
    template: "html-dashboard",
    description: "Chat and messaging application",
    features: ["messages", "conversations", "contacts", "groups", "notifications"],
    relatedConcepts: ["messaging", "communication", "realtime"]
  },
  "forum": {
    keywords: ["forum", "discussion", "community", "reddit", "board", "threads", "topics"],
    type: "social",
    template: "html-card-grid",
    description: "Forum and discussion board",
    features: ["topics", "posts", "replies", "categories", "users"],
    relatedConcepts: ["community", "social", "discussion"]
  },
  "profile": {
    keywords: ["profile", "user profile", "account page", "my account", "settings"],
    type: "social",
    template: "html-form",
    description: "User profile page",
    features: ["avatar", "info", "settings", "activity", "preferences"],
    relatedConcepts: ["account", "user", "settings"]
  },

  // ==========================================
  // MEDIA & ENTERTAINMENT
  // ==========================================

  "streaming": {
    keywords: ["streaming", "video platform", "netflix", "youtube", "hulu", "twitch", "video streaming"],
    type: "media",
    template: "html-card-grid",
    description: "Video streaming platform",
    features: ["videos", "categories", "player", "recommendations", "watchlist"],
    relatedConcepts: ["video", "entertainment", "media"]
  },
  "music": {
    keywords: ["music", "spotify", "soundcloud", "audio", "playlist", "songs", "albums", "artists"],
    type: "media",
    template: "html-card-grid",
    description: "Music streaming platform",
    features: ["songs", "playlists", "artists", "albums", "player"],
    relatedConcepts: ["streaming", "audio", "entertainment"]
  },
  "podcast": {
    keywords: ["podcast", "podcasts", "audio show", "episodes", "listen"],
    type: "media",
    template: "html-card-grid",
    description: "Podcast platform",
    features: ["episodes", "shows", "player", "subscriptions"],
    relatedConcepts: ["audio", "streaming", "content"]
  },
  "news": {
    keywords: ["news", "news site", "newspaper", "articles", "journalism", "headlines", "breaking news"],
    type: "media",
    template: "html-card-grid",
    description: "News and media website",
    features: ["articles", "categories", "trending", "search", "breaking"],
    relatedConcepts: ["blog", "content", "media"]
  },

  // ==========================================
  // FINANCE & FINTECH
  // ==========================================

  "banking": {
    keywords: ["banking", "bank", "fintech", "financial", "money", "transactions", "transfers"],
    type: "finance",
    template: "html-dashboard",
    description: "Banking and financial platform",
    features: ["accounts", "transactions", "transfers", "statements", "cards"],
    relatedConcepts: ["finance", "payments", "wallet"]
  },
  "wallet": {
    keywords: ["wallet", "digital wallet", "e-wallet", "payment wallet", "money transfer"],
    type: "finance",
    template: "html-dashboard",
    description: "Digital wallet application",
    features: ["balance", "send", "receive", "history", "cards"],
    relatedConcepts: ["banking", "payments", "fintech"]
  },
  "crypto": {
    keywords: ["crypto", "cryptocurrency", "bitcoin", "ethereum", "blockchain", "trading", "exchange", "coinbase", "binance"],
    type: "finance",
    template: "html-dashboard",
    description: "Cryptocurrency platform",
    features: ["portfolio", "trading", "charts", "wallet", "transactions"],
    relatedConcepts: ["trading", "finance", "blockchain"]
  },
  "stocks": {
    keywords: ["stocks", "stock market", "trading", "investment", "portfolio", "robinhood", "etrade"],
    type: "finance",
    template: "html-dashboard",
    description: "Stock trading platform",
    features: ["portfolio", "watchlist", "charts", "trading", "news"],
    relatedConcepts: ["trading", "finance", "investment"]
  },

  // ==========================================
  // SECURITY & CYBERSECURITY
  // ==========================================

  "security": {
    keywords: ["security", "secure", "protection", "cybersecurity", "infosec", "cyber defense"],
    type: "security",
    template: "html-landing",
    description: "Security-focused platform",
    features: ["protection", "monitoring", "alerts", "compliance"],
    relatedConcepts: ["siem", "vapt", "monitoring"]
  },
  "siem": {
    keywords: ["siem", "security information", "event management", "security monitoring", "log management", "splunk", "elastic"],
    type: "security",
    template: "html-dashboard",
    description: "Security Information and Event Management",
    features: ["logs", "alerts", "monitoring", "incidents", "reports", "correlation"],
    relatedConcepts: ["security", "monitoring", "logging"]
  },
  "vapt": {
    keywords: ["vapt", "vulnerability", "penetration", "security testing", "pen test", "vulnerability assessment", "security audit"],
    type: "security",
    template: "html-dashboard",
    description: "Vulnerability Assessment and Penetration Testing",
    features: ["scans", "vulnerabilities", "reports", "remediation", "severity"],
    relatedConcepts: ["security", "testing", "audit"]
  },
  "firewall": {
    keywords: ["firewall", "network security", "waf", "access control", "traffic"],
    type: "security",
    template: "html-dashboard",
    description: "Firewall and network security",
    features: ["rules", "traffic", "logs", "blocking", "whitelist"],
    relatedConcepts: ["security", "network", "protection"]
  },
  "iam": {
    keywords: ["iam", "identity", "access management", "authentication", "authorization", "sso", "oauth", "permissions"],
    type: "security",
    template: "html-dashboard",
    description: "Identity and Access Management",
    features: ["users", "roles", "permissions", "policies", "audit"],
    relatedConcepts: ["security", "auth", "users"]
  },

  // ==========================================
  // DEVOPS & INFRASTRUCTURE
  // ==========================================

  "devops": {
    keywords: ["devops", "ci/cd", "pipeline", "deployment", "jenkins", "github actions", "gitlab"],
    type: "devops",
    template: "html-dashboard",
    description: "DevOps and CI/CD platform",
    features: ["pipelines", "builds", "deployments", "logs", "status"],
    relatedConcepts: ["monitoring", "deployment", "automation"]
  },
  "monitoring": {
    keywords: ["monitoring", "observability", "metrics", "grafana", "prometheus", "datadog", "apm", "performance monitoring"],
    type: "devops",
    template: "html-dashboard",
    description: "Monitoring and observability platform",
    features: ["metrics", "dashboards", "alerts", "logs", "traces"],
    relatedConcepts: ["devops", "analytics", "alerts"]
  },
  "logging": {
    keywords: ["logging", "logs", "log management", "elk", "elasticsearch", "kibana", "logstash"],
    type: "devops",
    template: "html-dashboard",
    description: "Log management platform",
    features: ["logs", "search", "filters", "analytics", "retention"],
    relatedConcepts: ["monitoring", "devops", "siem"]
  },
  "cloud": {
    keywords: ["cloud", "cloud platform", "aws", "azure", "gcp", "cloud console", "infrastructure"],
    type: "devops",
    template: "html-dashboard",
    description: "Cloud platform console",
    features: ["resources", "services", "billing", "monitoring", "settings"],
    relatedConcepts: ["devops", "infrastructure", "hosting"]
  },

  // ==========================================
  // ANALYTICS & BI
  // ==========================================

  "analytics": {
    keywords: ["analytics", "business intelligence", "bi", "reports", "insights", "google analytics", "mixpanel", "amplitude"],
    type: "analytics",
    template: "html-dashboard",
    description: "Analytics and business intelligence",
    features: ["charts", "reports", "metrics", "funnels", "segments"],
    relatedConcepts: ["dashboard", "reports", "data"]
  },
  "reporting": {
    keywords: ["reporting", "reports", "report builder", "data visualization", "charts"],
    type: "analytics",
    template: "html-dashboard",
    description: "Reporting and visualization",
    features: ["charts", "tables", "filters", "export", "scheduling"],
    relatedConcepts: ["analytics", "dashboard", "data"]
  },

  // ==========================================
  // AI & MACHINE LEARNING
  // ==========================================

  "ai-platform": {
    keywords: ["ai platform", "machine learning", "ml platform", "ai dashboard", "model management"],
    type: "ai",
    template: "html-dashboard",
    description: "AI/ML platform",
    features: ["models", "training", "predictions", "metrics", "data"],
    relatedConcepts: ["analytics", "data", "automation"]
  },
  "chatbot": {
    keywords: ["chatbot", "ai assistant", "virtual assistant", "bot", "conversational ai"],
    type: "ai",
    template: "html-dashboard",
    description: "Chatbot and AI assistant",
    features: ["conversations", "intents", "responses", "training", "analytics"],
    relatedConcepts: ["ai", "chat", "automation"]
  },

  // ==========================================
  // WEB PAGES & MARKETING
  // ==========================================

  "landing": {
    keywords: ["landing", "landing page", "homepage", "home page", "hero", "marketing page", "startup", "saas", "product page", "launch"],
    type: "webpage",
    template: "html-landing",
    description: "Marketing landing page",
    features: ["hero", "features", "cta", "pricing", "testimonials", "faq"],
    relatedConcepts: ["website", "marketing", "product"]
  },
  "website": {
    keywords: ["website", "site", "web page", "webpage", "web site"],
    type: "webpage",
    template: "html-landing",
    description: "General website",
    features: ["navigation", "content", "footer", "about"],
    relatedConcepts: ["landing", "portfolio", "business"]
  },
  "portfolio": {
    keywords: ["portfolio", "gallery", "showcase", "work", "projects", "creative"],
    type: "webpage",
    template: "html-card-grid",
    description: "Portfolio or gallery",
    features: ["cards", "grid", "images", "descriptions", "filters"],
    relatedConcepts: ["gallery", "cards", "showcase"]
  },
  "blog": {
    keywords: ["blog", "article", "post", "content", "medium", "wordpress", "ghost"],
    type: "webpage",
    template: "html-card-grid",
    description: "Blog or article listing",
    features: ["articles", "categories", "dates", "authors", "tags"],
    relatedConcepts: ["content", "articles", "news"]
  },
  "pricing": {
    keywords: ["pricing", "pricing page", "plans", "subscription", "tiers"],
    type: "webpage",
    template: "html-card-grid",
    description: "Pricing page",
    features: ["plans", "features", "prices", "cta", "comparison"],
    relatedConcepts: ["landing", "saas", "subscription"]
  },
  "about": {
    keywords: ["about", "about us", "team", "company", "our story"],
    type: "webpage",
    template: "html-landing",
    description: "About page",
    features: ["story", "team", "values", "mission", "history"],
    relatedConcepts: ["website", "team", "company"]
  },
  "contact": {
    keywords: ["contact", "contact us", "get in touch", "reach us"],
    type: "webpage",
    template: "html-form",
    description: "Contact page",
    features: ["form", "email", "phone", "address", "map"],
    relatedConcepts: ["form", "support", "website"]
  },
  "faq": {
    keywords: ["faq", "frequently asked", "questions", "help center", "knowledge base"],
    type: "webpage",
    template: "html-card-grid",
    description: "FAQ page",
    features: ["questions", "answers", "categories", "search"],
    relatedConcepts: ["support", "help", "documentation"]
  },

  // ==========================================
  // UI COMPONENTS
  // ==========================================

  "dashboard": {
    keywords: ["dashboard", "admin", "panel", "control panel", "admin panel", "back office", "backoffice", "management panel", "console"],
    type: "ui",
    template: "html-dashboard",
    description: "Admin dashboard",
    features: ["sidebar", "stats", "charts", "tables", "navigation", "widgets"],
    relatedConcepts: ["admin", "erp", "crm", "analytics"]
  },
  "form": {
    keywords: ["form", "input", "signup", "register", "login", "subscribe", "survey", "questionnaire"],
    type: "ui",
    template: "html-form",
    description: "Input form",
    features: ["inputs", "validation", "submit", "feedback", "steps"],
    relatedConcepts: ["contact", "auth", "registration"]
  },
  "navbar": {
    keywords: ["navbar", "nav", "navigation", "menu", "header", "topbar", "navigation bar"],
    type: "ui",
    template: "html-navbar",
    description: "Navigation bar",
    features: ["logo", "links", "responsive", "mobile menu", "dropdown"],
    relatedConcepts: ["header", "menu", "navigation"]
  },
  "sidebar": {
    keywords: ["sidebar", "side menu", "side navigation", "left menu", "drawer"],
    type: "ui",
    template: "html-dashboard",
    description: "Sidebar navigation",
    features: ["menu items", "icons", "collapsible", "nested"],
    relatedConcepts: ["navigation", "dashboard", "menu"]
  },
  "cards": {
    keywords: ["cards", "card", "grid", "tiles", "items", "card layout"],
    type: "ui",
    template: "html-card-grid",
    description: "Card grid layout",
    features: ["responsive grid", "images", "content", "actions"],
    relatedConcepts: ["portfolio", "products", "listing"]
  },
  "table": {
    keywords: ["table", "data table", "grid", "spreadsheet", "data grid", "list view"],
    type: "ui",
    template: "html-dashboard",
    description: "Data table",
    features: ["columns", "sorting", "filtering", "pagination", "actions"],
    relatedConcepts: ["data", "listing", "crud"]
  },
  "modal": {
    keywords: ["modal", "popup", "dialog", "overlay", "lightbox", "popover"],
    type: "ui",
    template: "react-modal",
    description: "Modal dialog",
    features: ["overlay", "close button", "content", "animations"],
    relatedConcepts: ["dialog", "popup", "notification"]
  },
  "tabs": {
    keywords: ["tabs", "tab panel", "tabbed", "tab navigation"],
    type: "ui",
    template: "html-landing",
    description: "Tabbed interface",
    features: ["tabs", "panels", "switching", "active state"],
    relatedConcepts: ["navigation", "content", "panels"]
  },
  "accordion": {
    keywords: ["accordion", "collapsible", "expandable", "faq accordion"],
    type: "ui",
    template: "html-landing",
    description: "Accordion component",
    features: ["expandable", "collapsible", "headers", "content"],
    relatedConcepts: ["faq", "content", "ui"]
  },
  "carousel": {
    keywords: ["carousel", "slider", "slideshow", "image slider", "gallery slider"],
    type: "ui",
    template: "html-landing",
    description: "Image carousel/slider",
    features: ["slides", "navigation", "autoplay", "indicators"],
    relatedConcepts: ["gallery", "images", "hero"]
  },
  "footer": {
    keywords: ["footer", "site footer", "bottom", "page footer"],
    type: "ui",
    template: "html-landing",
    description: "Website footer",
    features: ["links", "social", "copyright", "newsletter"],
    relatedConcepts: ["website", "navigation", "contact"]
  },

  // ==========================================
  // APPS & UTILITIES
  // ==========================================

  "todo": {
    keywords: ["todo", "task", "tasks", "checklist", "to do", "to-do", "task list"],
    type: "app",
    template: "js-todo-app",
    description: "Task management app",
    features: ["add tasks", "complete", "delete", "filter", "priority"],
    relatedConcepts: ["tasks", "productivity", "project-management"]
  },
  "counter": {
    keywords: ["counter", "count", "increment", "decrement", "clicker", "tally", "number counter", "click counter", "plus minus", "incrementer", "add subtract"],
    type: "app",
    template: "html-counter",
    description: "Counter app with increment/decrement buttons",
    features: ["increment", "decrement", "reset", "display number"],
    relatedConcepts: ["calculator", "utility", "interactive"]
  },
  "calculator": {
    keywords: ["calculator", "calc", "math", "compute", "calculate"],
    type: "app",
    template: "js-calculator",
    description: "Calculator app",
    features: ["operations", "display", "clear", "history"],
    relatedConcepts: ["math", "utility", "tool"]
  },
  "timer": {
    keywords: ["timer", "countdown", "stopwatch", "clock", "pomodoro"],
    type: "app",
    template: "js-calculator",
    description: "Timer/countdown app",
    features: ["start", "stop", "reset", "alarm"],
    relatedConcepts: ["utility", "productivity", "time"]
  },
  "weather": {
    keywords: ["weather", "forecast", "temperature", "climate"],
    type: "app",
    template: "html-card-grid",
    description: "Weather app",
    features: ["current", "forecast", "location", "conditions"],
    relatedConcepts: ["utility", "api", "dashboard"]
  },
  "notes": {
    keywords: ["notes", "note taking", "notepad", "memo", "evernote", "notion"],
    type: "app",
    template: "html-dashboard",
    description: "Note taking app",
    features: ["create", "edit", "organize", "search", "tags"],
    relatedConcepts: ["productivity", "todo", "writing"]
  },
  "calendar": {
    keywords: ["calendar", "events", "schedule", "planner", "google calendar"],
    type: "app",
    template: "html-dashboard",
    description: "Calendar app",
    features: ["events", "views", "reminders", "recurring"],
    relatedConcepts: ["scheduling", "productivity", "appointments"]
  },
  "file-manager": {
    keywords: ["file manager", "files", "documents", "file browser", "storage", "drive", "dropbox"],
    type: "app",
    template: "html-dashboard",
    description: "File management",
    features: ["folders", "upload", "download", "sharing", "search"],
    relatedConcepts: ["storage", "documents", "cloud"]
  },

  // ==========================================
  // GAMING & ENTERTAINMENT
  // ==========================================

  "game": {
    keywords: ["game", "gaming", "play", "arcade", "video game"],
    type: "game",
    template: "html-landing",
    description: "Game or gaming platform",
    features: ["play", "scores", "levels", "characters"],
    relatedConcepts: ["entertainment", "interactive", "fun"]
  },
  "quiz": {
    keywords: ["quiz", "trivia", "quiz game", "question game"],
    type: "game",
    template: "html-form",
    description: "Quiz game",
    features: ["questions", "answers", "score", "timer"],
    relatedConcepts: ["game", "education", "interactive"]
  },

  // ==========================================
  // IOT & HARDWARE
  // ==========================================

  "iot": {
    keywords: ["iot", "internet of things", "smart home", "devices", "sensors", "connected devices"],
    type: "iot",
    template: "html-dashboard",
    description: "IoT dashboard",
    features: ["devices", "sensors", "controls", "monitoring", "automation"],
    relatedConcepts: ["monitoring", "automation", "smart-home"]
  },
  "smart-home": {
    keywords: ["smart home", "home automation", "home control", "alexa", "google home"],
    type: "iot",
    template: "html-dashboard",
    description: "Smart home control",
    features: ["devices", "scenes", "schedules", "controls"],
    relatedConcepts: ["iot", "automation", "control"]
  },

  // ==========================================
  // PLATFORMS & SAAS
  // ==========================================

  "platform": {
    keywords: ["platform", "saas", "software", "service", "tool", "solution"],
    type: "product",
    template: "html-landing",
    description: "Software platform",
    features: ["features", "pricing", "signup", "demo", "integrations"],
    relatedConcepts: ["landing", "saas", "product"]
  },
  "app": {
    keywords: ["app", "application", "software", "program", "mobile app"],
    type: "product",
    template: "html-landing",
    description: "Application product",
    features: ["interface", "functionality", "users", "download"],
    relatedConcepts: ["platform", "software", "product"]
  },
  "api": {
    keywords: ["api", "api documentation", "developer docs", "endpoints", "swagger", "rest api"],
    type: "developer",
    template: "html-dashboard",
    description: "API documentation",
    features: ["endpoints", "methods", "examples", "authentication"],
    relatedConcepts: ["developer", "documentation", "integration"]
  },
  "documentation": {
    keywords: ["documentation", "docs", "guide", "manual", "readme", "wiki"],
    type: "developer",
    template: "html-card-grid",
    description: "Documentation site",
    features: ["articles", "search", "navigation", "examples"],
    relatedConcepts: ["api", "help", "developer"]
  }
};

// ==========================================
// INDUSTRY DETECTION
// ==========================================

const industries: Record<string, string[]> = {
  "healthcare": ["medical", "health", "hospital", "clinic", "patient", "doctor", "pharmacy", "ehr", "diagnosis"],
  "finance": ["banking", "bank", "finance", "money", "payment", "trading", "crypto", "investment", "wallet", "fintech"],
  "education": ["school", "university", "college", "student", "teacher", "course", "learning", "education", "training", "lms"],
  "retail": ["shop", "store", "ecommerce", "retail", "products", "cart", "checkout", "inventory", "pos"],
  "hospitality": ["hotel", "restaurant", "travel", "booking", "reservation", "tourism", "food"],
  "technology": ["software", "tech", "developer", "code", "programming", "startup", "saas"],
  "security": ["security", "cyber", "siem", "vapt", "firewall", "protection", "threat"],
  "media": ["news", "content", "video", "music", "streaming", "podcast", "media"],
  "real-estate": ["property", "real estate", "homes", "apartment", "rental", "tenant"]
};

// ==========================================
// INTENT UNDERSTANDING ENGINE
// ==========================================

const createVerbs = ["make", "create", "build", "generate", "design", "develop", "write", "code", "implement", "construct", "craft", "produce"];
const modifyVerbs = ["change", "update", "modify", "edit", "fix", "improve", "adjust", "tweak", "alter", "enhance", "optimize", "refactor"];
const explainVerbs = ["explain", "show", "how", "what", "help", "guide", "teach", "describe", "tell me"];

export function understandRequest(input: string): RequestIntent {
  const lowerInput = input.toLowerCase();
  const simplified = simplifyForAnalysis(input);

  // Determine intent type
  let intentType: 'create' | 'modify' | 'explain' | 'fix' = 'create';
  if (modifyVerbs.some(v => lowerInput.includes(v))) {
    intentType = 'modify';
  } else if (explainVerbs.some(v => lowerInput.startsWith(v))) {
    intentType = 'explain';
  } else if (lowerInput.includes("fix") || lowerInput.includes("debug") || lowerInput.includes("error")) {
    intentType = 'fix';
  }

  // Find matching concepts - score by keyword length (longer = more specific)
  let bestMatch: ConceptDefinition | null = null;
  let bestScore = 0;
  let matchedKeyword = "";

  for (const [conceptName, concept] of Object.entries(conceptLibrary)) {
    for (const keyword of concept.keywords) {
      if (lowerInput.includes(keyword)) {
        const score = keyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = concept;
          matchedKeyword = keyword;
        }
      }
    }
  }

  // Detect industry
  let detectedIndustry: string | null = null;
  for (const [industry, keywords] of Object.entries(industries)) {
    if (keywords.some(k => lowerInput.includes(k))) {
      detectedIndustry = industry;
      break;
    }
  }

  // Determine complexity
  let complexity: 'simple' | 'medium' | 'complex' = 'medium';
  if (lowerInput.includes("simple") || lowerInput.includes("basic") || lowerInput.length < 50) {
    complexity = 'simple';
  } else if (lowerInput.includes("full") || lowerInput.includes("complete") || lowerInput.includes("advanced") || lowerInput.includes("complex") || lowerInput.length > 200) {
    complexity = 'complex';
  }

  // If no direct match, check for product/platform indicators
  if (!bestMatch) {
    if (lowerInput.includes("for") && /\b[A-Z][a-z]+[A-Z]?[a-z]*\b/.test(input)) {
      bestMatch = conceptLibrary["landing"];
    }
  }

  // Extract product/brand name
  const extractedName = extractBrandName(input);

  // Extract features
  const extractedFeatures = extractMentionedFeatures(input);

  // Default to landing page for named products
  if (!bestMatch && extractedName) {
    bestMatch = conceptLibrary["landing"];
  }

  return {
    type: intentType,
    subject: matchedKeyword || "general",
    template: bestMatch?.template || "html-landing",
    confidence: bestMatch ? Math.min(bestScore / 10, 1) : 0.3,
    extractedName,
    extractedFeatures,
    industry: detectedIndustry,
    complexity
  };
}

function simplifyForAnalysis(input: string): string {
  return input
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[-•]\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBrandName(input: string): string | null {
  // CamelCase names
  const camelMatch = input.match(/\b([A-Z][a-z]+[A-Z][a-zA-Z]*)\b/);
  if (camelMatch) return camelMatch[1];

  // "for ProductName" pattern
  const forMatch = input.match(/(?:for|of|called|named)\s+#?\s*([A-Z][a-zA-Z0-9]+)/);
  if (forMatch) return forMatch[1];

  // Quoted names
  const quotedMatch = input.match(/"([^"]+)"/);
  if (quotedMatch) return quotedMatch[1];

  // Single quoted
  const singleQuotedMatch = input.match(/'([^']+)'/);
  if (singleQuotedMatch) return singleQuotedMatch[1];

  return null;
}

function extractMentionedFeatures(input: string): string[] {
  const features: string[] = [];
  const lowerInput = input.toLowerCase();

  const featureKeywords: Record<string, string> = {
    "inventory": "Inventory Management",
    "sales": "Sales Tracking",
    "hr": "HR Management",
    "employee": "Employee Management",
    "payroll": "Payroll",
    "accounting": "Accounting",
    "finance": "Finance",
    "reports": "Reports & Analytics",
    "analytics": "Analytics",
    "monitoring": "Real-time Monitoring",
    "alerts": "Alert System",
    "security": "Security",
    "compliance": "Compliance",
    "siem": "SIEM",
    "vapt": "Vulnerability Testing",
    "ai": "AI-Powered",
    "automation": "Automation",
    "dashboard": "Dashboard",
    "api": "API Integration",
    "authentication": "Authentication",
    "notifications": "Notifications",
    "search": "Search",
    "filter": "Filtering",
    "export": "Export",
    "import": "Import",
    "backup": "Backup",
    "sync": "Sync",
    "realtime": "Real-time",
    "chat": "Chat",
    "messaging": "Messaging",
    "email": "Email",
    "payment": "Payments",
    "billing": "Billing",
    "subscription": "Subscriptions",
    "users": "User Management",
    "roles": "Role Management",
    "permissions": "Permissions",
    "audit": "Audit Log",
    "mobile": "Mobile Support",
    "responsive": "Responsive Design"
  };

  for (const [keyword, feature] of Object.entries(featureKeywords)) {
    if (lowerInput.includes(keyword)) {
      features.push(feature);
    }
  }

  return features.slice(0, 6);
}

// ==========================================
// KNOWLEDGE BASE API
// ==========================================

export function getTemplateFromIntent(intent: RequestIntent): string {
  return intent.template;
}

export function knowsConcept(term: string): boolean {
  const lowerTerm = term.toLowerCase();
  for (const concept of Object.values(conceptLibrary)) {
    if (concept.keywords.some(k => k.includes(lowerTerm) || lowerTerm.includes(k))) {
      return true;
    }
  }
  return false;
}

export function getRelatedConcepts(term: string): string[] {
  const lowerTerm = term.toLowerCase();
  for (const concept of Object.values(conceptLibrary)) {
    if (concept.keywords.some(k => lowerTerm.includes(k))) {
      return concept.relatedConcepts;
    }
  }
  return [];
}

export function getConceptDescription(term: string): string | null {
  const lowerTerm = term.toLowerCase();
  for (const concept of Object.values(conceptLibrary)) {
    if (concept.keywords.some(k => lowerTerm.includes(k))) {
      return concept.description;
    }
  }
  return null;
}

export function getConceptFeatures(term: string): string[] {
  const lowerTerm = term.toLowerCase();
  for (const concept of Object.values(conceptLibrary)) {
    if (concept.keywords.some(k => lowerTerm.includes(k))) {
      return concept.features;
    }
  }
  return [];
}

// Get all known concepts (for debugging/display)
export function getAllConcepts(): string[] {
  return Object.keys(conceptLibrary);
}

// Get concepts by type
export function getConceptsByType(type: string): string[] {
  return Object.entries(conceptLibrary)
    .filter(([_, concept]) => concept.type === type)
    .map(([name, _]) => name);
}
