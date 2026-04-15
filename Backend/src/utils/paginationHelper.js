/**
 * Pagination Helper Utility
 * Provides standardized pagination functionality for MongoDB queries
 */

/**
 * Handle pagination for MongoDB queries
 * @param {Model} Model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @param {Array|Object} populateOptions - Population options
 * @param {Object} sortOptions - Sort options
 * @param {Object} additionalOptions - Additional query options
 * @returns {Promise<Object>} Paginated results with metadata
 */
async function handlePagination(
  Model,
  filter = {},
  page = 1,
  limit = 20,
  populateOptions = [],
  sortOptions = { createdAt: -1 },
  additionalOptions = {}
) {
  // Ensure page and limit are numbers and within reasonable bounds
  const currentPage = Math.max(1, parseInt(page) || 1);
  const itemsPerPage = Math.min(100, Math.max(1, parseInt(limit) || 20));

  // Calculate skip value
  const skip = (currentPage - 1) * itemsPerPage;

  // Build base query
  let query = Model.find(filter).sort(sortOptions);

  // Apply population if specified
  if (populateOptions && populateOptions.length > 0) {
    populateOptions.forEach(option => {
      if (typeof option === 'string') {
        query = query.populate(option);
      } else if (typeof option === 'object' && option.path) {
        query = query.populate(option);
      }
    });
  }

  // Apply additional options
  if (additionalOptions.session) {
    query = query.session(additionalOptions.session);
  }

  if (additionalOptions.lean) {
    query = query.lean();
  }

  if (additionalOptions.select) {
    query = query.select(additionalOptions.select);
  }

  // Get total count for pagination metadata
  const totalItems = await Model.countDocuments(filter).session(additionalOptions.session || null);

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Execute query with pagination
  const items = await query.skip(skip).limit(itemsPerPage);

  return {
    items,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? currentPage + 1 : null,
      prevPage: hasPrevPage ? currentPage - 1 : null,
      from: skip + 1,
      to: Math.min(skip + itemsPerPage, totalItems),
    },
  };
}

/**
 * Handle cursor-based pagination for large datasets
 * @param {Model} Model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {string} cursor - Cursor for pagination
 * @param {number} limit - Items per page
 * @param {Object} sortOptions - Sort options (must include unique field)
 * @param {Array|Object} populateOptions - Population options
 * @returns {Promise<Object>} Cursor-based paginated results
 */
async function handleCursorPagination(
  Model,
  filter = {},
  cursor = null,
  limit = 20,
  sortOptions = { _id: 1 },
  populateOptions = []
) {
  const itemsPerPage = Math.min(100, Math.max(1, parseInt(limit) || 20));

  let query = Model.find(filter).sort(sortOptions);

  // Apply cursor condition if provided
  if (cursor) {
    const sortField = Object.keys(sortOptions)[0];
    const sortDirection = sortOptions[sortField];

    if (sortDirection === 1) {
      query = query.where(sortField).gt(cursor);
    } else {
      query = query.where(sortField).lt(cursor);
    }
  }

  // Apply population
  if (populateOptions && populateOptions.length > 0) {
    populateOptions.forEach(option => {
      if (typeof option === 'string') {
        query = query.populate(option);
      } else if (typeof option === 'object' && option.path) {
        query = query.populate(option);
      }
    });
  }

  // Execute query
  const items = await query.limit(itemsPerPage + 1); // Get one extra to check if there's more

  // Check if there are more items
  const hasNextPage = items.length > itemsPerPage;
  const results = hasNextPage ? items.slice(0, -1) : items;

  // Get next cursor
  const nextCursor = hasNextPage && results.length > 0
    ? results[results.length - 1][Object.keys(sortOptions)[0]]
    : null;

  return {
    items: results,
    pagination: {
      hasNextPage,
      nextCursor,
      limit: itemsPerPage,
      count: results.length,
    },
  };
}

/**
 * Simple pagination helper for basic use cases
 * @param {Array} items - Array of items to paginate
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @returns {Object} Paginated results
 */
function paginateArray(items, page = 1, limit = 20) {
  const currentPage = Math.max(1, parseInt(page) || 1);
  const itemsPerPage = Math.max(1, parseInt(limit) || 20);
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const skip = (currentPage - 1) * itemsPerPage;

  const paginatedItems = items.slice(skip, skip + itemsPerPage);

  return {
    items: paginatedItems,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
      prevPage: currentPage > 1 ? currentPage - 1 : null,
    },
  };
}

module.exports = {
  handlePagination,
  handleCursorPagination,
  paginateArray,
};
