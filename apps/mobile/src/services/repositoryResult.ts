export type RepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RepositoryError };

export type RepositoryError = {
  operation: string;
  message: string;
  retryable: boolean;
  cause?: unknown;
};

export function repositoryError(operation: string, cause: unknown): RepositoryError {
  const message = cause instanceof Error
    ? cause.message
    : isErrorRecord(cause) && typeof cause.message === 'string'
      ? cause.message
      : 'An unexpected data error occurred.';
  const code = isErrorRecord(cause) && typeof cause.code === 'string' ? cause.code : '';

  return {
    operation,
    message,
    retryable: !['23505', '23503', '42501', 'PGRST116'].includes(code),
    cause,
  };
}

function isErrorRecord(value: unknown): value is { code?: unknown; message?: unknown } {
  return typeof value === 'object' && value !== null;
}

export async function repositoryOperation<T>(
  operation: string,
  action: () => Promise<T>,
): Promise<RepositoryResult<T>> {
  try {
    return { ok: true, value: await action() };
  } catch (cause) {
    return { ok: false, error: repositoryError(operation, cause) };
  }
}
