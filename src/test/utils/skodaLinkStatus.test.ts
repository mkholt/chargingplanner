import { getSkodaLinkStatus, MS_PER_DAY, SKODA_EXPIRY_WARNING_DAYS } from '@/utils';

const NOW = new Date('2026-10-24T12:00:00Z');
const inDays = (days: number) => new Date(NOW.getTime() + days * MS_PER_DAY).toISOString();
const usable = { hasToken: true, isLocked: false, isRevoked: false, now: NOW };

describe('getSkodaLinkStatus', () => {
  const link = { vin: 'TMBJJ7NE8L0123456', expiresAt: inDays(60) };

  it('is linked with a usable token far from expiry', () => {
    expect(getSkodaLinkStatus(link, usable)).toBe('linked');
  });

  it('warns when the access expires soon', () => {
    const soon = { ...link, expiresAt: inDays(SKODA_EXPIRY_WARNING_DAYS - 1) };
    expect(getSkodaLinkStatus(soon, usable)).toBe('expiring');
  });

  it('is expired after the expiry, even while locked or revoked', () => {
    const expired = { ...link, expiresAt: inDays(-1) };
    expect(getSkodaLinkStatus(expired, usable)).toBe('expired');
    expect(getSkodaLinkStatus(expired, { ...usable, isLocked: true, isRevoked: true })).toBe('expired');
  });

  it('needs re-linking when the proxy reported the key as revoked', () => {
    expect(getSkodaLinkStatus(link, { ...usable, isRevoked: true })).toBe('relink');
  });

  it('is locked while the vault is locked', () => {
    expect(getSkodaLinkStatus(link, { ...usable, hasToken: false, isLocked: true })).toBe('locked');
  });

  it('needs re-linking when there is no token (e.g. after a vault reset)', () => {
    expect(getSkodaLinkStatus(link, { ...usable, hasToken: false })).toBe('relink');
  });
});
