import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchPrices, type FetchPricesParams } from '@/api';
import { type PriceArea, usePriceSettings } from '@/contexts';
import { getMockApiResponse } from '@/test/mocks/mockPrices';
import { getLocalDateString, QUERY_TIMING, USE_MOCK_API } from '@/utils';

// Query key factory for type safety and consistency
export const priceQueryKeys = {
  all: ['prices'] as const,
  byParams: (params: FetchPricesParams) => ['prices', params] as const,
};

// Wrapper type that includes whether data is mocked
export type PriceQueryResult<T> = {
  data: T;
  isMocked: boolean;
};

export function usePricesQuery() {
  const { resolved } = usePriceSettings();
  const queryClient = useQueryClient();

  // Calculate start date (today)
  const now = new Date();
  const today = getLocalDateString(now);

  // API requires either:
  // 1. priceArea alone (for general spot prices)
  // 2. supplierId + productId (for product-specific prices with surcharges)
  const hasProductSelection = resolved.supplier?.id && resolved.product?.id;

  const queryParams: FetchPricesParams = {
    // Only include priceArea if no product is selected
    priceArea: hasProductSelection ? undefined : resolved.priceArea,
    // Include supplier/product if both are selected
    supplierId: hasProductSelection ? resolved.supplier?.id : undefined,
    productId: hasProductSelection ? resolved.product?.id : undefined,
    from: today,
    // 'to' defaults to tomorrow on the API, no need to pass it
    // Aggregation: API uses '1h' to aggregate, omit for 15-minute data
    aggregation: resolved.aggregationSize === '1h' ? '1h' : undefined,
    aggregationMethod: resolved.aggregationSize === '1h' ? resolved.aggregationMethod : undefined,
  };

  // Use resolved priceArea for mock API (falls back to query param or default)
  const effectivePriceArea: PriceArea = (queryParams.priceArea as PriceArea) ?? resolved.priceArea;

  const query = useQuery({
    queryKey: priceQueryKeys.byParams(queryParams),
    queryFn: async (): Promise<PriceQueryResult<Awaited<ReturnType<typeof fetchPrices>>>> => {
      if (USE_MOCK_API) {
        // Simulate network delay for realistic testing
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          data: getMockApiResponse(effectivePriceArea),
          isMocked: true,
        };
      }
      return {
        data: await fetchPrices(queryParams),
        isMocked: false,
      };
    },
    staleTime: QUERY_TIMING.prices.staleTime,
    gcTime: QUERY_TIMING.prices.gcTime,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: priceQueryKeys.all });
  };

  return {
    ...query,
    refresh,
  };
}
