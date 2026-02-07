/**
 * Configuration Types
 * 
 * Types related to system configuration and carrier setup.
 * These are implementation concerns, not domain models.
 */

/**
 * Configuration for a carrier integration
 */
export interface CarrierConfig {
  /** Carrier identifier */
  carrierId: string;
  /** Base URL for the carrier API */
  baseUrl: string;
  /** API client ID/username */
  clientId: string;
  /** API client secret/password */
  clientSecret: string;
  /** OAuth token endpoint (if applicable) */
  tokenEndpoint?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Additional carrier-specific configuration */
  [key: string]: unknown;
}
