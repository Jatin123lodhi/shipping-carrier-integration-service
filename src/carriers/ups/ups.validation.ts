/**
 * UPS API Response Validation
 * 
 * Runtime validation schemas for UPS API responses using Zod.
 * These schemas ensure that API responses match expected structures
 * before they are used in the application.
 */

import { z } from 'zod';
import type { UpsTokenResponse, UpsRateResponse } from './ups.types';

/**
 * UPS OAuth token response validation schema
 * Note: expires_in may be optional in some API responses, but we validate it if present
 */
const upsTokenResponseSchema = z.object({
  access_token: z
    .string()
    .min(1, 'access_token is required and cannot be empty'),
  token_type: z
    .string()
    .min(1, 'token_type is required and cannot be empty'),
  expires_in: z
    .number()
    .int('expires_in must be an integer')
    .positive('expires_in must be positive'),
  issued_at: z.string().optional(),
}) as z.ZodType<UpsTokenResponse>;

/**
 * UPS Rate Response validation schema
 */
const upsRateResponseSchema = z.object({
  RateResponse: z.object({
    Response: z.object({
      ResponseStatus: z.object({
        Code: z.string().min(1, 'ResponseStatus.Code is required'),
        Description: z.string().min(1, 'ResponseStatus.Description is required'),
      }),
      Alert: z
        .array(
          z.object({
            Code: z.string().optional(),
            Description: z.string().min(1, 'Alert.Description is required'),
          })
        )
        .optional(),
      TransactionReference: z
        .object({
          CustomerContext: z.string().optional(),
        })
        .optional(),
    }),
    RatedShipment: z
      .array(
        z.object({
          Service: z.object({
            Code: z.string().min(1, 'Service.Code is required'),
            Description: z.string().min(1, 'Service.Description is required'),
          }),
          RatedShipmentAlert: z
            .array(
              z.object({
                Code: z.string().optional(),
                Description: z.string().min(1, 'RatedShipmentAlert.Description is required'),
              })
            )
            .optional(),
          TransportationCharges: z.object({
            CurrencyCode: z.string().min(1, 'TransportationCharges.CurrencyCode is required'),
            MonetaryValue: z.string().min(1, 'TransportationCharges.MonetaryValue is required'),
          }),
          TotalCharges: z.object({
            CurrencyCode: z.string().min(1, 'TotalCharges.CurrencyCode is required'),
            MonetaryValue: z.string().min(1, 'TotalCharges.MonetaryValue is required'),
          }),
          NegotiatedRateCharges: z
            .object({
              TotalCharge: z.object({
                CurrencyCode: z.string().min(1, 'NegotiatedRateCharges.TotalCharge.CurrencyCode is required'),
                MonetaryValue: z.string().min(1, 'NegotiatedRateCharges.TotalCharge.MonetaryValue is required'),
              }),
            })
            .optional(),
          TimeInTransit: z
            .object({
              ServiceLevel: z
                .object({
                  Code: z.string().min(1, 'TimeInTransit.ServiceLevel.Code is required'),
                  Description: z.string().min(1, 'TimeInTransit.ServiceLevel.Description is required'),
                })
                .optional(),
              EstimatedArrival: z
                .object({
                  Arrival: z
                    .object({
                      Date: z.string().min(1, 'TimeInTransit.EstimatedArrival.Arrival.Date is required'),
                      Time: z.string().optional(),
                    })
                    .optional(),
                })
                .optional(),
              ServiceDays: z.string().optional(),
            })
            .optional(),
        })
      )
      .optional(),
  }),
});

/**
 * Validates a UPS token response and returns the validated response or throws a ZodError
 */
export function validateUpsTokenResponse(response: unknown): UpsTokenResponse {
  return upsTokenResponseSchema.parse(response);
}

/**
 * Validates a UPS token response and returns a Result type
 */
export function validateUpsTokenResponseSafe(
  response: unknown
): { success: true; data: UpsTokenResponse } | { success: false; error: z.ZodError } {
  const result = upsTokenResponseSchema.safeParse(response);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validates a UPS rate response and returns the validated response or throws a ZodError
 */
export function validateUpsRateResponse(response: unknown): UpsRateResponse {
  return upsRateResponseSchema.parse(response);
}

/**
 * Validates a UPS rate response and returns a Result type
 */
export function validateUpsRateResponseSafe(
  response: unknown
): { success: true; data: UpsRateResponse } | { success: false; error: z.ZodError } {
  const result = upsRateResponseSchema.safeParse(response);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
