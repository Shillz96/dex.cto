// Error handling configuration
export const ERROR_HANDLING_CONFIG = {
  // Retry configuration
  retry: {
    default: {
      maxRetries: 3,
      baseDelay: 1000,        // 1 second
      maxDelay: 30000,         // 30 seconds
      backoffMultiplier: 2,
      jitter: true
    },
    // Specific retry policies for different operations
    operations: {
      transaction: {
        maxRetries: 3,
        baseDelay: 2000,       // 2 seconds for transactions
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitter: true
      },
      fetch: {
        maxRetries: 2,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 1.5,
        jitter: true
      },
      program: {
        maxRetries: 2,
        baseDelay: 1000,
        maxDelay: 15000,
        backoffMultiplier: 2,
        jitter: true
      }
    }
  },

  // Circuit breaker configuration
  circuitBreaker: {
    default: {
      failureThreshold: 5,
      recoveryTimeout: 60000,  // 1 minute
      expectedVolume: 100,
      monitoringWindow: 300000 // 5 minutes
    },
    // Specific circuit breaker settings for different services
    services: {
      solana: {
        failureThreshold: 3,
        recoveryTimeout: 30000,  // 30 seconds for Solana
        expectedVolume: 50,
        monitoringWindow: 180000 // 3 minutes
      },
      dex: {
        failureThreshold: 3,
        recoveryTimeout: 45000,  // 45 seconds for DEX operations
        expectedVolume: 20,
        monitoringWindow: 240000 // 4 minutes
      },
      program: {
        failureThreshold: 4,
        recoveryTimeout: 60000,  // 1 minute for program calls
        expectedVolume: 30,
        monitoringWindow: 300000 // 5 minutes
      }
    }
  },

  // Alerting configuration
  alerting: {
    // Alert levels and their thresholds
    levels: {
      CRITICAL: {
        threshold: 3,           // Retry attempts before CRITICAL
        immediate: true,        // Send immediately
        channels: ['console', 'webhook', 'email']
      },
      HIGH: {
        threshold: 2,           // Retry attempts before HIGH
        immediate: false,       // Batch with other alerts
        channels: ['console', 'webhook']
      },
      MEDIUM: {
        threshold: 1,           // Retry attempts before MEDIUM
        immediate: false,
        channels: ['console']
      },
      LOW: {
        threshold: 0,           // Always LOW for new errors
        immediate: false,
        channels: ['console']
      }
    },

    // Alert channels configuration
    channels: {
      webhook: {
        enabled: process.env.ALERT_WEBHOOK_URL !== undefined,
        url: process.env.ALERT_WEBHOOK_URL,
        timeout: 5000,
        retries: 2
      },
      email: {
        enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
        smtp: {
          host: process.env.ALERT_SMTP_HOST,
          port: parseInt(process.env.ALERT_SMTP_PORT || '587'),
          secure: process.env.ALERT_SMTP_SECURE === 'true',
          auth: {
            user: process.env.ALERT_SMTP_USER,
            pass: process.env.ALERT_SMTP_PASS
          }
        },
        recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || []
      },
      slack: {
        enabled: process.env.ALERT_SLACK_WEBHOOK_URL !== undefined,
        webhookUrl: process.env.ALERT_SLACK_WEBHOOK_URL,
        channel: process.env.ALERT_SLACK_CHANNEL || '#alerts',
        username: process.env.ALERT_SLACK_USERNAME || 'Dex.CTO Monitor'
      },
      discord: {
        enabled: process.env.ALERT_DISCORD_WEBHOOK_URL !== undefined,
        webhookUrl: process.env.ALERT_DISCORD_WEBHOOK_URL,
        username: process.env.ALERT_DISCORD_USERNAME || 'Dex.CTO Monitor'
      }
    },

    // Rate limiting for alerts
    rateLimit: {
      maxAlertsPerMinute: 10,
      maxAlertsPerHour: 100,
      maxAlertsPerDay: 1000
    }
  },

  // Health check configuration
  healthCheck: {
    // Health check intervals
    intervals: {
      quick: 30000,            // 30 seconds for quick checks
      standard: 300000,        // 5 minutes for standard checks
      comprehensive: 900000    // 15 minutes for comprehensive checks
    },

    // Health check timeouts
    timeouts: {
      quick: 5000,             // 5 seconds timeout for quick checks
      standard: 15000,         // 15 seconds timeout for standard checks
      comprehensive: 30000     // 30 seconds timeout for comprehensive checks
    },

    // Health check thresholds
    thresholds: {
      responseTime: {
        warning: 1000,         // 1 second - warning threshold
        critical: 5000          // 5 seconds - critical threshold
      },
      errorRate: {
        warning: 0.05,         // 5% error rate - warning threshold
        critical: 0.20         // 20% error rate - critical threshold
      }
    }
  },

  // Logging configuration
  logging: {
    // Log levels
    levels: {
      error: true,
      warn: true,
      info: true,
      debug: process.env.NODE_ENV === 'development'
    },

    // Log destinations
    destinations: {
      console: true,
      file: process.env.LOG_TO_FILE === 'true',
      external: process.env.LOG_EXTERNAL_URL !== undefined
    },

    // Log retention
    retention: {
      maxFiles: 10,
      maxSize: '10m',
      maxDays: 30
    }
  },

  // Performance monitoring
  performance: {
    // Metrics collection
    metrics: {
      enabled: true,
      interval: 60000,         // Collect metrics every minute
      retention: 24 * 60       // Keep 24 hours of metrics
    },

    // Performance thresholds
    thresholds: {
      memory: {
        warning: 0.8,          // 80% memory usage - warning
        critical: 0.95         // 95% memory usage - critical
      },
      cpu: {
        warning: 0.7,          // 70% CPU usage - warning
        critical: 0.9          // 90% CPU usage - critical
      },
      responseTime: {
        warning: 2000,         // 2 seconds - warning
        critical: 5000         // 5 seconds - critical
      }
    }
  },

  // Environment-specific overrides
  environment: {
    development: {
      retry: {
        default: { maxRetries: 1, baseDelay: 500 }
      },
      circuitBreaker: {
        default: { failureThreshold: 2, recoveryTimeout: 30000 }
      },
      alerting: {
        channels: { webhook: { enabled: false } }
      }
    },
    production: {
      retry: {
        default: { maxRetries: 3, baseDelay: 1000 }
      },
      circuitBreaker: {
        default: { failureThreshold: 5, recoveryTimeout: 60000 }
      },
      alerting: {
        channels: { webhook: { enabled: true } }
      }
    }
  }
};

// Get configuration for current environment
export function getConfig() {
  const env = process.env.NODE_ENV || 'development';
  const envConfig = ERROR_HANDLING_CONFIG.environment[env] || {};
  
  return {
    ...ERROR_HANDLING_CONFIG,
    ...envConfig,
    // Deep merge for nested objects
    retry: {
      ...ERROR_HANDLING_CONFIG.retry,
      ...envConfig.retry
    },
    circuitBreaker: {
      ...ERROR_HANDLING_CONFIG.circuitBreaker,
      ...envConfig.circuitBreaker
    }
  };
}

// Get specific configuration section
export function getConfigSection(section: keyof typeof ERROR_HANDLING_CONFIG) {
  const config = getConfig();
  return config[section];
}

// Get retry configuration for specific operation
export function getRetryConfig(operation?: string) {
  const retryConfig = getConfigSection('retry');
  
  if (operation && retryConfig.operations[operation]) {
    return { ...retryConfig.default, ...retryConfig.operations[operation] };
  }
  
  return retryConfig.default;
}

// Get circuit breaker configuration for specific service
export function getCircuitBreakerConfig(service?: string) {
  const cbConfig = getConfigSection('circuitBreaker');
  
  if (service && cbConfig.services[service]) {
    return { ...cbConfig.default, ...cbConfig.services[service] };
  }
  
  return cbConfig.default;
}

// Export default configuration
export default ERROR_HANDLING_CONFIG;
