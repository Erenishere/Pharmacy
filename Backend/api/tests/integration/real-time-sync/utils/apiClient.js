/**
 * API Client for Integration Tests
 * 
 * Provides a unified interface for making API requests to both
 * Admin and POS endpoints during integration testing.
 */

const axios = require('axios');
const config = require('../config/testConfig');

class ApiClient {
  constructor(baseUrl, authToken = null) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests if provided
    if (authToken) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    }
  }

  /**
   * Set authentication token
   * @param {string} token - JWT token
   */
  setAuthToken(token) {
    this.authToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>}
   */
  async get(endpoint, params = {}) {
    try {
      const response = await this.client.get(endpoint, { params });
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>}
   */
  async post(endpoint, data = {}) {
    try {
      const response = await this.client.post(endpoint, data);
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>}
   */
  async put(endpoint, data = {}) {
    try {
      const response = await this.client.put(endpoint, data);
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Make a PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>}
   */
  async patch(endpoint, data = {}) {
    try {
      const response = await this.client.patch(endpoint, data);
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>}
   */
  async delete(endpoint) {
    try {
      const response = await this.client.delete(endpoint);
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Handle API errors
   * @private
   */
  _handleError(error) {
    if (error.response) {
      // Server responded with error status
      const apiError = new Error(error.response.data.message || 'API request failed');
      apiError.status = error.response.status;
      apiError.data = error.response.data;
      throw apiError;
    } else if (error.request) {
      // Request made but no response received
      throw new Error('No response from server');
    } else {
      // Error setting up request
      throw error;
    }
  }
}

/**
 * Create an Admin API client
 * @param {string} authToken - JWT token
 * @returns {ApiClient}
 */
const createAdminClient = (authToken = null) => {
  return new ApiClient(config.adminApiUrl, authToken);
};

/**
 * Create a POS API client
 * @param {string} authToken - JWT token
 * @returns {ApiClient}
 */
const createPOSClient = (authToken = null) => {
  return new ApiClient(config.posApiUrl, authToken);
};

module.exports = {
  ApiClient,
  createAdminClient,
  createPOSClient,
};
