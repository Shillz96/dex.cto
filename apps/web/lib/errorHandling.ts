import { Connection, Transaction, TransactionSignature } from '@solana/web3.js';

// Enhanced error types for better error handling
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  WALLET_ERROR = 'WALLET_ERROR',
  PROGRAM_ERROR = 'PROGRAM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Specific program error types based on the Solana program
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

// Program error code mapping
export const PROGRAM_ERROR_CODES: Record<number, ProgramErrorType> = {
  6000: ProgramErrorType.INVALID_AMOUNT,
  6001: ProgramErrorType.INVALID_DEADLINE,
  6002: ProgramErrorType.WRONG_STATUS,
  6003: ProgramErrorType.DEADLINE_PASSED,
  6004: ProgramErrorType.OVERFLOW,
  6005: ProgramErrorType.UNAUTHORIZED,
  6006: ProgramErrorType.URI_TOO_LONG,
  6007: ProgramErrorType.GOAL_NOT_MET,
  6008: ProgramErrorType.ALREADY_REFUNDED,
  6009: ProgramErrorType.NOTHING_TO_REFUND,
  6010: ProgramErrorType.MERCHANT_HASH_NOT_SET,
  6011: ProgramErrorType.MERCHANT_HASH_MISMATCH,
  6012: ProgramErrorType.AMOUNT_TOO_SMALL,
  6013: ProgramErrorType.AMOUNT_TOO_LARGE,
  6014: ProgramErrorType.DURATION_TOO_SHORT,
  6015: ProgramErrorType.DURATION_TOO_LONG,
  6016: ProgramErrorType.INSUFFICIENT_RENT,
  6017: ProgramErrorType.INSUFFICIENT_BALANCE,
  6018: ProgramErrorType.EXCEEDS_TARGET,
  6019: ProgramErrorType.EMPTY_URI,
  6020: ProgramErrorType.INVALID_URI_FORMAT,
  6021: ProgramErrorType.INVALID_MERCHANT_HASH,
  6022: ProgramErrorType.EXCEEDS_CAMPAIGN_TOTAL,
  6023: ProgramErrorType.INSUFFICIENT_VAULT_BALANCE
};

// User-friendly error messages
export const USER_FRIENDLY_ERROR_MESSAGES: Record<ProgramErrorType, string> = {
  [ProgramErrorType.INVALID_AMOUNT]: 'The amount provided is not valid for this operation.',
  [ProgramErrorType.INVALID_DEADLINE]: 'The campaign deadline is not valid.',
  [ProgramErrorType.WRONG_STATUS]: 'This action cannot be performed in the current campaign status.',
  [ProgramErrorType.DEADLINE_PASSED]: 'The campaign deadline has passed. No more contributions are allowed.',
  [ProgramErrorType.OVERFLOW]: 'The operation would cause a numeric overflow.',
  [ProgramErrorType.UNAUTHORIZED]: 'You are not authorized to perform this action.',
  [ProgramErrorType.URI_TOO_LONG]: 'The metadata URI is too long. Please use a shorter URL.',
  [ProgramErrorType.GOAL_NOT_MET]: 'The campaign goal has not been met yet.',
  [ProgramErrorType.ALREADY_REFUNDED]: 'This contribution has already been refunded.',
  [ProgramErrorType.NOTHING_TO_REFUND]: 'There is nothing to refund for this contribution.',
  [ProgramErrorType.MERCHANT_HASH_NOT_SET]: 'The merchant hash has not been set for this campaign.',
  [ProgramErrorType.MERCHANT_HASH_MISMATCH]: 'The merchant hash does not match the expected value.',
  [ProgramErrorType.AMOUNT_TOO_SMALL]: 'The contribution amount is too small. Minimum amount is 1 token.',
  [ProgramErrorType.AMOUNT_TOO_LARGE]: 'The contribution amount is too large. Maximum amount is 1M tokens.',
  [ProgramErrorType.DURATION_TOO_SHORT]: 'The campaign duration is too short. Minimum duration is 1 hour.',
  [ProgramErrorType.DURATION_TOO_LONG]: 'The campaign duration is too long. Maximum duration is 1 year.',
  [ProgramErrorType.INSUFFICIENT_RENT]: 'Insufficient SOL balance to pay for account rent.',
  [ProgramErrorType.INSUFFICIENT_BALANCE]: 'Insufficient token balance to complete this operation.',
  [ProgramErrorType.EXCEEDS_TARGET]: 'This contribution would exceed the campaign target amount.',
  [ProgramErrorType.EMPTY_URI]: 'The metadata URI cannot be empty.',
  [ProgramErrorType.INVALID_URI_FORMAT]: 'The metadata URI format is invalid.',
  [ProgramErrorType.INVALID_MERCHANT_HASH]: 'The merchant hash format is invalid.',
  [ProgramErrorType.EXCEEDS_CAMPAIGN_TOTAL]: 'The payout amount exceeds the campaign total.',
  [ProgramErrorType.INSUFFICIENT_VAULT_BALANCE]: 'Insufficient vault balance to complete this payout.'
};

// Enhanced error context with more details
export interface ErrorContext {
  operation: string;
  campaignId?: string;
  userId?: string;
  timestamp: number;
  retryCount: number;
  errorType: ErrorType;
  programErrorType?: ProgramErrorType;
  errorCode?: number;
  originalError: any;
  userMessage?: string;
  suggestedAction?: string;
  metadata?: Record<string, any>;
}

// Circuit breaker states
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',    // Normal operation
  OPEN = 'OPEN',        // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  recoveryTimeout: number;       // Time to wait before trying again (ms)
  expectedVolume: number;        // Expected requests per time window
  monitoringWindow: number;      // Time window for monitoring (ms)
}

// Default circuit breaker configuration
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  expectedVolume: 100,
  monitoringWindow: 300000 // 5 minutes
};

// Circuit breaker implementation
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = CircuitBreakerState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitBreakerState.CLOSED;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;        // Base delay in ms
  maxDelay: number;         // Maximum delay in ms
  backoffMultiplier: number; // Multiplier for exponential backoff
  jitter: boolean;          // Add random jitter to prevent thundering herd
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,         // 1 second
  maxDelay: 30000,          // 30 seconds
  backoffMultiplier: 2,
  jitter: true
};

// Exponential backoff with jitter
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );

  if (config.jitter) {
    // Add ±25% jitter
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    return Math.max(0, delay + jitter);
  }

  return delay;
}

// Retry wrapper with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: any, delay: number) => void
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === finalConfig.maxRetries) {
        break;
      }

      const delay = calculateBackoffDelay(attempt, finalConfig);
      
      if (onRetry) {
        onRetry(attempt, error, delay);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Transaction retry wrapper specifically for Solana
export async function retryTransaction<T>(
  operation: () => Promise<T>,
  connection: Connection,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  return withRetry(
    operation,
    config,
    (attempt, error, delay) => {
      console.warn(`Transaction attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
    }
  );
}

// Error monitoring and alerting
export interface ErrorAlert {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  context: ErrorContext;
  timestamp: number;
}

export class ErrorMonitor {
  private alerts: ErrorAlert[] = [];
  private alertHandlers: ((alert: ErrorAlert) => void)[] = [];

  addAlertHandler(handler: (alert: ErrorAlert) => void): void {
    this.alertHandlers.push(handler);
  }

  async reportError(
    error: any,
    context: Partial<ErrorContext>
  ): Promise<void> {
    // Extract program error details if available
    let programErrorType: ProgramErrorType | undefined;
    let errorCode: number | undefined;
    let userMessage: string | undefined;
    let suggestedAction: string | undefined;

    if (error.error?.errorCode || error.error?.code) {
      errorCode = error.error?.errorCode || error.error?.code;
      programErrorType = PROGRAM_ERROR_CODES[errorCode];
      
      if (programErrorType) {
        userMessage = USER_FRIENDLY_ERROR_MESSAGES[programErrorType];
        suggestedAction = this.getSuggestedAction(programErrorType);
      }
    }

    const errorContext: ErrorContext = {
      operation: context.operation || 'unknown',
      campaignId: context.campaignId,
      userId: context.userId,
      timestamp: Date.now(),
      retryCount: context.retryCount || 0,
      errorType: this.categorizeError(error),
      programErrorType,
      errorCode,
      originalError: error,
      userMessage,
      suggestedAction,
      metadata: context.metadata
    };

    const alert: ErrorAlert = {
      level: this.determineAlertLevel(errorContext),
      message: error.message || 'Unknown error occurred',
      context: errorContext,
      timestamp: Date.now()
    };

    this.alerts.push(alert);

    // Notify all alert handlers
    for (const handler of this.alertHandlers) {
      try {
        await handler(alert);
      } catch (handlerError) {
        console.error('Error in alert handler:', handlerError);
      }
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error Alert:', alert);
    }
  }

  private categorizeError(error: any): ErrorType {
    // Check for program errors first
    if (error.error?.errorCode || error.error?.code) {
      return ErrorType.PROGRAM_ERROR;
    }
    
    // Check for Solana-specific errors
    if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
      return ErrorType.NETWORK_ERROR;
    }
    if (error.message?.includes('Transaction failed') || error.message?.includes('signature')) {
      return ErrorType.TRANSACTION_ERROR;
    }
    if (error.message?.includes('Validation failed') || error.message?.includes('require')) {
      return ErrorType.VALIDATION_ERROR;
    }
    if (error.message?.includes('Wallet') || error.message?.includes('signer')) {
      return ErrorType.WALLET_ERROR;
    }
    if (error.message?.includes('Program') || error.message?.includes('instruction')) {
      return ErrorType.PROGRAM_ERROR;
    }
    return ErrorType.UNKNOWN_ERROR;
  }

  private determineAlertLevel(context: ErrorContext): ErrorAlert['level'] {
    if (context.retryCount >= 3) return 'CRITICAL';
    if (context.retryCount >= 2) return 'HIGH';
    if (context.retryCount >= 1) return 'MEDIUM';
    return 'LOW';
  }

  private getSuggestedAction(programErrorType: ProgramErrorType): string {
    switch (programErrorType) {
      case ProgramErrorType.AMOUNT_TOO_SMALL:
        return 'Please increase your contribution amount to at least 1 token.';
      case ProgramErrorType.AMOUNT_TOO_LARGE:
        return 'Please reduce your contribution amount to less than 1M tokens.';
      case ProgramErrorType.DEADLINE_PASSED:
        return 'This campaign is no longer accepting contributions.';
      case ProgramErrorType.WRONG_STATUS:
        return 'Please check the campaign status and try again later.';
      case ProgramErrorType.INSUFFICIENT_BALANCE:
        return 'Please ensure you have sufficient token balance.';
      case ProgramErrorType.INSUFFICIENT_RENT:
        return 'Please ensure you have sufficient SOL for account rent.';
      case ProgramErrorType.EXCEEDS_TARGET:
        return 'Please reduce your contribution amount to stay within the campaign target.';
      case ProgramErrorType.ALREADY_REFUNDED:
        return 'This contribution has already been processed.';
      case ProgramErrorType.MERCHANT_HASH_NOT_SET:
        return 'Please wait for the merchant hash to be set before proceeding.';
      case ProgramErrorType.MERCHANT_HASH_MISMATCH:
        return 'Please verify the merchant hash and try again.';
      case ProgramErrorType.URI_TOO_LONG:
        return 'Please use a shorter metadata URI (maximum 256 characters).';
      case ProgramErrorType.INVALID_URI_FORMAT:
        return 'Please provide a valid URI format (e.g., https://example.com/metadata).';
      default:
        return 'Please try again or contact support if the issue persists.';
    }
  }

  getAlerts(level?: ErrorAlert['level']): ErrorAlert[] {
    if (level) {
      return this.alerts.filter(alert => alert.level === level);
    }
    return this.alerts;
  }

  clearAlerts(): void {
    this.alerts = [];
  }
}

// Health check utilities
export interface HealthCheckResult {
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

export class HealthChecker {
  private checks: Map<string, () => Promise<boolean>> = new Map();

  addCheck(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, check);
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const results: HealthCheckResult['checks'] = {};
    let overallStatus: HealthCheckResult['status'] = 'healthy';
    let failedChecks = 0;

    for (const [name, check] of this.checks) {
      const startTime = Date.now();
      try {
        const passed = await check();
        const responseTime = Date.now() - startTime;
        
        results[name] = {
          status: passed ? 'pass' : 'fail',
          responseTime
        };

        if (!passed) {
          failedChecks++;
          overallStatus = failedChecks === 1 ? 'degraded' : 'unhealthy';
        }
      } catch (error) {
        results[name] = {
          status: 'fail',
          error: error.message
        };
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

// Graceful degradation utilities
export class GracefulDegradation {
  private fallbacks: Map<string, () => any> = new Map();
  private isDegraded = false;

  setFallback(operation: string, fallback: () => any): void {
    this.fallbacks.set(operation, fallback);
  }

  async executeWithFallback<T>(
    operation: string,
    primary: () => Promise<T>,
    fallback?: () => T
  ): Promise<T> {
    try {
      return await primary();
    } catch (error) {
      console.warn(`Primary operation '${operation}' failed, using fallback:`, error.message);
      
      const fallbackFn = fallback || this.fallbacks.get(operation);
      if (fallbackFn) {
        try {
          const result = fallbackFn();
          this.isDegraded = true;
          return result;
        } catch (fallbackError) {
          console.error(`Fallback for '${operation}' also failed:`, fallbackError.message);
          throw fallbackError;
        }
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

// Utility functions for error handling
export function createErrorContext(
  operation: string,
  error: any,
  additionalContext: Partial<ErrorContext> = {}
): ErrorContext {
  const baseContext: ErrorContext = {
    operation,
    timestamp: Date.now(),
    retryCount: 0,
    errorType: ErrorType.UNKNOWN_ERROR,
    originalError: error
  };

  return { ...baseContext, ...additionalContext };
}

export function extractProgramError(error: any): {
  errorType: ProgramErrorType | undefined;
  errorCode: number | undefined;
  userMessage: string | undefined;
  suggestedAction: string | undefined;
} {
  let errorCode: number | undefined;
  let errorType: ProgramErrorType | undefined;
  let userMessage: string | undefined;
  let suggestedAction: string | undefined;

  if (error.error?.errorCode || error.error?.code) {
    errorCode = error.error?.errorCode || error.error?.code;
    errorType = PROGRAM_ERROR_CODES[errorCode];
    
    if (errorType) {
      userMessage = USER_FRIENDLY_ERROR_MESSAGES[errorType];
      // Get suggested action based on error type
      switch (errorType) {
        case ProgramErrorType.AMOUNT_TOO_SMALL:
          suggestedAction = 'Please increase your contribution amount to at least 1 token.';
          break;
        case ProgramErrorType.AMOUNT_TOO_LARGE:
          suggestedAction = 'Please reduce your contribution amount to less than 1M tokens.';
          break;
        case ProgramErrorType.DEADLINE_PASSED:
          suggestedAction = 'This campaign is no longer accepting contributions.';
          break;
        case ProgramErrorType.WRONG_STATUS:
          suggestedAction = 'Please check the campaign status and try again later.';
          break;
        case ProgramErrorType.INSUFFICIENT_BALANCE:
          suggestedAction = 'Please ensure you have sufficient token balance.';
          break;
        case ProgramErrorType.INSUFFICIENT_RENT:
          suggestedAction = 'Please ensure you have sufficient SOL for account rent.';
          break;
        case ProgramErrorType.EXCEEDS_TARGET:
          suggestedAction = 'Please reduce your contribution amount to stay within the campaign target.';
          break;
        case ProgramErrorType.ALREADY_REFUNDED:
          suggestedAction = 'This contribution has already been processed.';
          break;
        case ProgramErrorType.MERCHANT_HASH_NOT_SET:
          suggestedAction = 'Please wait for the merchant hash to be set before proceeding.';
          break;
        case ProgramErrorType.MERCHANT_HASH_MISMATCH:
          suggestedAction = 'Please verify the merchant hash and try again.';
          break;
        case ProgramErrorType.URI_TOO_LONG:
          suggestedAction = 'Please use a shorter metadata URI (maximum 256 characters).';
          break;
        case ProgramErrorType.INVALID_URI_FORMAT:
          suggestedAction = 'Please provide a valid URI format (e.g., https://example.com/metadata).';
          break;
        default:
          suggestedAction = 'Please try again or contact support if the issue persists.';
      }
    }
  }

  return { errorType, errorCode, userMessage, suggestedAction };
}

export function formatErrorForUser(error: any, context?: string): {
  title: string;
  message: string;
  action?: string;
  code?: number;
} {
  const programError = extractProgramError(error);
  
  if (programError.errorType && programError.userMessage) {
    return {
      title: 'Operation Failed',
      message: programError.userMessage,
      action: programError.suggestedAction,
      code: programError.errorCode
    };
  }

  // Fallback to generic error handling
  let title = 'An error occurred';
  let message = error.message || 'Something went wrong. Please try again.';
  
  if (context) {
    title = `${context} Failed`;
  }

  if (error.message?.includes('Network')) {
    message = 'Network connection issue. Please check your internet connection and try again.';
  } else if (error.message?.includes('Wallet')) {
    message = 'Wallet connection issue. Please reconnect your wallet and try again.';
  } else if (error.message?.includes('Transaction')) {
    message = 'Transaction failed. Please check your balance and try again.';
  }

  return { title, message };
}

// Export singleton instances
export const errorMonitor = new ErrorMonitor();
export const healthChecker = new HealthChecker();
export const gracefulDegradation = new GracefulDegradation();

// Default alert handlers
errorMonitor.addAlertHandler(async (alert) => {
  // In production, you might want to send to external services like:
  // - Sentry
  // - LogRocket
  // - Custom monitoring dashboard
  // - Slack/Discord webhooks
  
  if (alert.level === 'CRITICAL') {
    // Send immediate notification
    console.error('🚨 CRITICAL ERROR:', alert.message);
  }
});

// Add default health checks
healthChecker.addCheck('network', async () => {
  try {
    const response = await fetch('https://api.devnet.solana.com', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' })
    });
    return response.ok;
  } catch {
    return false;
  }
});

healthChecker.addCheck('program', async () => {
  // Check if the program is accessible
  try {
    // This would need to be implemented based on your specific program
    return true;
  } catch {
    return false;
  }
});
