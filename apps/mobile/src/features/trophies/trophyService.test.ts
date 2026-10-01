import { describe, expect, it } from 'vitest';

import { evaluateCompletionTrophies } from './trophyService';

describe('trophy service', () => {
  it('unlocks definitions idempotently', () => {
    const definitions = [{ trophyId: 'first', ruleVersion: '1.0.0', minimumCompletions: 1 }];
    const first = evaluateCompletionTrophies(definitions, 1);
    const second = evaluateCompletionTrophies(definitions, 1, first);
    expect(second).toHaveLength(1);
    expect(second[0]?.trophyId).toBe('first');
  });
});
