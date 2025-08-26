// Minimal error handling configuration for build compatibility
export const ERROR_HANDLING_CONFIG = {
  retry: {
    default: { maxRetries: 3, baseDelay: 1000 }
  },
  circuitBreaker: {
    default: { failureThreshold: 5, recoveryTimeout: 60000 }
  },
  alerting: {
    channels: { webhook: { enabled: false } }
  }
};

// Get configuration for current environment
export function getConfig() {
  return ERROR_HANDLING_CONFIG;
}

// Get specific configuration section
export function getConfigSection(section: keyof typeof ERROR_HANDLING_CONFIG) {
  const config = getConfig();
  return config[section];
}

// Get retry configuration for specific operation
export function getRetryConfig(operation?: string) {
  const retryConfig = getConfigSection('retry') as any;
  return retryConfig.default;
}

// Get circuit breaker configuration for specific service
export function getCircuitBreakerConfig(service?: string) {
  const cbConfig = getConfigSection('circuitBreaker') as any;
  return cbConfig.default;
}

// Export default configuration
export default ERROR_HANDLING_CONFIG;
