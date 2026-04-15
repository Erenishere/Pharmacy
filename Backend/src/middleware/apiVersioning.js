/**
 * API Versioning Middleware
 * Handles API version routing, deprecation warnings, and backward compatibility
 */

const express = require('express');

/**
 * Create versioned API router
 * @param {Object} versions - Map of version strings to route handlers
 * @param {Object} options - Configuration options
 * @returns {Router} Express router
 */
function createVersionedRouter(versions, options = {}) {
  const { defaultVersion = 'v1', sunsetDays = 90 } = options;
  const router = express.Router();

  // Mount versioned routes
  for (const [version, routes] of Object.entries(versions)) {
    router.use(`/${version}`, routes);
  }

  // Handle unversioned requests (default to latest stable or configured default)
  router.use('/', (req, res, next) => {
    // Add deprecation headers for unversioned requests
    const sunsetDate = new Date();
    sunsetDate.setDate(sunsetDate.getDate() + sunsetDays);

    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', sunsetDate.toUTCString());
    res.setHeader('Link', `</api/${defaultVersion}${req.path}>; rel="successor-version"`);
    
    // Log unversioned API usage
    console.warn(`[API Versioning] Unversioned request to ${req.path} from ${req.ip}`);

    // Forward to default version
    req.url = `/${defaultVersion}${req.url}`;
    next();
  });

  return router;
}

/**
 * Deprecation warning middleware
 * Marks an API version or route as deprecated
 * @param {string} version - Version being deprecated
 * @param {Date|string} sunsetDate - When the version will be removed
 * @param {string} successorVersion - Recommended new version
 * @returns {Function} Express middleware
 */
function deprecationWarning(version, sunsetDate, successorVersion) {
  const sunset = sunsetDate instanceof Date ? sunsetDate.toUTCString() : sunsetDate;

  return (req, res, next) => {
    res.setHeader('Deprecation', version);
    res.setHeader('Sunset', sunset);
    
    if (successorVersion) {
      res.setHeader('Link', `</api/${successorVersion}${req.path}>; rel="successor-version"`);
    }

    // Log deprecation warnings for tracking
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[API Deprecation] Version ${version} used by ${req.user?._id || req.ip} at ${req.path}`);
    }

    next();
  };
}

/**
 * Version negotiation middleware
 * Handles Accept-Version header for content negotiation
 * @param {Object} supportedVersions - Map of supported versions
 * @returns {Function} Express middleware
 */
function versionNegotiation(supportedVersions) {
  return (req, res, next) => {
    const requestedVersion = req.headers['accept-version'] || req.query.apiVersion;

    if (!requestedVersion) {
      return next();
    }

    // Check if requested version is supported
    if (supportedVersions[requestedVersion]) {
      req.apiVersion = requestedVersion;
      res.setHeader('X-API-Version', requestedVersion);
    } else {
      // Return 406 Not Acceptable for unsupported versions
      return res.status(406).json({
        success: false,
        message: `API version ${requestedVersion} is not supported`,
        supportedVersions: Object.keys(supportedVersions),
      });
    }

    next();
  };
}

/**
 * API change log middleware
 * Documents breaking changes for the requested version
 * @param {Object} changelogs - Map of versions to change descriptions
 * @returns {Function} Express middleware
 */
function apiChangelog(changelogs) {
  return (req, res, next) => {
    const version = req.apiVersion || 'v1';
    
    if (changelogs[version]) {
      res.setHeader('X-API-Changes', JSON.stringify(changelogs[version]));
    }

    next();
  };
}

/**
 * Feature flag middleware
 * Enable/disable features based on API version
 * @param {Object} featureFlags - Map of versions to feature flags
 * @returns {Function} Express middleware
 */
function versionFeatureFlags(featureFlags) {
  return (req, res, next) => {
    const version = req.apiVersion || 'v1';
    
    req.features = featureFlags[version] || {};

    next();
  };
}

/**
 * Transform response for backward compatibility
 * Adapts new response format to older version format
 * @param {string} targetVersion - Version to transform to
 * @param {Function} transformFn - Transformation function
 * @returns {Function} Express middleware
 */
function backwardCompatibilityTransform(targetVersion, transformFn) {
  return (req, res, next) => {
    // Only transform if specifically requesting older version
    if (req.apiVersion === targetVersion) {
      const originalJson = res.json.bind(res);
      
      res.json = (data) => {
        try {
          const transformed = transformFn(data, req);
          return originalJson(transformed);
        } catch (error) {
          console.error(`[API Transform] Error transforming to ${targetVersion}:`, error);
          return originalJson(data);
        }
      };
    }

    next();
  };
}

/**
 * API version info endpoint
 * Returns information about available API versions
 * @param {Object} versions - Version metadata
 * @returns {Function} Express route handler
 */
function versionInfoEndpoint(versions) {
  return (req, res) => {
    res.json({
      success: true,
      data: {
        current: 'v1',
        supported: Object.keys(versions).map(version => ({
          version,
          status: versions[version].status || 'stable',
          deprecated: versions[version].deprecated || false,
          sunsetDate: versions[version].sunsetDate,
          documentation: versions[version].documentation,
        })),
        deprecationPolicy: {
          noticePeriod: '90 days',
          sunsetGracePeriod: '30 days',
        },
      },
    });
  };
}

/**
 * Request transformation middleware
 * Transforms incoming request to match current API version
 * @param {Object} transforms - Map of versions to transform functions
 * @returns {Function} Express middleware
 */
function requestVersioning(transforms) {
  return (req, res, next) => {
    const version = req.apiVersion || req.headers['x-api-version'] || 'v1';

    if (transforms[version]) {
      try {
        transforms[version](req, res);
      } catch (error) {
        console.error(`[Request Versioning] Error transforming from ${version}:`, error);
      }
    }

    next();
  };
}

/**
 * Create a version-aware response wrapper
 * @param {string} version - API version
 * @returns {Object} Response wrapper with version metadata
 */
function createVersionedResponse(version) {
  return {
    wrap: (data, meta = {}) => ({
      success: true,
      apiVersion: version,
      timestamp: new Date().toISOString(),
      ...meta,
      data,
    }),
    
    error: (message, code, details = null) => ({
      success: false,
      apiVersion: version,
      timestamp: new Date().toISOString(),
      error: {
        code,
        message,
        details,
      },
    }),
  };
}

/**
 * API stability marker middleware
 * Mark endpoints with stability level
 * @param {string} level - Stability level (stable, beta, experimental, deprecated)
 * @returns {Function} Express middleware
 */
function stabilityMarker(level) {
  return (req, res, next) => {
    res.setHeader('X-API-Stability', level);
    
    if (level === 'deprecated') {
      res.setHeader('Warning', '299 - "Deprecated API"');
    }

    next();
  };
}

module.exports = {
  createVersionedRouter,
  deprecationWarning,
  versionNegotiation,
  apiChangelog,
  versionFeatureFlags,
  backwardCompatibilityTransform,
  versionInfoEndpoint,
  requestVersioning,
  createVersionedResponse,
  stabilityMarker,
};
