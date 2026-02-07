/**
 * UPS Mapper
 * 
 * Transforms between domain models and UPS API formats.
 */

import type { RateRequest, RateResponse, RateQuote } from '../../domain/types';
import type { UpsRateRequest, UpsRateResponse } from './ups.types';

export interface UpsMapper {
  toUpsRateRequest(request: RateRequest): UpsRateRequest;
  toRateResponse(response: UpsRateResponse): RateResponse;
}

/**
 * UPS service code mapping (simplified)
 */
const SERVICE_CODE_MAP: Record<string, string> = {
  ground: '03',
  '3_day_select': '12',
  '2nd_day_air': '02',
  'next_day_air': '01',
  'next_day_air_saver': '13',
};

export class UpsMapperImpl implements UpsMapper {
  toUpsRateRequest(request: RateRequest): UpsRateRequest {
    return {
      RateRequest: {
        Request: {
          RequestOption: 'Rate',
        },
        Shipment: {
          Shipper: {
            Address: this.mapAddress(request.origin),
          },
          ShipTo: {
            Address: this.mapAddress(request.destination),
          },
          Package: {
            PackagingType: {
              Code: '02', // Customer Supplied Package
            },
            Dimensions: {
              UnitOfMeasurement: {
                Code: request.package.dimensionUnit === 'in' ? 'IN' : 'CM',
              },
              Length: request.package.length.toString(),
              Width: request.package.width.toString(),
              Height: request.package.height.toString(),
            },
            PackageWeight: {
              UnitOfMeasurement: {
                Code: request.package.weightUnit === 'lbs' ? 'LBS' : 'KGS',
              },
              Weight: request.package.weight.toString(),
            },
          },
          ...(request.serviceLevel && {
            Service: {
              Code: this.mapServiceCode(request.serviceLevel),
            },
          }),
        },
      },
    };
  }

  toRateResponse(response: UpsRateResponse): RateResponse {
    const quotes: RateQuote[] = [];

    if (response.RateResponse.RatedShipment) {
      for (const shipment of response.RateResponse.RatedShipment) {
        const totalCharges = shipment.TotalCharges || shipment.TransportationCharges;
        const cost = parseFloat(
          shipment.NegotiatedRateCharges?.TotalCharge.MonetaryValue ||
            totalCharges.MonetaryValue
        );

        const quote: RateQuote = {
          carrier: 'ups',
          serviceLevel: shipment.Service.Description,
          serviceCode: shipment.Service.Code,
          totalCost: cost,
          currency: totalCharges.CurrencyCode,
        };

        // Add transit time if available
        if (shipment.TimeInTransit?.ServiceDays) {
          quote.estimatedTransitDays = parseInt(
            shipment.TimeInTransit.ServiceDays,
            10
          );
        }

        // Add delivery date if available
        if (shipment.TimeInTransit?.EstimatedArrival?.Arrival?.Date) {
          const dateStr = shipment.TimeInTransit.EstimatedArrival.Arrival.Date;
          quote.estimatedDeliveryDate = new Date(dateStr);
        }

        quotes.push(quote);
      }
    }

    return {
      quotes,
      requestId:
        response.RateResponse.Response.TransactionReference?.CustomerContext,
    };
  }

  private mapAddress(address: RateRequest['origin']): UpsRateRequest['RateRequest']['Shipment']['Shipper']['Address'] {
    const addressLines: string[] = [address.street1];
    if (address.street2) {
      addressLines.push(address.street2);
    }

    return {
      AddressLine: addressLines,
      City: address.city,
      StateProvinceCode: address.stateOrProvince,
      PostalCode: address.postalCode,
      CountryCode: address.countryCode,
    };
  }

  private mapServiceCode(serviceLevel: string): string {
    const normalized = serviceLevel.toLowerCase().replace(/\s+/g, '_');
    return SERVICE_CODE_MAP[normalized] || '03'; // Default to Ground
  }
}

export function createUpsMapper(): UpsMapper {
  return new UpsMapperImpl();
}
