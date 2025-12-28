import { http, HttpResponse, delay } from 'msw';

import { API_BASE } from '@/api/config';
import type { PriceArea } from '@/contexts';

import { getMockApiResponse, getMockApiResponseWithScenario, type PriceScenario } from './mockPrices';
import { getMockCompanies } from './mockCompanies';
import { getMockSuppliers, findSupplierByPostalCode } from './mockSuppliers';

// Default delay to simulate network latency
const MOCK_DELAY = 100;

/**
 * Get price scenario from localStorage for E2E testing.
 * Tests can set 'mock-price-scenario' in localStorage to control which price pattern is used.
 */
function getPriceScenarioFromStorage(): PriceScenario | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    const scenario = window.localStorage.getItem('mock-price-scenario');
    if (scenario) {
      return scenario as PriceScenario;
    }
  }
  return null;
}

export const handlers = [
  // Prices endpoint
  // Supports scenario via query param OR localStorage ('mock-price-scenario') for E2E testing
  http.get(`${API_BASE}/api/prices`, async ({ request }) => {
    await delay(MOCK_DELAY);
    const url = new URL(request.url);
    const priceArea = (url.searchParams.get('priceArea') as PriceArea) ?? 'DK1';

    // Check query param first, then localStorage
    const scenario = (url.searchParams.get('scenario') as PriceScenario | null) ?? getPriceScenarioFromStorage();

    if (scenario) {
      return HttpResponse.json(getMockApiResponseWithScenario(scenario, priceArea));
    }
    return HttpResponse.json(getMockApiResponse(priceArea));
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
      // Return empty array for unknown postal codes so UI can show "No grid operator found"
      // (404 would cause an error state that hides this message)
      return HttpResponse.json([]);
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
