/**
 * UPS HTTP Client
 * 
 * Handles HTTP communication with UPS Rating API.
 */

import type {
  UpsRateRequest,
  UpsRateApiResult,
  UpsToken,
} from './ups.types';
import type { CarrierConfig } from '../../config/types';
import {
  createValidationError,
  httpErrorToCarrierError,
  networkErrorToCarrierError,
  jsonParseErrorToCarrierError,
  unknownErrorToCarrierError,
} from '../../domain/errors';
import {
  validateUpsRateResponseSafe,
} from './ups.validation';
import { formatValidationError } from '../../domain/validation';

export interface UpsClient {
  getRates(request: UpsRateRequest, token: UpsToken): Promise<UpsRateApiResult>;
}

const DEFAULT_RATE_ENDPOINT = '/api/rating/v1/Rate';

export class UpsClientImpl implements UpsClient {
  constructor(
    private readonly config: CarrierConfig,
    private readonly httpClient: {
      post: (
        url: string,
        body: string,
        headers: Record<string, string>,
        timeout?: number
      ) => Promise<{ status: number; statusText: string; body: unknown }>;
    }
  ) {}

  async getRates(
    request: UpsRateRequest,
    token: UpsToken
  ): Promise<UpsRateApiResult> {
    const rateEndpoint =
      this.config.baseUrl.replace(/\/$/, '') + DEFAULT_RATE_ENDPOINT;
    const timeout = this.config.timeout || 30000;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `${token.tokenType} ${token.accessToken}`,
      'transId': this.generateTransactionId(),
      'transactionSrc': 'cybership',
    };

    try {
      const response = await this.httpClient.post(
        rateEndpoint,
        JSON.stringify(request),
        headers,
        timeout
      );

      // Handle HTTP errors
      if (response.status < 200 || response.status >= 300) {
        return {
          success: false,
          error: httpErrorToCarrierError(
            response.status,
            response.statusText,
            response.body,
            'ups'
          ),
        };
      }

      // Parse and validate response
      let parsedBody: unknown;
      try {
        if (typeof response.body === 'string') {
          parsedBody = JSON.parse(response.body);
        } else {
          parsedBody = response.body;
        }
      } catch (error) {
        return {
          success: false,
          error: jsonParseErrorToCarrierError(
            error,
            'ups',
            JSON.stringify(response.body)
          ),
        };
      }

      // Validate response structure
      const validationResult = validateUpsRateResponseSafe(parsedBody);
      if (!validationResult.success) {
        const errorMessage = formatValidationError(validationResult.error);
        return {
          success: false,
          error: createValidationError(
            `Invalid UPS rate response structure: ${errorMessage}`,
            {
              validationErrors: validationResult.error.errors,
              httpStatus: response.status,
              originalResponse: parsedBody,
            }
          ),
        };
      }

      return { success: true, data: validationResult.data };
    } catch (error) {
      // Handle network/timeout errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        const errorName = error.name.toLowerCase();
        if (
          errorMessage.includes('timeout') ||
          errorMessage.includes('etimedout') ||
          errorMessage.includes('econnrefused') ||
          errorMessage.includes('enotfound') ||
          errorMessage.includes('connection refused') ||
          errorMessage.includes('dns lookup') ||
          errorName.includes('timeout') ||
          errorName.includes('econnrefused') ||
          errorName.includes('enotfound')
        ) {
          return {
            success: false,
            error: networkErrorToCarrierError(error, 'ups', timeout),
          };
        }
      }

      return {
        success: false,
        error: unknownErrorToCarrierError(error, 'ups', 'Failed to get rates'),
      };
    }
  }

  private generateTransactionId(): string {
    return `cybership-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

export function createUpsClient(
  config: CarrierConfig,
  httpClient: {
    post: (
      url: string,
      body: string,
      headers: Record<string, string>,
      timeout?: number
    ) => Promise<{ status: number; statusText: string; body: unknown }>;
  }
): UpsClient {
  return new UpsClientImpl(config, httpClient);
}
