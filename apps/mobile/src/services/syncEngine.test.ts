import { describe, expect, it } from 'vitest';

import { retryDelayMs } from './syncBackoff';

describe('sync engine', () => {
  it('uses bounded exponential retry delays', () => {
    expect(retryDelayMs(0)).toBe(1000);
    expect(retryDelayMs(2)).toBe(2000);
    expect(retryDelayMs(99)).toBe(60000);
  });
});
