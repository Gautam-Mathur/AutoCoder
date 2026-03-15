// Domain Templates - Comprehensive functional templates for various industries
// Each template generates a complete working application with backend, database, and frontend

export interface DomainTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  features: string[];
  models: string[];
  prompt: string;
  color: string;
}

export const domainTemplates: DomainTemplate[] = [
  // === SECURITY & IT ===
  {
    id: "vapt",
    name: "VAPT Dashboard",
    icon: "shield",
    description: "Enterprise-grade Vulnerability Assessment & Penetration Testing platform",
    category: "Security",
    features: [
      "Multi-target asset management (IPs, URLs, domains, networks)",
      "Vulnerability scanner with CVE/CVSS database integration",
      "Severity classification (Critical/High/Medium/Low/Info)",
      "OWASP Top 10 compliance checking",
      "Automated scan scheduling (daily/weekly/monthly)",
      "Risk scoring with exploitability metrics",
      "Remediation workflow with assignees and deadlines",
      "Executive and technical PDF report generation",
      "Vulnerability trend analysis and historical tracking",
      "Asset discovery and network mapping",
      "Proof-of-concept attachment for findings",
      "Integration-ready API endpoints",
      "Role-based access (Admin/Analyst/Viewer)",
      "Audit logging for compliance",
      "Dashboard with real-time security posture"
    ],
    models: ["Target", "Vulnerability", "Scan", "ScanResult", "Report", "Remediation", "Asset", "Network", "User", "AuditLog"],
    prompt: "Create a comprehensive VAPT (Vulnerability Assessment and Penetration Testing) platform with database. Features: 1) Asset Management - add targets (IPs, domains, URLs, network ranges) with tags and criticality levels. 2) Vulnerability Scanner - run scans with configurable depth, track CVE IDs, CVSS scores, affected components. 3) Severity Dashboard - visual breakdown by Critical/High/Medium/Low with trend charts. 4) OWASP Compliance - track Top 10 vulnerabilities with recommendations. 5) Remediation Tracking - assign findings to team members with deadlines, track status (Open/In Progress/Resolved/Verified). 6) Scan Scheduling - set up automated recurring scans. 7) Reports - generate executive summaries and detailed technical reports. 8) Risk Scoring - calculate overall risk score based on vulnerabilities and asset criticality. 9) Audit Log - track all actions for compliance. 10) Role-based access control. Include demo data with sample vulnerabilities. Login: admin/admin123",
    color: "#ef4444"
  },
  {
    id: "siem",
    name: "SIEM Platform",
    icon: "monitor",
    description: "Enterprise Security Information & Event Management system",
    category: "Security",
    features: [
      "Multi-source log collection (servers, firewalls, apps)",
      "Real-time event streaming and monitoring",
      "Advanced correlation rule engine",
      "Threat intelligence feed integration",
      "Automated alert generation with severity levels",
      "Incident management and response workflow",
      "Custom dashboard widgets and visualizations",
      "Log search with advanced query language",
      "Compliance reporting (PCI-DSS, HIPAA, SOC2)",
      "User behavior analytics (UBA)",
      "Network traffic analysis",
      "Forensic investigation tools",
      "Automated playbook execution",
      "Email/SMS alert notifications",
      "Data retention policies"
    ],
    models: ["LogSource", "Event", "Alert", "Incident", "Rule", "Playbook", "Notification", "Investigation", "ThreatIntel", "User"],
    prompt: "Create a comprehensive SIEM (Security Information and Event Management) platform with database. Features: 1) Log Sources - manage servers, firewalls, applications as log sources with connection status. 2) Event Collection - real-time event streaming with categorization (Auth, Network, System, Application). 3) Correlation Rules - create if-then rules to detect threats (e.g., 5 failed logins = brute force alert). 4) Alert Management - generate alerts with severity (Critical/High/Medium/Low), assign to analysts. 5) Incident Response - create incidents from alerts, track investigation status, document findings. 6) Dashboard - show event counts, alert trends, top threat sources, active incidents. 7) Log Search - filter by source, timeframe, severity, keyword. 8) Threat Intel - maintain IoC database (malicious IPs, domains, hashes). 9) Playbooks - automated response actions for common threats. 10) Compliance Reports - generate reports for security audits. Include sample events and alerts. Login: admin/admin123",
    color: "#7c3aed"
  },

  // === FINANCE & BANKING ===
  {
    id: "banking",
    name: "Banking System",
    icon: "landmark",
    description: "Full-featured core banking with accounts, transfers, and loans",
    category: "Finance",
    features: [
      "Multi-account management (Savings, Checking, Credit, Fixed Deposit)",
      "Real-time balance tracking with available/pending",
      "Internal and external fund transfers (RTGS, NEFT, IMPS)",
      "Beneficiary management with verification",
      "Transaction categorization and tagging",
      "Recurring payment setup (standing orders)",
      "Loan management (application, approval, EMI tracking)",
      "Credit card management with limits",
      "Interest calculation (simple/compound)",
      "Mini statement and full statement generation",
      "Account freeze/unfreeze functionality",
      "Transaction limits and alerts",
      "Multi-currency support",
      "KYC document management",
      "Branch and ATM locator"
    ],
    models: ["Account", "Transaction", "Transfer", "Beneficiary", "Loan", "LoanPayment", "CreditCard", "KYCDocument", "Branch", "User"],
    prompt: "Create a comprehensive banking system with database. Features: 1) Account Management - create accounts (Savings 4% interest, Checking, Credit Card, Fixed Deposit 6% interest) with unique account numbers. 2) Dashboard - show all accounts with balances, recent transactions, quick transfer. 3) Fund Transfers - internal transfers (instant), external transfers with beneficiary management, scheduled transfers. 4) Transaction History - searchable by date, amount, type, category with export. 5) Loan Module - loan application, approval workflow, EMI calculator, payment tracking with outstanding balance. 6) Credit Cards - track credit limit, available credit, minimum due, payment due date. 7) Recurring Payments - set up standing orders for bills. 8) Statements - generate PDF statements for any date range. 9) Account Settings - set transaction limits, enable/disable features, manage nominees. 10) KYC - upload and verify identity documents. Include demo accounts with transaction history. Login: admin/admin123",
    color: "#10b981"
  },
  {
    id: "finance",
    name: "Finance Dashboard",
    icon: "trending-up",
    description: "Complete financial tracking, budgeting, and reporting platform",
    category: "Finance",
    features: [
      "Multi-budget creation with categories",
      "Income tracking from multiple sources",
      "Expense management with receipt uploads",
      "Bill reminders and payment tracking",
      "Goal-based savings tracking",
      "Cash flow analysis and forecasting",
      "Investment portfolio tracking",
      "Net worth calculation",
      "Tax-ready expense reports",
      "Budget vs Actual variance analysis",
      "Spending insights and trends",
      "Custom financial reports",
      "Multi-currency transaction support",
      "Bank account linking simulation",
      "Financial calendar with due dates"
    ],
    models: ["Budget", "Income", "Expense", "Category", "Bill", "Goal", "Investment", "Report", "Transaction", "User"],
    prompt: "Create a comprehensive personal/business finance dashboard with database. Features: 1) Dashboard - net worth, monthly income vs expenses, budget progress bars, upcoming bills. 2) Budgets - create monthly/yearly budgets by category (Food, Transport, Utilities, Entertainment), track spending vs budget. 3) Income Tracking - log income from salary, freelance, investments with recurring income support. 4) Expense Management - add expenses with categories, tags, receipt notes, split by cost center. 5) Bill Management - track recurring bills with due dates, payment status, reminders. 6) Savings Goals - create goals (Emergency Fund, Vacation, Car), track progress with target dates. 7) Cash Flow - visualize income vs expenses over time, forecast future balances. 8) Investment Tracking - track stocks, mutual funds, crypto with gains/losses. 9) Reports - generate spending by category, monthly summaries, annual tax reports. 10) Analytics - spending trends, category breakdown, month-over-month comparison. Include sample transactions and budgets. Login: admin/admin123",
    color: "#059669"
  },
  {
    id: "invoice",
    name: "Invoicing System",
    icon: "file-text",
    description: "Professional invoicing with payments, recurring billing, and reporting",
    category: "Finance",
    features: [
      "Professional invoice templates",
      "Client and customer database",
      "Product/service catalog with pricing",
      "Multiple tax rate support (GST, VAT, Sales Tax)",
      "Discount management (fixed, percentage)",
      "Recurring invoice automation",
      "Multi-currency invoicing",
      "Payment tracking with partial payments",
      "Payment reminders and overdue alerts",
      "Credit notes and refunds",
      "Quote/Estimate to Invoice conversion",
      "PDF invoice generation with branding",
      "Payment gateway integration ready",
      "Aging reports (30/60/90 days)",
      "Revenue analytics dashboard"
    ],
    models: ["Client", "Invoice", "InvoiceItem", "Payment", "Product", "Tax", "Quote", "CreditNote", "RecurringInvoice", "User"],
    prompt: "Create a comprehensive invoicing system with database. Features: 1) Client Management - store client details, billing/shipping addresses, payment terms (Net 15/30/60), tax IDs. 2) Product Catalog - create products/services with prices, descriptions, tax categories. 3) Invoice Creation - add line items, apply taxes (multiple rates), discounts, notes, terms. 4) Invoice Templates - professional PDF generation with company logo and branding. 5) Payment Tracking - record payments (full/partial), track outstanding amounts, payment methods. 6) Recurring Invoices - set up monthly/weekly automatic invoicing for subscriptions. 7) Quotes - create estimates, convert approved quotes to invoices. 8) Credit Notes - issue refunds and credits against invoices. 9) Payment Reminders - automatic reminders before due, on due, and overdue. 10) Reports - revenue by client, aging report (overdue invoices), monthly revenue, top clients. 11) Dashboard - total revenue, outstanding amounts, overdue invoices, recent activity. Include sample clients and invoices. Login: admin/admin123",
    color: "#0891b2"
  },

  // === HR & WORKFORCE ===
  {
    id: "hrms",
    name: "HRMS",
    icon: "users",
    description: "Complete Human Resource Management with attendance, leaves, and performance",
    category: "HR",
    features: [
      "Comprehensive employee database",
      "Organization hierarchy visualization",
      "Department and team management",
      "Attendance tracking (biometric-ready)",
      "Leave management with approval workflow",
      "Holiday calendar management",
      "Shift scheduling and roster management",
      "Performance review cycles",
      "Goal setting and OKR tracking",
      "Training and certification tracking",
      "Document management (contracts, policies)",
      "Employee self-service portal",
      "Onboarding and offboarding checklists",
      "Expense claims and reimbursements",
      "HR analytics and headcount reports"
    ],
    models: ["Employee", "Department", "Attendance", "Leave", "LeaveType", "Holiday", "Shift", "Performance", "Goal", "Training", "Document", "User"],
    prompt: "Create a comprehensive HRMS (Human Resource Management System) with database. Features: 1) Employee Directory - profiles with photo, contact, emergency contact, job details, reporting manager. 2) Organization Chart - visual hierarchy tree by department. 3) Attendance - daily check-in/out, work hours calculation, late/early tracking, monthly summary. 4) Leave Management - apply for leave (Annual/Sick/Personal/Maternity), approval workflow, leave balance tracking, team calendar. 5) Holiday Calendar - company holidays by location/department. 6) Shift Management - create shifts, assign employees, roster view. 7) Performance Reviews - 360-degree feedback, self-assessment, manager review, goal achievement. 8) Goals/OKRs - set quarterly goals, track progress, link to performance. 9) Training - track certifications, schedule training, completion status. 10) Documents - store contracts, policies, employee documents. 11) Expense Claims - submit expenses with receipts, approval workflow. 12) Dashboard - headcount, attendance rate, pending leaves, upcoming reviews. Include sample employees and departments. Login: admin/admin123",
    color: "#6366f1"
  },
  {
    id: "payroll",
    name: "Payroll System",
    icon: "dollar-sign",
    description: "Complete payroll processing with taxes, deductions, and compliance",
    category: "HR",
    features: [
      "Employee salary structure setup",
      "Multiple pay components (Basic, HRA, DA, Special)",
      "Automatic tax calculation (federal, state)",
      "Pre-tax and post-tax deductions",
      "Bonus and incentive management",
      "Overtime calculation",
      "Loan and advance management",
      "Payslip generation (PDF)",
      "Bank file generation for salary transfer",
      "Tax declaration and proof submission",
      "Form 16/W2 generation",
      "Payroll approval workflow",
      "Arrears calculation",
      "Cost-to-company breakdown",
      "Payroll analytics and reports"
    ],
    models: ["Employee", "SalaryStructure", "PayComponent", "Payroll", "Payslip", "Deduction", "Bonus", "Loan", "TaxDeclaration", "User"],
    prompt: "Create a comprehensive payroll system with database. Features: 1) Employee Setup - link employees with salary structures, bank details, tax info. 2) Salary Structure - define components (Basic, HRA, Transport, Special Allowance, PF, Tax). 3) Pay Components - configure earnings and deductions with calculation rules (fixed, percentage). 4) Monthly Payroll - generate payroll for all employees, calculate gross, deductions, net pay. 5) Tax Calculation - automatic income tax calculation based on slabs, show tax liability. 6) Deductions - manage PF, insurance, loans with EMI schedules. 7) Bonus Management - add performance bonus, festival bonus, annual bonus. 8) Payslip Generation - professional PDF payslips with all components breakdown. 9) Loan Management - issue salary advances, track repayment through payroll. 10) Overtime - calculate OT hours and pay based on rules. 11) Bank Transfer - generate bank file for bulk salary credit. 12) Reports - payroll summary, department-wise cost, tax liability, YTD earnings. Include sample employees with salary history. Login: admin/admin123",
    color: "#8b5cf6"
  },
  {
    id: "recruitment",
    name: "Recruitment Portal",
    icon: "briefcase",
    description: "End-to-end hiring with job board, ATS, and onboarding",
    category: "HR",
    features: [
      "Job posting with rich descriptions",
      "Careers page builder",
      "Applicant tracking system (ATS)",
      "Resume parsing and storage",
      "Candidate pipeline visualization",
      "Interview scheduling with calendar",
      "Scorecards and evaluation forms",
      "Multi-stage hiring workflow",
      "Offer letter generation",
      "Background check tracking",
      "Referral program management",
      "Job board integrations",
      "Talent pool database",
      "Hiring analytics and reports",
      "Onboarding checklist integration"
    ],
    models: ["Job", "Applicant", "Application", "Interview", "Evaluation", "Offer", "Referral", "Stage", "Department", "User"],
    prompt: "Create a comprehensive recruitment portal with database. Features: 1) Job Management - create jobs with title, department, location, requirements, salary range, application deadline. 2) Careers Page - list open positions with filters (department, location, type). 3) Application Form - collect applicant info, resume upload, cover letter, custom questions. 4) Pipeline View - kanban board showing candidates in each stage (Applied→Screening→Interview→Offer→Hired). 5) Resume Database - search and filter candidates by skills, experience, location. 6) Interview Scheduling - schedule interviews with interviewers, send calendar invites. 7) Evaluation Forms - structured scorecards for interviewers to rate candidates. 8) Multi-Stage Process - customizable stages per job (Technical→HR→Final→Offer). 9) Offer Management - generate offer letters, track acceptance/negotiation. 10) Referral Program - employees can refer candidates, track referral bonus. 11) Talent Pool - save promising candidates for future roles. 12) Analytics - time-to-hire, source effectiveness, offer acceptance rate. Include sample jobs and candidates. Login: admin/admin123",
    color: "#a855f7"
  },

  // === HEALTHCARE ===
  {
    id: "healthcare",
    name: "Healthcare System",
    icon: "heart-pulse",
    description: "Complete hospital management with EMR, appointments, and billing",
    category: "Healthcare",
    features: [
      "Patient registration and demographics",
      "Electronic Medical Records (EMR)",
      "Appointment scheduling with slots",
      "Doctor and staff management",
      "Department and specialty management",
      "Prescription management with drug database",
      "Lab test ordering and results",
      "Diagnosis with ICD codes",
      "Vitals tracking (BP, temp, weight)",
      "Medical history timeline",
      "Billing and insurance claims",
      "Inpatient admission management",
      "Bed management and occupancy",
      "Referral management",
      "Patient portal access"
    ],
    models: ["Patient", "Doctor", "Appointment", "MedicalRecord", "Prescription", "Medication", "LabTest", "Vitals", "Bill", "Admission", "Department", "User"],
    prompt: "Create a comprehensive healthcare management system with database. Features: 1) Patient Registration - demographics, contact, emergency contact, insurance, allergies, blood group. 2) Electronic Medical Records - complete medical history, diagnoses, treatments, surgeries. 3) Appointment Scheduling - book by doctor, department, view available slots, appointment status. 4) Doctor Management - profiles, specializations, schedules, consultation fees. 5) Consultation - record symptoms, diagnosis (ICD codes), treatment plan, follow-up. 6) Prescriptions - digital prescriptions with medications, dosage, duration, refills. 7) Lab Orders - order tests, track sample collection, view results, reference ranges. 8) Vitals - track BP, temperature, pulse, weight, height, BMI over time. 9) Inpatient - admission, bed assignment, daily rounds, discharge summary. 10) Billing - consultation fees, procedures, medications, lab tests, insurance claims. 11) Dashboard - today's appointments, patient count, revenue, pending labs. Include sample patients and doctors. Login: admin/admin123",
    color: "#0ea5e9"
  },
  {
    id: "pharmacy",
    name: "Pharmacy Management",
    icon: "pill",
    description: "Complete pharmacy with inventory, prescriptions, and POS",
    category: "Healthcare",
    features: [
      "Medicine database with categories",
      "Batch and expiry tracking",
      "Stock level management",
      "Automatic reorder alerts",
      "Prescription verification",
      "Drug interaction warnings",
      "Controlled substance tracking",
      "Supplier and purchase management",
      "Sales and billing POS",
      "Customer/patient database",
      "Generic substitution suggestions",
      "Returns and expired drug handling",
      "Inventory valuation reports",
      "Sales analytics",
      "Multi-store support"
    ],
    models: ["Medicine", "Batch", "Stock", "Prescription", "Sale", "SaleItem", "Supplier", "Purchase", "Customer", "Return", "User"],
    prompt: "Create a comprehensive pharmacy management system with database. Features: 1) Medicine Master - name, generic name, category, manufacturer, dosage forms, storage conditions. 2) Inventory - batch tracking with manufacturing date, expiry date, batch number, quantity. 3) Stock Alerts - automatic low stock and expiry warnings (30/60/90 days before). 4) Suppliers - manage suppliers, contact info, payment terms, order history. 5) Purchases - create purchase orders, goods receipt, invoice matching. 6) Prescription Handling - verify prescriptions, check for drug interactions, fill orders. 7) POS Sales - quick sale with barcode/search, apply discounts, multiple payment methods. 8) Customer Database - track customer purchase history, prescriptions, loyalty points. 9) Returns - handle customer returns, expired drug returns to suppliers. 10) Controlled Substances - track schedule drugs with special logging. 11) Reports - sales by product, inventory valuation, expiry report, purchase vs sales. 12) Dashboard - today's sales, low stock items, expiring soon, profit margin. Include sample medicines and transactions. Login: admin/admin123",
    color: "#14b8a6"
  },

  // === E-COMMERCE & RETAIL ===
  {
    id: "ecommerce",
    name: "E-Commerce Store",
    icon: "shopping-cart",
    description: "Full-featured online store with cart, checkout, and order management",
    category: "Retail",
    features: [
      "Product catalog with categories",
      "Product variants (size, color)",
      "Image gallery per product",
      "Inventory and stock tracking",
      "Shopping cart persistence",
      "Guest and member checkout",
      "Multiple payment methods",
      "Shipping zone and rate management",
      "Order processing workflow",
      "Order tracking for customers",
      "Coupon and discount codes",
      "Wishlist functionality",
      "Product reviews and ratings",
      "Related products suggestions",
      "Sales analytics dashboard"
    ],
    models: ["Product", "Category", "Variant", "Order", "OrderItem", "Customer", "Cart", "Coupon", "Review", "Shipping", "Payment", "User"],
    prompt: "Create a comprehensive e-commerce store with database. Features: 1) Product Catalog - products with name, description, images, price, compare-at price, categories, tags. 2) Variants - product options (Size: S/M/L, Color: Red/Blue) with separate stock per variant. 3) Categories - hierarchical category tree with featured categories. 4) Shopping Cart - add to cart, update quantity, remove items, persistent cart. 5) Customer Accounts - registration, order history, saved addresses, wishlist. 6) Checkout - shipping address, delivery options, payment method, order summary. 7) Order Management - order status (Pending→Confirmed→Shipped→Delivered), tracking number. 8) Inventory - track stock levels, low stock alerts, out-of-stock handling. 9) Coupons - percentage or fixed discounts, minimum order, expiry dates. 10) Reviews - customers can rate and review products they purchased. 11) Shipping - zones, flat rate or weight-based, free shipping threshold. 12) Admin Dashboard - revenue, orders, top products, conversion rate. Include sample products and orders. Login: admin/admin123",
    color: "#f59e0b"
  },
  {
    id: "inventory",
    name: "Inventory Management",
    icon: "package",
    description: "Warehouse and stock management with multi-location support",
    category: "Retail",
    features: [
      "Product master data management",
      "Multi-warehouse support",
      "Location/bin management",
      "Stock receive and put-away",
      "Stock transfer between locations",
      "Pick, pack, and ship workflow",
      "Barcode/SKU management",
      "Cycle counting and stock takes",
      "Reorder point and quantity",
      "Purchase order management",
      "Supplier management",
      "Stock movement history",
      "Inventory valuation (FIFO, LIFO, Avg)",
      "Dead stock identification",
      "Inventory reports and analytics"
    ],
    models: ["Product", "Warehouse", "Location", "Stock", "StockMovement", "PurchaseOrder", "Supplier", "StockTake", "Transfer", "User"],
    prompt: "Create a comprehensive inventory management system with database. Features: 1) Products - SKU, name, description, category, unit of measure, reorder level, reorder quantity. 2) Warehouses - multiple warehouses with addresses, manage capacity. 3) Locations - bins/shelves within warehouses for precise stock location. 4) Stock Receive - receive goods against PO, put-away to specific locations. 5) Stock Transfers - move stock between warehouses or locations. 6) Stock Movements - track all ins/outs with reason codes (Sale, Return, Adjustment, Transfer). 7) Purchase Orders - create POs to suppliers, track status (Draft→Sent→Partial→Received). 8) Suppliers - supplier database with contact, payment terms, lead time. 9) Cycle Count - schedule counts, record findings, investigate variances. 10) Reorder Alerts - automatic alerts when stock hits reorder point. 11) Stock Valuation - view inventory value by FIFO, LIFO, or Average cost. 12) Reports - stock on hand, movement history, slow-moving items, stock accuracy. Dashboard with inventory overview. Login: admin/admin123",
    color: "#f97316"
  },
  {
    id: "pos",
    name: "POS System",
    icon: "credit-card",
    description: "Retail point of sale with inventory, customers, and reporting",
    category: "Retail",
    features: [
      "Touch-friendly sales interface",
      "Product search and barcode scan",
      "Quick product buttons",
      "Cart management with quantity",
      "Multiple payment methods (Cash, Card, UPI)",
      "Split payment support",
      "Receipt printing/email",
      "Customer lookup and loyalty",
      "Discounts (item-level, cart-level)",
      "Returns and exchanges",
      "Shift management",
      "Cash drawer management",
      "Daily sales reports",
      "Staff performance tracking",
      "Real-time inventory sync"
    ],
    models: ["Product", "Sale", "SaleItem", "Payment", "Customer", "LoyaltyPoints", "Shift", "CashDrawer", "Return", "User"],
    prompt: "Create a comprehensive Point of Sale (POS) system with database. Features: 1) Sales Screen - large touch-friendly product tiles, quick search, barcode input. 2) Cart - add products, adjust quantity, apply item discounts, remove items. 3) Payment - accept multiple methods (Cash, Card, UPI), split payments, calculate change. 4) Receipts - generate receipt with items, taxes, payment method, store info. 5) Customers - lookup by phone/name, show purchase history, loyalty points. 6) Loyalty Program - earn points on purchase, redeem for discounts. 7) Discounts - apply percentage or fixed discount at item or cart level. 8) Returns - process returns with reason, refund to original payment or store credit. 9) Shift Management - open/close shifts, track cash in drawer, end-of-day reconciliation. 10) Cash Drawer - track cash added/removed, expected vs actual. 11) Inventory Sync - real-time stock update on sales. 12) Reports - daily sales summary, hourly breakdown, top products, staff sales. Dashboard with today's metrics. Login: admin/admin123",
    color: "#ec4899"
  },

  // === ENTERPRISE ===
  {
    id: "erp",
    name: "ERP System",
    icon: "building-2",
    description: "Integrated enterprise resource planning with all business modules",
    category: "Enterprise",
    features: [
      "Unified dashboard with KPIs",
      "Sales order management",
      "Purchase order management",
      "Inventory and warehousing",
      "Financial accounting (AR, AP, GL)",
      "HR and payroll basics",
      "Customer management (CRM)",
      "Supplier management",
      "Manufacturing basics (BOM, work orders)",
      "Project costing",
      "Multi-company support",
      "Role-based access control",
      "Approval workflows",
      "Document management",
      "Business intelligence reports"
    ],
    models: ["SalesOrder", "PurchaseOrder", "Product", "Invoice", "Payment", "Customer", "Supplier", "Employee", "Account", "Project", "User"],
    prompt: "Create a comprehensive ERP (Enterprise Resource Planning) system with database. Features: 1) Dashboard - key metrics (revenue, orders, AR, AP), charts, pending approvals. 2) Sales Module - create quotes, convert to sales orders, generate invoices, track payments. 3) Purchase Module - create purchase orders, receive goods, match invoices, pay suppliers. 4) Inventory - product master, stock levels, warehouse management, movements. 5) Finance - chart of accounts, journal entries, AR aging, AP aging, trial balance. 6) HR Basics - employee directory, departments, basic attendance. 7) Customers - customer database, credit limits, payment terms, transaction history. 8) Suppliers - supplier master, lead times, payment terms, order history. 9) Manufacturing - bill of materials, work orders, production tracking. 10) Projects - project costing, time tracking, expense allocation. 11) Approvals - configurable workflows for orders, expenses. 12) Reports - P&L, balance sheet, inventory valuation, sales by product. Multi-module navigation. Login: admin/admin123",
    color: "#3b82f6"
  },
  {
    id: "crm",
    name: "CRM System",
    icon: "contact",
    description: "Sales CRM with leads, deals, pipeline, and customer management",
    category: "Enterprise",
    features: [
      "Contact and company management",
      "Lead capture and scoring",
      "Deal pipeline visualization",
      "Sales stage management",
      "Activity tracking (calls, emails, meetings)",
      "Task and reminder management",
      "Email integration and templates",
      "Quote generation",
      "Sales forecasting",
      "Territory management",
      "Team collaboration",
      "Custom fields and tags",
      "Import/export contacts",
      "Sales analytics dashboard",
      "Win/loss analysis"
    ],
    models: ["Contact", "Company", "Lead", "Deal", "Stage", "Activity", "Task", "Quote", "Campaign", "Territory", "User"],
    prompt: "Create a comprehensive CRM (Customer Relationship Management) system with database. Features: 1) Contacts - store contact details, company, role, email, phone, social, custom fields. 2) Companies - company profiles, size, industry, website, associated contacts. 3) Leads - lead capture with source, score leads (Hot/Warm/Cold), convert to deals. 4) Deal Pipeline - visual kanban with stages (Lead→Qualified→Proposal→Negotiation→Won/Lost), drag-and-drop. 5) Activities - log calls, emails, meetings with notes, link to contacts/deals. 6) Tasks - create follow-up tasks with due dates, reminders, assignments. 7) Email Templates - save and use templates for outreach. 8) Quotes - create quotes with products, send to contacts, track status. 9) Sales Forecast - projected revenue by stage, close date. 10) Campaigns - track marketing campaigns, associate leads/deals. 11) Dashboard - deals by stage, revenue pipeline, activities this week, win rate. 12) Reports - sales by rep, lead source analysis, activity reports. Include sample data. Login: admin/admin123",
    color: "#2563eb"
  },
  {
    id: "project",
    name: "Project Management",
    icon: "kanban",
    description: "Complete project and task management with teams and timelines",
    category: "Enterprise",
    features: [
      "Project creation with details",
      "Task management with subtasks",
      "Kanban board view",
      "Gantt chart timeline",
      "Team member assignment",
      "Due dates and priorities",
      "Time tracking per task",
      "File attachments",
      "Comments and discussions",
      "Milestone tracking",
      "Project templates",
      "Resource allocation",
      "Budget tracking",
      "Progress reports",
      "Calendar integration"
    ],
    models: ["Project", "Task", "Subtask", "Team", "Member", "Milestone", "TimeEntry", "Comment", "Attachment", "Template", "User"],
    prompt: "Create a comprehensive project management system with database. Features: 1) Projects - create projects with name, description, client, dates, budget, status. 2) Task Board - kanban columns (To Do→In Progress→Review→Done), drag-and-drop. 3) Task Details - description, assignee, due date, priority (Low/Medium/High/Urgent), tags, subtasks. 4) Gantt View - timeline view showing task dependencies, durations, milestones. 5) Team Management - add members, assign roles (Admin/Member/Viewer), set permissions. 6) Time Tracking - log time on tasks, view timesheets, calculate billable hours. 7) Milestones - set project milestones with target dates, track completion. 8) Files - attach documents to projects/tasks, organize in folders. 9) Comments - threaded discussions on tasks, @mentions, notifications. 10) Templates - save project templates, quick-start new projects. 11) Budget Tracking - set budget, track actual costs, forecast. 12) Dashboard - my tasks, overdue items, team workload, project progress. Reports on project status. Login: admin/admin123",
    color: "#1d4ed8"
  },

  // === EDUCATION ===
  {
    id: "lms",
    name: "Learning Management",
    icon: "graduation-cap",
    description: "Complete online learning platform with courses, quizzes, and certificates",
    category: "Education",
    features: [
      "Course creation and management",
      "Lesson/module organization",
      "Video, document, and text content",
      "Student enrollment management",
      "Progress tracking per student",
      "Quiz and assessment builder",
      "Assignment submission",
      "Grading and feedback",
      "Discussion forums",
      "Certificate generation",
      "Learning paths",
      "Instructor dashboard",
      "Student analytics",
      "Course ratings and reviews",
      "Gamification (badges, points)"
    ],
    models: ["Course", "Module", "Lesson", "Quiz", "Question", "Student", "Enrollment", "Progress", "Assignment", "Certificate", "Discussion", "User"],
    prompt: "Create a comprehensive Learning Management System (LMS) with database. Features: 1) Courses - create courses with title, description, image, instructor, duration, level. 2) Curriculum - organize into modules and lessons, support video/document/text/external links. 3) Student Enrollment - enroll students, track enrollment date, completion status. 4) Progress Tracking - mark lessons complete, show percentage progress, resume where left off. 5) Quizzes - multiple choice, true/false, short answer questions, automatic grading. 6) Assignments - students submit files, instructor grades with feedback. 7) Discussion Forums - per-course forums for Q&A and discussion. 8) Certificates - auto-generate certificates on course completion. 9) Learning Paths - bundle courses into structured paths. 10) Instructor Dashboard - students enrolled, completion rates, quiz scores. 11) Student Dashboard - my courses, progress, upcoming deadlines, certificates. 12) Gamification - award badges for achievements, points leaderboard. Include sample courses. Login: admin/admin123",
    color: "#f59e0b"
  },
  {
    id: "school",
    name: "School Management",
    icon: "school",
    description: "Complete school administration with students, classes, and grades",
    category: "Education",
    features: [
      "Student registration and profiles",
      "Parent/guardian information",
      "Class and section management",
      "Subject and curriculum setup",
      "Teacher assignment to classes",
      "Class timetable scheduling",
      "Attendance tracking",
      "Grade and report card system",
      "Exam scheduling and marks entry",
      "Fee management and collection",
      "Library management",
      "Transport management",
      "Notice board and announcements",
      "SMS/Email notifications",
      "Parent portal"
    ],
    models: ["Student", "Parent", "Teacher", "Class", "Section", "Subject", "Attendance", "Exam", "Grade", "Fee", "Timetable", "User"],
    prompt: "Create a comprehensive school management system with database. Features: 1) Students - registration with roll number, photo, contact, address, parent details, previous school. 2) Parents - parent/guardian info, relationship, contact, occupation for communication. 3) Classes - create classes (1st-12th), sections (A, B, C), assign class teacher. 4) Subjects - subject master, assign to classes, theory/practical marks split. 5) Teachers - teacher profiles, qualifications, assigned subjects and classes. 6) Timetable - create weekly timetable per class, allocate periods to subjects/teachers. 7) Attendance - daily attendance per class, monthly reports, absent notifications to parents. 8) Exams - schedule exams (Unit Test, Mid-term, Final), enter marks. 9) Report Cards - auto-generate with marks, grades, ranks, teacher remarks. 10) Fees - fee structure per class, collect fees, track dues, generate receipts. 11) Library - book catalog, issue/return, due reminders. 12) Announcements - notice board, send SMS/Email to parents. Dashboard with stats. Login: admin/admin123",
    color: "#eab308"
  },

  // === COMMUNICATION ===
  {
    id: "sms",
    name: "SMS Management",
    icon: "message-square",
    description: "Bulk SMS platform with campaigns, templates, and analytics",
    category: "Communication",
    features: [
      "Contact list management",
      "Contact group segmentation",
      "CSV import/export",
      "Message template library",
      "Variable personalization",
      "Bulk campaign creation",
      "Scheduled messaging",
      "Delivery status tracking",
      "Two-way messaging",
      "Opt-out management",
      "Sender ID management",
      "Credit/usage tracking",
      "Campaign analytics",
      "A/B testing",
      "API access for integration"
    ],
    models: ["Contact", "ContactGroup", "Template", "Campaign", "Message", "DeliveryReport", "OptOut", "SenderId", "Credit", "User"],
    prompt: "Create a comprehensive SMS management platform with database. Features: 1) Contacts - store name, phone, email, custom fields, tags. 2) Groups - create contact groups, add/remove members, dynamic segments. 3) Import/Export - CSV upload with field mapping, export contacts. 4) Templates - create reusable templates with variables ({{name}}, {{date}}). 5) Compose - write message, select recipients (individual/group), preview personalized. 6) Campaigns - name campaigns, track separately, set objectives. 7) Scheduling - send immediately or schedule for specific date/time. 8) Delivery Reports - track Sent/Delivered/Failed status per message. 9) Two-Way - receive replies, view conversation threads. 10) Opt-Out - honor unsubscribe requests, maintain DND list. 11) Sender IDs - manage approved sender IDs, use appropriate for campaigns. 12) Analytics - delivery rate, response rate, campaign performance, cost per message. Dashboard with recent campaigns and credits. Login: admin/admin123",
    color: "#22c55e"
  },
  {
    id: "email",
    name: "Email Campaign",
    icon: "mail",
    description: "Email marketing platform with automation, templates, and tracking",
    category: "Communication",
    features: [
      "Subscriber list management",
      "List segmentation and tags",
      "Drag-and-drop email builder",
      "Responsive email templates",
      "Campaign scheduling",
      "A/B subject line testing",
      "Open and click tracking",
      "Automation workflows",
      "Drip campaigns",
      "Unsubscribe management",
      "Spam score checking",
      "Domain authentication (SPF, DKIM)",
      "Campaign analytics",
      "Integration webhooks",
      "GDPR compliance tools"
    ],
    models: ["Subscriber", "List", "Tag", "Template", "Campaign", "Email", "Click", "Open", "Unsubscribe", "Automation", "User"],
    prompt: "Create a comprehensive email campaign system with database. Features: 1) Subscribers - store email, name, status (Active/Unsubscribed), custom fields. 2) Lists - create subscriber lists, manage membership, segment by criteria. 3) Tags - tag subscribers for segmentation. 4) Templates - HTML email templates with drag-and-drop blocks, save designs. 5) Campaign Creation - compose email, set subject, preview, select recipients. 6) Personalization - merge fields ({{first_name}}), dynamic content. 7) Scheduling - send now or schedule, timezone consideration. 8) A/B Testing - test subject lines, send to sample, send winner. 9) Tracking - track opens (pixel), clicks (link tracking), bounces. 10) Automation - trigger emails on subscribe, create drip sequences. 11) Unsubscribe - one-click unsubscribe, preference center. 12) Analytics - open rate, click rate, bounce rate, campaign comparison, subscriber growth. Dashboard with key metrics. Login: admin/admin123",
    color: "#16a34a"
  },

  // === LOGISTICS ===
  {
    id: "logistics",
    name: "Logistics Tracking",
    icon: "truck",
    description: "Complete shipment management with tracking, routes, and delivery",
    category: "Logistics",
    features: [
      "Shipment creation and booking",
      "Unique tracking number generation",
      "Real-time status updates",
      "Multi-stop route planning",
      "Carrier management",
      "Driver assignment",
      "Proof of delivery capture",
      "Customer tracking portal",
      "Delivery notifications (SMS/Email)",
      "Failed delivery handling",
      "COD collection tracking",
      "Freight cost calculation",
      "SLA and performance tracking",
      "Exception management",
      "Delivery analytics"
    ],
    models: ["Shipment", "Tracking", "Route", "Stop", "Carrier", "Driver", "Vehicle", "Delivery", "POD", "Notification", "User"],
    prompt: "Create a comprehensive logistics tracking system with database. Features: 1) Shipments - create with sender, receiver, package details, weight, dimensions. 2) Tracking Numbers - auto-generate unique tracking IDs. 3) Status Updates - log status changes (Booked→Picked→In Transit→Out for Delivery→Delivered). 4) Routes - plan routes with multiple stops, optimize sequence. 5) Carriers - manage partner carriers, rates, coverage areas. 6) Drivers - driver profiles, assign shipments, track location. 7) Vehicles - vehicle fleet, capacity, availability. 8) Proof of Delivery - capture signature, photo on delivery. 9) Customer Portal - track shipment with tracking number, no login needed. 10) Notifications - SMS/Email on status changes to sender/receiver. 11) Failed Deliveries - log reason, reschedule, attempt tracking. 12) COD - track cash collection, reconcile with finance. 13) Analytics - on-time delivery %, carrier performance, route efficiency. Dashboard with pending deliveries. Login: admin/admin123",
    color: "#ea580c"
  },
  {
    id: "fleet",
    name: "Fleet Management",
    icon: "car",
    description: "Vehicle fleet operations with maintenance, fuel, and drivers",
    category: "Logistics",
    features: [
      "Vehicle registry with details",
      "Driver management and licensing",
      "Vehicle-driver assignment",
      "GPS tracking integration ready",
      "Trip logging and history",
      "Fuel consumption tracking",
      "Maintenance scheduling",
      "Service history records",
      "Insurance and document tracking",
      "Expense management per vehicle",
      "Utilization reports",
      "Driver performance scoring",
      "Odometer tracking",
      "Alert and reminder system",
      "Cost-per-mile analysis"
    ],
    models: ["Vehicle", "Driver", "Trip", "FuelLog", "Maintenance", "Service", "Document", "Expense", "Insurance", "Alert", "User"],
    prompt: "Create a comprehensive fleet management system with database. Features: 1) Vehicles - add vehicles with make, model, year, VIN, license plate, capacity. 2) Drivers - driver profiles, license info, license expiry, contact, emergency contact. 3) Assignment - assign drivers to vehicles, view current assignments. 4) Trips - log trips with start/end location, odometer, purpose, fuel used. 5) Fuel Tracking - log refueling with date, liters, cost, calculate mileage. 6) Maintenance - schedule preventive maintenance (oil change every 5000km, tire rotation). 7) Service History - log all services performed, parts replaced, costs. 8) Documents - store registration, insurance, permits with expiry tracking. 9) Expenses - track all vehicle expenses (fuel, maintenance, tolls, parking). 10) Insurance - policy details, premium, renewal dates, claim history. 11) Alerts - upcoming maintenance, document expiry, license renewal reminders. 12) Reports - cost per vehicle, fuel efficiency, utilization rate, driver performance. Dashboard overview. Login: admin/admin123",
    color: "#dc2626"
  },

  // === HOSPITALITY ===
  {
    id: "hotel",
    name: "Hotel Booking",
    icon: "bed",
    description: "Complete hotel management with reservations, housekeeping, and billing",
    category: "Hospitality",
    features: [
      "Room type and inventory management",
      "Dynamic pricing and rate plans",
      "Reservation calendar view",
      "Online booking engine",
      "Guest profile management",
      "Check-in and check-out process",
      "Room assignment and upgrades",
      "Housekeeping management",
      "Room service orders",
      "Billing and folio management",
      "Payment processing",
      "Guest preferences and history",
      "Occupancy reports",
      "Revenue management",
      "Channel management ready"
    ],
    models: ["Room", "RoomType", "RatePlan", "Reservation", "Guest", "Folio", "Payment", "Housekeeping", "RoomService", "Amenity", "User"],
    prompt: "Create a comprehensive hotel booking system with database. Features: 1) Room Types - define types (Standard, Deluxe, Suite) with amenities, max occupancy, photos. 2) Rooms - individual room numbers, floor, view, status (Available/Occupied/Maintenance). 3) Rate Plans - base rates, seasonal pricing, weekend rates, packages. 4) Reservations - book with guest details, check-in/out dates, room type, special requests. 5) Availability Calendar - visual calendar showing room availability, drag to extend stays. 6) Guest Profiles - store guest info, preferences, loyalty tier, stay history. 7) Check-In/Out - quick check-in, room assignment, key card issue, express checkout. 8) Housekeeping - room status (Clean/Dirty/Inspected), task assignment, priority rooms. 9) Folio/Billing - track charges (room, dining, services), view running total, split folios. 10) Payments - collect advance, final settlement, multiple payment methods. 11) Room Service - take orders, track delivery, charge to folio. 12) Reports - occupancy %, revenue per room, guest statistics. Dashboard with today's arrivals/departures. Login: admin/admin123",
    color: "#0891b2"
  },
  {
    id: "restaurant",
    name: "Restaurant POS",
    icon: "utensils",
    description: "Complete restaurant management with orders, tables, and kitchen display",
    category: "Hospitality",
    features: [
      "Menu management with categories",
      "Item modifiers and add-ons",
      "Table layout and management",
      "Table reservation system",
      "Order taking by table",
      "Kitchen display system (KDS)",
      "Order status tracking",
      "Bill splitting options",
      "Multiple payment methods",
      "Tip management",
      "Inventory deduction",
      "Recipe costing",
      "Staff management and roles",
      "Daily sales reports",
      "Customer loyalty program"
    ],
    models: ["MenuItem", "Category", "Modifier", "Table", "Reservation", "Order", "OrderItem", "KitchenOrder", "Bill", "Payment", "Staff", "User"],
    prompt: "Create a comprehensive restaurant POS system with database. Features: 1) Menu - items with name, price, description, photo, category, available status. 2) Categories - Food (Appetizers, Mains, Desserts), Drinks, Specials. 3) Modifiers - add-ons (extra cheese $2), cooking preferences (rare, medium, well-done). 4) Tables - table layout with numbers, capacity, status (Available/Occupied/Reserved). 5) Reservations - book table with guest name, time, party size, special requests. 6) Order Taking - select table, add items with modifiers, add notes for kitchen. 7) Kitchen Display - orders sent to kitchen with prep time, mark items ready, fire courses. 8) Order Status - track (Ordered→Preparing→Ready→Served). 9) Billing - view table bill, add/remove items, apply discounts, add tip. 10) Split Bill - split by item, by person, or equal split. 11) Payments - cash, card, combine methods, print receipt. 12) Reports - daily sales, popular items, table turnover, staff performance. Dashboard with active tables and pending orders. Login: admin/admin123",
    color: "#0d9488"
  },

  // === SUPPORT ===
  {
    id: "helpdesk",
    name: "Help Desk",
    icon: "headphones",
    description: "Complete support ticket system with SLA, knowledge base, and reporting",
    category: "Support",
    features: [
      "Multi-channel ticket creation",
      "Ticket categorization and tagging",
      "Priority and severity levels",
      "SLA policies and tracking",
      "Automatic ticket assignment",
      "Agent workload balancing",
      "Ticket escalation rules",
      "Canned responses/macros",
      "Internal notes and collaboration",
      "Customer satisfaction surveys",
      "Knowledge base articles",
      "Self-service portal",
      "Ticket merge and split",
      "Time tracking per ticket",
      "Support analytics dashboard"
    ],
    models: ["Ticket", "Category", "Priority", "SLA", "Agent", "Team", "Reply", "Note", "Article", "Survey", "Macro", "User"],
    prompt: "Create a comprehensive help desk system with database. Features: 1) Ticket Creation - submit via form with subject, description, category, priority, attachments. 2) Categories - organize by type (Technical, Billing, General), route to appropriate team. 3) Priority Levels - Low/Medium/High/Urgent with color coding and sort order. 4) SLA Policies - define response time and resolution time per priority, track violations. 5) Assignment - auto-assign based on category, round-robin, or manual assignment. 6) Agent Dashboard - my tickets, open tickets, overdue, SLA breaching. 7) Ticket Workflow - status (New→Open→Pending→Resolved→Closed), assignee, updates. 8) Replies - respond to customer, internal notes for team, attachments. 9) Macros - saved responses for common issues, insert with one click. 10) Knowledge Base - create help articles, categorize, search, link to tickets. 11) Customer Portal - submit tickets, view status, search KB, rate resolution. 12) Surveys - CSAT survey after resolution, track satisfaction score. 13) Analytics - tickets by status, avg response time, resolution time, agent performance. Login: admin/admin123",
    color: "#8b5cf6"
  },
  {
    id: "feedback",
    name: "Feedback System",
    icon: "message-circle",
    description: "Customer feedback and survey platform with analytics",
    category: "Support",
    features: [
      "Survey builder with question types",
      "NPS (Net Promoter Score) surveys",
      "CSAT (Customer Satisfaction) surveys",
      "CES (Customer Effort Score) surveys",
      "Multi-page surveys",
      "Skip logic and branching",
      "Anonymous submissions",
      "Survey distribution (link, email, embed)",
      "Real-time response collection",
      "Sentiment analysis",
      "Response management",
      "Trend analysis over time",
      "Benchmark comparisons",
      "Export and reporting",
      "Integration with CRM/Helpdesk"
    ],
    models: ["Survey", "Question", "QuestionType", "Response", "Answer", "Distribution", "Respondent", "Tag", "Report", "User"],
    prompt: "Create a comprehensive feedback system with database. Features: 1) Survey Builder - create surveys with title, description, thank you message. 2) Question Types - multiple choice, rating (1-5, 1-10), NPS (0-10), open text, yes/no. 3) NPS Surveys - standard NPS question, calculate promoters/passives/detractors. 4) CSAT Surveys - satisfaction rating, benchmark against goals. 5) Multi-Page - organize questions into sections/pages. 6) Logic - skip questions based on previous answers, show/hide conditionally. 7) Distribution - generate shareable link, embed code, send via email. 8) Collection - record responses with timestamp, anonymous option. 9) Response View - see individual responses, filter by date/score. 10) Sentiment - analyze text responses for positive/negative sentiment. 11) Analytics Dashboard - response rate, average scores, NPS trend, word cloud for text. 12) Trend Reports - track scores over time, identify improvements/declines. 13) Export - download responses as CSV, generate PDF reports. Include sample surveys. Login: admin/admin123",
    color: "#a855f7"
  }
];

// Get templates by category
export function getTemplatesByCategory(): Record<string, DomainTemplate[]> {
  const categories: Record<string, DomainTemplate[]> = {};
  domainTemplates.forEach(template => {
    if (!categories[template.category]) {
      categories[template.category] = [];
    }
    categories[template.category].push(template);
  });
  return categories;
}

// Get template by ID
export function getTemplateById(id: string): DomainTemplate | undefined {
  return domainTemplates.find(t => t.id === id);
}

// Get all category names
export function getCategories(): string[] {
  return Array.from(new Set(domainTemplates.map(t => t.category)));
}