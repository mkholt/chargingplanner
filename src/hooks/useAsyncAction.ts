import { useCallback, useState } from 'react';

/**
 * Pending and error state for a user action such as submitting a form.
 * `run` resolves to true when the action succeeded; a thrown error is kept in `error` instead of rethrown.
 */
export function useAsyncAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const run = useCallback(async (action: () => Promise<unknown> | void): Promise<boolean> => {
    setPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);

  return { run, pending, error, reset };
}
