/**
 * Shipping Carrier Integration Service
 * 
 * Main entry point for the carrier integration service.
 */

// Domain exports
export * from './domain/types';
export * from './domain/errors';
export * from './domain/validation';

// Carrier interface
export * from './carriers/carrier.interface';

// UPS implementation
export { UpsService, createUpsService } from './carriers/ups/ups.service';
export { createUpsAuth } from './carriers/ups/ups.auth';
export { createUpsClient } from './carriers/ups/ups.client';
export { createUpsMapper } from './carriers/ups/ups.mapper';

// Configuration
export { loadUpsConfig } from './config/env';
export * from './config/types';

// HTTP client
export { createHttpClient } from './http/http.client';
export type { HttpClient } from './http/http.client';

/**
 * Create a configured UPS service instance
 * 
 * Convenience function to create a fully configured UPS service
 * using environment variables.
 */
import { UpsService } from './carriers/ups/ups.service';
import { createUpsAuth } from './carriers/ups/ups.auth';
import { createUpsClient } from './carriers/ups/ups.client';
import { createUpsMapper } from './carriers/ups/ups.mapper';
import { loadUpsConfig } from './config/env';
import { createHttpClient } from './http/http.client';

export function createUpsServiceFromEnv(): UpsService {
  const config = loadUpsConfig();
  const httpClient = createHttpClient();
  const auth = createUpsAuth(config, httpClient);
  const client = createUpsClient(config, httpClient);
  const mapper = createUpsMapper();

  return new UpsService(auth, client, mapper);
}
