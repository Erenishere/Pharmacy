const Response = require('../../../src/utils/response');

describe('Response Utility', () => {
  let res;
  let req;

  beforeEach(() => {
    req = {
      originalUrl: '/api/test',
      method: 'GET',
      requestId: 'test-request-id',
      startTime: process.hrtime(),
      protocol: 'http',
      get: jest.fn((header) => {
        if (header === 'host') return 'localhost:3000';
        return null;
      }),
      query: {},
      baseUrl: '/api',
      path: '/test'
    };

    res = {
      req,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('success', () => {
    it('should send a success response with default message and status', () => {
      const data = { id: 1, name: 'Test' };
      Response.success(res, data);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Success',
          data,
          metadata: expect.objectContaining({
            requestId: 'test-request-id',
            path: '/api/test',
            method: 'GET',
          }),
        })
      );
    });

    it('should send a success response with custom message and status', () => {
      const data = { id: 1 };
      Response.success(res, data, 'Custom Success', 201);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Custom Success',
          data,
        })
      );
    });

    it('should include duration in metadata if startTime is provided', (done) => {
      setTimeout(() => {
        Response.success(res, {});
        const call = res.json.mock.calls[0][0];
        expect(call.metadata.duration).toBeDefined();
        expect(call.metadata.duration).toMatch(/^\d+\.\d+ms$/);
        done();
      }, 10);
    });
  });

  describe('error', () => {
    it('should send an error response with default values', () => {
      Response.error(res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Internal Server Error',
          }),
          metadata: expect.any(Object),
        })
      );
    });

    it('should send an error response with custom values', () => {
      const details = { field: 'email', message: 'invalid' };
      Response.error(res, 'Validation failed', 400, 'VALIDATION_ERROR', details);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details,
          }),
        })
      );
    });
  });

  describe('formatPagination', () => {
    it('should return null if pagination is not provided', () => {
      expect(Response.formatPagination(null, req)).toBeNull();
    });

    it('should return formatted pagination with HATEOAS links', () => {
      const pagination = {
        total: 100,
        limit: 10,
        page: 2,
        pages: 10
      };

      const result = Response.formatPagination(pagination, req);

      expect(result).toEqual(
        expect.objectContaining({
          total: 100,
          limit: 10,
          page: 2,
          pages: 10,
          links: expect.objectContaining({
            self: expect.stringContaining('/api/test?page=2&limit=10'),
            first: expect.stringContaining('/api/test?page=1&limit=10'),
            last: expect.stringContaining('/api/test?page=10&limit=10'),
            prev: expect.stringContaining('/api/test?page=1&limit=10'),
            next: expect.stringContaining('/api/test?page=3&limit=10'),
          })
        })
      );
    });

    it('should not include prev link on first page', () => {
      const pagination = { total: 100, limit: 10, page: 1, pages: 10 };
      const result = Response.formatPagination(pagination, req);
      expect(result.links.prev).toBeNull();
    });

    it('should not include next link on last page', () => {
      const pagination = { total: 100, limit: 10, page: 10, pages: 10 };
      const result = Response.formatPagination(pagination, req);
      expect(result.links.next).toBeNull();
    });
  });
});
