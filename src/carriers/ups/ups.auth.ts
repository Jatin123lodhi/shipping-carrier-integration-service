/**
 * UPS Authentication
 * 
 * Handles UPS OAuth 2.0 client-credentials flow:
 * - Token acquisition
 * - Token caching and reuse
 * - Transparent refresh on expiry
 */

import type { UpsToken, UpsTokenResult } from './ups.types';
import type { CarrierConfig } from '../../config/types';
import {
  createValidationError,
  httpErrorToCarrierError,
  networkErrorToCarrierError,
  jsonParseErrorToCarrierError,
  unknownErrorToCarrierError,
} from '../../domain/errors';
import {
  validateUpsTokenResponseSafe,
} from './ups.validation';
import { formatValidationError } from '../../domain/validation';

/**
 * UPS Authentication Service
 */
export interface UpsAuth {
  getValidToken(): Promise<UpsTokenResult>;
}

const DEFAULT_UPS_TOKEN_ENDPOINT = '/security/v1/oauth/token';
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

/**
 * UPS Authentication Implementation
 */
export class UpsAuthImpl implements UpsAuth {
  private cachedToken: UpsToken | null = null;

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

  async getValidToken(): Promise<UpsTokenResult> {
    // Return cached token if still valid
    if (this.cachedToken && this.isTokenValid(this.cachedToken)) {
      return { success: true, data: this.cachedToken };
    }

    // Acquire new token
    const result = await this.acquireToken();
    if (result.success) {
      this.cachedToken = result.data;
    }
    return result;
  }

  private isTokenValid(token: UpsToken): boolean {
    return token.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS;
  }

  private async acquireToken(): Promise<UpsTokenResult> {
    const tokenEndpoint =
      this.config.tokenEndpoint ||
      `${this.config.baseUrl.replace(/\/$/, '')}${DEFAULT_UPS_TOKEN_ENDPOINT}`;
    const timeout = this.config.timeout || 30000;

    // OAuth 2.0 client-credentials flow
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64');

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    };

    try {
      const response = await this.httpClient.post(
        tokenEndpoint,
        'grant_type=client_credentials',
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
      const validationResult = validateUpsTokenResponseSafe(parsedBody);
      if (!validationResult.success) {
        const errorMessage = formatValidationError(validationResult.error);
        return {
          success: false,
          error: createValidationError(
            `Invalid UPS token response structure: ${errorMessage}`,
            {
              validationErrors: validationResult.error.errors,
              httpStatus: response.status,
              originalResponse: parsedBody,
            }
          ),
        };
      }

      const tokenResponse = validationResult.data;

      // Calculate expiration
      const expiresIn = tokenResponse.expires_in || 3600;
      const token: UpsToken = {
        accessToken: tokenResponse.access_token,
        tokenType: tokenResponse.token_type,
        expiresAt: Date.now() + expiresIn * 1000,
      };

      return { success: true, data: token };
    } catch (error) {
      // Handle network/timeout errors
      if (
        error instanceof Error &&
        (error.message.includes('timeout') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ENOTFOUND'))
      ) {
        return {
          success: false,
          error: networkErrorToCarrierError(error, 'ups', timeout),
        };
      }

      // Handle unknown errors
      return {
        success: false,
        error: unknownErrorToCarrierError(error, 'ups', 'Failed to acquire token'),
      };
    }
  }

  clearCache(): void {
    this.cachedToken = null;
  }
}

export function createUpsAuth(
  config: CarrierConfig,
  httpClient: {
    post: (
      url: string,
      body: string,
      headers: Record<string, string>,
      timeout?: number
    ) => Promise<{ status: number; statusText: string; body: unknown }>;
  }
): UpsAuth {
  return new UpsAuthImpl(config, httpClient);
}
