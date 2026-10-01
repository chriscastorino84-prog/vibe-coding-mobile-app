export const CONSENT_VERSION = '2026-01-01';

export type ConsentRecord = {
  version: string;
  acceptedAt: string;
  wellnessAcknowledged: boolean;
  privacyAcknowledged: boolean;
};

export function hasRequiredConsent(record: ConsentRecord | null | undefined): boolean {
  return Boolean(
    record &&
      record.version === CONSENT_VERSION &&
      record.wellnessAcknowledged &&
      record.privacyAcknowledged,
  );
}
