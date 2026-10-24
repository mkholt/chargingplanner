import type { IncomingMessage } from 'node:http';

import proxyaddr from 'proxy-addr';

/**
 * Resolves the client IP, honouring X-Forwarded-For only from the configured trusted proxies
 * (proxy-addr syntax: addresses, CIDRs, or "loopback" / "linklocal" / "uniquelocal").
 */
export const createClientIpResolver = (trustedProxies: string[]) => {
  const trust = proxyaddr.compile(trustedProxies);
  return (incoming: IncomingMessage | undefined) => (incoming ? proxyaddr(incoming, trust) : 'unknown');
};
