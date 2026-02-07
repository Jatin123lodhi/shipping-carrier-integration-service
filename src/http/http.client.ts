/**
 * HTTP Client
 * 
 * Simple HTTP client abstraction for making API requests.
 * Can be stubbed/mocked for testing.
 */

export interface HttpClient {
  post: (
    url: string,
    body: string,
    headers: Record<string, string>,
    timeout?: number
  ) => Promise<{ status: number; statusText: string; body: unknown }>;
}

/**
 * Simple HTTP client implementation using fetch
 */
export class FetchHttpClient implements HttpClient {
  async post(
    url: string,
    body: string,
    headers: Record<string, string>,
    timeout: number = 30000
  ): Promise<{ status: number; statusText: string; body: unknown }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseBody: unknown;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      return {
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      throw error;
    }
  }
}

export function createHttpClient(): HttpClient {
  return new FetchHttpClient();
}
