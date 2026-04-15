const { requestTrackingMiddleware } = require('../../src/middleware/performanceMonitoring');

describe('Performance Monitoring Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      get: jest.fn(),
      method: 'GET',
      originalUrl: '/api/test',
    };
    res = {
      setHeader: jest.fn(),
      on: jest.fn(),
    };
    next = jest.fn();
  });

  it('should inject a request ID if not provided', () => {
    requestTrackingMiddleware(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(typeof req.requestId).toBe('string');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it('should use provided X-Request-ID', () => {
    const existingId = 'existing-request-id';
    req.get.mockReturnValue(existingId);

    requestTrackingMiddleware(req, res, next);

    expect(req.requestId).toBe(existingId);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', existingId);
  });

  it('should set startTime on request', () => {
    requestTrackingMiddleware(req, res, next);

    expect(req.startTime).toBeDefined();
    expect(Array.isArray(req.startTime)).toBe(true);
  });
});
