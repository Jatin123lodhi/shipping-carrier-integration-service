# Shipping Carrier Integration Service

A TypeScript service for integrating with shipping carriers (UPS, FedEx, USPS, DHL) to provide rate shopping, label purchase, tracking, and address validation capabilities.

## Overview

This service provides a clean, extensible architecture for integrating with multiple shipping carriers. It abstracts away carrier-specific API formats, providing a unified interface for rate requests and other operations.

## Features

- ✅ **Rate Shopping** - Get shipping rates from carriers with normalized responses
- ✅ **OAuth Authentication** - Automatic token acquisition, caching, and refresh
- ✅ **Extensible Architecture** - Easy to add new carriers without touching existing code
- ✅ **Type Safety** - Strong TypeScript types throughout
- ✅ **Input Validation** - Runtime validation using Zod schemas
- ✅ **Error Handling** - Structured error responses for all failure modes
- ✅ **Integration Tests** - Comprehensive test suite with stubbed API responses

## Architecture

The service follows a clean separation of concerns:

- **Domain Layer** (`src/domain/`) - Business logic, types, validation, and error handling
- **Carrier Layer** (`src/carriers/`) - Carrier-specific implementations
- **Config Layer** (`src/config/`) - Environment configuration
- **HTTP Layer** (`src/http/`) - HTTP client abstraction

### Adding a New Carrier

To add a new carrier (e.g., FedEx):

1. Create `src/carriers/fedex/fedex.service.ts` implementing the `Carrier` interface
2. Implement `fedex.auth.ts`, `fedex.client.ts`, and `fedex.mapper.ts`
3. Add carrier-specific types in `fedex.types.ts`
4. No changes needed to existing UPS code!

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `UPS_CLIENT_ID` - Your UPS API client ID
- `UPS_CLIENT_SECRET` - Your UPS API client secret
- `UPS_BASE_URL` - UPS API base URL (default: https://wwwcie.ups.com)
- `UPS_TIMEOUT` - Request timeout in milliseconds (default: 30000)

## Usage

### Basic Usage

```typescript
import { createUpsServiceFromEnv } from './src/index';

const upsService = createUpsServiceFromEnv();

const rateRequest = {
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

const result = await upsService.getRates(rateRequest);

if (result.success) {
  console.log('Available rates:', result.data.quotes);
} else {
  console.error('Error:', result.error.message);
}
```

### Advanced Usage (Dependency Injection)

```typescript
import { UpsService } from './src/carriers/ups/ups.service';
import { createUpsAuth } from './src/carriers/ups/ups.auth';
import { createUpsClient } from './src/carriers/ups/ups.client';
import { createUpsMapper } from './src/carriers/ups/ups.mapper';
import { loadUpsConfig } from './src/config/env';
import { createHttpClient } from './src/http/http.client';

const config = loadUpsConfig();
const httpClient = createHttpClient();
const auth = createUpsAuth(config, httpClient);
const client = createUpsClient(config, httpClient);
const mapper = createUpsMapper();

const upsService = new UpsService(auth, client, mapper);
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Test Coverage

The integration tests verify:
- ✅ Request payloads are correctly built from domain models
- ✅ Successful responses are parsed and normalized
- ✅ Auth token lifecycle (acquisition, reuse, refresh on expiry)
- ✅ Error handling (4xx, 5xx, malformed JSON, timeouts)

All tests use stubbed HTTP responses - no live API calls are made.

## Building

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Design Decisions

### 1. Extensible Architecture
- **Carrier Interface**: All carriers implement the same `Carrier` interface
- **Separation of Concerns**: Auth, client, and mapper are separate modules
- **Dependency Injection**: Easy to test and mock individual components

### 2. Type Safety
- **Domain Types**: Carrier-agnostic types that callers use
- **Carrier Types**: Internal types for UPS API formats
- **Result Types**: Type-safe error handling with `Result<T, E>`

### 3. Error Handling
- **Structured Errors**: All errors follow the same `CarrierError` structure
- **Error Severity**: Categorizes errors (CLIENT_ERROR, SERVER_ERROR, NETWORK_ERROR, etc.)
- **No Swallowed Exceptions**: All errors are properly handled and returned

### 4. Validation
- **Input Validation**: All inputs validated before API calls using Zod
- **Runtime Safety**: Catches invalid data before it reaches external APIs

### 5. Authentication
- **Token Caching**: Tokens are cached and reused until expiry
- **Automatic Refresh**: Tokens refresh transparently when expired
- **5-minute Buffer**: Tokens refresh 5 minutes before expiry to prevent race conditions

## Future Improvements

Given more time, I would:

1. **Add More Carriers**: Implement FedEx, USPS, and DHL integrations
2. **Additional Operations**: Add label purchase, tracking, and address validation
3. **Retry Logic**: Implement exponential backoff for retryable errors
4. **Rate Limiting**: Add client-side rate limiting with retry-after support
5. **Logging**: Add structured logging (e.g., Winston, Pino)
6. **Metrics**: Add metrics collection (e.g., Prometheus)
7. **Caching**: Add response caching for rate requests
8. **Documentation**: Add JSDoc comments and API documentation

## Project Structure

```
src/
├── domain/          # Business logic, types, validation
├── carriers/        # Carrier implementations
│   └── ups/        # UPS-specific code
├── config/         # Configuration management
├── http/           # HTTP client abstraction
└── index.ts        # Main entry point

tests/
├── integration/    # End-to-end integration tests
└── fixtures/       # Test data fixtures
```

## License

ISC
