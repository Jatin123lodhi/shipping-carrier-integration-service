/**
 * UPS Rate Integration Tests
 * 
 * Tests end-to-end rate request flow with stubbed API responses.
 */

import { UpsService } from '../../src/carriers/ups/ups.service';
import { createUpsAuth } from '../../src/carriers/ups/ups.auth';
import { createUpsClient } from '../../src/carriers/ups/ups.client';
import { createUpsMapper } from '../../src/carriers/ups/ups.mapper';
import type { CarrierConfig } from '../../src/config/types';
import type { RateRequest } from '../../src/domain/types';
const authTokenFixture = require('../fixtures/ups/auth-token.json');
const rateSuccessFixture = require('../fixtures/ups/rate-success.json');
const rateErrorFixture = require('../fixtures/ups/rate-error.json');

describe('UPS Rate Service', () => {
  const mockConfig: CarrierConfig = {
    carrierId: 'ups',
    baseUrl: 'https://api.ups.com',
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    tokenEndpoint: 'https://api.ups.com/security/v1/oauth/token',
  };

  const sampleRateRequest: RateRequest = {
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
      weightUnit: 'lbs',
      length: 10,
      width: 8,
      height: 6,
      dimensionUnit: 'in',
    },
  };

  const createMockHttpClient = () => {
    const calls: Array<{
      url: string;
      body: string;
      headers: Record<string, string>;
    }> = [];

    return {
      calls,
      post: jest.fn().mockImplementation(
        (url: string, body: string, headers: Record<string, string>) => {
          calls.push({ url, body, headers });

          // Token endpoint
          if (url.includes('/oauth/token')) {
            return Promise.resolve({
              status: 200,
              statusText: 'OK',
              body: authTokenFixture,
            });
          }

          // Rate endpoint
          if (url.includes('/Rate')) {
            return Promise.resolve({
              status: 200,
              statusText: 'OK',
              body: rateSuccessFixture,
            });
          }

          return Promise.resolve({
            status: 404,
            statusText: 'Not Found',
            body: {},
          });
        }
      ),
    };
  };

  describe('Successful Rate Requests', () => {
    it('should return normalized rate quotes', async () => {
      const mockHttpClient = createMockHttpClient();
      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const client = createUpsClient(mockConfig, mockHttpClient);
      const mapper = createUpsMapper();
      const service = new UpsService(auth, client, mapper);

      const result = await service.getRates(sampleRateRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quotes).toHaveLength(3);
        expect(result.data.quotes[0].carrier).toBe('ups');
        expect(result.data.quotes[0].serviceLevel).toBe('Ground');
        expect(result.data.quotes[0].serviceCode).toBe('03');
        expect(result.data.quotes[0].totalCost).toBe(15.5);
        expect(result.data.quotes[0].currency).toBe('USD');
        expect(result.data.quotes[0].estimatedTransitDays).toBe(5);
      }
    });

    it('should build correct UPS API request payload', async () => {
      const mockHttpClient = createMockHttpClient();
      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const client = createUpsClient(mockConfig, mockHttpClient);
      const mapper = createUpsMapper();
      const service = new UpsService(auth, client, mapper);

      await service.getRates(sampleRateRequest);

      // Find the rate API call
      const rateCall = mockHttpClient.calls.find((call) =>
        call.url.includes('/Rate')
      );
      expect(rateCall).toBeDefined();

      if (rateCall) {
        const requestBody = JSON.parse(rateCall.body);
        expect(requestBody.RateRequest.Shipment.Shipper.Address.City).toBe(
          'San Francisco'
        );
        expect(requestBody.RateRequest.Shipment.ShipTo.Address.City).toBe(
          'New York'
        );
        expect(
          requestBody.RateRequest.Shipment.Package.PackageWeight.Weight
        ).toBe('5');
        expect(
          requestBody.RateRequest.Shipment.Package.Dimensions.Length
        ).toBe('10');
      }
    });

    it('should include OAuth token in rate request headers', async () => {
      const mockHttpClient = createMockHttpClient();
      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const client = createUpsClient(mockConfig, mockHttpClient);
      const mapper = createUpsMapper();
      const service = new UpsService(auth, client, mapper);

      await service.getRates(sampleRateRequest);

      const rateCall = mockHttpClient.calls.find((call) =>
        call.url.includes('/Rate')
      );
      expect(rateCall).toBeDefined();

      if (rateCall) {
        expect(rateCall.headers.Authorization).toBe(
          `Bearer ${authTokenFixture.access_token}`
        );
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP 4xx client errors', async () => {
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
            status: 400,
            statusText: 'Bad Request',
            body: rateErrorFixture,
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
        expect(result.error.httpStatus).toBe(400);
        expect(result.error.severity).toBe('CLIENT_ERROR');
      }
    });

    it('should handle HTTP 5xx server errors', async () => {
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
        expect(result.error.httpStatus).toBe(500);
        expect(result.error.severity).toBe('SERVER_ERROR');
      }
    });

    it('should handle malformed JSON responses', async () => {
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
            status: 200,
            statusText: 'OK',
            body: 'invalid json{',
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
        expect(result.error.severity).toBe('SERVER_ERROR');
        expect(result.error.code).toBe('JSON_PARSE_ERROR');
      }
    });

    it('should handle network timeout errors', async () => {
      const mockHttpClient = {
        post: jest.fn().mockImplementation((url: string) => {
          if (url.includes('/oauth/token')) {
            return Promise.resolve({
              status: 200,
              statusText: 'OK',
              body: authTokenFixture,
            });
          }
          return Promise.reject(new Error('Request timeout after 30000ms'));
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
        expect(result.error.severity).toBe('NETWORK_ERROR');
      }
    });

    it('should validate input before making API calls', async () => {
      const mockHttpClient = createMockHttpClient();
      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const client = createUpsClient(mockConfig, mockHttpClient);
      const mapper = createUpsMapper();
      const service = new UpsService(auth, client, mapper);

      const invalidRequest = {
        ...sampleRateRequest,
        package: {
          ...sampleRateRequest.package,
          weight: -1, // Invalid weight
        },
      } as RateRequest;

      const result = await service.getRates(invalidRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.severity).toBe('VALIDATION_ERROR');
      }

      // Should not make any API calls
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });
  });
});
