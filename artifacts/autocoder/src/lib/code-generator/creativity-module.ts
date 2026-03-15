// Creativity Module - Dynamic content customization based on understood concepts
// Makes the AI creative enough to customize any template for any domain

import { RequestIntent } from "./knowledge-base";

export interface DomainContent {
  title: string;
  subtitle: string;
  navItems: { icon: string; label: string; active?: boolean }[];
  stats: { label: string; value: string; change: string; direction: 'up' | 'down' }[];
  features: string[];
  actions: string[];
  colors: { primary: string; accent: string };
  terminology: Record<string, string>;
}

// Domain-specific content library
const domainContent: Record<string, DomainContent> = {
  // Security / VAPT
  "security": {
    title: "Security Dashboard",
    subtitle: "Vulnerability Assessment & Penetration Testing",
    navItems: [
      { icon: "shield", label: "Overview", active: true },
      { icon: "scan", label: "Vulnerability Scan" },
      { icon: "alert", label: "Threats" },
      { icon: "report", label: "Reports" },
      { icon: "target", label: "Pen Tests" },
      { icon: "settings", label: "Settings" }
    ],
    stats: [
      { label: "Critical Vulnerabilities", value: "12", change: "3 new", direction: "up" },
      { label: "Systems Scanned", value: "847", change: "24 today", direction: "up" },
      { label: "Threats Blocked", value: "2,451", change: "+18%", direction: "up" },
      { label: "Security Score", value: "78%", change: "+5%", direction: "up" }
    ],
    features: ["Vulnerability Scanner", "Threat Detection", "Penetration Testing", "Compliance Reports", "Risk Assessment"],
    actions: ["Run Scan", "Generate Report", "View Threats"],
    colors: { primary: "#ef4444", accent: "#f97316" },
    terminology: {
      "users": "Assets",
      "revenue": "Threats Blocked",
      "analytics": "Security Metrics",
      "overview": "Security Overview"
    }
  },

  "vapt": {
    title: "VAPT Dashboard",
    subtitle: "Vulnerability Assessment & Penetration Testing Platform",
    navItems: [
      { icon: "shield", label: "Dashboard", active: true },
      { icon: "search", label: "Vulnerability Scan" },
      { icon: "target", label: "Penetration Tests" },
      { icon: "alert", label: "CVE Database" },
      { icon: "file", label: "Reports" },
      { icon: "server", label: "Assets" },
      { icon: "settings", label: "Configuration" }
    ],
    stats: [
      { label: "Critical CVEs", value: "8", change: "2 new today", direction: "up" },
      { label: "High Severity", value: "23", change: "5 remediated", direction: "down" },
      { label: "Assets Scanned", value: "156", change: "12 pending", direction: "up" },
      { label: "Compliance Score", value: "82%", change: "+7% this week", direction: "up" }
    ],
    features: ["Network Scanning", "Web App Testing", "API Security", "Code Analysis", "Remediation Tracking"],
    actions: ["Start Scan", "New Pen Test", "Export Report"],
    colors: { primary: "#dc2626", accent: "#ea580c" },
    terminology: {
      "users": "Targets",
      "revenue": "Vulnerabilities Found",
      "customers": "Assets",
      "products": "Scan Results"
    }
  },

  "siem": {
    title: "SIEM Dashboard",
    subtitle: "Security Information & Event Management",
    navItems: [
      { icon: "monitor", label: "Live Monitor", active: true },
      { icon: "log", label: "Event Logs" },
      { icon: "alert", label: "Alerts" },
      { icon: "search", label: "Threat Hunt" },
      { icon: "chart", label: "Analytics" },
      { icon: "rules", label: "Correlation Rules" },
      { icon: "settings", label: "Settings" }
    ],
    stats: [
      { label: "Events/Second", value: "12.4K", change: "Peak: 45K", direction: "up" },
      { label: "Active Alerts", value: "47", change: "12 critical", direction: "up" },
      { label: "Log Sources", value: "234", change: "All healthy", direction: "up" },
      { label: "Threat Score", value: "Medium", change: "2 IOCs detected", direction: "up" }
    ],
    features: ["Real-time Monitoring", "Log Correlation", "Threat Intelligence", "Incident Response", "Forensics"],
    actions: ["View Logs", "Create Alert", "Hunt Threats"],
    colors: { primary: "#7c3aed", accent: "#8b5cf6" },
    terminology: {}
  },

  // Healthcare
  "healthcare": {
    title: "Healthcare Dashboard",
    subtitle: "Patient Management System",
    navItems: [
      { icon: "home", label: "Overview", active: true },
      { icon: "users", label: "Patients" },
      { icon: "calendar", label: "Appointments" },
      { icon: "file", label: "Medical Records" },
      { icon: "pill", label: "Prescriptions" },
      { icon: "chart", label: "Analytics" }
    ],
    stats: [
      { label: "Total Patients", value: "2,847", change: "+12 today", direction: "up" },
      { label: "Appointments Today", value: "48", change: "5 pending", direction: "up" },
      { label: "Bed Occupancy", value: "78%", change: "23 available", direction: "up" },
      { label: "Staff on Duty", value: "124", change: "Full capacity", direction: "up" }
    ],
    features: ["Patient Records", "Appointment Scheduling", "Prescription Management", "Lab Results", "Billing"],
    actions: ["New Patient", "Schedule", "View Records"],
    colors: { primary: "#0ea5e9", accent: "#06b6d4" },
    terminology: {
      "users": "Patients",
      "revenue": "Appointments",
      "products": "Services"
    }
  },

  // E-commerce
  "ecommerce": {
    title: "Store Dashboard",
    subtitle: "E-Commerce Management",
    navItems: [
      { icon: "home", label: "Overview", active: true },
      { icon: "package", label: "Products" },
      { icon: "cart", label: "Orders" },
      { icon: "users", label: "Customers" },
      { icon: "chart", label: "Analytics" },
      { icon: "settings", label: "Settings" }
    ],
    stats: [
      { label: "Total Sales", value: "$45,231", change: "+12% this month", direction: "up" },
      { label: "Orders Today", value: "156", change: "+8% vs yesterday", direction: "up" },
      { label: "Products", value: "1,234", change: "45 low stock", direction: "up" },
      { label: "Customers", value: "8,492", change: "+234 new", direction: "up" }
    ],
    features: ["Product Management", "Order Processing", "Inventory", "Customer Analytics", "Promotions"],
    actions: ["Add Product", "View Orders", "Analytics"],
    colors: { primary: "#8b5cf6", accent: "#a855f7" },
    terminology: {}
  },

  // Finance / Banking
  "finance": {
    title: "Finance Dashboard",
    subtitle: "Financial Management Platform",
    navItems: [
      { icon: "home", label: "Overview", active: true },
      { icon: "wallet", label: "Accounts" },
      { icon: "transfer", label: "Transactions" },
      { icon: "chart", label: "Analytics" },
      { icon: "file", label: "Reports" },
      { icon: "settings", label: "Settings" }
    ],
    stats: [
      { label: "Total Balance", value: "$1.2M", change: "+5.2% MTD", direction: "up" },
      { label: "Transactions", value: "3,847", change: "234 today", direction: "up" },
      { label: "Pending", value: "$45,230", change: "12 awaiting", direction: "up" },
      { label: "Revenue", value: "$892K", change: "+18% YoY", direction: "up" }
    ],
    features: ["Account Management", "Transaction History", "Budgeting", "Reports", "Forecasting"],
    actions: ["Transfer", "New Account", "Reports"],
    colors: { primary: "#10b981", accent: "#34d399" },
    terminology: {
      "users": "Accounts",
      "products": "Transactions"
    }
  },

  // HR / HRMS
  "hrms": {
    title: "HR Dashboard",
    subtitle: "Human Resource Management System",
    navItems: [
      { icon: "home", label: "Overview", active: true },
      { icon: "users", label: "Employees" },
      { icon: "calendar", label: "Attendance" },
      { icon: "money", label: "Payroll" },
      { icon: "briefcase", label: "Recruitment" },
      { icon: "chart", label: "Performance" }
    ],
    stats: [
      { label: "Total Employees", value: "1,247", change: "+23 this month", direction: "up" },
      { label: "Present Today", value: "1,189", change: "95.3% attendance", direction: "up" },
      { label: "Open Positions", value: "34", change: "12 interviews", direction: "up" },
      { label: "Payroll Due", value: "$2.4M", change: "In 5 days", direction: "up" }
    ],
    features: ["Employee Directory", "Attendance Tracking", "Payroll Processing", "Leave Management", "Performance Reviews"],
    actions: ["Add Employee", "Run Payroll", "Post Job"],
    colors: { primary: "#6366f1", accent: "#818cf8" },
    terminology: {
      "customers": "Employees",
      "products": "Positions"
    }
  },

  // Education / LMS
  "education": {
    title: "Learning Dashboard",
    subtitle: "Learning Management System",
    navItems: [
      { icon: "home", label: "Overview", active: true },
      { icon: "book", label: "Courses" },
      { icon: "users", label: "Students" },
      { icon: "calendar", label: "Schedule" },
      { icon: "file", label: "Assignments" },
      { icon: "chart", label: "Progress" }
    ],
    stats: [
      { label: "Active Courses", value: "48", change: "5 new this week", direction: "up" },
      { label: "Enrolled Students", value: "12,450", change: "+892 this month", direction: "up" },
      { label: "Completion Rate", value: "78%", change: "+5% vs last month", direction: "up" },
      { label: "Assignments Due", value: "234", change: "45 pending review", direction: "up" }
    ],
    features: ["Course Management", "Student Tracking", "Assignments", "Quizzes", "Certificates"],
    actions: ["New Course", "Add Student", "Create Quiz"],
    colors: { primary: "#f59e0b", accent: "#fbbf24" },
    terminology: {
      "customers": "Students",
      "products": "Courses",
      "revenue": "Enrollments"
    }
  },

  // Project Management
  "project": {
    title: "Project Dashboard",
    subtitle: "Project Management Platform",
    navItems: [
      { icon: "home", label: "Overview", active: true },
      { icon: "folder", label: "Projects" },
      { icon: "task", label: "Tasks" },
      { icon: "users", label: "Team" },
      { icon: "calendar", label: "Timeline" },
      { icon: "chart", label: "Reports" }
    ],
    stats: [
      { label: "Active Projects", value: "24", change: "3 due this week", direction: "up" },
      { label: "Tasks Completed", value: "847", change: "+45 today", direction: "up" },
      { label: "Team Members", value: "36", change: "All assigned", direction: "up" },
      { label: "On Track", value: "87%", change: "3 at risk", direction: "up" }
    ],
    features: ["Project Tracking", "Task Management", "Team Collaboration", "Gantt Charts", "Time Tracking"],
    actions: ["New Project", "Add Task", "Assign Team"],
    colors: { primary: "#3b82f6", accent: "#60a5fa" },
    terminology: {
      "customers": "Clients",
      "products": "Deliverables"
    }
  },

  // Default / Generic
  "default": {
    title: "Dashboard",
    subtitle: "Management Overview",
    navItems: [
      { icon: "home", label: "Overview", active: true },
      { icon: "chart", label: "Analytics" },
      { icon: "users", label: "Users" },
      { icon: "file", label: "Reports" },
      { icon: "settings", label: "Settings" }
    ],
    stats: [
      { label: "Total Users", value: "2,340", change: "+12% this month", direction: "up" },
      { label: "Active Now", value: "847", change: "Peak today", direction: "up" },
      { label: "Revenue", value: "$45,231", change: "+8% vs last month", direction: "up" },
      { label: "Growth", value: "23%", change: "On target", direction: "up" }
    ],
    features: ["Dashboard", "Analytics", "Reports", "User Management"],
    actions: ["New", "Export", "Settings"],
    colors: { primary: "#8b5cf6", accent: "#a855f7" },
    terminology: {}
  }
};

// Detect domain from intent
export function detectDomain(intent: RequestIntent, input: string): string {
  const lowerInput = input.toLowerCase();

  // Security domains
  if (lowerInput.includes("vapt") || lowerInput.includes("vulnerability") || lowerInput.includes("penetration test")) {
    return "vapt";
  }
  if (lowerInput.includes("siem") || lowerInput.includes("security information") || lowerInput.includes("event management")) {
    return "siem";
  }
  if (lowerInput.includes("security") || lowerInput.includes("cyber") || lowerInput.includes("threat")) {
    return "security";
  }

  // Finance domains
  if (lowerInput.includes("banking") || lowerInput.includes("bank system") || lowerInput.includes("account transfer")) {
    return "banking";
  }
  if (lowerInput.includes("invoice") || lowerInput.includes("invoicing") || lowerInput.includes("billing system")) {
    return "invoice";
  }
  if (lowerInput.includes("finance") || lowerInput.includes("money") || lowerInput.includes("budget") || lowerInput.includes("expense")) {
    return "finance";
  }

  // HR domains
  if (lowerInput.includes("hrms") || lowerInput.includes("human resource") || lowerInput.includes("hr system")) {
    return "hrms";
  }
  if (lowerInput.includes("payroll") || lowerInput.includes("salary") || lowerInput.includes("payslip")) {
    return "payroll";
  }
  if (lowerInput.includes("recruitment") || lowerInput.includes("hiring") || lowerInput.includes("applicant") || lowerInput.includes("job posting")) {
    return "recruitment";
  }
  if (lowerInput.includes("employee") || lowerInput.includes("attendance") || lowerInput.includes("leave management")) {
    return "hrms";
  }

  // Healthcare domains
  if (lowerInput.includes("pharmacy") || lowerInput.includes("medicine") || lowerInput.includes("drug")) {
    return "pharmacy";
  }
  if (lowerInput.includes("health") || lowerInput.includes("medical") || lowerInput.includes("patient") || lowerInput.includes("hospital") || lowerInput.includes("clinic")) {
    return "healthcare";
  }

  // Retail domains
  if (lowerInput.includes("pos") || lowerInput.includes("point of sale") || lowerInput.includes("cashier")) {
    return "pos";
  }
  if (lowerInput.includes("inventory") || lowerInput.includes("stock") || lowerInput.includes("warehouse")) {
    return "inventory";
  }
  if (lowerInput.includes("shop") || lowerInput.includes("store") || lowerInput.includes("ecommerce") || lowerInput.includes("e-commerce") || lowerInput.includes("product catalog")) {
    return "ecommerce";
  }

  // Enterprise domains
  if (lowerInput.includes("erp") || lowerInput.includes("enterprise resource")) {
    return "erp";
  }
  if (lowerInput.includes("crm") || lowerInput.includes("customer relationship") || lowerInput.includes("lead") || lowerInput.includes("deal pipeline")) {
    return "crm";
  }
  if (lowerInput.includes("project") || lowerInput.includes("task") || lowerInput.includes("kanban") || lowerInput.includes("sprint")) {
    return "project";
  }

  // Education domains
  if (lowerInput.includes("lms") || lowerInput.includes("learning management") || lowerInput.includes("online course")) {
    return "lms";
  }
  if (lowerInput.includes("school") || lowerInput.includes("education") || lowerInput.includes("student") || lowerInput.includes("classroom")) {
    return "school";
  }

  // Communication domains
  if (lowerInput.includes("sms") || lowerInput.includes("bulk message") || lowerInput.includes("messaging platform")) {
    return "sms";
  }
  if (lowerInput.includes("email campaign") || lowerInput.includes("newsletter") || lowerInput.includes("email marketing")) {
    return "email";
  }

  // Logistics domains
  if (lowerInput.includes("logistics") || lowerInput.includes("shipment") || lowerInput.includes("delivery tracking")) {
    return "logistics";
  }
  if (lowerInput.includes("fleet") || lowerInput.includes("vehicle management") || lowerInput.includes("driver")) {
    return "fleet";
  }

  // Hospitality domains
  if (lowerInput.includes("hotel") || lowerInput.includes("room booking") || lowerInput.includes("reservation")) {
    return "hotel";
  }
  if (lowerInput.includes("restaurant") || lowerInput.includes("menu") || lowerInput.includes("table booking") || lowerInput.includes("food order")) {
    return "restaurant";
  }

  // Support domains
  if (lowerInput.includes("helpdesk") || lowerInput.includes("support ticket") || lowerInput.includes("ticketing")) {
    return "helpdesk";
  }
  if (lowerInput.includes("feedback") || lowerInput.includes("survey") || lowerInput.includes("customer feedback")) {
    return "feedback";
  }

  // Check industry from intent
  if (intent.industry) {
    const industryMap: Record<string, string> = {
      "healthcare": "healthcare",
      "finance": "finance",
      "education": "education",
      "retail": "ecommerce",
      "security": "security"
    };
    if (industryMap[intent.industry]) {
      return industryMap[intent.industry];
    }
  }

  return "default";
}

// Get domain content
export function getDomainContent(domain: string): DomainContent {
  return domainContent[domain] || domainContent["default"];
}

// Generate SVG icons for nav items
function getNavIcon(iconName: string): string {
  const icons: Record<string, string> = {
    "shield": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    "scan": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
    "alert": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    "target": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    "report": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    "home": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    "users": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    "chart": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    "settings": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    "file": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    "server": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
    "monitor": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    "log": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    "search": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    "rules": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    "calendar": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    "pill": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.5 18.5L19 9a4.24 4.24 0 00-6-6l-9.5 9.5a4.24 4.24 0 006 6z"/><line x1="7.5" y1="13.5" x2="11" y2="10"/></svg>',
    "package": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    "cart": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    "wallet": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    "transfer": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    "money": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    "briefcase": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    "book": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    "folder": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    "task": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
  };
  return icons[iconName] || icons["home"];
}

// Creatively customize template HTML
export function customizeTemplate(html: string, domain: string): string {
  const content = getDomainContent(domain);
  let customized = html;

  // Replace title
  customized = customized.replace(/<title>[^<]*<\/title>/, `<title>${content.title}</title>`);

  // Replace primary colors
  customized = customized.replace(/--primary:\s*#[0-9a-fA-F]{6}/g, `--primary: ${content.colors.primary}`);
  customized = customized.replace(/#8b5cf6/gi, content.colors.primary);
  customized = customized.replace(/#a855f7/gi, content.colors.accent);
  customized = customized.replace(/#ec4899/gi, content.colors.accent);

  // Replace sidebar logo/title
  customized = customized.replace(
    /<div class="sidebar-logo">[^<]*<\/div>/,
    `<div class="sidebar-logo">${content.title.split(' ')[0]}</div>`
  );

  // Replace dashboard title
  customized = customized.replace(/<h1>Overview<\/h1>/, `<h1>${content.navItems[0]?.label || 'Overview'}</h1>`);

  // Replace nav items with domain-specific ones
  const navItemsHtml = content.navItems.map(item => `
      <a href="#" class="nav-item${item.active ? ' active' : ''}">
        <span class="nav-icon" aria-hidden="true">
          ${getNavIcon(item.icon)}
        </span>
        ${item.label}
      </a>`).join('');

  // Replace the entire nav section
  customized = customized.replace(
    /<nav class="sidebar-nav">[\s\S]*?<\/nav>/,
    `<nav class="sidebar-nav">${navItemsHtml}
    </nav>`
  );

  // Replace stats
  if (content.stats.length >= 4) {
    const statsHtml = content.stats.map(stat => `
      <div class="stat-card">
        <div class="stat-label">${stat.label}</div>
        <div class="stat-value">${stat.value}</div>
        <div class="stat-change ${stat.direction}">${stat.direction === 'up' ? '↑' : '↓'} ${stat.change}</div>
      </div>`).join('');

    customized = customized.replace(
      /<div class="stats-grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/,
      `<div class="stats-grid">${statsHtml}
    </div>`
    );
  }

  // Replace chart title with domain-appropriate one
  const chartTitles: Record<string, string> = {
    "vapt": "Vulnerabilities Over Time",
    "siem": "Events & Alerts",
    "security": "Threat Activity",
    "healthcare": "Patient Activity",
    "ecommerce": "Sales Trends",
    "finance": "Transaction Volume",
    "hrms": "Workforce Analytics",
    "education": "Enrollment Trends",
    "project": "Project Progress",
    "default": "Activity Overview"
  };

  customized = customized.replace(
    /<h2 class="chart-title">[^<]*<\/h2>/,
    `<h2 class="chart-title">${chartTitles[domain] || chartTitles["default"]}</h2>`
  );

  return customized;
}

// Get all available domains
export function getAvailableDomains(): string[] {
  return Object.keys(domainContent);
}