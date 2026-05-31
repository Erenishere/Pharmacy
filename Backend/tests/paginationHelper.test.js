const { handlePagination } = require('../src/utils/paginationHelper');

describe('pagination helper', () => {
  it('retrieves the page and count concurrently for Mongo list queries', async () => {
    const events = [];
    const query = {
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      session: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn(() => {
        events.push('data-start');
        return new Promise((resolve) => {
          setTimeout(() => {
            events.push('data-end');
            resolve([{ id: 'salary-sheet-2' }]);
          }, 20);
        });
      }),
    };

    const Model = {
      find: jest.fn(() => query),
      countDocuments: jest.fn(() => {
        events.push('count-start');
        return new Promise((resolve) => {
          setTimeout(() => {
            events.push('count-end');
            resolve(11);
          }, 20);
        });
      }),
    };

    const result = await handlePagination(
      Model,
      { isActive: true },
      2,
      10,
      [{ path: 'employeeId', select: 'name' }],
      { createdAt: -1 },
      { lean: true, select: 'employeeId month year' },
    );

    expect(result).toEqual({
      items: [{ id: 'salary-sheet-2' }],
      pagination: {
        currentPage: 2,
        totalPages: 2,
        totalItems: 11,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPrevPage: true,
        nextPage: null,
        prevPage: 1,
        from: 11,
        to: 11,
      },
    });
    expect(Model.find).toHaveBeenCalledWith({ isActive: true });
    expect(Model.countDocuments).toHaveBeenCalledWith({ isActive: true });
    expect(query.populate).toHaveBeenCalledWith({ path: 'employeeId', select: 'name' });
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(query.lean).toHaveBeenCalled();
    expect(query.select).toHaveBeenCalledWith('employeeId month year');
    expect(events.indexOf('data-start')).toBeGreaterThan(events.indexOf('count-start'));
    expect(events.indexOf('data-start')).toBeLessThan(events.indexOf('count-end'));
  });
});
