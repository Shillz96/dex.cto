import React, { useState, useCallback } from 'react';
import { formatErrorForUser, extractProgramError, ErrorType, ProgramErrorType } from './errorHandling';

// Error display component props
export interface ErrorDisplayProps {
  error: any;
  context?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

// Error display component
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  context,
  onRetry,
  onDismiss,
  showDetails = false,
  className = ''
}) => {
  const [showFullDetails, setShowFullDetails] = useState(showDetails);
  
  const formattedError = formatErrorForUser(error, context);
  const programError = extractProgramError(error);
  
  return (
    <div className={`error-display ${className}`}>
      <div className="error-header">
        <h4 className="error-title">{formattedError.title}</h4>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="error-dismiss"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
      
      <div className="error-message">
        <p>{formattedError.message}</p>
        {formattedError.action && (
          <p className="error-action">{formattedError.action}</p>
        )}
      </div>
      
      {programError.errorCode && (
        <div className="error-code">
          Error Code: {programError.errorCode}
        </div>
      )}
      
      {showFullDetails && (
        <div className="error-details">
          <button
            onClick={() => setShowFullDetails(!showFullDetails)}
            className="error-toggle-details"
          >
            {showFullDetails ? 'Hide' : 'Show'} Technical Details
          </button>
          
          {showFullDetails && (
            <div className="error-technical">
              <pre>{JSON.stringify(error, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
      
      <div className="error-actions">
        {onRetry && (
          <button onClick={onRetry} className="error-retry">
            Try Again
          </button>
        )}
        {!showFullDetails && (
          <button
            onClick={() => setShowFullDetails(true)}
            className="error-show-details"
          >
            Show Details
          </button>
        )}
      </div>
    </div>
  );
};

// Hook for managing errors in components
export function useErrorHandler() {
  const [error, setError] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleError = useCallback((error: any, context?: string) => {
    console.error(`Error in ${context || 'operation'}:`, error);
    setError(error);
    setIsLoading(false);
  }, []);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      clearError();
      const result = await operation();
      setIsLoading(false);
      return result;
    } catch (err) {
      handleError(err, context);
      return null;
    }
  }, [handleError, clearError]);
  
  return {
    error,
    isLoading,
    handleError,
    clearError,
    executeWithErrorHandling
  };
}

// Hook for handling specific program errors
export function useProgramErrorHandler() {
  const [programError, setProgramError] = useState<{
    type: ProgramErrorType | undefined;
    code: number | undefined;
    message: string | undefined;
    action: string | undefined;
  } | null>(null);
  
  const handleProgramError = useCallback((error: any) => {
    const extracted = extractProgramError(error);
    setProgramError(extracted);
  }, []);
  
  const clearProgramError = useCallback(() => {
    setProgramError(null);
  }, []);
  
  const isSpecificError = useCallback((errorType: ProgramErrorType) => {
    return programError?.type === errorType;
  }, [programError]);
  
  return {
    programError,
    handleProgramError,
    clearProgramError,
    isSpecificError
  };
}

// Error boundary component for catching React errors
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <this.props.fallback error={this.state.error!} />;
      }
      
      return (
        <ErrorDisplay
          error={this.state.error}
          context="Application"
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    
    return this.props.children;
  }
}

// Default error fallback component
export const DefaultErrorFallback: React.ComponentType<{ error: Error }> = ({ error }) => (
  <ErrorDisplay
    error={error}
    context="Application"
    showDetails={true}
  />
);

// Utility function to get error severity for styling
export function getErrorSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
  const programError = extractProgramError(error);
  
  if (programError.errorType) {
    switch (programError.errorType) {
      case ProgramErrorType.AMOUNT_TOO_SMALL:
      case ProgramErrorType.AMOUNT_TOO_LARGE:
      case ProgramErrorType.URI_TOO_LONG:
      case ProgramErrorType.INVALID_URI_FORMAT:
        return 'low';
      
      case ProgramErrorType.WRONG_STATUS:
      case ProgramErrorType.GOAL_NOT_MET:
      case ProgramErrorType.EXCEEDS_TARGET:
      case ProgramErrorType.INVALID_MERCHANT_HASH:
        return 'medium';
      
      case ProgramErrorType.INSUFFICIENT_BALANCE:
      case ProgramErrorType.INSUFFICIENT_RENT:
      case ProgramErrorType.INSUFFICIENT_VAULT_BALANCE:
      case ProgramErrorType.DEADLINE_PASSED:
        return 'high';
      
      case ProgramErrorType.UNAUTHORIZED:
      case ProgramErrorType.MERCHANT_HASH_MISMATCH:
      case ProgramErrorType.OVERFLOW:
        return 'critical';
      
      default:
        return 'medium';
    }
  }
  
  // Default severity based on error type
  if (error.message?.includes('Network')) return 'high';
  if (error.message?.includes('Wallet')) return 'high';
  if (error.message?.includes('Transaction')) return 'medium';
  
  return 'medium';
}

// Export types for external use
export type { ErrorDisplayProps };
