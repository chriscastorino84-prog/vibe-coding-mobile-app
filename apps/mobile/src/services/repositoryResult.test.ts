import { describe, expect, it } from 'vitest';

import { repositoryError, repositoryOperation } from './repositoryResult';

describe('repository result handling', () => {
  it('returns successful values explicitly', async () => {
    await expect(repositoryOperation('load', async () => 42)).resolves.toEqual({ ok: true, value: 42 });
  });

  it('surfaces failure and classifies constraint violations as non-retryable', () => {
    const result = repositoryError('insert', { code: '23505', message: 'duplicate' });
    expect(result).toMatchObject({ operation: 'insert', message: 'duplicate', retryable: false });
  });
});
