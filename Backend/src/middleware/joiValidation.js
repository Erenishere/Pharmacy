const { ValidationError } = require('../utils/errors');

/**
 * Joi Validation Middleware
 * Validates request body against Joi schema
 */
const validateSchema = (schema, property = 'body') => (req, res, next) => {
  const dataToValidate = req[property];

  const { error, value } = schema.validate(dataToValidate, {
    abortEarly: false, // Return all errors, not just the first one
    stripUnknown: true, // Remove unknown fields
    convert: true, // Convert types (e.g., string to number)
  });

  if (error) {
    const details = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    }));

    return next(new ValidationError('Validation failed', details));
  }

  // Replace request data with validated and sanitized data
  req[property] = value;
  next();
};

/**
 * Validate request body
 */
const validateBody = (schema) => validateSchema(schema, 'body');

/**
 * Validate request params
 */
const validateParams = (schema) => validateSchema(schema, 'params');

/**
 * Validate request query
 */
const validateQuery = (schema) => validateSchema(schema, 'query');

module.exports = {
  validateSchema,
  validateBody,
  validateParams,
  validateQuery,
};
