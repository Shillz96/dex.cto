// Minimal error handling for build compatibility
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  WALLET_ERROR = 'WALLET_ERROR',
  PROGRAM_ERROR = 'PROGRAM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ProgramErrorType {
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_DEADLINE = 'INVALID_DEADLINE',
  WRONG_STATUS = 'WRONG_STATUS',
  DEADLINE_PASSED = 'DEADLINE_PASSED',
  OVERFLOW = 'OVERFLOW',
  UNAUTHORIZED = 'UNAUTHORIZED',
  URI_TOO_LONG = 'URI_TOO_LONG',
  GOAL_NOT_MET = 'GOAL_NOT_MET',
  ALREADY_REFUNDED = 'ALREADY_REFUNDED',
  NOTHING_TO_REFUND = 'NOTHING_TO_REFUND',
  MERCHANT_HASH_NOT_SET = 'MERCHANT_HASH_NOT_SET',
  MERCHANT_HASH_MISMATCH = 'MERCHANT_HASH_MISMATCH',
  AMOUNT_TOO_SMALL = 'AMOUNT_TOO_SMALL',
  AMOUNT_TOO_LARGE = 'AMOUNT_TOO_LARGE',
  DURATION_TOO_SHORT = 'DURATION_TOO_SHORT',
  DURATION_TOO_LONG = 'DURATION_TOO_LONG',
  INSUFFICIENT_RENT = 'INSUFFICIENT_RENT',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  EXCEEDS_TARGET = 'EXCEEDS_TARGET',
  EMPTY_URI = 'EMPTY_URI',
  INVALID_URI_FORMAT = 'INVALID_URI_FORMAT',
  INVALID_MERCHANT_HASH = 'INVALID_MERCHANT_HASH',
  EXCEEDS_CAMPAIGN_TOTAL = 'EXCEEDS_CAMPAIGN_TOTAL',
  INSUFFICIENT_VAULT_BALANCE = 'INSUFFICIENT_VAULT_BALANCE'
}

// Simple circuit breaker
export class CircuitBreaker {
  private isOpen = false;
  private failureCount = 0;
  private readonly threshold = 3;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await operation();
      this.failureCount = 0;
      return result;
    } catch (error) {
      this.failureCount++;
      if (this.failureCount >= this.threshold) {
        this.isOpen = true;
      }
      throw error;
    }
  }

  reset(): void {
    this.isOpen = false;
    this.failureCount = 0;
  }
}

// Simple retry function
export async function retryTransaction<T>(
  operation: () => Promise<T>,
  connection: any,
  config: { maxRetries: number; baseDelay: number } = { maxRetries: 3, baseDelay: 1000 }
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === config.maxRetries) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, config.baseDelay * Math.pow(2, attempt)));
    }
  }

  throw lastError;
}

// Simple error monitor
export class ErrorMonitor {
  private alerts: any[] = [];

  async reportError(error: any, context: any): Promise<void> {
    console.error('Error reported:', error, context);
    this.alerts.push({ error, context, timestamp: Date.now() });
  }

  getAlerts(): any[] {
    return this.alerts;
  }

  clearAlerts(): void {
    this.alerts = [];
  }
}

// Simple health checker
export class HealthChecker {
  private checks: Map<string, () => Promise<boolean>> = new Map();

  addCheck(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, check);
  }

  async performHealthCheck(): Promise<any> {
    const results: any = {};
    let overallStatus = 'healthy';
    let failedChecks = 0;

    for (const [name, check] of this.checks) {
      try {
        const passed = await check();
        results[name] = { status: passed ? 'pass' : 'fail' };
        if (!passed) {
          failedChecks++;
          overallStatus = failedChecks === 1 ? 'degraded' : 'unhealthy';
        }
      } catch (error) {
        results[name] = { status: 'fail', error: 'Check failed' };
        failedChecks++;
        overallStatus = failedChecks === 1 ? 'degraded' : 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      checks: results,
      timestamp: Date.now()
    };
  }
}

// Simple graceful degradation
export class GracefulDegradation {
  private isDegraded = false;

  async executeWithFallback<T>(
    operation: string,
    primary: () => Promise<T>,
    fallback?: () => T
  ): Promise<T> {
    try {
      return await primary();
    } catch (error) {
      console.warn(`Primary operation '${operation}' failed:`, error);
      if (fallback) {
        this.isDegraded = true;
        return fallback();
      }
      throw error;
    }
  }

  isServiceDegraded(): boolean {
    return this.isDegraded;
  }

  resetDegradation(): void {
    this.isDegraded = false;
  }
}

// Utility functions
export function createErrorContext(operation: string, error: any, additionalContext: any = {}): any {
  return {
    operation,
    timestamp: Date.now(),
    retryCount: 0,
    errorType: ErrorType.UNKNOWN_ERROR,
    originalError: error,
    ...additionalContext
  };
}

export function extractProgramError(error: any): any {
  return {
    errorType: undefined,
    errorCode: undefined,
    userMessage: undefined,
    suggestedAction: undefined
  };
}

export function formatErrorForUser(error: any, context?: string): any {
  return {
    title: context ? `${context} Failed` : 'An error occurred',
    message: error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  };
}

// Export singleton instances
export const errorMonitor = new ErrorMonitor();
export const healthChecker = new HealthChecker();
export const gracefulDegradation = new GracefulDegradation();
