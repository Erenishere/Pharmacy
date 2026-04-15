/**
 * Standardized API Response Utility
 *
 * Provides consistent structure for success and error responses across the application.
 */

class Response {
  /**
   * Send a success response
   * @param {Object} res - Express response object
   * @param {Object} data - Data to send in the response
   * @param {String} message - Success message
   * @param {Number} statusCode - HTTP status code (default 200)
   * @param {Object} extra - Any extra fields to include (e.g. pagination)
   */
  static success(res, data, message = 'Success', statusCode = 200, extra = {}) {
    const response = {
      success: true,
      message,
      data,
      ...extra,
      metadata: this._generateMetadata(res.req),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send an error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Number} statusCode - HTTP status code (default 500)
   * @param {String} errorCode - Custom error code
   * @param {Object} details - Error details
   */
  static error(res, message = 'Internal Server Error', statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    const response = {
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details && { details }),
      },
      metadata: this._generateMetadata(res.req),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Generate standard metadata for response
   * @param {Object} req - Express request object
   * @private
   */
  static _generateMetadata(req) {
    const metadata = {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
    };

    // Calculate duration if startTime is available
    if (req.startTime) {
      const diff = process.hrtime(req.startTime);
      const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
      metadata.duration = `${durationMs}ms`;
    }

    return metadata;
  }

  /**
   * Format pagination metadata
   * @param {Object} pagination - Pagination info
   * @param {Object} req - Express request object for HATEOAS links
   * @returns {Object} Formatted pagination metadata
   */
  static formatPagination(pagination, req) {
    if (!pagination) return null;

    // Handle different pagination property names (support both legacy and new)
    const total = pagination.total ?? pagination.totalItems ?? 0;
    const limit = pagination.limit ?? pagination.itemsPerPage ?? 10;
    const page = pagination.page ?? pagination.currentPage ?? 1;
    const pages = pagination.pages ?? pagination.totalPages ?? (Math.ceil(total / limit) || 1);

    const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;

    // Helper to generate links with current query params
    const getLink = (targetPage) => {
      const query = { ...req.query, page: targetPage, limit };
      const queryString = new URLSearchParams(query).toString();
      return `${baseUrl}?${queryString}`;
    };

    return {
      // New standardized format
      total,
      limit,
      page,
      pages,

      // Frontend/Legacy compatibility format
      totalItems: total,
      itemsPerPage: limit,
      currentPage: page,
      totalPages: pages,

      // HATEOAS links
      links: {
        self: getLink(page),
        first: getLink(1),
        last: getLink(pages),
        next: page < pages ? getLink(page + 1) : null,
        prev: page > 1 ? getLink(page - 1) : null,
      },
    };
  }
}

module.exports = Response;
