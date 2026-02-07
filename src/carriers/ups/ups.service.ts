/**
 * UPS Service
 * 
 * Main service implementation for UPS carrier integration.
 * Implements the Carrier interface and coordinates authentication,
 * API requests, and response mapping.
 */

import type {
  RateRequest,
  RateResponse,
  CarrierError,
  Result,
} from '../../domain/types';
import { CarrierOperation } from '../../domain/types';
import type { Carrier } from '../carrier.interface';
import { validateRateRequestSafe, formatValidationError } from '../../domain/validation';
import {
  createValidationError,
  unknownErrorToCarrierError,
} from '../../domain/errors';
import type { UpsAuth } from './ups.auth';
import type { UpsClient } from './ups.client';
import type { UpsMapper } from './ups.mapper';

/**
 * UPS Carrier Service
 * 
 * Implements the Carrier interface for UPS shipping rate requests.
 * Handles the complete flow:
 * 1. Input validation
 * 2. Authentication (OAuth token acquisition/refresh)
 * 3. Request transformation (domain -> UPS API format)
 * 4. API call execution
 * 5. Response transformation (UPS API -> domain format)
 * 6. Error handling
 */
export class UpsService implements Carrier {
  readonly carrierId = 'ups';

  constructor(
    private readonly auth: UpsAuth,
    private readonly client: UpsClient,
    private readonly mapper: UpsMapper
  ) {}

  /**
   * Get shipping rates from UPS
   */
  async getRates(request: RateRequest): Promise<Result<RateResponse, CarrierError>> {
    try {
      // Step 1: Validate input before making any external calls
      const validationResult = validateRateRequestSafe(request);
      if (!validationResult.success) {
        const errorMessage = formatValidationError(validationResult.error);
        return {
          success: false,
          error: createValidationError(errorMessage, {
            validationErrors: validationResult.error.errors,
          }),
        };
      }

      // Step 2: Get valid authentication token
      const tokenResult = await this.auth.getValidToken();
      if (!tokenResult.success) {
        return {
          success: false,
          error: {
            ...tokenResult.error,
            carrier: this.carrierId,
          },
        };
      }

      // Step 3: Transform domain request to UPS API format
      const upsRequest = this.mapper.toUpsRateRequest(validationResult.data);

      // Step 4: Make authenticated API call
      const apiResult = await this.client.getRates(upsRequest, tokenResult.data);

      if (!apiResult.success) {
        return {
          success: false,
          error: {
            ...apiResult.error,
            carrier: this.carrierId,
          },
        };
      }

      // Step 5: Transform UPS API response to domain format
      const domainResponse = this.mapper.toRateResponse(apiResult.data);

      return {
        success: true,
        data: domainResponse,
      };
    } catch (error) {
      // Catch any unexpected errors
      return {
        success: false,
        error: unknownErrorToCarrierError(
          error,
          this.carrierId,
          'Failed to get UPS rates'
        ),
      };
    }
  }

  /**
   * Check if UPS supports a specific operation
   */
  supportsOperation(operation: CarrierOperation): boolean {
    // Currently only RATE is supported
    // Future operations (LABEL, TRACKING, etc.) can be added here
    return operation === CarrierOperation.RATE;
  }

  /**
   * Get UPS display name
   */
  getDisplayName(): string {
    return 'UPS';
  }
}

/**
 * Factory function to create a UPS service instance
 * 
 * This allows for dependency injection and easier testing.
 */
export function createUpsService(
  auth: UpsAuth,
  client: UpsClient,
  mapper: UpsMapper
): UpsService {
  return new UpsService(auth, client, mapper);
}
