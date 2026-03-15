interface ArchetypeField {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

interface ArchetypeRelationship {
  entity: string;
  type: 'one-to-many' | 'many-to-one' | 'many-to-many';
  field?: string;
}

interface EntityArchetype {
  name: string;
  synonyms: string[];
  category: string;
  fields: ArchetypeField[];
  relationships: ArchetypeRelationship[];
  statusValues?: string[];
}

interface InferredEntity {
  name: string;
  fields: ArchetypeField[];
  relationships: ArchetypeRelationship[];
  matchedArchetype?: string;
  matchConfidence: number;
}

const ENTITY_ARCHETYPES: EntityArchetype[] = [
  {
    name: 'Invoice',
    synonyms: ['bill', 'billing', 'invoice'],
    category: 'financial',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'invoiceNumber', type: 'string', required: true, description: 'Unique invoice identifier' },
      { name: 'issueDate', type: 'date', required: true, description: 'Date invoice was issued' },
      { name: 'dueDate', type: 'date', required: true, description: 'Payment due date' },
      { name: 'subtotal', type: 'number', required: true, description: 'Sum before tax' },
      { name: 'taxRate', type: 'number', required: false, description: 'Tax percentage' },
      { name: 'taxAmount', type: 'number', required: false, description: 'Calculated tax amount' },
      { name: 'total', type: 'number', required: true, description: 'Total amount due' },
      { name: 'currency', type: 'string', required: true, description: 'Currency code (e.g. USD)' },
      { name: 'status', type: 'enum:draft,sent,paid,overdue,cancelled', required: true },
      { name: 'notes', type: 'string', required: false, description: 'Additional notes' },
      { name: 'paidAt', type: 'datetime', required: false, description: 'Date payment was received' },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Customer', type: 'many-to-one', field: 'customerId' },
    ],
    statusValues: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
  },
  {
    name: 'Budget',
    synonyms: ['budget', 'financial-plan'],
    category: 'financial',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true, description: 'Budget name' },
      { name: 'category', type: 'string', required: true, description: 'Budget category' },
      { name: 'allocatedAmount', type: 'number', required: true, description: 'Total allocated budget' },
      { name: 'spentAmount', type: 'number', required: false, description: 'Amount spent so far' },
      { name: 'remainingAmount', type: 'number', required: false, description: 'Remaining budget' },
      { name: 'currency', type: 'string', required: true },
      { name: 'startDate', type: 'date', required: true },
      { name: 'endDate', type: 'date', required: true },
      { name: 'status', type: 'enum:active,closed,exceeded', required: true },
      { name: 'notes', type: 'string', required: false },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Expense',
    synonyms: ['expense', 'expenditure', 'cost'],
    category: 'financial',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true, description: 'Expense title' },
      { name: 'amount', type: 'number', required: true, description: 'Expense amount' },
      { name: 'currency', type: 'string', required: true },
      { name: 'category', type: 'string', required: true, description: 'Expense category' },
      { name: 'date', type: 'date', required: true },
      { name: 'receipt', type: 'string', required: false, description: 'Receipt URL or file path' },
      { name: 'vendor', type: 'string', required: false },
      { name: 'description', type: 'string', required: false },
      { name: 'status', type: 'enum:pending,approved,rejected,reimbursed', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Employee', type: 'many-to-one', field: 'employeeId' },
      { entity: 'Budget', type: 'many-to-one', field: 'budgetId' },
    ],
  },
  {
    name: 'Payment',
    synonyms: ['payment', 'payout', 'remittance'],
    category: 'financial',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'amount', type: 'number', required: true },
      { name: 'currency', type: 'string', required: true },
      { name: 'method', type: 'enum:credit-card,debit-card,bank-transfer,cash,check,paypal,stripe', required: true },
      { name: 'referenceNumber', type: 'string', required: false, description: 'Payment reference' },
      { name: 'paymentDate', type: 'date', required: true },
      { name: 'status', type: 'enum:pending,completed,failed,refunded', required: true },
      { name: 'notes', type: 'string', required: false },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Invoice', type: 'many-to-one', field: 'invoiceId' },
      { entity: 'Customer', type: 'many-to-one', field: 'customerId' },
    ],
  },
  {
    name: 'Transaction',
    synonyms: ['transaction', 'ledger-entry'],
    category: 'financial',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'type', type: 'enum:credit,debit,transfer', required: true },
      { name: 'amount', type: 'number', required: true },
      { name: 'currency', type: 'string', required: true },
      { name: 'description', type: 'string', required: true },
      { name: 'category', type: 'string', required: false },
      { name: 'referenceNumber', type: 'string', required: false },
      { name: 'transactionDate', type: 'date', required: true },
      { name: 'balanceAfter', type: 'number', required: false },
      { name: 'status', type: 'enum:pending,completed,reversed', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Account', type: 'many-to-one', field: 'accountId' },
    ],
  },
  {
    name: 'Employee',
    synonyms: ['employee', 'staff', 'worker', 'team-member'],
    category: 'people',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'firstName', type: 'string', required: true },
      { name: 'lastName', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'phone', type: 'string', required: false },
      { name: 'position', type: 'string', required: true, description: 'Job title' },
      { name: 'department', type: 'string', required: true },
      { name: 'hireDate', type: 'date', required: true },
      { name: 'salary', type: 'number', required: false },
      { name: 'avatar', type: 'string', required: false },
      { name: 'status', type: 'enum:active,on-leave,terminated', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Customer',
    synonyms: ['customer', 'client', 'buyer', 'patron'],
    category: 'people',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'firstName', type: 'string', required: true },
      { name: 'lastName', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'phone', type: 'string', required: false },
      { name: 'company', type: 'string', required: false },
      { name: 'address', type: 'string', required: false },
      { name: 'city', type: 'string', required: false },
      { name: 'state', type: 'string', required: false },
      { name: 'zipCode', type: 'string', required: false },
      { name: 'notes', type: 'string', required: false },
      { name: 'status', type: 'enum:active,inactive', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Contact',
    synonyms: ['contact', 'lead', 'prospect'],
    category: 'people',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'firstName', type: 'string', required: true },
      { name: 'lastName', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'phone', type: 'string', required: false },
      { name: 'company', type: 'string', required: false },
      { name: 'title', type: 'string', required: false, description: 'Job title' },
      { name: 'source', type: 'enum:website,referral,social,event,cold-call,other', required: false },
      { name: 'tags', type: 'string[]', required: false },
      { name: 'lastContactedAt', type: 'datetime', required: false },
      { name: 'status', type: 'enum:new,contacted,qualified,unqualified', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Patient',
    synonyms: ['patient'],
    category: 'people',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'firstName', type: 'string', required: true },
      { name: 'lastName', type: 'string', required: true },
      { name: 'dateOfBirth', type: 'date', required: true },
      { name: 'gender', type: 'enum:male,female,other', required: true },
      { name: 'email', type: 'string', required: false },
      { name: 'phone', type: 'string', required: true },
      { name: 'address', type: 'string', required: false },
      { name: 'emergencyContact', type: 'string', required: false },
      { name: 'emergencyPhone', type: 'string', required: false },
      { name: 'insuranceProvider', type: 'string', required: false },
      { name: 'insuranceNumber', type: 'string', required: false },
      { name: 'bloodType', type: 'enum:A+,A-,B+,B-,AB+,AB-,O+,O-', required: false },
      { name: 'allergies', type: 'string', required: false },
      { name: 'status', type: 'enum:active,discharged,deceased', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Student',
    synonyms: ['student', 'learner', 'pupil'],
    category: 'people',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'firstName', type: 'string', required: true },
      { name: 'lastName', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'phone', type: 'string', required: false },
      { name: 'dateOfBirth', type: 'date', required: false },
      { name: 'enrollmentDate', type: 'date', required: true },
      { name: 'grade', type: 'string', required: false, description: 'Current grade level' },
      { name: 'gpa', type: 'number', required: false },
      { name: 'guardianName', type: 'string', required: false },
      { name: 'guardianPhone', type: 'string', required: false },
      { name: 'status', type: 'enum:active,graduated,suspended,withdrawn', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Member',
    synonyms: ['member', 'subscriber'],
    category: 'people',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'firstName', type: 'string', required: true },
      { name: 'lastName', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'phone', type: 'string', required: false },
      { name: 'membershipType', type: 'enum:basic,premium,vip', required: true },
      { name: 'joinDate', type: 'date', required: true },
      { name: 'expiryDate', type: 'date', required: false },
      { name: 'avatar', type: 'string', required: false },
      { name: 'status', type: 'enum:active,expired,cancelled,suspended', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Tenant',
    synonyms: ['tenant', 'renter', 'lessee'],
    category: 'people',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'firstName', type: 'string', required: true },
      { name: 'lastName', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'phone', type: 'string', required: true },
      { name: 'emergencyContact', type: 'string', required: false },
      { name: 'moveInDate', type: 'date', required: true },
      { name: 'leaseEndDate', type: 'date', required: false },
      { name: 'monthlyRent', type: 'number', required: true },
      { name: 'depositPaid', type: 'number', required: false },
      { name: 'status', type: 'enum:active,past,evicted', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Property', type: 'many-to-one', field: 'propertyId' },
    ],
  },
  {
    name: 'Candidate',
    synonyms: ['candidate', 'applicant', 'job-seeker'],
    category: 'people',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'firstName', type: 'string', required: true },
      { name: 'lastName', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'phone', type: 'string', required: false },
      { name: 'resume', type: 'string', required: false, description: 'Resume file URL' },
      { name: 'coverLetter', type: 'string', required: false },
      { name: 'linkedinUrl', type: 'string', required: false },
      { name: 'experience', type: 'number', required: false, description: 'Years of experience' },
      { name: 'skills', type: 'string[]', required: false },
      { name: 'appliedDate', type: 'date', required: true },
      { name: 'status', type: 'enum:applied,screening,interview,offer,hired,rejected', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Vendor',
    synonyms: ['vendor', 'supplier', 'provider'],
    category: 'people',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true, description: 'Vendor company name' },
      { name: 'contactName', type: 'string', required: false },
      { name: 'email', type: 'string', required: true },
      { name: 'phone', type: 'string', required: false },
      { name: 'address', type: 'string', required: false },
      { name: 'website', type: 'string', required: false },
      { name: 'category', type: 'string', required: false },
      { name: 'rating', type: 'number', required: false },
      { name: 'paymentTerms', type: 'string', required: false },
      { name: 'status', type: 'enum:active,inactive,blacklisted', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Article',
    synonyms: ['article', 'blog-post', 'news'],
    category: 'content',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'slug', type: 'string', required: true, description: 'URL-friendly identifier' },
      { name: 'content', type: 'string', required: true, description: 'Article body (rich text)' },
      { name: 'excerpt', type: 'string', required: false, description: 'Short summary' },
      { name: 'coverImage', type: 'string', required: false },
      { name: 'category', type: 'string', required: false },
      { name: 'tags', type: 'string[]', required: false },
      { name: 'publishedAt', type: 'datetime', required: false },
      { name: 'status', type: 'enum:draft,published,archived', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'User', type: 'many-to-one', field: 'authorId' },
    ],
  },
  {
    name: 'Post',
    synonyms: ['post', 'feed-item', 'update'],
    category: 'content',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: false },
      { name: 'content', type: 'string', required: true },
      { name: 'mediaUrl', type: 'string', required: false },
      { name: 'likes', type: 'number', required: false },
      { name: 'tags', type: 'string[]', required: false },
      { name: 'visibility', type: 'enum:public,private,followers', required: true },
      { name: 'status', type: 'enum:active,hidden,flagged', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'User', type: 'many-to-one', field: 'authorId' },
    ],
  },
  {
    name: 'Comment',
    synonyms: ['comment', 'reply', 'response'],
    category: 'content',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'content', type: 'string', required: true },
      { name: 'parentId', type: 'number', required: false, description: 'Parent comment for threading' },
      { name: 'likes', type: 'number', required: false },
      { name: 'status', type: 'enum:visible,hidden,flagged', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'User', type: 'many-to-one', field: 'authorId' },
      { entity: 'Post', type: 'many-to-one', field: 'postId' },
    ],
  },
  {
    name: 'Page',
    synonyms: ['page', 'web-page', 'cms-page'],
    category: 'content',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'slug', type: 'string', required: true },
      { name: 'content', type: 'string', required: true },
      { name: 'metaTitle', type: 'string', required: false },
      { name: 'metaDescription', type: 'string', required: false },
      { name: 'template', type: 'string', required: false },
      { name: 'sortOrder', type: 'number', required: false },
      { name: 'status', type: 'enum:draft,published,archived', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Document',
    synonyms: ['document', 'file', 'attachment'],
    category: 'content',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'fileUrl', type: 'string', required: true },
      { name: 'fileType', type: 'string', required: true },
      { name: 'fileSize', type: 'number', required: false, description: 'Size in bytes' },
      { name: 'category', type: 'string', required: false },
      { name: 'description', type: 'string', required: false },
      { name: 'version', type: 'number', required: false },
      { name: 'status', type: 'enum:active,archived,deleted', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'User', type: 'many-to-one', field: 'uploadedById' },
    ],
  },
  {
    name: 'Notification',
    synonyms: ['notification', 'alert'],
    category: 'content',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'message', type: 'string', required: true },
      { name: 'type', type: 'enum:info,success,warning,error', required: true },
      { name: 'isRead', type: 'boolean', required: true },
      { name: 'link', type: 'string', required: false },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'User', type: 'many-to-one', field: 'userId' },
    ],
  },
  {
    name: 'Message',
    synonyms: ['message', 'chat-message', 'dm'],
    category: 'content',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'content', type: 'string', required: true },
      { name: 'attachment', type: 'string', required: false },
      { name: 'isRead', type: 'boolean', required: true },
      { name: 'sentAt', type: 'datetime', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'User', type: 'many-to-one', field: 'senderId' },
      { entity: 'User', type: 'many-to-one', field: 'receiverId' },
    ],
  },
  {
    name: 'Product',
    synonyms: ['product', 'item', 'goods', 'merchandise'],
    category: 'commerce',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'sku', type: 'string', required: false, description: 'Stock keeping unit' },
      { name: 'price', type: 'number', required: true },
      { name: 'compareAtPrice', type: 'number', required: false, description: 'Original price for sale display' },
      { name: 'cost', type: 'number', required: false, description: 'Cost of goods' },
      { name: 'quantity', type: 'number', required: true, description: 'Stock quantity' },
      { name: 'imageUrl', type: 'string', required: false },
      { name: 'weight', type: 'number', required: false },
      { name: 'tags', type: 'string[]', required: false },
      { name: 'status', type: 'enum:active,draft,archived,out-of-stock', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Category', type: 'many-to-one', field: 'categoryId' },
    ],
  },
  {
    name: 'Order',
    synonyms: ['order', 'purchase-order', 'sales-order'],
    category: 'commerce',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'orderNumber', type: 'string', required: true, description: 'Unique order number' },
      { name: 'orderDate', type: 'date', required: true },
      { name: 'subtotal', type: 'number', required: true },
      { name: 'taxAmount', type: 'number', required: false },
      { name: 'shippingCost', type: 'number', required: false },
      { name: 'total', type: 'number', required: true },
      { name: 'currency', type: 'string', required: true },
      { name: 'shippingAddress', type: 'string', required: false },
      { name: 'trackingNumber', type: 'string', required: false },
      { name: 'notes', type: 'string', required: false },
      { name: 'status', type: 'enum:pending,confirmed,processing,shipped,delivered,cancelled,refunded', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Customer', type: 'many-to-one', field: 'customerId' },
    ],
    statusValues: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
  },
  {
    name: 'OrderItem',
    synonyms: ['order-item', 'line-item', 'order-line'],
    category: 'commerce',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'quantity', type: 'number', required: true },
      { name: 'unitPrice', type: 'number', required: true },
      { name: 'totalPrice', type: 'number', required: true },
      { name: 'discount', type: 'number', required: false },
      { name: 'notes', type: 'string', required: false },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Order', type: 'many-to-one', field: 'orderId' },
      { entity: 'Product', type: 'many-to-one', field: 'productId' },
    ],
  },
  {
    name: 'Cart',
    synonyms: ['cart', 'shopping-cart', 'basket'],
    category: 'commerce',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'sessionId', type: 'string', required: false },
      { name: 'totalItems', type: 'number', required: false },
      { name: 'totalAmount', type: 'number', required: false },
      { name: 'status', type: 'enum:active,abandoned,converted', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Customer', type: 'many-to-one', field: 'customerId' },
    ],
  },
  {
    name: 'Coupon',
    synonyms: ['coupon', 'discount-code', 'promo-code', 'voucher'],
    category: 'commerce',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'code', type: 'string', required: true },
      { name: 'discountType', type: 'enum:percentage,fixed', required: true },
      { name: 'discountValue', type: 'number', required: true },
      { name: 'minOrderAmount', type: 'number', required: false },
      { name: 'maxUses', type: 'number', required: false },
      { name: 'usedCount', type: 'number', required: false },
      { name: 'startDate', type: 'date', required: true },
      { name: 'endDate', type: 'date', required: true },
      { name: 'status', type: 'enum:active,expired,disabled', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Review',
    synonyms: ['review', 'rating', 'testimonial', 'feedback'],
    category: 'commerce',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'rating', type: 'number', required: true, description: 'Rating 1-5' },
      { name: 'title', type: 'string', required: false },
      { name: 'content', type: 'string', required: true },
      { name: 'isVerified', type: 'boolean', required: false },
      { name: 'helpfulCount', type: 'number', required: false },
      { name: 'status', type: 'enum:pending,approved,rejected', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Product', type: 'many-to-one', field: 'productId' },
      { entity: 'Customer', type: 'many-to-one', field: 'customerId' },
    ],
  },
  {
    name: 'Wishlist',
    synonyms: ['wishlist', 'favorites', 'saved-items'],
    category: 'commerce',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: false },
      { name: 'isPublic', type: 'boolean', required: false },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Customer', type: 'many-to-one', field: 'customerId' },
      { entity: 'Product', type: 'many-to-many' },
    ],
  },
  {
    name: 'Subscription',
    synonyms: ['subscription', 'plan', 'membership-plan'],
    category: 'commerce',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'planName', type: 'string', required: true },
      { name: 'price', type: 'number', required: true },
      { name: 'billingCycle', type: 'enum:monthly,quarterly,yearly', required: true },
      { name: 'startDate', type: 'date', required: true },
      { name: 'endDate', type: 'date', required: false },
      { name: 'trialEndDate', type: 'date', required: false },
      { name: 'autoRenew', type: 'boolean', required: true },
      { name: 'status', type: 'enum:active,paused,cancelled,expired,trial', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Customer', type: 'many-to-one', field: 'customerId' },
    ],
  },
  {
    name: 'Category',
    synonyms: ['category', 'group', 'classification', 'tag'],
    category: 'commerce',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'slug', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'parentId', type: 'number', required: false, description: 'Parent category for nesting' },
      { name: 'imageUrl', type: 'string', required: false },
      { name: 'sortOrder', type: 'number', required: false },
      { name: 'status', type: 'enum:active,inactive', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Appointment',
    synonyms: ['appointment', 'visit'],
    category: 'scheduling',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'startTime', type: 'datetime', required: true },
      { name: 'endTime', type: 'datetime', required: true },
      { name: 'location', type: 'string', required: false },
      { name: 'type', type: 'string', required: false },
      { name: 'notes', type: 'string', required: false },
      { name: 'reminderSent', type: 'boolean', required: false },
      { name: 'status', type: 'enum:scheduled,confirmed,in-progress,completed,cancelled,no-show', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Customer', type: 'many-to-one', field: 'customerId' },
    ],
  },
  {
    name: 'Event',
    synonyms: ['event', 'gathering', 'occasion'],
    category: 'scheduling',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'startDate', type: 'datetime', required: true },
      { name: 'endDate', type: 'datetime', required: true },
      { name: 'location', type: 'string', required: false },
      { name: 'venue', type: 'string', required: false },
      { name: 'capacity', type: 'number', required: false },
      { name: 'registeredCount', type: 'number', required: false },
      { name: 'ticketPrice', type: 'number', required: false },
      { name: 'coverImage', type: 'string', required: false },
      { name: 'isPublic', type: 'boolean', required: true },
      { name: 'status', type: 'enum:draft,upcoming,ongoing,completed,cancelled', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Booking',
    synonyms: ['booking', 'reservation'],
    category: 'scheduling',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'bookingNumber', type: 'string', required: true },
      { name: 'checkIn', type: 'datetime', required: true },
      { name: 'checkOut', type: 'datetime', required: true },
      { name: 'guestCount', type: 'number', required: false },
      { name: 'totalPrice', type: 'number', required: true },
      { name: 'specialRequests', type: 'string', required: false },
      { name: 'status', type: 'enum:pending,confirmed,checked-in,checked-out,cancelled,no-show', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Customer', type: 'many-to-one', field: 'customerId' },
    ],
  },
  {
    name: 'Shift',
    synonyms: ['shift', 'work-shift', 'schedule-slot'],
    category: 'scheduling',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'date', type: 'date', required: true },
      { name: 'startTime', type: 'datetime', required: true },
      { name: 'endTime', type: 'datetime', required: true },
      { name: 'breakDuration', type: 'number', required: false, description: 'Break duration in minutes' },
      { name: 'notes', type: 'string', required: false },
      { name: 'status', type: 'enum:scheduled,started,completed,missed', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Employee', type: 'many-to-one', field: 'employeeId' },
    ],
  },
  {
    name: 'TimeEntry',
    synonyms: ['time-entry', 'time-log', 'timesheet-entry'],
    category: 'scheduling',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'date', type: 'date', required: true },
      { name: 'hours', type: 'number', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'isBillable', type: 'boolean', required: true },
      { name: 'hourlyRate', type: 'number', required: false },
      { name: 'status', type: 'enum:draft,submitted,approved,rejected', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Employee', type: 'many-to-one', field: 'employeeId' },
      { entity: 'Project', type: 'many-to-one', field: 'projectId' },
      { entity: 'Task', type: 'many-to-one', field: 'taskId' },
    ],
  },
  {
    name: 'Schedule',
    synonyms: ['schedule', 'timetable', 'calendar'],
    category: 'scheduling',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'startDate', type: 'date', required: true },
      { name: 'endDate', type: 'date', required: true },
      { name: 'recurrence', type: 'enum:none,daily,weekly,biweekly,monthly', required: false },
      { name: 'timezone', type: 'string', required: false },
      { name: 'status', type: 'enum:active,inactive', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Availability',
    synonyms: ['availability', 'open-slot', 'free-time'],
    category: 'scheduling',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'dayOfWeek', type: 'number', required: true, description: '0=Sunday, 6=Saturday' },
      { name: 'startTime', type: 'string', required: true, description: 'HH:MM format' },
      { name: 'endTime', type: 'string', required: true, description: 'HH:MM format' },
      { name: 'isAvailable', type: 'boolean', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Employee', type: 'many-to-one', field: 'employeeId' },
    ],
  },
  {
    name: 'Project',
    synonyms: ['project'],
    category: 'project',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'startDate', type: 'date', required: true },
      { name: 'endDate', type: 'date', required: false },
      { name: 'budget', type: 'number', required: false },
      { name: 'progress', type: 'number', required: false, description: 'Completion percentage' },
      { name: 'priority', type: 'enum:low,medium,high,critical', required: true },
      { name: 'tags', type: 'string[]', required: false },
      { name: 'status', type: 'enum:planning,in-progress,on-hold,completed,cancelled', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Task',
    synonyms: ['task', 'to-do', 'todo', 'work-item', 'ticket', 'issue'],
    category: 'project',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'priority', type: 'enum:low,medium,high,urgent', required: true },
      { name: 'dueDate', type: 'date', required: false },
      { name: 'estimatedHours', type: 'number', required: false },
      { name: 'actualHours', type: 'number', required: false },
      { name: 'tags', type: 'string[]', required: false },
      { name: 'status', type: 'enum:backlog,todo,in-progress,review,done', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Project', type: 'many-to-one', field: 'projectId' },
      { entity: 'Employee', type: 'many-to-one', field: 'assigneeId' },
    ],
  },
  {
    name: 'Milestone',
    synonyms: ['milestone', 'deliverable', 'checkpoint'],
    category: 'project',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'dueDate', type: 'date', required: true },
      { name: 'completedDate', type: 'date', required: false },
      { name: 'progress', type: 'number', required: false },
      { name: 'status', type: 'enum:pending,in-progress,completed,overdue', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Project', type: 'many-to-one', field: 'projectId' },
    ],
  },
  {
    name: 'Sprint',
    synonyms: ['sprint', 'iteration', 'cycle'],
    category: 'project',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'goal', type: 'string', required: false },
      { name: 'startDate', type: 'date', required: true },
      { name: 'endDate', type: 'date', required: true },
      { name: 'capacity', type: 'number', required: false, description: 'Story points capacity' },
      { name: 'velocity', type: 'number', required: false },
      { name: 'status', type: 'enum:planning,active,completed', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Project', type: 'many-to-one', field: 'projectId' },
    ],
  },
  {
    name: 'Board',
    synonyms: ['board', 'kanban-board'],
    category: 'project',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'isDefault', type: 'boolean', required: false },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Project', type: 'many-to-one', field: 'projectId' },
    ],
  },
  {
    name: 'Label',
    synonyms: ['label', 'tag-item'],
    category: 'project',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'color', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'TimeLog',
    synonyms: ['time-log', 'work-log'],
    category: 'project',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'hours', type: 'number', required: true },
      { name: 'date', type: 'date', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'isBillable', type: 'boolean', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Task', type: 'many-to-one', field: 'taskId' },
      { entity: 'Employee', type: 'many-to-one', field: 'userId' },
    ],
  },
  {
    name: 'Course',
    synonyms: ['course', 'program', 'curriculum'],
    category: 'education',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'code', type: 'string', required: false, description: 'Course code (e.g. CS101)' },
      { name: 'instructor', type: 'string', required: false },
      { name: 'duration', type: 'number', required: false, description: 'Duration in hours' },
      { name: 'maxStudents', type: 'number', required: false },
      { name: 'credits', type: 'number', required: false },
      { name: 'level', type: 'enum:beginner,intermediate,advanced', required: false },
      { name: 'coverImage', type: 'string', required: false },
      { name: 'price', type: 'number', required: false },
      { name: 'status', type: 'enum:draft,published,archived', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Lesson',
    synonyms: ['lesson', 'lecture', 'module', 'chapter'],
    category: 'education',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'content', type: 'string', required: false },
      { name: 'videoUrl', type: 'string', required: false },
      { name: 'duration', type: 'number', required: false, description: 'Duration in minutes' },
      { name: 'sortOrder', type: 'number', required: true },
      { name: 'isFree', type: 'boolean', required: false },
      { name: 'status', type: 'enum:draft,published', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Course', type: 'many-to-one', field: 'courseId' },
    ],
  },
  {
    name: 'Assignment',
    synonyms: ['assignment', 'homework', 'coursework'],
    category: 'education',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'dueDate', type: 'date', required: true },
      { name: 'maxScore', type: 'number', required: true },
      { name: 'weight', type: 'number', required: false, description: 'Weight in final grade (%)' },
      { name: 'attachmentUrl', type: 'string', required: false },
      { name: 'status', type: 'enum:draft,published,closed', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Course', type: 'many-to-one', field: 'courseId' },
    ],
  },
  {
    name: 'Grade',
    synonyms: ['grade', 'score', 'mark', 'result'],
    category: 'education',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'score', type: 'number', required: true },
      { name: 'maxScore', type: 'number', required: true },
      { name: 'percentage', type: 'number', required: false },
      { name: 'letterGrade', type: 'string', required: false },
      { name: 'feedback', type: 'string', required: false },
      { name: 'gradedAt', type: 'datetime', required: false },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Student', type: 'many-to-one', field: 'studentId' },
      { entity: 'Assignment', type: 'many-to-one', field: 'assignmentId' },
    ],
  },
  {
    name: 'Enrollment',
    synonyms: ['enrollment', 'registration', 'enrolment'],
    category: 'education',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'enrolledAt', type: 'date', required: true },
      { name: 'completedAt', type: 'date', required: false },
      { name: 'progress', type: 'number', required: false, description: 'Completion percentage' },
      { name: 'status', type: 'enum:enrolled,in-progress,completed,dropped', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Student', type: 'many-to-one', field: 'studentId' },
      { entity: 'Course', type: 'many-to-one', field: 'courseId' },
    ],
  },
  {
    name: 'Quiz',
    synonyms: ['quiz', 'test', 'exam', 'assessment'],
    category: 'education',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'timeLimit', type: 'number', required: false, description: 'Time limit in minutes' },
      { name: 'passingScore', type: 'number', required: false },
      { name: 'maxAttempts', type: 'number', required: false },
      { name: 'questionCount', type: 'number', required: false },
      { name: 'isRandomized', type: 'boolean', required: false },
      { name: 'status', type: 'enum:draft,published,closed', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Course', type: 'many-to-one', field: 'courseId' },
    ],
  },
  {
    name: 'Certificate',
    synonyms: ['certificate', 'credential', 'certification'],
    category: 'education',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'certificateNumber', type: 'string', required: true },
      { name: 'issuedDate', type: 'date', required: true },
      { name: 'expiryDate', type: 'date', required: false },
      { name: 'templateUrl', type: 'string', required: false },
      { name: 'pdfUrl', type: 'string', required: false },
      { name: 'status', type: 'enum:issued,revoked,expired', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Student', type: 'many-to-one', field: 'studentId' },
      { entity: 'Course', type: 'many-to-one', field: 'courseId' },
    ],
  },
  {
    name: 'Prescription',
    synonyms: ['prescription', 'rx'],
    category: 'healthcare',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'medication', type: 'string', required: true },
      { name: 'dosage', type: 'string', required: true },
      { name: 'frequency', type: 'string', required: true, description: 'e.g. twice daily' },
      { name: 'duration', type: 'string', required: false, description: 'e.g. 14 days' },
      { name: 'refillsRemaining', type: 'number', required: false },
      { name: 'prescribedDate', type: 'date', required: true },
      { name: 'expiryDate', type: 'date', required: false },
      { name: 'instructions', type: 'string', required: false },
      { name: 'status', type: 'enum:active,completed,cancelled', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Patient', type: 'many-to-one', field: 'patientId' },
    ],
  },
  {
    name: 'Diagnosis',
    synonyms: ['diagnosis', 'condition', 'medical-condition'],
    category: 'healthcare',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'code', type: 'string', required: false, description: 'ICD code' },
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'severity', type: 'enum:mild,moderate,severe,critical', required: false },
      { name: 'diagnosedDate', type: 'date', required: true },
      { name: 'resolvedDate', type: 'date', required: false },
      { name: 'notes', type: 'string', required: false },
      { name: 'status', type: 'enum:active,resolved,chronic', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Patient', type: 'many-to-one', field: 'patientId' },
    ],
  },
  {
    name: 'Visit',
    synonyms: ['visit', 'consultation', 'checkup', 'encounter'],
    category: 'healthcare',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'visitDate', type: 'datetime', required: true },
      { name: 'reason', type: 'string', required: true },
      { name: 'notes', type: 'string', required: false },
      { name: 'vitals', type: 'string', required: false, description: 'JSON vital signs' },
      { name: 'followUpDate', type: 'date', required: false },
      { name: 'copay', type: 'number', required: false },
      { name: 'status', type: 'enum:scheduled,in-progress,completed,cancelled', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Patient', type: 'many-to-one', field: 'patientId' },
    ],
  },
  {
    name: 'Treatment',
    synonyms: ['treatment', 'procedure', 'therapy'],
    category: 'healthcare',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'startDate', type: 'date', required: true },
      { name: 'endDate', type: 'date', required: false },
      { name: 'cost', type: 'number', required: false },
      { name: 'progress', type: 'number', required: false },
      { name: 'notes', type: 'string', required: false },
      { name: 'status', type: 'enum:planned,in-progress,completed,discontinued', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Patient', type: 'many-to-one', field: 'patientId' },
      { entity: 'Diagnosis', type: 'many-to-one', field: 'diagnosisId' },
    ],
  },
  {
    name: 'LabResult',
    synonyms: ['lab-result', 'test-result', 'lab'],
    category: 'healthcare',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'testName', type: 'string', required: true },
      { name: 'result', type: 'string', required: true },
      { name: 'normalRange', type: 'string', required: false },
      { name: 'unit', type: 'string', required: false },
      { name: 'isAbnormal', type: 'boolean', required: false },
      { name: 'testDate', type: 'date', required: true },
      { name: 'notes', type: 'string', required: false },
      { name: 'status', type: 'enum:pending,completed,reviewed', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Patient', type: 'many-to-one', field: 'patientId' },
    ],
  },
  {
    name: 'Vitals',
    synonyms: ['vitals', 'vital-signs'],
    category: 'healthcare',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'bloodPressureSystolic', type: 'number', required: false },
      { name: 'bloodPressureDiastolic', type: 'number', required: false },
      { name: 'heartRate', type: 'number', required: false },
      { name: 'temperature', type: 'number', required: false },
      { name: 'weight', type: 'number', required: false },
      { name: 'height', type: 'number', required: false },
      { name: 'oxygenSaturation', type: 'number', required: false },
      { name: 'recordedAt', type: 'datetime', required: true },
      { name: 'notes', type: 'string', required: false },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Patient', type: 'many-to-one', field: 'patientId' },
    ],
  },
  {
    name: 'Property',
    synonyms: ['property', 'real-estate', 'building'],
    category: 'realestate',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'type', type: 'enum:house,apartment,condo,townhouse,commercial,land', required: true },
      { name: 'address', type: 'string', required: true },
      { name: 'city', type: 'string', required: true },
      { name: 'state', type: 'string', required: true },
      { name: 'zipCode', type: 'string', required: true },
      { name: 'price', type: 'number', required: true },
      { name: 'bedrooms', type: 'number', required: false },
      { name: 'bathrooms', type: 'number', required: false },
      { name: 'squareFeet', type: 'number', required: false },
      { name: 'yearBuilt', type: 'number', required: false },
      { name: 'description', type: 'string', required: false },
      { name: 'imageUrl', type: 'string', required: false },
      { name: 'status', type: 'enum:available,rented,sold,maintenance,off-market', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Listing',
    synonyms: ['listing', 'property-listing'],
    category: 'realestate',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'listingType', type: 'enum:sale,rent,lease', required: true },
      { name: 'askingPrice', type: 'number', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'listedDate', type: 'date', required: true },
      { name: 'expiryDate', type: 'date', required: false },
      { name: 'viewCount', type: 'number', required: false },
      { name: 'isFeatured', type: 'boolean', required: false },
      { name: 'status', type: 'enum:active,pending,sold,expired,withdrawn', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Property', type: 'many-to-one', field: 'propertyId' },
    ],
  },
  {
    name: 'Lease',
    synonyms: ['lease', 'rental-agreement', 'contract'],
    category: 'realestate',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'leaseNumber', type: 'string', required: true },
      { name: 'startDate', type: 'date', required: true },
      { name: 'endDate', type: 'date', required: true },
      { name: 'monthlyRent', type: 'number', required: true },
      { name: 'securityDeposit', type: 'number', required: false },
      { name: 'terms', type: 'string', required: false },
      { name: 'documentUrl', type: 'string', required: false },
      { name: 'status', type: 'enum:draft,active,expired,terminated', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Property', type: 'many-to-one', field: 'propertyId' },
      { entity: 'Tenant', type: 'many-to-one', field: 'tenantId' },
    ],
  },
  {
    name: 'MaintenanceRequest',
    synonyms: ['maintenance-request', 'work-order', 'repair-request', 'service-request'],
    category: 'realestate',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'description', type: 'string', required: true },
      { name: 'priority', type: 'enum:low,medium,high,emergency', required: true },
      { name: 'category', type: 'enum:plumbing,electrical,hvac,appliance,structural,other', required: true },
      { name: 'reportedDate', type: 'date', required: true },
      { name: 'resolvedDate', type: 'date', required: false },
      { name: 'cost', type: 'number', required: false },
      { name: 'photos', type: 'string[]', required: false },
      { name: 'status', type: 'enum:submitted,in-progress,completed,cancelled', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Property', type: 'many-to-one', field: 'propertyId' },
      { entity: 'Tenant', type: 'many-to-one', field: 'tenantId' },
    ],
  },
  {
    name: 'Showing',
    synonyms: ['showing', 'property-tour', 'viewing'],
    category: 'realestate',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'scheduledDate', type: 'datetime', required: true },
      { name: 'duration', type: 'number', required: false, description: 'Duration in minutes' },
      { name: 'notes', type: 'string', required: false },
      { name: 'feedback', type: 'string', required: false },
      { name: 'interestedLevel', type: 'enum:not-interested,somewhat,very-interested,ready-to-buy', required: false },
      { name: 'status', type: 'enum:scheduled,completed,cancelled,no-show', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Property', type: 'many-to-one', field: 'propertyId' },
      { entity: 'Contact', type: 'many-to-one', field: 'contactId' },
    ],
  },
  {
    name: 'Unit',
    synonyms: ['unit', 'apartment-unit', 'rental-unit'],
    category: 'realestate',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'unitNumber', type: 'string', required: true },
      { name: 'floor', type: 'number', required: false },
      { name: 'bedrooms', type: 'number', required: false },
      { name: 'bathrooms', type: 'number', required: false },
      { name: 'squareFeet', type: 'number', required: false },
      { name: 'rentAmount', type: 'number', required: false },
      { name: 'status', type: 'enum:available,occupied,maintenance,reserved', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Property', type: 'many-to-one', field: 'propertyId' },
    ],
  },
  {
    name: 'Shipment',
    synonyms: ['shipment', 'shipping', 'consignment'],
    category: 'logistics',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'trackingNumber', type: 'string', required: true },
      { name: 'origin', type: 'string', required: true },
      { name: 'destination', type: 'string', required: true },
      { name: 'weight', type: 'number', required: false },
      { name: 'dimensions', type: 'string', required: false },
      { name: 'carrier', type: 'string', required: false },
      { name: 'shippedDate', type: 'date', required: true },
      { name: 'estimatedDelivery', type: 'date', required: false },
      { name: 'actualDelivery', type: 'date', required: false },
      { name: 'cost', type: 'number', required: false },
      { name: 'status', type: 'enum:pending,picked-up,in-transit,out-for-delivery,delivered,returned', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Order', type: 'many-to-one', field: 'orderId' },
    ],
  },
  {
    name: 'Vehicle',
    synonyms: ['vehicle', 'car', 'truck', 'fleet-vehicle'],
    category: 'logistics',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'make', type: 'string', required: true },
      { name: 'model', type: 'string', required: true },
      { name: 'year', type: 'number', required: true },
      { name: 'licensePlate', type: 'string', required: true },
      { name: 'vin', type: 'string', required: false },
      { name: 'color', type: 'string', required: false },
      { name: 'mileage', type: 'number', required: false },
      { name: 'fuelType', type: 'enum:gasoline,diesel,electric,hybrid', required: false },
      { name: 'lastServiceDate', type: 'date', required: false },
      { name: 'status', type: 'enum:available,in-use,maintenance,retired', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Route',
    synonyms: ['route', 'delivery-route', 'path'],
    category: 'logistics',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'origin', type: 'string', required: true },
      { name: 'destination', type: 'string', required: true },
      { name: 'distance', type: 'number', required: false, description: 'Distance in km' },
      { name: 'estimatedTime', type: 'number', required: false, description: 'Estimated time in minutes' },
      { name: 'stops', type: 'number', required: false },
      { name: 'status', type: 'enum:active,inactive,planned', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Delivery',
    synonyms: ['delivery', 'dispatch'],
    category: 'logistics',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'deliveryNumber', type: 'string', required: true },
      { name: 'pickupAddress', type: 'string', required: true },
      { name: 'deliveryAddress', type: 'string', required: true },
      { name: 'scheduledDate', type: 'datetime', required: true },
      { name: 'actualDeliveryDate', type: 'datetime', required: false },
      { name: 'recipientName', type: 'string', required: false },
      { name: 'signature', type: 'string', required: false },
      { name: 'proofOfDelivery', type: 'string', required: false },
      { name: 'notes', type: 'string', required: false },
      { name: 'status', type: 'enum:assigned,picked-up,in-transit,delivered,failed,returned', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Vehicle', type: 'many-to-one', field: 'vehicleId' },
      { entity: 'Route', type: 'many-to-one', field: 'routeId' },
    ],
  },
  {
    name: 'Warehouse',
    synonyms: ['warehouse', 'depot', 'storage-facility'],
    category: 'logistics',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'address', type: 'string', required: true },
      { name: 'city', type: 'string', required: false },
      { name: 'state', type: 'string', required: false },
      { name: 'capacity', type: 'number', required: false, description: 'Total capacity in units' },
      { name: 'currentOccupancy', type: 'number', required: false },
      { name: 'manager', type: 'string', required: false },
      { name: 'phone', type: 'string', required: false },
      { name: 'status', type: 'enum:active,inactive,full', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'InventoryItem',
    synonyms: ['inventory-item', 'stock-item', 'inventory'],
    category: 'logistics',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'sku', type: 'string', required: true },
      { name: 'quantity', type: 'number', required: true },
      { name: 'minQuantity', type: 'number', required: false, description: 'Reorder threshold' },
      { name: 'maxQuantity', type: 'number', required: false },
      { name: 'unitCost', type: 'number', required: false },
      { name: 'location', type: 'string', required: false, description: 'Bin/shelf location' },
      { name: 'lastRestocked', type: 'date', required: false },
      { name: 'expiryDate', type: 'date', required: false },
      { name: 'status', type: 'enum:in-stock,low-stock,out-of-stock,discontinued', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Warehouse', type: 'many-to-one', field: 'warehouseId' },
    ],
  },
  {
    name: 'Recipe',
    synonyms: ['recipe', 'dish', 'menu-item'],
    category: 'food',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'category', type: 'string', required: true },
      { name: 'cuisine', type: 'string', required: false },
      { name: 'prepTime', type: 'number', required: false, description: 'Prep time in minutes' },
      { name: 'cookTime', type: 'number', required: false, description: 'Cook time in minutes' },
      { name: 'servings', type: 'number', required: false },
      { name: 'difficulty', type: 'enum:easy,medium,hard', required: false },
      { name: 'calories', type: 'number', required: false },
      { name: 'ingredients', type: 'string', required: true, description: 'Ingredients list' },
      { name: 'instructions', type: 'string', required: true, description: 'Cooking instructions' },
      { name: 'imageUrl', type: 'string', required: false },
      { name: 'tags', type: 'string[]', required: false },
      { name: 'rating', type: 'number', required: false },
      { name: 'status', type: 'enum:draft,published,archived', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Menu',
    synonyms: ['menu', 'food-menu'],
    category: 'food',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'isActive', type: 'boolean', required: true },
      { name: 'validFrom', type: 'date', required: false },
      { name: 'validUntil', type: 'date', required: false },
      { name: 'status', type: 'enum:active,inactive,seasonal', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Ingredient',
    synonyms: ['ingredient', 'raw-material'],
    category: 'food',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'category', type: 'string', required: false },
      { name: 'unit', type: 'string', required: true, description: 'Measurement unit (g, ml, piece)' },
      { name: 'costPerUnit', type: 'number', required: false },
      { name: 'stockQuantity', type: 'number', required: false },
      { name: 'minStock', type: 'number', required: false },
      { name: 'allergens', type: 'string[]', required: false },
      { name: 'status', type: 'enum:available,low-stock,out-of-stock', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Account',
    synonyms: ['account', 'user-account', 'financial-account'],
    category: 'financial',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'type', type: 'enum:checking,savings,credit,investment', required: true },
      { name: 'accountNumber', type: 'string', required: true },
      { name: 'balance', type: 'number', required: true },
      { name: 'currency', type: 'string', required: true },
      { name: 'institution', type: 'string', required: false },
      { name: 'status', type: 'enum:active,frozen,closed', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Workout',
    synonyms: ['workout', 'exercise', 'training-session'],
    category: 'fitness',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'type', type: 'enum:cardio,strength,flexibility,hiit,yoga,swimming', required: true },
      { name: 'duration', type: 'number', required: false, description: 'Duration in minutes' },
      { name: 'caloriesBurned', type: 'number', required: false },
      { name: 'intensity', type: 'enum:low,moderate,high,extreme', required: false },
      { name: 'notes', type: 'string', required: false },
      { name: 'completedAt', type: 'datetime', required: false },
      { name: 'status', type: 'enum:planned,in-progress,completed,skipped', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Member', type: 'many-to-one', field: 'memberId' },
    ],
  },
  {
    name: 'Deal',
    synonyms: ['deal', 'opportunity', 'pipeline-item'],
    category: 'crm',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'value', type: 'number', required: true, description: 'Deal value' },
      { name: 'currency', type: 'string', required: true },
      { name: 'probability', type: 'number', required: false, description: 'Win probability (%)' },
      { name: 'expectedCloseDate', type: 'date', required: false },
      { name: 'source', type: 'string', required: false },
      { name: 'description', type: 'string', required: false },
      { name: 'stage', type: 'enum:prospecting,qualification,proposal,negotiation,closed-won,closed-lost', required: true },
      { name: 'status', type: 'enum:active,won,lost,stale', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'Contact', type: 'many-to-one', field: 'contactId' },
    ],
  },
  {
    name: 'Campaign',
    synonyms: ['campaign', 'marketing-campaign'],
    category: 'crm',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'type', type: 'enum:email,social,ppc,content,event', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'budget', type: 'number', required: false },
      { name: 'spent', type: 'number', required: false },
      { name: 'startDate', type: 'date', required: true },
      { name: 'endDate', type: 'date', required: false },
      { name: 'targetAudience', type: 'string', required: false },
      { name: 'impressions', type: 'number', required: false },
      { name: 'clicks', type: 'number', required: false },
      { name: 'conversions', type: 'number', required: false },
      { name: 'status', type: 'enum:draft,active,paused,completed', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'User',
    synonyms: ['user', 'account-user', 'app-user'],
    category: 'system',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'username', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'passwordHash', type: 'string', required: true },
      { name: 'firstName', type: 'string', required: false },
      { name: 'lastName', type: 'string', required: false },
      { name: 'avatar', type: 'string', required: false },
      { name: 'role', type: 'enum:admin,manager,user,viewer', required: true },
      { name: 'lastLoginAt', type: 'datetime', required: false },
      { name: 'isActive', type: 'boolean', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    name: 'Announcement',
    synonyms: ['announcement', 'notice', 'bulletin'],
    category: 'content',
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'content', type: 'string', required: true },
      { name: 'priority', type: 'enum:low,normal,high,urgent', required: true },
      { name: 'publishDate', type: 'datetime', required: true },
      { name: 'expiryDate', type: 'datetime', required: false },
      { name: 'isPinned', type: 'boolean', required: false },
      { name: 'status', type: 'enum:draft,published,expired', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [
      { entity: 'User', type: 'many-to-one', field: 'authorId' },
    ],
  },
];

function computeLevenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,
        matrix[j][i - 1] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - computeLevenshteinDistance(a, b) / maxLen;
}

function normalizeEntityName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, '-')
    .replace(/s$/, '');
}

const DOMAIN_CATEGORY_MAP: Record<string, string[]> = {
  'hr': ['people', 'scheduling', 'financial'],
  'healthcare': ['healthcare', 'people', 'scheduling'],
  'ecommerce': ['commerce', 'financial', 'logistics'],
  'finance': ['financial', 'commerce'],
  'education': ['education', 'people', 'scheduling'],
  'realestate': ['realestate', 'financial', 'people'],
  'logistics': ['logistics', 'commerce'],
  'food': ['food', 'commerce', 'logistics'],
  'crm': ['crm', 'people', 'commerce'],
  'project': ['project', 'people'],
  'projectmanagement': ['project', 'people', 'scheduling'],
  'content': ['content', 'system'],
  'fitness': ['fitness', 'people', 'scheduling'],
  'consulting': ['people', 'project', 'financial', 'scheduling'],
  'manufacturing': ['logistics', 'commerce', 'project'],
  'retail': ['commerce', 'financial', 'logistics'],
  'restaurant': ['food', 'commerce', 'scheduling'],
  'inventory': ['commerce', 'logistics'],
};

function findMatchingArchetype(entityName: string, domainId?: string): { archetype: EntityArchetype; confidence: number } | null {
  const normalized = normalizeEntityName(entityName).toLowerCase();
  const words = normalized.split('-').filter(w => w.length > 0);
  const joined = words.join('');

  const normalizedDomainId = domainId ? domainId.toLowerCase().replace(/[^a-z]/g, '') : undefined;
  const preferredCategories = normalizedDomainId ? DOMAIN_CATEGORY_MAP[normalizedDomainId] || [] : [];

  let bestMatch: EntityArchetype | null = null;
  let bestConfidence = 0;

  for (const archetype of ENTITY_ARCHETYPES) {
    const archetypeNorm = archetype.name.toLowerCase();

    if (archetypeNorm === joined || archetypeNorm === normalized.replace(/-/g, '')) {
      return { archetype, confidence: 1.0 };
    }

    for (const synonym of archetype.synonyms) {
      const synNorm = synonym.replace(/-/g, '');
      if (synNorm === joined || synNorm === normalized.replace(/-/g, '')) {
        return { archetype, confidence: 0.95 };
      }
    }

    const nameSim = levenshteinSimilarity(joined, archetypeNorm);
    let adjustedSim = nameSim;
    if (preferredCategories.length > 0 && !preferredCategories.includes(archetype.category)) {
      adjustedSim *= 0.5;
    }
    if (adjustedSim > bestConfidence && nameSim >= 0.75) {
      bestMatch = archetype;
      bestConfidence = adjustedSim;
    }

    for (const synonym of archetype.synonyms) {
      const synNorm = synonym.replace(/-/g, '');
      const synSim = levenshteinSimilarity(joined, synNorm);
      let adjustedSynSim = synSim;
      if (preferredCategories.length > 0 && !preferredCategories.includes(archetype.category)) {
        adjustedSynSim *= 0.5;
      }
      if (adjustedSynSim > bestConfidence && synSim >= 0.75) {
        bestMatch = archetype;
        bestConfidence = adjustedSynSim;
      }
    }

    if (words.length >= 2) {
      const fullNormalized = normalized.replace(/-/g, '');
      if (archetypeNorm.includes(fullNormalized) || fullNormalized.includes(archetypeNorm)) {
        let partialScore = 0.7 + (0.2 * Math.min(fullNormalized.length, archetypeNorm.length) / Math.max(fullNormalized.length, archetypeNorm.length));
        if (preferredCategories.length > 0 && !preferredCategories.includes(archetype.category)) {
          partialScore *= 0.5;
        }
        if (partialScore > bestConfidence) {
          bestMatch = archetype;
          bestConfidence = partialScore;
        }
      }
    }
  }

  if (bestMatch && bestConfidence >= 0.65) {
    return { archetype: bestMatch, confidence: bestConfidence };
  }
  return null;
}

const SEMANTIC_FIELD_GROUPS: string[][] = [
  ['name', 'firstName', 'lastName', 'fullName', 'displayName'],
  ['status', 'stage', 'state', 'currentStatus', 'currentStage'],
  ['description', 'summary', 'overview', 'details', 'content', 'body'],
  ['title', 'name', 'label', 'heading', 'subject'],
  ['email', 'emailAddress', 'contactEmail', 'primaryEmail'],
  ['phone', 'phoneNumber', 'mobile', 'contactPhone', 'tel'],
  ['date', 'createdAt', 'dateCreated', 'createDate'],
  ['notes', 'comment', 'comments', 'remarks', 'memo'],
  ['amount', 'total', 'price', 'cost', 'value'],
  ['url', 'link', 'href', 'website'],
  ['image', 'photo', 'avatar', 'picture', 'thumbnail', 'imageUrl', 'photoUrl'],
  ['address', 'location', 'streetAddress'],
  ['resume', 'resumeUrl', 'cv', 'cvUrl'],
];

export function isSemanticDuplicate(newFieldName: string, existingFieldNames: Set<string>): boolean {
  const lower = newFieldName.toLowerCase();
  for (const group of SEMANTIC_FIELD_GROUPS) {
    if (group.some(g => g.toLowerCase() === lower)) {
      for (const g of group) {
        if (existingFieldNames.has(g)) return true;
      }
    }
  }
  return false;
}

export interface EntityTrait {
  id: string;
  keywords: string[];
  fields: ArchetypeField[];
  relationships: ArchetypeRelationship[];
  statusValues?: string[];
}

const ENTITY_TRAITS: EntityTrait[] = [
  {
    id: 'has-identity',
    keywords: ['name', 'title', 'label', 'record', 'item', 'entry', 'thing', 'object', 'entity'],
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true, description: 'Display name' },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    id: 'has-status',
    keywords: ['status', 'state', 'phase', 'stage', 'workflow', 'lifecycle', 'active', 'draft', 'pending', 'approve', 'reject'],
    fields: [
      { name: 'status', type: 'enum:active,inactive,archived', required: true },
    ],
    relationships: [],
    statusValues: ['active', 'inactive', 'archived'],
  },
  {
    id: 'has-description',
    keywords: ['description', 'detail', 'notes', 'summary', 'about', 'info', 'documentation', 'overview'],
    fields: [
      { name: 'description', type: 'string', required: false, description: 'Detailed description' },
      { name: 'notes', type: 'string', required: false },
    ],
    relationships: [],
  },
  {
    id: 'has-ownership',
    keywords: ['owner', 'creator', 'author', 'assigned', 'responsible', 'manager', 'user', 'person', 'created by'],
    fields: [
      { name: 'createdById', type: 'number', required: false, description: 'Creator/owner user ID' },
    ],
    relationships: [
      { entity: 'User', type: 'many-to-one', field: 'createdById' },
    ],
  },
  {
    id: 'has-timeline',
    keywords: ['date', 'time', 'schedule', 'start', 'end', 'deadline', 'due', 'period', 'duration', 'from', 'to', 'timeline', 'range'],
    fields: [
      { name: 'startDate', type: 'date', required: false, description: 'Start date' },
      { name: 'endDate', type: 'date', required: false, description: 'End date' },
      { name: 'dueDate', type: 'date', required: false, description: 'Due date' },
    ],
    relationships: [],
  },
  {
    id: 'has-pricing',
    keywords: ['price', 'cost', 'amount', 'fee', 'charge', 'rate', 'billing', 'payment', 'money', 'dollar', 'budget', 'revenue', 'income', 'expense', 'financial', 'currency'],
    fields: [
      { name: 'amount', type: 'number', required: true, description: 'Monetary amount' },
      { name: 'currency', type: 'string', required: false, description: 'Currency code (e.g. USD)' },
    ],
    relationships: [],
  },
  {
    id: 'has-quantity',
    keywords: ['quantity', 'count', 'stock', 'inventory', 'units', 'number of', 'total', 'capacity', 'limit', 'balance', 'remaining'],
    fields: [
      { name: 'quantity', type: 'number', required: true, description: 'Quantity/count' },
      { name: 'unit', type: 'string', required: false, description: 'Unit of measurement' },
    ],
    relationships: [],
  },
  {
    id: 'has-location',
    keywords: ['location', 'address', 'place', 'site', 'position', 'coordinate', 'geo', 'latitude', 'longitude', 'city', 'country', 'region', 'area', 'zone', 'map', 'where'],
    fields: [
      { name: 'address', type: 'string', required: false, description: 'Street address' },
      { name: 'city', type: 'string', required: false },
      { name: 'state', type: 'string', required: false },
      { name: 'zipCode', type: 'string', required: false },
      { name: 'latitude', type: 'number', required: false },
      { name: 'longitude', type: 'number', required: false },
    ],
    relationships: [],
  },
  {
    id: 'has-contact',
    keywords: ['email', 'phone', 'contact', 'reach', 'communication', 'call', 'message'],
    fields: [
      { name: 'email', type: 'string', required: false },
      { name: 'phone', type: 'string', required: false },
    ],
    relationships: [],
  },
  {
    id: 'has-media',
    keywords: ['image', 'photo', 'picture', 'video', 'media', 'file', 'upload', 'attachment', 'document', 'thumbnail', 'avatar', 'cover', 'gallery'],
    fields: [
      { name: 'imageUrl', type: 'string', required: false, description: 'Image or media URL' },
      { name: 'fileUrl', type: 'string', required: false, description: 'File attachment URL' },
    ],
    relationships: [],
  },
  {
    id: 'has-categorization',
    keywords: ['category', 'tag', 'label', 'type', 'class', 'group', 'kind', 'genre', 'classification', 'taxonomy', 'topic'],
    fields: [
      { name: 'category', type: 'string', required: false, description: 'Category or type' },
      { name: 'tags', type: 'string[]', required: false, description: 'Tags or labels' },
    ],
    relationships: [],
  },
  {
    id: 'has-priority',
    keywords: ['priority', 'urgency', 'importance', 'severity', 'critical', 'high', 'low', 'medium', 'level', 'rank'],
    fields: [
      { name: 'priority', type: 'enum:low,medium,high,critical', required: false },
    ],
    relationships: [],
  },
  {
    id: 'has-rating',
    keywords: ['rating', 'score', 'review', 'feedback', 'star', 'evaluation', 'quality', 'grade', 'rank', 'assessment'],
    fields: [
      { name: 'rating', type: 'number', required: false, description: 'Rating score' },
      { name: 'feedback', type: 'string', required: false, description: 'Textual feedback' },
    ],
    relationships: [],
  },
  {
    id: 'has-hierarchy',
    keywords: ['parent', 'child', 'tree', 'nested', 'hierarchy', 'sub', 'level', 'folder', 'directory', 'container', 'group', 'belongs to'],
    fields: [
      { name: 'parentId', type: 'number', required: false, description: 'Parent record ID for hierarchy' },
      { name: 'sortOrder', type: 'number', required: false, description: 'Display order' },
    ],
    relationships: [],
  },
  {
    id: 'has-measurement',
    keywords: ['measure', 'sensor', 'reading', 'metric', 'value', 'data point', 'sample', 'observation', 'telemetry', 'signal', 'monitor', 'gauge', 'instrument'],
    fields: [
      { name: 'value', type: 'number', required: true, description: 'Measured value' },
      { name: 'unit', type: 'string', required: false, description: 'Unit of measurement' },
      { name: 'timestamp', type: 'datetime', required: true, description: 'When measurement was taken' },
      { name: 'source', type: 'string', required: false, description: 'Measurement source or sensor' },
      { name: 'isAnomaly', type: 'boolean', required: false, description: 'Whether value is anomalous' },
    ],
    relationships: [],
  },
  {
    id: 'has-versioning',
    keywords: ['version', 'revision', 'history', 'changelog', 'draft', 'publish', 'iteration', 'release'],
    fields: [
      { name: 'version', type: 'number', required: false, description: 'Version number' },
      { name: 'publishedAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    id: 'has-permissions',
    keywords: ['permission', 'access', 'role', 'visibility', 'public', 'private', 'shared', 'restricted', 'acl'],
    fields: [
      { name: 'visibility', type: 'enum:public,private,restricted', required: false },
    ],
    relationships: [],
  },
  {
    id: 'has-scheduling',
    keywords: ['schedule', 'recurring', 'repeat', 'cron', 'frequency', 'interval', 'periodic', 'daily', 'weekly', 'monthly'],
    fields: [
      { name: 'scheduledAt', type: 'datetime', required: false, description: 'Scheduled date/time' },
      { name: 'recurrence', type: 'string', required: false, description: 'Recurrence pattern' },
      { name: 'reminderAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    id: 'has-progress',
    keywords: ['progress', 'completion', 'percentage', 'milestone', 'step', 'phase', 'checkpoint', 'done', 'complete'],
    fields: [
      { name: 'progress', type: 'number', required: false, description: 'Completion percentage (0-100)' },
      { name: 'completedAt', type: 'datetime', required: false },
    ],
    relationships: [],
  },
  {
    id: 'has-configuration',
    keywords: ['config', 'setting', 'preference', 'option', 'parameter', 'toggle', 'flag', 'threshold', 'limit'],
    fields: [
      { name: 'key', type: 'string', required: true, description: 'Configuration key' },
      { name: 'value', type: 'string', required: true, description: 'Configuration value' },
      { name: 'isEnabled', type: 'boolean', required: false },
    ],
    relationships: [],
  },
];

function detectTraitsFromContext(entityName: string, userDescription?: string): { trait: EntityTrait; score: number }[] {
  const context = (entityName + ' ' + (userDescription || '')).toLowerCase();
  const words = context.split(/[\s\-_.,;:!?()]+/).filter(w => w.length > 1);
  const scored: { trait: EntityTrait; score: number }[] = [];

  for (const trait of ENTITY_TRAITS) {
    let matchCount = 0;
    for (const keyword of trait.keywords) {
      const kwParts = keyword.split(/\s+/);
      if (kwParts.length > 1) {
        if (context.includes(keyword)) matchCount += 2;
      } else {
        if (words.includes(keyword)) matchCount++;
        else if (context.includes(keyword)) matchCount += 0.5;
      }
    }
    if (matchCount > 0) {
      const score = Math.min(matchCount / Math.max(trait.keywords.length * 0.3, 1), 1.0);
      scored.push({ trait, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function composeEntityFromTraits(entityName: string, traits: { trait: EntityTrait; score: number }[], userDescription?: string): InferredEntity {
  const fields: ArchetypeField[] = [];
  const relationships: ArchetypeRelationship[] = [];
  const fieldNames = new Set<string>();
  const matchedTraits: string[] = [];
  let hasId = false;

  const topTraits = traits.filter(t => t.score >= 0.15).slice(0, 8);

  if (!topTraits.some(t => t.trait.id === 'has-identity')) {
    topTraits.unshift({ trait: ENTITY_TRAITS.find(t => t.id === 'has-identity')!, score: 1.0 });
  }

  for (const { trait } of topTraits) {
    for (const field of trait.fields) {
      if (field.name === 'id') {
        if (hasId) continue;
        hasId = true;
      }
      if (fieldNames.has(field.name)) continue;
      if (isSemanticDuplicate(field.name, fieldNames)) continue;
      fields.push({ ...field });
      fieldNames.add(field.name);
    }
    for (const rel of trait.relationships) {
      if (!relationships.some(r => r.entity === rel.entity && r.field === rel.field)) {
        relationships.push({ ...rel });
      }
    }
    matchedTraits.push(trait.id);
  }

  if (!fieldNames.has('status') && !topTraits.some(t => t.trait.id === 'has-status')) {
    fields.push({ name: 'status', type: 'enum:active,inactive,archived', required: true });
    fieldNames.add('status');
  }

  if (!fieldNames.has('createdAt')) {
    fields.push({ name: 'createdAt', type: 'datetime', required: false });
  }

  const avgScore = topTraits.length > 0
    ? topTraits.reduce((sum, t) => sum + t.score, 0) / topTraits.length
    : 0;
  const confidence = Math.min(avgScore * 0.6 + (topTraits.length / 8) * 0.4, 0.65);

  return {
    name: entityName,
    fields,
    relationships,
    matchedArchetype: `trait-composed(${matchedTraits.join('+')})`,
    matchConfidence: Math.round(confidence * 100) / 100,
  };
}

export function inferFieldsFromExamples(entityName: string, examples: { fieldName: string; sampleValue?: string }[]): InferredEntity {
  const fields: ArchetypeField[] = [
    { name: 'id', type: 'serial', required: true },
  ];

  for (const ex of examples) {
    const name = ex.fieldName.replace(/\s+/g, '').replace(/^(.)/, (_, c) => c.toLowerCase());
    if (name === 'id') continue;

    let type = 'string';
    let required = true;

    if (ex.sampleValue !== undefined) {
      const val = ex.sampleValue;
      if (/^-?\d+$/.test(val)) type = 'number';
      else if (/^-?\d+\.\d+$/.test(val)) type = 'number';
      else if (/^\d{4}-\d{2}-\d{2}T/.test(val)) type = 'datetime';
      else if (/^\d{4}-\d{2}-\d{2}$/.test(val)) type = 'date';
      else if (/^(true|false)$/i.test(val)) type = 'boolean';
      else if (/^https?:\/\//.test(val)) type = 'string';
      else if (/^[^@]+@[^@]+\.[^@]+$/.test(val)) type = 'string';
    } else {
      const lower = name.toLowerCase();
      if (/date|time|at$/.test(lower)) type = 'datetime';
      else if (/count|amount|price|cost|total|quantity|number|age|score|rating/.test(lower)) type = 'number';
      else if (/^(is|has|can|should|enabled|active|visible)/.test(lower)) type = 'boolean';
      else if (/email/i.test(lower)) type = 'string';
      else if (/url|image|photo|avatar|file/i.test(lower)) type = 'string';
    }

    if (/notes|description|memo|feedback|optional/i.test(name)) required = false;

    fields.push({ name, type, required });
  }

  fields.push({ name: 'createdAt', type: 'datetime', required: false });

  return {
    name: entityName,
    fields,
    relationships: [],
    matchedArchetype: 'user-examples',
    matchConfidence: 0.85,
  };
}

export function inferFieldsForEntity(entityName: string, domainId?: string, userDescription?: string): InferredEntity {
  const match = findMatchingArchetype(entityName, domainId);

  if (match) {
    return {
      name: entityName,
      fields: match.archetype.fields.map(f => ({ ...f })),
      relationships: match.archetype.relationships.map(r => ({ ...r })),
      matchedArchetype: match.archetype.name,
      matchConfidence: match.confidence,
    };
  }

  const detectedTraits = detectTraitsFromContext(entityName, userDescription);
  if (detectedTraits.length > 0) {
    return composeEntityFromTraits(entityName, detectedTraits, userDescription);
  }

  return {
    name: entityName,
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'status', type: 'enum:active,inactive,archived', required: true },
      { name: 'createdAt', type: 'datetime', required: false },
    ],
    relationships: [],
    matchConfidence: 0,
  };
}

export function inferRelationshipsForEntities(entityNames: string[]): ArchetypeRelationship[] {
  const inferred: ArchetypeRelationship[] = [];
  const nameSet = new Set(entityNames.map(n => n.toLowerCase()));

  for (const name of entityNames) {
    const match = findMatchingArchetype(name);
    if (!match) continue;

    for (const rel of match.archetype.relationships) {
      const targetLower = rel.entity.toLowerCase();
      if (nameSet.has(targetLower)) {
        inferred.push({
          entity: rel.entity,
          type: rel.type,
          field: rel.field,
        });
      }

      for (const otherName of entityNames) {
        if (otherName.toLowerCase() === targetLower) continue;
        const otherMatch = findMatchingArchetype(otherName);
        if (otherMatch && otherMatch.archetype.name.toLowerCase() === targetLower) {
          inferred.push({
            entity: otherName,
            type: rel.type,
            field: rel.field,
          });
        }
      }
    }
  }

  return inferred;
}

export function inferEntityFields(entityNames: string[], domainId?: string): InferredEntity[] {
  const results: InferredEntity[] = [];
  const nameSet = new Set(entityNames.map(n => n.toLowerCase()));

  for (const name of entityNames) {
    const entity = inferFieldsForEntity(name, domainId);

    entity.relationships = entity.relationships.filter(rel => {
      const targetLower = rel.entity.toLowerCase();
      if (nameSet.has(targetLower)) return true;

      for (const otherName of entityNames) {
        const otherMatch = findMatchingArchetype(otherName);
        if (otherMatch && otherMatch.archetype.name.toLowerCase() === targetLower) {
          rel.entity = otherName;
          return true;
        }
      }
      return false;
    });

    results.push(entity);
  }

  return results;
}