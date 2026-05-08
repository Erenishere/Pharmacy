const mongoose = require('mongoose');
const StockMovement = require('../StockMovement');

describe('StockMovement return contracts', () => {
  const objectId = () => new mongoose.Types.ObjectId();

  const baseMovement = (overrides = {}) => ({
    itemId: objectId(),
    warehouse: objectId(),
    movementType: 'in',
    quantity: 5,
    referenceType: 'sales_return',
    referenceId: objectId(),
    createdBy: objectId(),
    ...overrides,
  });

  it('accepts sales return stock restoration as an inbound warehouse movement', () => {
    const movement = new StockMovement(baseMovement({
      batchInfo: {
        batchNumber: 'SR-BATCH-1',
        expiryDate: new Date('2027-01-31T00:00:00.000Z'),
      },
    }));

    expect(movement.validateSync()).toBeUndefined();
  });

  it('accepts purchase return stock removal as an outbound warehouse movement', () => {
    const movement = new StockMovement(baseMovement({
      movementType: 'out',
      referenceType: 'return_purchase',
      batchInfo: {
        batchNumber: 'PR-BATCH-1',
      },
    }));

    expect(movement.validateSync()).toBeUndefined();
  });

  it('keeps return stock movements tied to the source return invoice', () => {
    const movement = new StockMovement(baseMovement({
      referenceType: 'sales_return',
      referenceId: undefined,
    }));

    const error = movement.validateSync();
    expect(error.errors.referenceId.message).toBe('Path `referenceId` is required.');
  });

  it('rejects ad hoc return movement types outside the canonical in/out/adjustment set', () => {
    const movement = new StockMovement(baseMovement({
      movementType: 'return_to_supplier',
      referenceType: 'return_purchase',
    }));

    const error = movement.validateSync();
    expect(error.errors.movementType.message).toContain('Movement type must be one of');
  });
});
