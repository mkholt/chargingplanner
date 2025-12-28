import { http, HttpResponse, delay } from 'msw';

import { API_BASE } from '@/api/config';
import type { PriceArea } from '@/contexts';

import { getMockApiResponse } from './mockPrices';
import { getMockCompanies } from './mockCompanies';
import { getMockSuppliers, findSupplierByPostalCode } from './mockSuppliers';

// Default delay to simulate network latency
const MOCK_DELAY = 100;

export const handlers = [
  // Prices endpoint
  http.get(`${API_BASE}/api/prices`, async ({ request }) => {
    await delay(MOCK_DELAY);
    const url = new URL(request.url);
    const priceArea = (url.searchParams.get('priceArea') as PriceArea) ?? 'DK1';
    return HttpResponse.json(getMockApiResponse(priceArea));
  }),

  // Current price endpoint
  http.get(`${API_BASE}/api/prices/now`, async ({ request }) => {
    await delay(MOCK_DELAY);
    const url = new URL(request.url);
    const priceArea = (url.searchParams.get('priceArea') as PriceArea) ?? 'DK1';
    const response = getMockApiResponse(priceArea);
    // Return just the first price entry as "current"
    return HttpResponse.json(response.prices?.[0] ?? null);
  }),

  // Companies endpoint
  http.get(`${API_BASE}/api/companies`, async ({ request }) => {
    await delay(MOCK_DELAY);
    const url = new URL(request.url);
    const region = (url.searchParams.get('region') as PriceArea) ?? 'DK1';
    const companies = getMockCompanies(region);
    // Transform to API format (the hook does the reverse mapping)
    return HttpResponse.json(
      companies.map(c => ({
        name: c.name,
        products: c.products.map(p => ({
          name: p.name,
          consumptionSurcharge: p.surcharge,
          subscriptionMonthly: p.subscriptionMonthly,
        })),
      }))
    );
  }),

  // Suppliers list endpoint
  http.get(`${API_BASE}/api/suppliers`, async () => {
    await delay(MOCK_DELAY);
    const suppliers = getMockSuppliers();
    // Transform to API format
    return HttpResponse.json(
      suppliers.map(s => ({
        id: s.id,
        name: s.name,
        companyName: s.companyName,
        priceArea: s.priceArea,
      }))
    );
  }),

  // Suppliers find endpoint
  http.get(`${API_BASE}/api/suppliers/find`, async ({ request }) => {
    await delay(MOCK_DELAY);
    const url = new URL(request.url);
    const postalCodeStr = url.searchParams.get('postalCode');
    const lat = url.searchParams.get('lat');
    const long = url.searchParams.get('long');

    if (postalCodeStr) {
      const postalCode = parseInt(postalCodeStr, 10);
      const supplier = findSupplierByPostalCode(postalCode);
      if (supplier) {
        return HttpResponse.json([{
          id: supplier.id,
          name: supplier.name,
          companyName: supplier.companyName,
          priceArea: supplier.priceArea,
        }]);
      }
      // Real API returns 404 for unknown postal codes
      return HttpResponse.json('Postal code not found', { status: 404 });
    }

    if (lat && long) {
      // For GPS coordinates, determine DK1/DK2 based on longitude
      // East of ~12° is DK2 (Copenhagen area), west is DK1
      const longitude = parseFloat(long);
      const isDK2 = longitude > 12;
      const suppliers = getMockSuppliers();
      const supplier = suppliers.find(s => s.priceArea === (isDK2 ? 'DK2' : 'DK1'));
      if (supplier) {
        return HttpResponse.json([{
          id: supplier.id,
          name: supplier.name,
          companyName: supplier.companyName,
          priceArea: supplier.priceArea,
        }]);
      }
    }

    return HttpResponse.json([]);
  }),
];
