jest.mock('../../models/Invoice', () => ({
  findById: jest.fn(),
}));

jest.mock('../emailService', () => ({
  isEmailConfigured: jest.fn(),
  sendEmail: jest.fn(),
}));

const Invoice = require('../../models/Invoice');
const invoicePrintService = require('../invoicePrintService');
const { isEmailConfigured, sendEmail } = require('../emailService');

describe('InvoicePrintService email delivery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emails the generated invoice PDF when email is configured', async () => {
    const invoice = {
      _id: 'invoice-1',
      invoiceNumber: 'INV-1001',
      customerId: {
        name: 'Test Customer',
        email: 'customer@example.com',
      },
    };

    Invoice.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(invoice),
      }),
    });

    isEmailConfigured.mockReturnValue(true);
    jest.spyOn(invoicePrintService, 'generateInvoicePDF').mockResolvedValue(Buffer.from('pdf-content'));

    const result = await invoicePrintService.emailInvoicePDF('invoice-1', {
      message: 'Attached invoice',
    });

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'customer@example.com',
      subject: 'Invoice INV-1001',
      text: 'Attached invoice',
      attachments: [
        expect.objectContaining({
          filename: 'invoice-INV-1001.pdf',
          contentType: 'application/pdf',
        }),
      ],
    }));
    expect(result).toEqual({
      delivered: true,
      to: 'customer@example.com',
      invoiceId: 'invoice-1',
      invoiceNumber: 'INV-1001',
    });
  });
});
