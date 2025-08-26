import React, { useState, useEffect } from 'react';
import { errorMonitor, healthChecker, gracefulDegradation } from '../lib/errorHandling';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [key: string]: {
      status: 'pass' | 'fail';
      responseTime?: number;
      error?: string;
    };
  };
  timestamp: number;
}

interface ErrorAlert {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  context: any;
  timestamp: number;
}

const MonitoringDashboard: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [errorAlerts, setErrorAlerts] = useState<ErrorAlert[]>([]);
  const [isDegraded, setIsDegraded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        // Fetch health status from API
        const response = await fetch('/api/health');
        const data = await response.json();
        
        if (response.ok) {
          setHealthStatus(data);
          setIsDegraded(data.status === 'degraded');
        }
      } catch (error) {
        console.error('Failed to fetch health data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchHealthData();

    // Set up polling every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);

    // Set up real-time error monitoring
    const updateErrors = () => {
      setErrorAlerts(errorMonitor.getAlerts());
      setIsDegraded(gracefulDegradation.isServiceDegraded());
      setLastUpdate(new Date());
    };

    // Update errors every 10 seconds
    const errorInterval = setInterval(updateErrors, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(errorInterval);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy':
      case 'fail':
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'unhealthy':
      case 'fail':
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-600 text-white';
      case 'HIGH':
        return 'bg-orange-600 text-white';
      case 'MEDIUM':
        return 'bg-yellow-600 text-white';
      case 'LOW':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading monitoring data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">System Monitoring Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdate.toLocaleString()}
        </div>
      </div>

      {/* Overall Status */}
      {healthStatus && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Overall System Health</h2>
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-full ${getStatusColor(healthStatus.status)}`}>
              <span className="text-lg font-semibold">
                {getStatusIcon(healthStatus.status)} {healthStatus.status.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {Object.values(healthStatus.checks).filter(check => check.status === 'pass').length} healthy, {Object.values(healthStatus.checks).filter(check => check.status === 'fail').length} unhealthy
            </div>
          </div>
        </div>
      )}

      {/* Health Checks Grid */}
      {healthStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(healthStatus.checks).map(([checkName, checkData]) => (
            <div key={checkName} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold capitalize">{checkName.replace(/([A-Z])/g, ' $1').trim()}</h3>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(checkData.status)}`}>
                  {getStatusIcon(checkData.status)} {checkData.status}
                </div>
              </div>
              
              {checkData.responseTime && (
                <div className="text-sm text-gray-600 mb-2">
                  Response time: {checkData.responseTime}ms
                </div>
              )}
              
              {checkData.error && (
                <div className="text-sm text-red-600">
                  Error: {checkData.error}
                </div>
              )}
              
              {/* Additional details for specific checks */}
              {checkName === 'system' && checkData.details && (
                <div className="mt-3 text-sm text-gray-600">
                  <div>Uptime: {Math.floor(checkData.details.uptime / 3600)}h {Math.floor((checkData.details.uptime % 3600) / 60)}m</div>
                  <div>Memory: {Math.round(checkData.details.memory.heapUsed / 1024 / 1024)}MB</div>
                  <div>Environment: {checkData.details.environment}</div>
                </div>
              )}
              
              {checkName === 'solana' && checkData.details && (
                <div className="mt-3 text-sm text-gray-600">
                  <div>Slot: {checkData.details.slot}</div>
                  <div>Health: {checkData.details.health}</div>
                  {checkData.details.blockTime && (
                    <div>Block Time: {new Date(checkData.details.blockTime).toLocaleString()}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error Alerts */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Error Alerts</h2>
          <div className="text-sm text-gray-500">
            {errorAlerts.length} total alerts
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {errorAlerts.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <div className="text-2xl mb-2">✅</div>
              <div>No error alerts</div>
              <div className="text-sm">System is running smoothly</div>
            </div>
          ) : (
            errorAlerts.slice(-10).reverse().map((alert, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getAlertLevelColor(alert.level)}`}>
                        {alert.level}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatTimestamp(alert.timestamp)}
                      </span>
                    </div>
                    <div className="text-gray-900 mb-2">{alert.message}</div>
                    {alert.context.operation && (
                      <div className="text-sm text-gray-600">
                        Operation: {alert.context.operation}
                      </div>
                    )}
                    {alert.context.campaignId && (
                      <div className="text-sm text-gray-600">
                        Campaign: {alert.context.campaignId.slice(0, 8)}...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Circuit Breaker Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Circuit Breaker Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Service Degradation</h3>
            <div className={`px-4 py-2 rounded-full inline-block ${isDegraded ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
              {isDegraded ? '⚠️ Service Degraded' : '✅ Service Normal'}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {isDegraded 
                ? 'Some services are operating in degraded mode with fallbacks'
                : 'All services are operating normally'
              }
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Error Recovery</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• Automatic retry with exponential backoff</div>
              <div>• Circuit breaker pattern for repeated failures</div>
              <div>• Graceful degradation with fallbacks</div>
              <div>• Real-time error monitoring and alerting</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
          <button
            onClick={() => gracefulDegradation.resetDegradation()}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Reset Degradation
          </button>
          <button
            onClick={() => errorMonitor.clearAlerts()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Clear Alerts
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
