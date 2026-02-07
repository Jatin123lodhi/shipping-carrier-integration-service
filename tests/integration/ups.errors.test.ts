/**
 * UPS Error Handling Integration Tests
 * 
 * Tests error handling for various failure scenarios.
 */

import { UpsService } from '../../src/carriers/ups/ups.service';
import { createUpsAuth } from '../../src/carriers/ups/ups.auth';
import { createUpsClient } from '../../src/carriers/ups/ups.client';
import { createUpsMapper } from '../../src/carriers/ups/ups.mapper';
import type { CarrierConfig } from '../../src/config/types';
import { ErrorSeverity } from '../../src/domain/types';
const authTokenFixture = require('../fixtures/ups/auth-token.json');

describe('UPS Error Handling', () => {
  const mockConfig: CarrierConfig = {
    carrierId: 'ups',
    baseUrl: 'https://api.ups.com',
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    tokenEndpoint: 'https://api.ups.com/security/v1/oauth/token',
  };

  const sampleRateRequest = {
    origin: {
      street1: '123 Main St',
      city: 'San Francisco',
      stateOrProvince: 'CA',
      postalCode: '94102',
      countryCode: 'US',
    },
    destination: {
      street1: '456 Oak Ave',
      city: 'New York',
      stateOrProvince: 'NY',
      postalCode: '10001',
      countryCode: 'US',
    },
    package: {
      weight: 5,
      weightUnit: 'lbs' as const,
      length: 10,
      width: 8,
      height: 6,
      dimensionUnit: 'in' as const,
    },
  };

  describe('Authentication Errors', () => {
    it('should handle 401 Unauthorized', async () => {
      const mockHttpClient = {
        post: jest.fn().mockResolvedValue({
          status: 401,
          statusText: 'Unauthorized',
          body: { error: 'Invalid credentials' },
        }),
        calls: [] as any[],
      };

      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const client = createUpsClient(mockConfig, mockHttpClient);
      const mapper = createUpsMapper();
      const service = new UpsService(auth, client, mapper);

      const result = await service.getRates(sampleRateRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.severity).toBe(ErrorSeverity.AUTH_ERROR);
        expect(result.error.httpStatus).toBe(401);
        expect(result.error.carrier).toBe('ups');
      }
    });

    it('should handle 403 Forbidden', async () => {
      const mockHttpClient = {
        post: jest.fn().mockResolvedValue({
          status: 403,
          statusText: 'Forbidden',
          body: { error: 'Access denied' },
        }),
        calls: [] as any[],
      };

      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const client = createUpsClient(mockConfig, mockHttpClient);
      const mapper = createUpsMapper();
      const service = new UpsService(auth, client, mapper);

      const result = await service.getRates(sampleRateRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.severity).toBe(ErrorSeverity.AUTH_ERROR);
        expect(result.error.httpStatus).toBe(403);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should handle 429 Too Many Requests', async () => {
      const mockHttpClient = {
        post: jest.fn().mockImplementation((url: string) => {
          if (url.includes('/oauth/token')) {
            return Promise.resolve({
              status: 200,
              statusText: 'OK',
              body: authTokenFixture,
            });
          }
          return Promise.resolve({
            status: 429,
            statusText: 'Too Many Requests',
            body: {
              error: 'Rate limit exceeded',
              retryAfter: 60,
            },
          });
        }),
        calls: [] as any[],
      };

      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const client = createUpsClient(mockConfig, mockHttpClient);
      const mapper = createUpsMapper();
      const service = new UpsService(auth, client, mapper);

      const result = await service.getRates(sampleRateRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.severity).toBe(ErrorSeverity.RATE_LIMIT_ERROR);
        expect(result.error.httpStatus).toBe(429);
      }
    });
  });

  describe('Server Errors', () => {
    it('should handle 500 Internal Server Error', async () => {
      const mockHttpClient = {
        post: jest.fn().mockImplementation((url: string) => {
          if (url.includes('/oauth/token')) {
            return Promise.resolve({
              status: 200,
              statusText: 'OK',
              body: authTokenFixture,
            });
          }
          return Promise.resolve({
            status: 500,
            statusText: 'Internal Server Error',
            body: { error: 'Server error' },
          });
        }),
        calls: [] as any[],
      };

      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const client = createUpsClient(mockConfig, mockHttpClient);
      const mapper = createUpsMapper();
      const service = new UpsService(auth, client, mapper);

      const result = await service.getRates(sampleRateRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.severity).toBe(ErrorSeverity.SERVER_ERROR);
        expect(result.error.httpStatus).toBe(500);
      }
    });

    it('should handle 503 Service Unavailable', async () => {
      const mockHttpClient = {
        post: jest.fn().mockImplementation((url: string) => {
          if (url.includes('/oauth/token')) {
            return Promise.resolve({
              status: 200,
              statusText: 'OK',
              body: authTokenFixture,
            });
          }
          return Promise.resolve({
            status: 503,
            statusText: 'Service Unavailable',
            body: { error: 'Service temporarily unavailable' },
          });
        }),
        calls: [] as any[],
      };

      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const client = createUpsClient(mockConfig, mockHttpClient);
      const mapper = createUpsMapper();
      const service = new UpsService(auth, client, mapper);

      const result = await service.getRates(sampleRateRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.severity).toBe(ErrorSeverity.SERVER_ERROR);
        expect(result.error.httpStatus).toBe(503);
      }
    });
  });

  describe('Network Errors', () => {
    it('should handle connection refused errors', async () => {
      const mockHttpClient = {
        post: jest.fn().mockImplementation((url: string) => {
          if (url.includes('/oauth/token')) {
            return Promise.resolve({
              status: 200,
              statusText: 'OK',
              body: authTokenFixture,
            });
          }
          const error = new Error('Connection refused');
          error.name = 'ECONNREFUSED';
          return Promise.reject(error);
        }),
        calls: [] as any[],
      };

      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const client = createUpsClient(mockConfig, mockHttpClient);
      const mapper = createUpsMapper();
      const service = new UpsService(auth, client, mapper);

      const result = await service.getRates(sampleRateRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.severity).toBe(ErrorSeverity.NETWORK_ERROR);
      }
    });

    it('should handle DNS resolution errors', async () => {
      const mockHttpClient = {
        post: jest.fn().mockImplementation((url: string) => {
          if (url.includes('/oauth/token')) {
            return Promise.resolve({
              status: 200,
              statusText: 'OK',
              body: authTokenFixture,
            });
          }
          const error = new Error('DNS lookup failed');
          error.name = 'ENOTFOUND';
          return Promise.reject(error);
        }),
        calls: [] as any[],
      };

      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const client = createUpsClient(mockConfig, mockHttpClient);
      const mapper = createUpsMapper();
      const service = new UpsService(auth, client, mapper);

      const result = await service.getRates(sampleRateRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.severity).toBe(ErrorSeverity.NETWORK_ERROR);
      }
    });
  });
});
