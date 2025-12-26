import { apiClient } from './client';

export type FetchCompaniesParams = {
  region?: string; // DK1 or DK2
  yearlyConsumption?: number;
  periodMonths?: number;
};

/**
 * Fetch electricity companies from the stromligning API.
 * Companies are filtered by region (price area).
 */
export async function fetchCompanies(params: FetchCompaniesParams = {}) {
  const { data, error } = await apiClient.GET('/api/companies', {
    params: {
      query: params,
    },
  });

  if (error) {
    throw new Error(`Failed to fetch companies: ${JSON.stringify(error)}`);
  }

  return data;
}
