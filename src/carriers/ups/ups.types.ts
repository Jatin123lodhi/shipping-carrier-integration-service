/**
 * UPS-specific Types
 * 
 * Types that represent UPS API request and response structures.
 * These are internal to the UPS implementation and should not be
 * exposed to callers of the service.
 */

import type { Result, CarrierError } from '../../domain/types';

/**
 * UPS OAuth token response structure
 */
export interface UpsTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  issued_at?: string;
}

/**
 * UPS OAuth token with expiration tracking
 */
export interface UpsToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

/**
 * UPS Rate Request structure (simplified based on UPS Rating API)
 * This represents the UPS API format
 */
export interface UpsRateRequest {
  RateRequest: {
    Request: {
      RequestOption: string;
      TransactionReference?: {
        CustomerContext?: string;
      };
    };
    Shipment: {
      Shipper: {
        Name?: string;
        ShipperNumber?: string;
        Address: {
          AddressLine?: string[];
          City: string;
          StateProvinceCode: string;
          PostalCode: string;
          CountryCode: string;
        };
      };
      ShipTo: {
        Name?: string;
        Address: {
          AddressLine?: string[];
          City: string;
          StateProvinceCode: string;
          PostalCode: string;
          CountryCode: string;
        };
      };
      ShipFrom?: {
        Name?: string;
        Address: {
          AddressLine?: string[];
          City: string;
          StateProvinceCode: string;
          PostalCode: string;
          CountryCode: string;
        };
      };
      Package: {
        PackagingType?: {
          Code: string;
          Description?: string;
        };
        Dimensions?: {
          UnitOfMeasurement: {
            Code: string;
            Description?: string;
          };
          Length: string;
          Width: string;
          Height: string;
        };
        PackageWeight: {
          UnitOfMeasurement: {
            Code: string;
            Description?: string;
          };
          Weight: string;
        };
      };
      Service?: {
        Code: string;
        Description?: string;
      };
    };
  };
}

/**
 * UPS Rate Response structure (simplified based on UPS Rating API)
 */
export interface UpsRateResponse {
  RateResponse: {
    Response: {
      ResponseStatus: {
        Code: string;
        Description: string;
      };
      Alert?: Array<{
        Code?: string;
        Description: string;
      }>;
      TransactionReference?: {
        CustomerContext?: string;
      };
    };
    RatedShipment?: Array<{
      Service: {
        Code: string;
        Description: string;
      };
      RatedShipmentAlert?: Array<{
        Code?: string;
        Description: string;
      }>;
      TransportationCharges: {
        CurrencyCode: string;
        MonetaryValue: string;
      };
      TotalCharges: {
        CurrencyCode: string;
        MonetaryValue: string;
      };
      NegotiatedRateCharges?: {
        TotalCharge: {
          CurrencyCode: string;
          MonetaryValue: string;
        };
      };
      TimeInTransit?: {
        ServiceLevel?: {
          Code: string;
          Description: string;
        };
        EstimatedArrival?: {
          Arrival?: {
            Date: string;
            Time?: string;
          };
        };
        ServiceDays?: string;
      };
    }>;
  };
}

/**
 * Result type for UPS token operations
 */
export type UpsTokenResult = Result<UpsToken, CarrierError>;

/**
 * Result type for UPS rate API calls
 */
export type UpsRateApiResult = Result<UpsRateResponse, CarrierError>;
