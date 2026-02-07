/**
 * Domain Validation Schemas
 * 
 * Runtime validation schemas for all domain models using Zod.
 * These schemas ensure type safety and validate input before making external API calls.
 */

import { z } from 'zod';
import type {
  Address,
  Package,
  RateRequest,
  RateQuote,
  RateResponse,
  CarrierError,
} from './types';
import { ErrorSeverity } from './types';

/**
 * ISO 3166-1 alpha-2 country code validation
 * Validates 2-letter country codes (e.g., "US", "CA", "GB")
 */
const countryCodeSchema = z
  .string()
  .length(2, 'Country code must be exactly 2 characters')
  .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters');

/**
 * Postal code validation - accepts various formats
 * This is lenient to support international postal codes
 */
const postalCodeSchema = z
  .string()
  .min(3, 'Postal code must be at least 3 characters')
  .max(10, 'Postal code must be at most 10 characters')
  .regex(/^[A-Z0-9\s-]+$/, 'Postal code contains invalid characters');

/**
 * Address validation schema
 */
export const addressSchema: z.ZodType<Address> = z.object({
  street1: z
    .string()
    .min(1, 'Street address line 1 is required')
    .max(100, 'Street address line 1 must be at most 100 characters'),
  street2: z
    .string()
    .max(100, 'Street address line 2 must be at most 100 characters')
    .optional(),
  city: z
    .string()
    .min(1, 'City is required')
    .max(50, 'City must be at most 50 characters'),
  stateOrProvince: z
    .string()
    .min(1, 'State or province is required')
    .max(50, 'State or province must be at most 50 characters'),
  postalCode: postalCodeSchema,
  countryCode: countryCodeSchema,
});

/**
 * Package validation schema
 * Validates dimensions and weight with reasonable limits
 */
export const packageSchema: z.ZodType<Package> = z.object({
  weight: z
    .number()
    .positive('Weight must be positive')
    .max(1000, 'Weight exceeds maximum allowed (1000)'),
  weightUnit: z.enum(['lbs', 'kg'], {
    errorMap: () => ({ message: 'Weight unit must be "lbs" or "kg"' }),
  }),
  length: z
    .number()
    .positive('Length must be positive')
    .max(200, 'Length exceeds maximum allowed (200)'),
  width: z
    .number()
    .positive('Width must be positive')
    .max(200, 'Width exceeds maximum allowed (200)'),
  height: z
    .number()
    .positive('Height must be positive')
    .max(200, 'Height exceeds maximum allowed (200)'),
  dimensionUnit: z.enum(['in', 'cm'], {
    errorMap: () => ({ message: 'Dimension unit must be "in" or "cm"' }),
  }),
});

/**
 * Service level validation schema
 */
export const serviceLevelSchema = z
  .string()
  .min(1, 'Service level cannot be empty')
  .max(50, 'Service level must be at most 50 characters')
  .optional();

/**
 * Rate request validation schema
 */
export const rateRequestSchema: z.ZodType<RateRequest> = z.object({
  origin: addressSchema,
  destination: addressSchema,
  package: packageSchema,
  serviceLevel: serviceLevelSchema,
});

/**
 * ISO 4217 currency code validation (3-letter codes like "USD", "EUR")
 */
const currencyCodeSchema = z
  .string()
  .length(3, 'Currency code must be exactly 3 characters')
  .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters');

/**
 * Rate quote validation schema
 */
export const rateQuoteSchema: z.ZodType<RateQuote> = z.object({
  carrier: z
    .string()
    .min(1, 'Carrier identifier is required')
    .max(50, 'Carrier identifier must be at most 50 characters'),
  serviceLevel: z
    .string()
    .min(1, 'Service level name is required')
    .max(100, 'Service level name must be at most 100 characters'),
  serviceCode: z
    .string()
    .min(1, 'Service code is required')
    .max(50, 'Service code must be at most 50 characters'),
  totalCost: z
    .number()
    .nonnegative('Total cost must be non-negative')
    .finite('Total cost must be a finite number'),
  currency: currencyCodeSchema,
  estimatedTransitDays: z
    .number()
    .int('Estimated transit days must be an integer')
    .nonnegative('Estimated transit days must be non-negative')
    .optional(),
  estimatedDeliveryDate: z.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Rate response validation schema
 */
export const rateResponseSchema: z.ZodType<RateResponse> = z.object({
  quotes: z
    .array(rateQuoteSchema)
    .min(1, 'Rate response must contain at least one quote'),
  requestId: z.string().optional(),
});

/**
 * Error severity enum schema
 */
export const errorSeveritySchema: z.ZodType<ErrorSeverity> = z.nativeEnum(
  ErrorSeverity,
  {
    errorMap: () => ({ message: 'Invalid error severity' }),
  }
);

/**
 * Carrier error validation schema
 */
export const carrierErrorSchema: z.ZodType<CarrierError> = z.object({
  severity: errorSeveritySchema,
  message: z.string().min(1, 'Error message is required'),
  code: z.string().min(1, 'Error code is required'),
  carrier: z.string().optional(),
  httpStatus: z
    .number()
    .int('HTTP status must be an integer')
    .min(100, 'HTTP status must be between 100 and 599')
    .max(599, 'HTTP status must be between 100 and 599')
    .optional(),
  details: z.record(z.unknown()).optional(),
  originalError: z.unknown().optional(),
});

/**
 * Validation helper functions
 */

/**
 * Validates an address and returns the validated address or throws a ZodError
 */
export function validateAddress(address: unknown): Address {
  return addressSchema.parse(address);
}

/**
 * Validates an address and returns a Result type
 */
export function validateAddressSafe(
  address: unknown
): { success: true; data: Address } | { success: false; error: z.ZodError } {
  const result = addressSchema.safeParse(address);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validates a package and returns the validated package or throws a ZodError
 */
export function validatePackage(packageData: unknown): Package {
  return packageSchema.parse(packageData);
}

/**
 * Validates a package and returns a Result type
 */
export function validatePackageSafe(
  packageData: unknown
): { success: true; data: Package } | { success: false; error: z.ZodError } {
  const result = packageSchema.safeParse(packageData);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validates a rate request and returns the validated request or throws a ZodError
 */
export function validateRateRequest(request: unknown): RateRequest {
  return rateRequestSchema.parse(request);
}

/**
 * Validates a rate request and returns a Result type
 */
export function validateRateRequestSafe(
  request: unknown
):
  | { success: true; data: RateRequest }
  | { success: false; error: z.ZodError } {
  const result = rateRequestSchema.safeParse(request);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validates a rate quote and returns the validated quote or throws a ZodError
 */
export function validateRateQuote(quote: unknown): RateQuote {
  return rateQuoteSchema.parse(quote);
}

/**
 * Validates a rate response and returns the validated response or throws a ZodError
 */
export function validateRateResponse(response: unknown): RateResponse {
  return rateResponseSchema.parse(response);
}

/**
 * Validates a carrier error and returns the validated error or throws a ZodError
 */
export function validateCarrierError(error: unknown): CarrierError {
  return carrierErrorSchema.parse(error);
}

/**
 * Converts a ZodError to a user-friendly error message
 */
export function formatValidationError(error: z.ZodError): string {
  return error.errors
    .map((err) => {
      const path = err.path.join('.');
      return path ? `${path}: ${err.message}` : err.message;
    })
    .join('; ');
}
