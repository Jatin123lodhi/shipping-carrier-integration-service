/**
 * Domain Types
 * 
 * These are the internal, carrier-agnostic types used throughout the service.
 * Callers should never need to know about carrier-specific implementations.
 */

/**
 * Physical address for shipping origin or destination
 */
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  countryCode: string;
}

/**
 * Package dimensions and weight
 */
export interface Package {
  weight: number;
  weightUnit: 'lbs' | 'kg';
  length: number;
  width: number;
  height: number;
  dimensionUnit: 'in' | 'cm';
}

/**
 * Service level identifier (carrier-agnostic)
 * Examples: "ground", "express", "overnight", etc.
 */
export type ServiceLevel = string;

/**
 * Request to get shipping rates
 */
export interface RateRequest {
  origin: Address;
  destination: Address;
  package: Package;
  serviceLevel?: ServiceLevel;
}

/**
 * Normalized rate quote returned to the caller
 * This abstracts away carrier-specific response formats
 */
export interface RateQuote {
  carrier: string;
  serviceLevel: string;
  serviceCode: string;
  totalCost: number;
  currency: string;
  estimatedTransitDays?: number;
  estimatedDeliveryDate?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Successful rate response containing one or more quotes
 */
export interface RateResponse {
  quotes: RateQuote[];
  requestId?: string;
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  /** Client error (4xx) - invalid request */
  CLIENT_ERROR = 'CLIENT_ERROR',
  /** Server error (5xx) - carrier API issue */
  SERVER_ERROR = 'SERVER_ERROR',
  /** Network/timeout error */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Authentication/authorization error */
  AUTH_ERROR = 'AUTH_ERROR',
  /** Rate limiting error */
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  /** Validation error - invalid input */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** Unknown/unexpected error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured error returned to the caller
 */
export interface CarrierError {
  severity: ErrorSeverity;
  message: string;
  code: string;
  carrier?: string;
  httpStatus?: number;
  details?: Record<string, unknown>;
  originalError?: unknown;
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = CarrierError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Carrier operation types
 */
export enum CarrierOperation {
  RATE = 'RATE',
  LABEL = 'LABEL',
  TRACKING = 'TRACKING',
  ADDRESS_VALIDATION = 'ADDRESS_VALIDATION',
}
