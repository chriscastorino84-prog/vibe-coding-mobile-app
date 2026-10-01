import { describe, expect, it } from 'vitest';
import { CONSENT_VERSION, hasRequiredConsent, type ConsentRecord } from './consent';

const accepted: ConsentRecord = {
  version: CONSENT_VERSION,
  acceptedAt: '2026-09-30T00:00:00.000Z',
  wellnessAcknowledged: true,
  privacyAcknowledged: true,
};

describe('consent requirements', () => {
  it('accepts the current version only when both acknowledgements are present', () => {
    expect(hasRequiredConsent(accepted)).toBe(true);
    expect(hasRequiredConsent({ ...accepted, privacyAcknowledged: false })).toBe(false);
    expect(hasRequiredConsent({ ...accepted, version: 'old-version' })).toBe(false);
  });

  it('does not treat a missing record as consent', () => {
    expect(hasRequiredConsent(null)).toBe(false);
    expect(hasRequiredConsent(undefined)).toBe(false);
  });
});
