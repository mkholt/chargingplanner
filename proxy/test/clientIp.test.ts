import { describe, expect, it } from 'vitest';

import { clientKeyFor, createClientKeyResolver } from '@proxy/clientIp';

import { makeIncoming } from './helpers';

describe('clientKeyFor', () => {
  it.each([
    ['an IPv4 address', '203.0.113.1', '203.0.113.1'],
    ['an IPv4-mapped IPv6 address', '::ffff:203.0.113.1', '203.0.113.1'],
    ['an IPv6 address', '2001:db8:1:2:3:4:5:6', '2001:db8:1:2::/64'],
    ['another address in the same /64', '2001:db8:1:2::ffff', '2001:db8:1:2::/64'],
    ['an unparseable value', 'not-an-ip', 'not-an-ip'],
  ])('keys %s', (_, ip, key) => {
    expect(clientKeyFor(ip)).toBe(key);
  });
});

describe('createClientKeyResolver', () => {
  it('ignores X-Forwarded-For from untrusted peers', () => {
    const resolve = createClientKeyResolver([]);

    expect(resolve(makeIncoming('198.51.100.9', '203.0.113.50'))).toBe('198.51.100.9');
  });

  it('uses X-Forwarded-For from trusted proxies', () => {
    const resolve = createClientKeyResolver(['loopback']);

    expect(resolve(makeIncoming('127.0.0.1', '2001:db8::1'))).toBe('2001:db8::/64');
  });

  it('falls back to a shared key without a Node request', () => {
    expect(createClientKeyResolver([])(undefined)).toBe('unknown');
  });
});
