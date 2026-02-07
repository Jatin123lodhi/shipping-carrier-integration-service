/**
 * Environment Configuration
 * 
 * Loads and validates environment variables for carrier integrations.
 */

import type { CarrierConfig } from './types';

/**
 * Load UPS configuration from environment variables
 */
export function loadUpsConfig(): CarrierConfig {
  const baseUrl = process.env.UPS_BASE_URL || 'https://wwwcie.ups.com';
  const clientId = process.env.UPS_CLIENT_ID;
  const clientSecret = process.env.UPS_CLIENT_SECRET;
  const timeout = process.env.UPS_TIMEOUT
    ? parseInt(process.env.UPS_TIMEOUT, 10)
    : undefined;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing required UPS configuration: UPS_CLIENT_ID and UPS_CLIENT_SECRET must be set'
    );
  }

  return {
    carrierId: 'ups',
    baseUrl,
    clientId,
    clientSecret,
    timeout,
  };
}
