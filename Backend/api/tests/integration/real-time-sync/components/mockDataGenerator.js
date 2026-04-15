/**
 * Mock Data Generator Module
 * 
 * Uses fast-check library to create arbitraries for generating realistic
 * pharmaceutical distribution test data for property-based testing.
 * 
 * This module provides generators for:
 * - Items (pharmaceutical products)
 * - Accounts (customers/suppliers)
 * - Warehouses
 * - Batches (with expiry tracking)
 * - Invoice items
 * - Sales invoices
 * - Purchase invoices
 * - Stock adjustments
 * - Payments
 */

const fc = require('fast-check');

// ============================================================================
// PRIMITIVE GENERATORS
// ============================================================================

/**
 * Generate a random pharmaceutical item name
 */
const itemNameArbitrary = () => {
  const prefixes = ['Tab', 'Cap', 'Syp', 'Inj', 'Susp', 'Cream', 'Oint', 'Drop'];
  const medicines = [
    'Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Azithromycin', 'Ciprofloxacin',
    'Metformin', 'Omeprazole', 'Atorvastatin', 'Losartan', 'Amlodipine',
    'Cetirizine', 'Montelukast', 'Salbutamol', 'Prednisolone', 'Diclofenac'
  ];
  const strengths = ['250mg', '500mg', '1g', '5mg', '10mg', '20mg', '50mg', '100mg'];
  
  return fc.tuple(
    fc.constantFrom(...prefixes),
    fc.constantFrom(...medicines),
    fc.constantFrom(...strengths)
  ).map(([prefix, medicine, strength]) => `${prefix} ${medicine} ${strength}`);
};

/**
 * Generate a random item code
 */
const itemCodeArbitrary = () => {
  return fc.tuple(
    fc.string({ minLength: 3, maxLength: 4 }).map(s => s.toUpperCase().replace(/[^A-Z]/g, 'A')),
    fc.integer({ min: 1000, max: 9999 })
  ).map(([letters, number]) => `${letters}${number}`);
};

/**
 * Generate a random category name
 */
const categoryArbitrary = () => {
  return fc.constantFrom(
    'Antibiotics', 'Analgesics', 'Antidiabetics', 'Cardiovascular',
    'Respiratory', 'Gastrointestinal', 'Dermatology', 'Vitamins',
    'Antihistamines', 'Antihypertensives'
  );
};

/**
 * Generate a random unit
 */
const unitArbitrary = () => {
  return fc.constantFrom(
    'piece', 'strip', 'tablet', 'capsule', 'bottle', 'tube', 'box', 'pack'
  );
};

/**
 * Generate a random person name
 */
const personNameArbitrary = () => {
  const firstNames = [
    'Ahmed', 'Ali', 'Hassan', 'Fatima', 'Ayesha', 'Zainab', 'Omar', 'Bilal',
    'Sara', 'Maryam', 'Usman', 'Hamza', 'Aisha', 'Khadija', 'Ibrahim'
  ];
  const lastNames = [
    'Khan', 'Ahmed', 'Ali', 'Hussain', 'Shah', 'Malik', 'Iqbal', 'Raza',
    'Siddiqui', 'Ansari', 'Qureshi', 'Mirza', 'Butt', 'Chaudhry', 'Sheikh'
  ];
  
  return fc.tuple(
    fc.constantFrom(...firstNames),
    fc.constantFrom(...lastNames)
  ).map(([first, last]) => `${first} ${last}`);
};

/**
 * Generate a random company/business name
 */
const companyNameArbitrary = () => {
  const prefixes = ['Al', 'New', 'Star', 'Royal', 'Prime', 'Elite', 'Global', 'Metro'];
  const types = ['Pharma', 'Medical', 'Healthcare', 'Traders', 'Distributors', 'Suppliers'];
  
  return fc.tuple(
    fc.constantFrom(...prefixes),
    fc.constantFrom(...types)
  ).map(([prefix, type]) => `${prefix} ${type}`);
};

/**
 * Generate a random phone number (Pakistani format)
 */
const phoneArbitrary = () => {
  return fc.tuple(
    fc.constantFrom('0300', '0301', '0302', '0303', '0321', '0333', '0345'),
    fc.integer({ min: 1000000, max: 9999999 })
  ).map(([prefix, number]) => `${prefix}${number}`);
};

/**
 * Generate a random email
 */
const emailArbitrary = () => {
  return fc.tuple(
    fc.string({ minLength: 5, maxLength: 10 }).map(s => s.toLowerCase().replace(/[^a-z0-9]/g, 'a')),
    fc.constantFrom('gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com')
  ).map(([name, domain]) => `${name}@${domain}`);
};

/**
 * Generate a random address
 */
const addressArbitrary = () => {
  const streets = ['Main Road', 'Mall Road', 'GT Road', 'Jail Road', 'Canal Road', 'Ferozepur Road'];
  const areas = ['Gulberg', 'DHA', 'Johar Town', 'Model Town', 'Bahria Town', 'Cantt'];
  
  return fc.tuple(
    fc.integer({ min: 1, max: 999 }),
    fc.constantFrom(...streets),
    fc.constantFrom(...areas)
  ).map(([number, street, area]) => `${number} ${street}, ${area}`);
};

/**
 * Generate a random city
 */
const cityArbitrary = () => {
  return fc.constantFrom(
    'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad',
    'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala'
  );
};

/**
 * Generate a random batch number
 */
const batchNumberArbitrary = () => {
  return fc.tuple(
    fc.string({ minLength: 2, maxLength: 3 }).map(s => s.toUpperCase().replace(/[^A-Z]/g, 'A')),
    fc.integer({ min: 100000, max: 999999 })
  ).map(([letters, number]) => `${letters}${number}`);
};

/**
 * Generate a future date for batch expiry (30 to 730 days in future)
 */
const expiryDateArbitrary = () => {
  return fc.integer({ min: 30, max: 730 }).map(days => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  });
};

/**
 * Generate a past date for manufacturing (30 to 365 days in past)
 */
const manufacturingDateArbitrary = () => {
  return fc.integer({ min: 30, max: 365 }).map(days => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  });
};

/**
 * Generate a payment method
 */
const paymentMethodArbitrary = () => {
  return fc.constantFrom('cash', 'bank_transfer', 'cheque', 'credit_card', 'online');
};

/**
 * Generate a stock adjustment reason
 */
const adjustmentReasonArbitrary = () => {
  return fc.constantFrom(
    'damaged', 'expired', 'theft', 'loss', 'found', 'correction', 'return', 'sample'
  );
};

// ============================================================================
// ENTITY GENERATORS
// ============================================================================

/**
 * Generate a random item (pharmaceutical product)
 * @returns {fc.Arbitrary<Object>}
 */
const generateItem = () => {
  return fc.record({
    code: itemCodeArbitrary(),
    name: itemNameArbitrary(),
    category: categoryArbitrary(),
    unit: unitArbitrary(),
    price: fc.double({ min: 10, max: 5000, noNaN: true }).map(p => Number(p.toFixed(2))),
    isActive: fc.boolean(),
    description: fc.option(fc.lorem({ maxCount: 1 }), { nil: undefined }),
  });
};

/**
 * Generate a random account (customer or supplier)
 * @param {string} type - 'customer' or 'supplier'
 * @returns {fc.Arbitrary<Object>}
 */
const generateAccount = (type = 'customer') => {
  const typeArb = type === 'both' 
    ? fc.constantFrom('customer', 'supplier', 'both')
    : fc.constant(type);
  
  return fc.record({
    name: fc.oneof(personNameArbitrary(), companyNameArbitrary()),
    type: typeArb,
    accountType: typeArb,
    contactInfo: fc.record({
      phone: phoneArbitrary(),
      phone1: fc.option(phoneArbitrary(), { nil: undefined }),
      email: fc.option(emailArbitrary(), { nil: undefined }),
      address: addressArbitrary(),
      city: cityArbitrary(),
    }),
    openingBalance: fc.double({ min: -50000, max: 50000, noNaN: true }).map(b => Number(b.toFixed(2))),
  });
};

/**
 * Generate a random warehouse
 * @returns {fc.Arbitrary<Object>}
 */
const generateWarehouse = () => {
  return fc.record({
    code: fc.tuple(
      fc.string({ minLength: 2, maxLength: 3 }).map(s => s.toUpperCase().replace(/[^A-Z]/g, 'A')),
      fc.integer({ min: 1, max: 99 })
    ).map(([letters, number]) => `${letters}${number}`),
    name: fc.tuple(
      fc.constantFrom('Main', 'Central', 'North', 'South', 'East', 'West'),
      fc.constantFrom('Warehouse', 'Depot', 'Store', 'Godown')
    ).map(([prefix, suffix]) => `${prefix} ${suffix}`),
    location: fc.record({
      address: addressArbitrary(),
      city: cityArbitrary(),
      state: fc.constantFrom('Punjab', 'Sindh', 'KPK', 'Balochistan', 'Islamabad'),
      country: fc.constant('Pakistan'),
      postalCode: fc.integer({ min: 10000, max: 99999 }).map(String),
    }),
    contact: fc.record({
      phone: phoneArbitrary(),
      email: fc.option(emailArbitrary(), { nil: undefined }),
    }),
    isActive: fc.boolean(),
  });
};

/**
 * Generate a random batch
 * @param {string} itemId - Item ID for the batch
 * @returns {fc.Arbitrary<Object>}
 */
const generateBatch = (itemId) => {
  return fc.record({
    batchNumber: batchNumberArbitrary(),
    itemId: fc.constant(itemId),
    quantity: fc.integer({ min: 10, max: 1000 }),
    expiryDate: expiryDateArbitrary(),
    manufacturingDate: manufacturingDateArbitrary(),
  });
};

/**
 * Generate a random invoice item
 * @param {string} itemId - Item ID
 * @param {number} price - Item price
 * @returns {fc.Arbitrary<Object>}
 */
const generateInvoiceItem = (itemId, price) => {
  return fc.record({
    itemId: fc.constant(itemId),
    quantity: fc.integer({ min: 1, max: 100 }),
    price: fc.constant(price),
    discount: fc.double({ min: 0, max: 20, noNaN: true }).map(d => Number(d.toFixed(2))),
  }).map(item => ({
    ...item,
    amount: Number(((item.quantity * item.price) * (1 - item.discount / 100)).toFixed(2)),
  }));
};

/**
 * Generate multiple invoice items
 * @param {Array<{id: string, price: number}>} items - Array of items with id and price
 * @returns {fc.Arbitrary<Array>}
 */
const generateInvoiceItems = (items) => {
  if (!items || items.length === 0) {
    throw new Error('Items array must not be empty');
  }
  
  return fc.array(
    fc.nat(items.length - 1).chain(index => {
      const item = items[index];
      return generateInvoiceItem(item.id, item.price);
    }),
    { minLength: 1, maxLength: Math.min(items.length, 10) }
  );
};

/**
 * Generate a random sales invoice
 * @param {string} customerId - Customer ID
 * @param {string} warehouseId - Warehouse ID
 * @param {Array<{id: string, price: number}>} items - Array of items
 * @returns {fc.Arbitrary<Object>}
 */
const generateSalesInvoice = (customerId, warehouseId, items) => {
  return fc.record({
    type: fc.constant('sales'),
    customerId: fc.constant(customerId),
    warehouseId: fc.constant(warehouseId),
    items: generateInvoiceItems(items),
    paymentTerms: fc.record({
      creditDays: fc.integer({ min: 0, max: 90 }),
      paymentMethod: paymentMethodArbitrary(),
    }),
    invoiceDate: fc.constant(new Date()),
    discount: fc.double({ min: 0, max: 10, noNaN: true }).map(d => Number(d.toFixed(2))),
  }).map(invoice => {
    const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
    const discountAmount = Number((subtotal * invoice.discount / 100).toFixed(2));
    const totalAmount = Number((subtotal - discountAmount).toFixed(2));
    
    return {
      ...invoice,
      subtotal,
      discountAmount,
      totalAmount,
    };
  });
};

/**
 * Generate a random purchase invoice
 * @param {string} supplierId - Supplier ID
 * @param {string} warehouseId - Warehouse ID
 * @param {Array<{id: string, price: number}>} items - Array of items
 * @returns {fc.Arbitrary<Object>}
 */
const generatePurchaseInvoice = (supplierId, warehouseId, items) => {
  return fc.record({
    type: fc.constant('purchase'),
    supplierId: fc.constant(supplierId),
    warehouseId: fc.constant(warehouseId),
    items: generateInvoiceItems(items),
    paymentTerms: fc.record({
      creditDays: fc.integer({ min: 0, max: 90 }),
      paymentMethod: paymentMethodArbitrary(),
    }),
    invoiceDate: fc.constant(new Date()),
    discount: fc.double({ min: 0, max: 10, noNaN: true }).map(d => Number(d.toFixed(2))),
  }).map(invoice => {
    const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
    const discountAmount = Number((subtotal * invoice.discount / 100).toFixed(2));
    const totalAmount = Number((subtotal - discountAmount).toFixed(2));
    
    return {
      ...invoice,
      subtotal,
      discountAmount,
      totalAmount,
    };
  });
};

/**
 * Generate a random stock adjustment
 * @param {string} itemId - Item ID
 * @param {string} warehouseId - Warehouse ID
 * @returns {fc.Arbitrary<Object>}
 */
const generateStockAdjustment = (itemId, warehouseId) => {
  return fc.record({
    itemId: fc.constant(itemId),
    warehouseId: fc.constant(warehouseId),
    quantity: fc.integer({ min: -100, max: 100 }).filter(q => q !== 0),
    reason: adjustmentReasonArbitrary(),
    date: fc.constant(new Date()),
    notes: fc.option(fc.lorem({ maxCount: 1 }), { nil: undefined }),
  });
};

/**
 * Generate a random payment
 * @param {string} accountId - Account ID
 * @param {number} maxAmount - Maximum payment amount
 * @returns {fc.Arbitrary<Object>}
 */
const generatePayment = (accountId, maxAmount = 50000) => {
  return fc.record({
    accountId: fc.constant(accountId),
    amount: fc.double({ min: 100, max: maxAmount, noNaN: true }).map(a => Number(a.toFixed(2))),
    paymentMethod: paymentMethodArbitrary(),
    date: fc.constant(new Date()),
    reference: fc.option(
      fc.tuple(
        fc.constantFrom('CHQ', 'TXN', 'REF'),
        fc.integer({ min: 100000, max: 999999 })
      ).map(([prefix, number]) => `${prefix}${number}`),
      { nil: undefined }
    ),
    notes: fc.option(fc.lorem({ maxCount: 1 }), { nil: undefined }),
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Primitive generators
  itemNameArbitrary,
  itemCodeArbitrary,
  categoryArbitrary,
  unitArbitrary,
  personNameArbitrary,
  companyNameArbitrary,
  phoneArbitrary,
  emailArbitrary,
  addressArbitrary,
  cityArbitrary,
  batchNumberArbitrary,
  expiryDateArbitrary,
  manufacturingDateArbitrary,
  paymentMethodArbitrary,
  adjustmentReasonArbitrary,
  
  // Entity generators
  generateItem,
  generateAccount,
  generateWarehouse,
  generateBatch,
  generateInvoiceItem,
  generateInvoiceItems,
  generateSalesInvoice,
  generatePurchaseInvoice,
  generateStockAdjustment,
  generatePayment,
};
