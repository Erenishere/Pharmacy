const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const app = require('../src/app');
const authService = require('../src/services/authService');
const Account = require('../src/models/Account');
const CashPayment = require('../src/models/CashPayment');
const CashReceipt = require('../src/models/CashReceipt');
const Customer = require('../src/models/Customer');
const Invoice = require('../src/models/Invoice');
const Item = require('../src/models/Item');
const LedgerEntry = require('../src/models/LedgerEntry');
const Supplier = require('../src/models/Supplier');
const User = require('../src/models/User');

jest.setTimeout(120000);

describe('cashbook and PDC API workflows', () => {
  let replSet;
  let token;
  let adminUser;
  let cashAccount;
  let customer;
  let supplier;
  let item;

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  const createInvoice = async ({
    type,
    party,
    total = 100,
    paidAmount = 0,
    suffix = Math.random().toString(16).slice(2),
  }) => {
    const isSales = type === 'sales';
    return Invoice.create({
      invoiceNumber: `${isSales ? 'SI' : 'PI'}-${suffix}`,
      type,
      customerId: isSales ? party._id : undefined,
      supplierId: isSales ? undefined : party._id,
      supplierBillNo: isSales ? undefined : `BILL-${suffix}`,
      invoiceDate: new Date('2024-05-03T10:00:00.000Z'),
      dueDate: new Date('2024-05-10T10:00:00.000Z'),
      items: [{
        itemId: item._id,
        quantity: 1,
        unitPrice: total,
        discount: 0,
        gstRate: 0,
        lineTotal: total,
      }],
      totals: {
        subtotal: total,
        grandTotal: total,
        paidAmount,
        dueAmount: total - paidAmount,
      },
      status: 'confirmed',
      paymentStatus: paidAmount >= total ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
      createdBy: adminUser._id,
    });
  };

  const expectInvoicePayment = async (invoiceId, paidAmount, dueAmount, paymentStatus, status) => {
    const invoice = await Invoice.findById(invoiceId).lean();
    expect(invoice.totals.paidAmount).toBe(paidAmount);
    expect(invoice.totals.dueAmount).toBe(dueAmount);
    expect(invoice.paymentStatus).toBe(paymentStatus);
    expect(invoice.status).toBe(status);
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'cashbook-api-test-secret';
    process.env.JWT_REFRESH_SECRET = 'cashbook-api-test-refresh-secret';

    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    await mongoose.connect(replSet.getUri(), { dbName: 'cashbook_pdc_api_workflows' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();

    adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    token = authService.generateAccessToken({ userId: adminUser._id, role: 'admin' });

    cashAccount = await Account.create({
      name: 'Cash in Hand',
      code: 'CASH_TEST',
      accountType: 'asset',
      isActive: true,
      createdBy: adminUser._id,
    });
    customer = await Customer.create({
      code: 'CUST1',
      name: 'Test Customer',
      type: 'regular',
      accountType: 'customer',
      isActive: true,
    });
    supplier = await Supplier.create({
      code: 'SUP1',
      name: 'Test Supplier',
      type: 'supplier',
      isActive: true,
    });
    item = await Item.create({
      code: 'ITEM1',
      name: 'Test Item',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      unit: 'piece',
      pricing: {
        costPrice: 50,
        salePrice: 100,
      },
    });
  });

  it('posts a partial customer receipt and cancel reverses invoice and ledger effects', async () => {
    const invoice = await createInvoice({ type: 'sales', party: customer, total: 100, suffix: 'RECEIPT-PARTIAL' });

    const createResponse = await request(app)
      .post('/api/v1/cashbook/receipts')
      .set(authHeaders())
      .send({
        customerId: customer._id,
        cashAccountId: cashAccount._id,
        receiptDate: '2024-05-03T10:00:00.000Z',
        amount: 40,
        paymentMethod: 'cash',
        invoiceAllocations: [{ invoiceId: invoice._id, amount: 40 }],
        notes: 'partial receipt',
      });

    expect(createResponse.status).toBe(201);
    const receipt = createResponse.body.data.receipt;
    expect(receipt.status).toBe('cleared');
    expect(receipt.totalAllocated).toBe(40);
    expect(receipt.difference).toBe(0);

    await expectInvoicePayment(invoice._id, 40, 60, 'partial', 'confirmed');
    expect(await LedgerEntry.countDocuments({ referenceType: 'cash_receipt', referenceId: receipt._id })).toBe(2);

    const cancelResponse = await request(app)
      .post(`/api/v1/cashbook/receipts/${receipt._id}/cancel`)
      .set(authHeaders())
      .send({ reason: 'duplicate receipt' });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.data.receipt.status).toBe('cancelled');
    await expectInvoicePayment(invoice._id, 0, 100, 'pending', 'confirmed');
    expect(await LedgerEntry.countDocuments({ referenceType: 'adjustment' })).toBe(2);
  });

  it('posts a full supplier payment and cancel reverses invoice and ledger effects', async () => {
    const invoice = await createInvoice({ type: 'purchase', party: supplier, total: 75, suffix: 'PAYMENT-FULL' });

    const createResponse = await request(app)
      .post('/api/v1/cashbook/payments')
      .set(authHeaders())
      .send({
        supplierId: supplier._id,
        cashAccountId: cashAccount._id,
        paymentDate: '2024-05-03T10:00:00.000Z',
        amount: 75,
        paymentMethod: 'cash',
        invoiceAllocations: [{ invoiceId: invoice._id, amount: 75 }],
        notes: 'full supplier payment',
      });

    expect(createResponse.status).toBe(201);
    const payment = createResponse.body.data.payment;
    expect(payment.status).toBe('cleared');
    expect(payment.totalAllocated).toBe(75);

    await expectInvoicePayment(invoice._id, 75, 0, 'paid', 'paid');
    expect(await LedgerEntry.countDocuments({ referenceType: 'cash_payment', referenceId: payment._id })).toBe(2);

    const cancelResponse = await request(app)
      .post(`/api/v1/cashbook/payments/${payment._id}/cancel`)
      .set(authHeaders())
      .send({ reason: 'wrong supplier' });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.data.payment.status).toBe('cancelled');
    await expectInvoicePayment(invoice._id, 0, 75, 'pending', 'confirmed');
    expect(await LedgerEntry.countDocuments({ referenceType: 'adjustment' })).toBe(2);
  });

  it('rejects over-allocation without creating receipt, ledger, or invoice mutation', async () => {
    const invoice = await createInvoice({ type: 'sales', party: customer, total: 100, suffix: 'OVER-ALLOCATE' });

    const response = await request(app)
      .post('/api/v1/cashbook/receipts')
      .set(authHeaders())
      .send({
        customerId: customer._id,
        cashAccountId: cashAccount._id,
        amount: 150,
        paymentMethod: 'cash',
        invoiceAllocations: [{ invoiceId: invoice._id, amount: 150 }],
        notes: 'invalid over-allocation',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('exceeds remaining due');
    await expectInvoicePayment(invoice._id, 0, 100, 'pending', 'confirmed');
    expect(await CashReceipt.countDocuments()).toBe(0);
    expect(await LedgerEntry.countDocuments()).toBe(0);
  });

  it('returns only outstanding confirmed customer invoices for cashbook allocation', async () => {
    const pendingInvoice = await createInvoice({
      type: 'sales',
      party: customer,
      total: 100,
      suffix: 'PENDING-LIST',
    });
    const partialInvoice = await createInvoice({
      type: 'sales',
      party: customer,
      total: 120,
      paidAmount: 20,
      suffix: 'PARTIAL-LIST',
    });
    await createInvoice({
      type: 'sales',
      party: customer,
      total: 75,
      paidAmount: 75,
      suffix: 'PAID-LIST',
    });
    await Invoice.create({
      invoiceNumber: 'SI-CANCELLED-LIST',
      type: 'sales',
      customerId: customer._id,
      invoiceDate: new Date('2024-05-03T10:00:00.000Z'),
      dueDate: new Date('2024-05-10T10:00:00.000Z'),
      items: [{
        itemId: item._id,
        quantity: 1,
        unitPrice: 90,
        discount: 0,
        gstRate: 0,
        lineTotal: 90,
      }],
      totals: {
        subtotal: 90,
        grandTotal: 90,
        paidAmount: 0,
        dueAmount: 90,
      },
      status: 'cancelled',
      paymentStatus: 'pending',
      createdBy: adminUser._id,
    });

    const response = await request(app)
      .get(`/api/v1/cashbook/customers/${customer._id}/pending-invoices`)
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.map((invoice) => invoice._id)).toEqual([
      pendingInvoice._id.toString(),
      partialInvoice._id.toString(),
    ]);
    expect(response.body.data.map((invoice) => invoice.invoiceNumber)).toEqual([
      pendingInvoice.invoiceNumber,
      partialInvoice.invoiceNumber,
    ]);
    expect(response.body.data[0].totals.dueAmount).toBe(100);
    expect(response.body.data[1].totals.dueAmount).toBe(100);
  });

  it('returns active asset accounts for cashbook cash-account selectors', async () => {
    const response = await request(app)
      .get('/api/v1/accounts')
      .query({ accountType: 'asset', isActive: true, limit: 50 })
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.map((account) => account._id)).toContain(cashAccount._id.toString());
    expect(response.body.data.every((account) => account.accountType === 'asset')).toBe(true);
  });

  it('returns merged cashbook entries with canonical pagination and type filtering', async () => {
    await CashReceipt.create({
      receiptNumber: 'CR-MERGED-001',
      customerId: customer._id,
      cashAccountId: cashAccount._id,
      receiptDate: new Date('2024-05-01T09:00:00.000Z'),
      amount: 45,
      paymentMethod: 'cash',
      status: 'pending',
      notes: 'older receipt entry',
      createdBy: adminUser._id,
    });

    await CashPayment.create({
      paymentNumber: 'CP-MERGED-001',
      supplierId: supplier._id,
      cashAccountId: cashAccount._id,
      paymentDate: new Date('2024-05-02T12:00:00.000Z'),
      amount: 30,
      paymentMethod: 'cash',
      status: 'cleared',
      notes: 'newer payment entry',
      createdBy: adminUser._id,
    });

    const mergedResponse = await request(app)
      .get('/api/v1/cashbook/entries')
      .query({ page: 1, limit: 1 })
      .set(authHeaders());

    expect(mergedResponse.status).toBe(200);
    expect(mergedResponse.body.data.pagination).toMatchObject({
      currentPage: 1,
      itemsPerPage: 1,
      totalItems: 2,
      totalPages: 2,
    });
    expect(mergedResponse.body.data.entries).toHaveLength(1);
    expect(mergedResponse.body.data.entries[0]).toMatchObject({
      entryType: 'payment',
      number: 'CP-MERGED-001',
      accountTitle: supplier.name,
      cashAccount: cashAccount.name,
      paid: 30,
      receive: 0,
      status: 'cleared',
      detail: 'newer payment entry',
    });
    expect(mergedResponse.body.data.entries[0].raw.supplierId._id).toBe(supplier._id.toString());
    expect(mergedResponse.body.data.entries[0].raw.cashAccountId._id).toBe(cashAccount._id.toString());

    const receiveOnlyResponse = await request(app)
      .get('/api/v1/cashbook/entries')
      .query({ type: 'receive', page: 1, limit: 10 })
      .set(authHeaders());

    expect(receiveOnlyResponse.status).toBe(200);
    expect(receiveOnlyResponse.body.data.pagination.totalItems).toBe(1);
    expect(receiveOnlyResponse.body.data.entries).toHaveLength(1);
    expect(receiveOnlyResponse.body.data.entries[0]).toMatchObject({
      entryType: 'receive',
      number: 'CR-MERGED-001',
      accountTitle: customer.name,
      receive: 45,
      paid: 0,
      status: 'pending',
      detail: 'older receipt entry',
    });
    expect(receiveOnlyResponse.body.data.entries[0].raw.customerId._id).toBe(customer._id.toString());
  });

  it('keeps PDC pending, clear, bounce, and rollback flows in sync through compatibility routes', async () => {
    const clearInvoice = await createInvoice({ type: 'sales', party: customer, total: 60, suffix: 'PDC-CLEAR' });

    const createClearPdcResponse = await request(app)
      .post('/api/v1/cashbook/receipts')
      .set(authHeaders())
      .send({
        customerId: customer._id,
        cashAccountId: cashAccount._id,
        amount: 60,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          isPostDated: true,
          bankName: 'Test Bank',
          chequeNumber: 'CHQ-CLEAR-1',
          chequeDate: '2099-05-15T10:00:00.000Z',
        },
        invoiceAllocations: [{ invoiceId: clearInvoice._id, amount: 60 }],
        notes: 'clear pdc',
      });

    expect(createClearPdcResponse.status).toBe(201);
    const clearPdc = createClearPdcResponse.body.data.receipt;
    expect(clearPdc.status).toBe('pending');
    expect(clearPdc.postDatedCheque).toBe(true);

    const pendingResponse = await request(app)
      .get('/api/v1/pdc/pending')
      .set(authHeaders());

    expect(pendingResponse.status).toBe(200);
    expect(pendingResponse.body.data.cheques.map((cheque) => cheque._id)).toContain(clearPdc._id);

    const clearResponse = await request(app)
      .patch(`/api/v1/pdc/${clearPdc._id}/clear`)
      .set(authHeaders())
      .send();

    expect(clearResponse.status).toBe(200);
    expect(clearResponse.body.data.receipt.status).toBe('cleared');
    expect(clearResponse.body.data.receipt.chequeStatus).toBe('cleared');
    await expectInvoicePayment(clearInvoice._id, 60, 0, 'paid', 'paid');

    const bounceInvoice = await createInvoice({ type: 'sales', party: customer, total: 25, suffix: 'PDC-BOUNCE' });
    const createBouncePdcResponse = await request(app)
      .post('/api/v1/cashbook/receipts')
      .set(authHeaders())
      .send({
        customerId: customer._id,
        cashAccountId: cashAccount._id,
        amount: 25,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          isPostDated: true,
          bankName: 'Test Bank',
          chequeNumber: 'CHQ-BOUNCE-1',
          chequeDate: '2099-05-16T10:00:00.000Z',
        },
        invoiceAllocations: [{ invoiceId: bounceInvoice._id, amount: 25 }],
        notes: 'bounce pdc',
      });

    expect(createBouncePdcResponse.status).toBe(201);
    const bouncePdc = createBouncePdcResponse.body.data.receipt;

    const bounceResponse = await request(app)
      .patch(`/api/v1/pdc/${bouncePdc._id}/bounce`)
      .set(authHeaders())
      .send({ reason: 'insufficient funds' });

    expect(bounceResponse.status).toBe(200);
    expect(bounceResponse.body.data.receipt.status).toBe('bounced');
    expect(bounceResponse.body.data.receipt.chequeStatus).toBe('bounced');
    await expectInvoicePayment(bounceInvoice._id, 0, 25, 'pending', 'confirmed');
    expect(await LedgerEntry.countDocuments({ referenceType: 'cash_receipt', referenceId: bouncePdc._id })).toBe(2);
    expect(await LedgerEntry.countDocuments({ referenceType: 'adjustment' })).toBe(2);
  });
});
