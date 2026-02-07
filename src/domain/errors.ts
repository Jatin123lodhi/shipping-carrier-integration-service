/**
 * Error Handling Utilities
 * 
 * Provides structured error creation and handling for carrier integrations.
 * Handles realistic failure modes: network timeouts, HTTP errors, malformed responses,
 * rate limiting, and authentication failures.
 */

import type { CarrierError, ErrorSeverity } from './types';
import { ErrorSeverity as ErrorSeverityEnum } from './types';

/**
 * Custom error class for carrier-related errors
 * Extends the native Error class with additional carrier-specific properties
 */
export class CarrierIntegrationError extends Error {
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly carrier?: string;
  public readonly httpStatus?: number;
  public readonly details?: Record<string, unknown>;
  public readonly originalError?: unknown;

  constructor(error: CarrierError) {
    super(error.message);
    this.name = 'CarrierIntegrationError';
    this.severity = error.severity;
    this.code = error.code;
    this.carrier = error.carrier;
    this.httpStatus = error.httpStatus;
    this.details = error.details;
    this.originalError = error.originalError;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CarrierIntegrationError);
    }
  }

  /**
   * Converts the error to a CarrierError object
   */
  toCarrierError(): CarrierError {
    return {
      severity: this.severity,
      message: this.message,
      code: this.code,
      carrier: this.carrier,
      httpStatus: this.httpStatus,
      details: this.details,
      originalError: this.originalError,
    };
  }
}

/**
 * Error factory functions for creating structured errors
 */

/**
 * Creates a validation error
 */
export function createValidationError(
  message: string,
  details?: Record<string, unknown>
): CarrierError {
  return {
    severity: ErrorSeverityEnum.VALIDATION_ERROR,
    message,
    code: 'VALIDATION_ERROR',
    details,
  };
}

/**
 * Creates an authentication error
 */
export function createAuthError(
  message: string,
  carrier?: string,
  httpStatus?: number,
  details?: Record<string, unknown>
): CarrierError {
  return {
    severity: ErrorSeverityEnum.AUTH_ERROR,
    message,
    code: 'AUTH_ERROR',
    carrier,
    httpStatus,
    details,
  };
}

/**
 * Creates a client error (4xx HTTP status)
 */
export function createClientError(
  message: string,
  code: string,
  carrier?: string,
  httpStatus?: number,
  details?: Record<string, unknown>
): CarrierError {
  return {
    severity: ErrorSeverityEnum.CLIENT_ERROR,
    message,
    code,
    carrier,
    httpStatus,
    details,
  };
}

/**
 * Creates a server error (5xx HTTP status)
 */
export function createServerError(
  message: string,
  code: string,
  carrier?: string,
  httpStatus?: number,
  details?: Record<string, unknown>
): CarrierError {
  return {
    severity: ErrorSeverityEnum.SERVER_ERROR,
    message,
    code,
    carrier,
    httpStatus,
    details,
  };
}

/**
 * Creates a network/timeout error
 */
export function createNetworkError(
  message: string,
  carrier?: string,
  details?: Record<string, unknown>,
  originalError?: unknown
): CarrierError {
  return {
    severity: ErrorSeverityEnum.NETWORK_ERROR,
    message,
    code: 'NETWORK_ERROR',
    carrier,
    details,
    originalError,
  };
}

/**
 * Creates a rate limit error
 */
export function createRateLimitError(
  message: string,
  carrier?: string,
  httpStatus?: number,
  retryAfter?: number,
  details?: Record<string, unknown>
): CarrierError {
  return {
    severity: ErrorSeverityEnum.RATE_LIMIT_ERROR,
    message,
    code: 'RATE_LIMIT_ERROR',
    carrier,
    httpStatus,
    details: {
      ...details,
      retryAfter,
    },
  };
}

/**
 * Creates an unknown/unexpected error
 */
export function createUnknownError(
  message: string,
  carrier?: string,
  originalError?: unknown,
  details?: Record<string, unknown>
): CarrierError {
  return {
    severity: ErrorSeverityEnum.UNKNOWN_ERROR,
    message,
    code: 'UNKNOWN_ERROR',
    carrier,
    details,
    originalError,
  };
}

/**
 * Error conversion utilities
 */

/**
 * Converts an HTTP status code to an appropriate error severity
 */
export function httpStatusToSeverity(status: number): ErrorSeverity {
  if (status >= 400 && status < 500) {
    if (status === 401 || status === 403) {
      return ErrorSeverityEnum.AUTH_ERROR;
    }
    if (status === 429) {
      return ErrorSeverityEnum.RATE_LIMIT_ERROR;
    }
    return ErrorSeverityEnum.CLIENT_ERROR;
  }
  if (status >= 500) {
    return ErrorSeverityEnum.SERVER_ERROR;
  }
  return ErrorSeverityEnum.UNKNOWN_ERROR;
}

/**
 * Converts an HTTP error response to a CarrierError
 */
export function httpErrorToCarrierError(
  status: number,
  statusText: string,
  body?: unknown,
  carrier?: string
): CarrierError {
  const severity = httpStatusToSeverity(status);
  const code = `HTTP_${status}`;
  
  let message = `HTTP ${status}: ${statusText}`;
  let details: Record<string, unknown> | undefined;

  // Try to extract more detailed error message from response body
  if (body) {
    if (typeof body === 'object' && body !== null) {
      const bodyObj = body as Record<string, unknown>;
      
      // Common error response formats
      if ('message' in bodyObj && typeof bodyObj.message === 'string') {
        message = bodyObj.message;
      } else if ('error' in bodyObj && typeof bodyObj.error === 'string') {
        message = bodyObj.error;
      } else if (
        'errors' in bodyObj &&
        Array.isArray(bodyObj.errors) &&
        bodyObj.errors.length > 0
      ) {
        const firstError = bodyObj.errors[0];
        if (typeof firstError === 'object' && firstError !== null) {
          const errorObj = firstError as Record<string, unknown>;
          if ('message' in errorObj && typeof errorObj.message === 'string') {
            message = errorObj.message;
          }
        }
      }
      
      details = { responseBody: bodyObj };
    } else if (typeof body === 'string') {
      details = { responseBody: body };
    }
  }

  return {
    severity,
    message,
    code,
    carrier,
    httpStatus: status,
    details,
  };
}

/**
 * Converts a network error (timeout, connection failure, etc.) to a CarrierError
 */
export function networkErrorToCarrierError(
  error: unknown,
  carrier?: string,
  timeout?: number
): CarrierError {
  let message = 'Network error occurred';
  let details: Record<string, unknown> | undefined;

  if (error instanceof Error) {
    message = error.message;

    // Detect timeout errors
    if (
      error.message.includes('timeout') ||
      error.message.includes('ETIMEDOUT') ||
      error.name === 'TimeoutError'
    ) {
      message = timeout
        ? `Request timed out after ${timeout}ms`
        : 'Request timed out';
      details = { timeout };
    }

    // Detect connection errors
    if (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('network')
    ) {
      message = 'Failed to connect to carrier API';
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  return createNetworkError(message, carrier, details, error);
}

/**
 * Converts a validation error (e.g., from Zod) to a CarrierError
 */
export function validationErrorToCarrierError(
  error: unknown,
  details?: Record<string, unknown>
): CarrierError {
  let message = 'Validation error';

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  return createValidationError(message, {
    ...details,
    originalError: error,
  });
}

/**
 * Converts a JSON parsing error to a CarrierError
 */
export function jsonParseErrorToCarrierError(
  error: unknown,
  carrier?: string,
  responseText?: string
): CarrierError {
  let message = 'Failed to parse response JSON';

  if (error instanceof SyntaxError) {
    message = `Invalid JSON response: ${error.message}`;
  } else if (error instanceof Error) {
    message = `JSON parse error: ${error.message}`;
  }

  return createServerError(
    message,
    'JSON_PARSE_ERROR',
    carrier,
    undefined,
    {
      responseText: responseText?.substring(0, 500), // Limit response text length
      originalError: error,
    }
  );
}

/**
 * Converts any unknown error to a CarrierError
 * This is a catch-all for unexpected errors
 */
export function unknownErrorToCarrierError(
  error: unknown,
  carrier?: string,
  context?: string
): CarrierError {
  let message = 'An unexpected error occurred';

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    // Try to extract message from error-like objects
    const errorObj = error as Record<string, unknown>;
    if ('message' in errorObj && typeof errorObj.message === 'string') {
      message = errorObj.message;
    }
  }

  if (context) {
    message = `${context}: ${message}`;
  }

  return createUnknownError(message, carrier, error, { context });
}

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: CarrierError): boolean {
  switch (error.severity) {
    case ErrorSeverityEnum.NETWORK_ERROR:
      return true;
    case ErrorSeverityEnum.SERVER_ERROR:
      return true;
    case ErrorSeverityEnum.RATE_LIMIT_ERROR:
      return true;
    case ErrorSeverityEnum.AUTH_ERROR:
      // Auth errors might be retryable if it's a token expiry issue
      return error.code === 'TOKEN_EXPIRED';
    default:
      return false;
  }
}

/**
 * Extracts retry delay from a rate limit error
 */
export function getRetryAfter(error: CarrierError): number | undefined {
  if (error.severity === ErrorSeverityEnum.RATE_LIMIT_ERROR) {
    const retryAfter = error.details?.retryAfter;
    if (typeof retryAfter === 'number') {
      return retryAfter;
    }
  }
  return undefined;
}
