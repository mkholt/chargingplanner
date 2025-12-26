import { useQuery } from '@tanstack/react-query';

import { fetchCompanies, type FetchCompaniesParams } from '@/api';
import type { Company } from '@/data';
import { getMockCompanies } from '@/test/mocks/mockCompanies';
import type { CompaniesApiResponse, PriceArea } from '@/types';
import { QUERY_TIMING, USE_MOCK_API } from '@/utils';

// Query key factory for companies
// Companies depend only on region (priceArea)
export const companyQueryKeys = {
  all: ['companies'] as const,
  byRegion: (region: PriceArea) => ['companies', { region }] as const,
};

/**
 * Generate a slug ID from a name.
 * Converts to lowercase, replaces spaces/special chars with underscores.
 * Note: The API uses slugs like "looad" or "nrgi_time" as IDs.
 */
function toSlugId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (ø→o, å→a, æ→ae)
    .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscore
    .replace(/^_|_$/g, ''); // Trim leading/trailing underscores
}

/**
 * Detect if a product is "green" based on its name.
 * Looks for common Danish/English green energy keywords.
 */
function isGreenProduct(productName: string): boolean {
  const greenKeywords = ['grøn', 'groen', 'green', 'klima', 'vind', 'sol', 'bæredygtig'];
  const lowerName = productName.toLowerCase();
  return greenKeywords.some(keyword => lowerName.includes(keyword));
}

/**
 * Map API response to our internal Company type.
 * The /api/companies endpoint doesn't return IDs in its response,
 * so we generate slugs from names to match the API's ID format
 * (visible in /api/companies/find and /api/prices/now responses).
 */
function mapApiCompanies(apiCompanies: CompaniesApiResponse): Company[] {
  return apiCompanies.map(apiCompany => {
    const companyId = toSlugId(apiCompany.name ?? 'unknown');
    return {
      id: companyId,
      name: apiCompany.name ?? 'Unknown',
      products: (apiCompany.products ?? []).map(apiProduct => {
        const productName = apiProduct.name ?? 'Unknown';
        const productId = `${companyId}_${toSlugId(productName)}`;
        return {
          id: productId,
          name: productName,
          surcharge: apiProduct.consumptionSurcharge ?? 0,
          subscriptionMonthly: apiProduct.subscriptionMonthly ?? 0,
          isGreen: isGreenProduct(productName),
        };
      }),
    };
  });
}

export function useCompaniesQuery(priceArea: PriceArea | null) {
  return useQuery({
    queryKey: companyQueryKeys.byRegion(priceArea ?? 'DK1'),
    queryFn: async (): Promise<Company[]> => {
      if (USE_MOCK_API) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return getMockCompanies(priceArea ?? 'DK1');
      }
      const params: FetchCompaniesParams = {
        region: priceArea ?? undefined,
      };
      const apiResponse = await fetchCompanies(params);
      return mapApiCompanies(apiResponse ?? []);
    },
    enabled: priceArea !== null,
    staleTime: QUERY_TIMING.static.staleTime,
    gcTime: QUERY_TIMING.static.gcTime,
  });
}
