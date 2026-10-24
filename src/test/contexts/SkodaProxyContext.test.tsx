import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';

import { SkodaProxyProvider, useSkodaProxy } from '@/contexts';
import { server } from '@/test/mocks/server';
import { createTestQueryClient, stubLocalStorage } from '@/test/utils/testUtils';
import { LS_KEYS } from '@/utils';

function renderProxy() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SkodaProxyProvider>{children}</SkodaProxyProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useSkodaProxy(), { wrapper });
}

/** No proxy deployed: the web server's fallback route answers with the app page */
function serveAppPageInstead() {
  server.use(http.get('*/api/skoda/healthz', () => new HttpResponse('<!doctype html><html></html>', {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })));
}

describe('SkodaProxyContext', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses /api/skoda on the app origin', () => {
    stubLocalStorage({});
    const { result } = renderProxy();

    expect(result.current.proxyUrl).toBe(`${window.location.origin}/api/skoda`);
  });

  it('is available when a proxy answers on the app origin', async () => {
    stubLocalStorage({});
    const { result } = renderProxy();

    expect(result.current.available).toBe(false);
    await waitFor(() => expect(result.current.available).toBe(true));
    expect(result.current.baseUrl).toBeNull();
  });

  it('is not available when no proxy is deployed', async () => {
    stubLocalStorage({});
    serveAppPageInstead();
    const { result } = renderProxy();

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(result.current.available).toBe(false);
  });

  it('stays available while turned on, even if the proxy cannot be reached', async () => {
    stubLocalStorage({ [LS_KEYS.SKODA_PROXY]: JSON.stringify({ enabled: true }) });
    server.use(http.get('*/api/skoda/healthz', () => HttpResponse.error()));
    const { result } = renderProxy();

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(result.current.available).toBe(true);
    expect(result.current.baseUrl).toBe(`${window.location.origin}/api/skoda`);
  });
});
