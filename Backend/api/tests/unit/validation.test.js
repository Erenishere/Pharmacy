const { validate } = require('../../src/middleware/validation');
const { validationResult } = require('express-validator');

// Mock express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      requestId: 'test-id',
      originalUrl: '/api/test',
      method: 'POST',
    };
    res = {
      req,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should call next() if there are no validation errors', () => {
    validationResult.mockReturnValue({
      isEmpty: () => true,
    });

    validate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 with standardized error format if there are validation errors', () => {
    const errors = [
      { param: 'email', msg: 'Invalid email' },
      { param: 'password', msg: 'Too short' },
    ];
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => errors,
    });

    validate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: [
            { field: 'email', message: 'Invalid email' },
            { field: 'password', message: 'Too short' },
          ],
        }),
        metadata: expect.objectContaining({
          requestId: 'test-id',
        }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle express-validator path instead of param', () => {
    const errors = [
      { path: 'email', msg: 'Invalid email' },
    ];
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => errors,
    });

    validate(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          details: [
            { field: 'email', message: 'Invalid email' },
          ],
        }),
      })
    );
  });
});
