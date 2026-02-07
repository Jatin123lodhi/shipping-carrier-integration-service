/**
 * UPS Authentication Integration Tests
 * 
 * Tests OAuth token acquisition, caching, and refresh.
 */

import { UpsAuthImpl, createUpsAuth } from '../../src/carriers/ups/ups.auth';
import type { CarrierConfig } from '../../src/config/types';
import { ErrorSeverity } from '../../src/domain/types';

describe('UPS Authentication', () => {
  const mockConfig: CarrierConfig = {
    carrierId: 'ups',
    baseUrl: 'https://api.ups.com',
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    tokenEndpoint: 'https://api.ups.com/security/v1/oauth/token',
  };

  const createMockHttpClient = (mockResponse: {
    status: number;
    statusText: string;
    body: unknown;
  }) => ({
    post: jest.fn().mockResolvedValue(mockResponse),
  });

  describe('Token Acquisition', () => {
    it('should acquire a new token successfully', async () => {
      const mockHttpClient = createMockHttpClient({
        status: 200,
        statusText: 'OK',
        body: {
          access_token: 'test_token_123',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });

      const auth = createUpsAuth(mockConfig, mockHttpClient);

      const result = await auth.getValidToken();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accessToken).toBe('test_token_123');
        expect(result.data.tokenType).toBe('Bearer');
        expect(result.data.expiresAt).toBeGreaterThan(Date.now());
      }

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        mockConfig.tokenEndpoint,
        'grant_type=client_credentials',
        expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: expect.stringContaining('Basic'),
        }),
        expect.any(Number)
      );
    });

    it('should cache and reuse valid tokens', async () => {
      const mockHttpClient = createMockHttpClient({
        status: 200,
        statusText: 'OK',
        body: {
          access_token: 'cached_token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });

      const auth = createUpsAuth(mockConfig, mockHttpClient);

      // First call - should acquire token
      const result1 = await auth.getValidToken();
      expect(result1.success).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

      // Second call - should use cached token
      const result2 = await auth.getValidToken();
      expect(result2.success).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1); // Still 1, not called again

      if (result1.success && result2.success) {
        expect(result1.data.accessToken).toBe(result2.data.accessToken);
      }
    });

    it('should refresh expired tokens', async () => {
      const mockHttpClient = createMockHttpClient({
        status: 200,
        statusText: 'OK',
        body: {
          access_token: 'new_token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });

      const auth = new UpsAuthImpl(mockConfig, mockHttpClient);

      // Acquire first token
      const result1 = await auth.getValidToken();
      expect(result1.success).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

      // Manually expire the token
      if (result1.success) {
        (auth as any).cachedToken = {
          ...result1.data,
          expiresAt: Date.now() - 1000, // Expired
        };
      }

      // Next call should acquire new token
      const result2 = await auth.getValidToken();
      expect(result2.success).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP 401 authentication errors', async () => {
      const mockHttpClient = createMockHttpClient({
        status: 401,
        statusText: 'Unauthorized',
        body: { error: 'Invalid credentials' },
      });

      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const result = await auth.getValidToken();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.severity).toBe(ErrorSeverity.AUTH_ERROR);
        expect(result.error.httpStatus).toBe(401);
      }
    });

    it('should handle network timeout errors', async () => {
      const mockHttpClient = {
        post: jest.fn().mockRejectedValue(
          new Error('Request timeout after 30000ms')
        ),
      };

      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const result = await auth.getValidToken();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.severity).toBe(ErrorSeverity.NETWORK_ERROR);
      }
    });

    it('should handle malformed JSON responses', async () => {
      const mockHttpClient = createMockHttpClient({
        status: 200,
        statusText: 'OK',
        body: 'invalid json{',
      });

      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const result = await auth.getValidToken();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.severity).toBe(ErrorSeverity.SERVER_ERROR);
        expect(result.error.code).toBe('JSON_PARSE_ERROR');
      }
    });

    it('should handle missing token fields', async () => {
      const mockHttpClient = createMockHttpClient({
        status: 200,
        statusText: 'OK',
        body: {
          token_type: 'Bearer',
          // Missing access_token
        },
      });

      const auth = createUpsAuth(mockConfig, mockHttpClient);
      const result = await auth.getValidToken();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.severity).toBe(ErrorSeverity.AUTH_ERROR);
        expect(result.error.message).toContain('missing access_token');
      }
    });
  });
});
