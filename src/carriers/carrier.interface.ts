/**
 * Carrier Interface
 * 
 * Defines the contract that all carrier integrations must implement.
 * This interface enables extensibility - adding a new carrier (FedEx, USPS, DHL)
 * or a new operation (label purchase, tracking) should not require rewriting
 * existing code.
 */

import type {
  RateRequest,
  RateResponse,
  CarrierError,
  Result,
} from '../domain/types';
import { CarrierOperation } from '../domain/types';

/**
 * Base interface that all carrier implementations must satisfy.
 * 
 * Each carrier (UPS, FedEx, USPS, DHL) will implement this interface,
 * handling their specific API formats internally while exposing a unified
 * interface to callers.
 */
export interface Carrier {
  /**
   * Unique identifier for this carrier (e.g., "ups", "fedex", "usps")
   */
  readonly carrierId: string;

  /**
   * Get shipping rates for a given request.
   * 
   * This is the primary operation for rate shopping. The carrier implementation
   * will:
   * 1. Validate the request
   * 2. Transform domain models to carrier-specific API format
   * 3. Make authenticated API call
   * 4. Transform carrier response to normalized RateResponse
   * 5. Handle errors and return structured Result type
   * 
   * @param request - Rate request with origin, destination, and package details
   * @returns Result containing RateResponse with quotes or CarrierError
   */
  getRates(request: RateRequest): Promise<Result<RateResponse, CarrierError>>;

  /**
   * Check if this carrier supports a specific operation.
   * 
   * Allows the service to check capabilities before attempting operations.
   * Useful for future operations like label purchase, tracking, etc.
   * 
   * @param operation - The operation to check support for
   * @returns true if the operation is supported, false otherwise
   */
  supportsOperation(operation: CarrierOperation): boolean;

  /**
   * Get the carrier's display name (e.g., "UPS", "FedEx", "USPS")
   */
  getDisplayName(): string;
}

