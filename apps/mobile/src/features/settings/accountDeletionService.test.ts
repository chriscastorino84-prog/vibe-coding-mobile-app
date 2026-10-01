import { describe, expect, it } from 'vitest';

import { deleteCurrentAccount } from './accountDeletionService';

describe('account deletion boundary', () => {
  it('exposes a callable deletion service without embedding server credentials', async () => {
    expect(deleteCurrentAccount).toBeTypeOf('function');
    expect(await import('./accountDeletionService')).not.toHaveProperty('SERVICE_ROLE_KEY');
  });
});
