/**
 * Enhanced Dashboard Page Component
 * Professional dashboard with real-time interactive graphs
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRefreshCw, FiFilter, FiDownload, FiSettings, FiActivity } from 'react-icons/fi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { 
  DashboardGraphContainer,
  SalesTrendGraph,
  InventoryPerformanceGraph,
  CustomerBehaviorGraph,
  FinancialHealthGraph 
} from '../components/Dashboard/InteractiveGraphs';
import { useRealTimeDashboard, generateSampleDashboardData } from '../hooks/useRealTimeDashboard';
import { ErrorBoundary } from '../components/ErrorBoundary';

const Dashboard = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedMetrics, setSelectedMetrics] = useState({
    sales: true,
    inventory: true,
    customer: true,
    financial: true
  });

  // Initialize real-time dashboard hook
  const {
    isConnected,
    connectionStatus,
    lastUpdate,
    dashboardData,
    loadingStates,
    errors,
    refreshData,
    formatCurrency,
    formatDate
  } = useRealTimeDashboard({
    enableAutoRefresh: autoRefresh,
    refreshInterval: refreshInterval
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (connectionStatus === 'error') {
      toast.error('Connection error. Attempting to reconnect...');
    } else if (connectionStatus === 'connected') {
      toast.success('Connected to real-time dashboard');
    }
  }, [connectionStatus]);

  const handleRefresh = async () => {
    try {
      await refreshData();
      toast.success('Dashboard data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh dashboard data');
    }
  };

  const handleExportData = () => {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        period: selectedPeriod,
        data: dashboardData
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `dashboard-export-${new Date().toISOString()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Dashboard data exported successfully');
    } catch (error) {
      toast.error('Failed to export dashboard data');
    }
  };

  const connectionStatusColor = {
    connected: 'bg-green-500',
    disconnected: 'bg-red-500',
    reconnecting: 'bg-yellow-500',
    error: 'bg-red-600'
  }[connectionStatus] || 'bg-gray-500';

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-sm text-gray-600">
                  Real-time business intelligence and performance metrics
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Connection Status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${connectionStatusColor} animate-pulse`}></div>
                  <span className="text-sm text-gray-600">
                    {connectionStatus === 'connected' ? 'Live' : 'Connecting...'}
                  </span>
                </div>
                
                {/* Last Update */}
                {lastUpdate && (
                  <div className="text-sm text-gray-500">
                    Updated: {formatDate(lastUpdate)}
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <FiFilter className="w-4 h-4 mr-2" />
                    Filters
                  </button>
                  
                  <button
                    onClick={handleRefresh}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <FiRefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </button>
                  
                  <button
                    onClick={handleExportData}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <FiDownload className="w-4 h-4 mr-2" />
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white border-b border-gray-200 shadow-sm"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Period Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Period
                    </label>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                      <option value="90d">Last 90 Days</option>
                      <option value="1y">Last Year</option>
                    </select>
                  </div>
                  
                  {/* Auto Refresh */}
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Auto Refresh
                      </span>
                    </label>
                    {autoRefresh && (
                      <select
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={10000}>10 seconds</option>
                        <option value={30000}>30 seconds</option>
                        <option value={60000}>1 minute</option>
                        <option value={300000}>5 minutes</option>
                      </select>
                    )}
                  </div>
                  
                  {/* Metrics Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Metrics
                    </label>
                    <div className="space-y-2">
                      {Object.entries(selectedMetrics).map(([key, value]) => (
                        <label key={key} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => setSelectedMetrics(prev => ({
                              ...prev,
                              [key]: e.target.checked
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 capitalize">
                            {key}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick Actions
                    </label>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setSelectedPeriod('30d');
                          setAutoRefresh(true);
                          setSelectedMetrics({
                            sales: true,
                            inventory: true,
                            customer: true,
                            financial: true
                          });
                        }}
                        className="w-full px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                      >
                        Reset to Default
                      </button>
                      
                      <button
                        onClick={() => setShowFilters(false)}
                        className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 place-items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(dashboardData.financial?.financialMetrics?.totalRevenue || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FiActivity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium">+12.5%</span>
                <span className="text-gray-600 ml-2">from last month</span>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Customers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.customer?.behaviorMetrics?.totalActiveCustomers || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FiActivity className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium">+8.2%</span>
                <span className="text-gray-600 ml-2">from last month</span>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.inventory?.lowStockItems?.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <FiActivity className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-red-600 font-medium">+2.1%</span>
                <span className="text-gray-600 ml-2">needs attention</span>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gross Margin</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.financial?.financialMetrics?.grossMargin?.toFixed(1) || 0}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FiActivity className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium">+1.8%</span>
                <span className="text-gray-600 ml-2">from last month</span>
              </div>
            </motion.div>
          </div>

          {/* Interactive Graphs */}
          <ErrorBoundary>
            <DashboardGraphContainer
              salesData={dashboardData.sales}
              inventoryData={dashboardData.inventory}
              customerData={dashboardData.customer}
              financialData={dashboardData.financial}
              onDataRefresh={refreshData}
              loadingStates={loadingStates}
              errors={errors}
            />
          </ErrorBoundary>
        </div>

        {/* Toast Notifications */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;