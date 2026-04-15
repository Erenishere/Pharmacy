/**
 * Loading States Component
 * Accessible loading indicators with progress indicators
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLoader, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';

/**
 * Graph Loading Component
 * Shows loading state for individual graph components
 */
export const GraphLoading = ({ 
  message = "Loading chart data...", 
  progress = null,
  size = 'default',
  variant = 'spinner' 
}) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    default: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const renderContent = () => {
    switch (variant) {
      case 'skeleton':
        return (
          <div className="w-full space-y-4">
            <div className="animate-pulse bg-gray-200 h-4 rounded w-3/4"></div>
            <div className="animate-pulse bg-gray-200 h-32 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-4 rounded w-1/2"></div>
          </div>
        );
      
      case 'progress':
        return (
          <div className="w-full space-y-4">
            <div className="animate-pulse bg-gray-200 h-32 rounded mb-4"></div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              ></div>
            </div>
            <p className="text-sm text-gray-600 text-center">{message} ({progress}%)</p>
          </div>
        );
      
      default: // spinner
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <FiLoader className={`${sizeClasses[size]} text-blue-600`} aria-hidden="true" />
            </motion.div>
            <p className="text-sm text-gray-600 text-center">{message}</p>
            {progress !== null && (
              <div className="text-xs text-gray-500">{progress}%</div>
            )}
          </div>
        );
    }
  };

  return (
    <div 
      className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200"
      role="status"
      aria-live="polite"
    >
      {renderContent()}
      <span className="sr-only">{message}</span>
    </div>
  );
};

/**
 * Dashboard Loading Component
 * Shows loading state for entire dashboard
 */
export const DashboardLoading = ({ 
  message = "Loading dashboard...",
  subMessage = "Please wait while we fetch your data",
  progress = null 
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center"
        role="status"
        aria-live="polite"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4"
        >
          <FiRefreshCw className="h-6 w-6 text-blue-600" aria-hidden="true" />
        </motion.div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{message}</h3>
        <p className="text-gray-600 mb-4">{subMessage}</p>
        
        {progress !== null && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>
        )}
        
        <div className="text-sm text-gray-500">
          This may take a few moments...
        </div>
        
        <span className="sr-only">{message}</span>
      </motion.div>
    </div>
  );
};

/**
 * Error State Component
 * Shows error state with recovery options
 */
export const ErrorState = ({ 
  title = "Something went wrong",
  message = "We couldn't load the data. Please try again.",
  onRetry,
  error = null,
  variant = 'default'
}) => {
  const variants = {
    graph: {
      container: "h-64 bg-red-50 rounded-lg border border-red-200",
      icon: "text-red-500",
      button: "bg-red-600 hover:bg-red-700"
    },
    dashboard: {
      container: "min-h-[400px] bg-red-50 rounded-lg border border-red-200",
      icon: "text-red-600",
      button: "bg-red-600 hover:bg-red-700"
    },
    default: {
      container: "bg-red-50 rounded-lg border border-red-200 p-6",
      icon: "text-red-600",
      button: "bg-red-600 hover:bg-red-700"
    }
  };

  const currentVariant = variants[variant] || variants.default;

  return (
    <div 
      className={`flex flex-col items-center justify-center ${currentVariant.container}`}
      role="alert"
      aria-live="assertive"
    >
      <FiAlertCircle className={`w-12 h-12 ${currentVariant.icon} mb-4`} aria-hidden="true" />
      
      <h3 className="text-lg font-semibold text-red-900 mb-2">{title}</h3>
      <p className="text-red-700 text-center mb-4 max-w-md">{message}</p>
      
      {error && process.env.NODE_ENV === 'development' && (
        <details className="mb-4 text-sm text-red-600 max-w-md">
          <summary className="cursor-pointer">Error Details</summary>
          <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
            {error.toString()}
          </pre>
        </details>
      )}
      
      {onRetry && (
        <button
          onClick={onRetry}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${currentVariant.button} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors`}
        >
          <FiRefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      )}
      
      <span className="sr-only">{title}: {message}</span>
    </div>
  );
};

/**
 * Empty State Component
 * Shows when no data is available
 */
export const EmptyState = ({ 
  title = "No data available",
  message = "There's no data to display at the moment.",
  icon = null,
  action = null
}) => {
  return (
    <div 
      className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200"
      role="status"
      aria-live="polite"
    >
      {icon || (
        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <FiAlertCircle className="w-6 h-6 text-gray-400" aria-hidden="true" />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-center mb-4 max-w-md">{message}</p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          {action.icon && <span className="mr-2">{action.icon}</span>}
          {action.label}
        </button>
      )}
      
      <span className="sr-only">{title}: {message}</span>
    </div>
  );
};

/**
 * Skeleton Loader Component
 * Shows placeholder content while loading
 */
export const SkeletonLoader = ({ 
  count = 1,
  variant = 'card',
  height = 'h-32'
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'chart':
        return (
          <div className={`animate-pulse bg-gray-200 rounded-lg ${height} w-full`}>
            <div className="h-full flex items-end justify-around p-4">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i}
                  className="bg-gray-300 rounded w-8"
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                ></div>
              ))}
            </div>
          </div>
        );
      
      case 'list':
        return (
          <div className="space-y-3">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        );
      
      default: // card
        return (
          <div className={`animate-pulse bg-gray-200 rounded-lg ${height} w-full`}></div>
        );
    }
  };

  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">Loading content...</span>
      {[...Array(count)].map((_, i) => (
        <div key={i}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

export default {
  GraphLoading,
  DashboardLoading,
  ErrorState,
  EmptyState,
  SkeletonLoader
};