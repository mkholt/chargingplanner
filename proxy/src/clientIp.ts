import type { IncomingMessage } from 'node:http';

import ipaddr from 'ipaddr.js';
import proxyaddr from 'proxy-addr';

/** IPv6 clients usually control at least a /64, so limits apply per /64 rather than per address. */
const IPV6_PREFIX_BYTES = 8;

/** IPv4 address, or the /64 network of an IPv6 address (IPv4-mapped IPv6 counts as IPv4). */
export const clientKeyFor = (ip: string) => {
  if (!ipaddr.isValid(ip)) return ip;
  const address = ipaddr.process(ip);
  if (address.kind() === 'ipv4') return address.toString();
  const network = address.toByteArray().map((byte, index) => (index < IPV6_PREFIX_BYTES ? byte : 0));
  return `${ipaddr.fromByteArray(network).toString()}/${IPV6_PREFIX_BYTES * 8}`;
};

/**
 * Resolves the rate-limit key for a request, honouring X-Forwarded-For only from the configured
 * trusted proxies (proxy-addr syntax: addresses, CIDRs, or "loopback" / "linklocal" / "uniquelocal").
 */
export const createClientKeyResolver = (trustedProxies: string[]) => {
  const trust = proxyaddr.compile(trustedProxies);
  return (incoming: IncomingMessage | undefined) =>
    incoming ? clientKeyFor(proxyaddr(incoming, trust)) : 'unknown';
};
