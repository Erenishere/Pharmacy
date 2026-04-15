/**
 * Test Helper Utilities
 * 
 * Common utility functions for integration tests
 */

const mongoose = require('mongoose');

/**
 * Wait for a specified duration
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a unique identifier
 * @returns {string}
 */
const generateUniqueId = () => {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};

/**
 * Generate a random number within a range
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number}
 */
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generate a random decimal number within a range
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} decimals - Number of decimal places
 * @returns {number}
 */
const randomDecimal = (min, max, decimals = 2) => {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
};

/**
 * Pick a random element from an array
 * @param {Array} array - Array to pick from
 * @returns {*}
 */
const randomElement = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Generate a random date within a range
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Date}
 */
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

/**
 * Generate a future date (for batch expiry dates)
 * @param {number} minDays - Minimum days in the future
 * @param {number} maxDays - Maximum days in the future
 * @returns {Date}
 */
const futureDate = (minDays = 30, maxDays = 365) => {
  const days = randomInt(minDays, maxDays);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

/**
 * Retry a function until it succeeds or times out
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<*>}
 */
const retry = async (fn, options = {}) => {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 1.5,
  } = options;

  let lastError;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await wait(currentDelay);
        currentDelay *= backoff;
      }
    }
  }

  throw lastError;
};

/**
 * Clean up test data from database
 * @param {string} collectionName - Name of the collection
 * @param {Object} filter - Filter to identify test data
 * @returns {Promise<void>}
 */
const cleanupTestData = async (collectionName, filter = {}) => {
  try {
    const collection = mongoose.connection.collection(collectionName);
    await collection.deleteMany(filter);
  } catch (error) {
    console.error(`Error cleaning up test data from ${collectionName}:`, error);
  }
};

/**
 * Measure execution time of a function
 * @param {Function} fn - Function to measure
 * @returns {Promise<{result: *, duration: number}>}
 */
const measureTime = async (fn) => {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
};

/**
 * Create a deep copy of an object
 * @param {*} obj - Object to copy
 * @returns {*}
 */
const deepCopy = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Compare two objects for equality
 * @param {*} obj1 - First object
 * @param {*} obj2 - Second object
 * @returns {boolean}
 */
const deepEqual = (obj1, obj2) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

/**
 * Format a number as currency
 * @param {number} amount - Amount to format
 * @returns {string}
 */
const formatCurrency = (amount) => {
  return amount.toFixed(2);
};

/**
 * Calculate percentage difference
 * @param {number} expected - Expected value
 * @param {number} actual - Actual value
 * @returns {number}
 */
const percentageDifference = (expected, actual) => {
  if (expected === 0) return actual === 0 ? 0 : 100;
  return Math.abs((actual - expected) / expected) * 100;
};

module.exports = {
  wait,
  generateUniqueId,
  randomInt,
  randomDecimal,
  randomElement,
  randomDate,
  futureDate,
  retry,
  cleanupTestData,
  measureTime,
  deepCopy,
  deepEqual,
  formatCurrency,
  percentageDifference,
};
