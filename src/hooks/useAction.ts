import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/toast';

/**
 * Runs a save/delete call: shows a success toast, or the server's error message.
 * Returns the result, or undefined when it failed.
 */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, okMessage?: string): Promise<T | undefined> => {
      setBusy(true);
      try {
        const result = await fn();
        if (okMessage) toast.success(okMessage);
        return result;
      } catch (e) {
        toast.error((e as Error).message || 'Something went wrong.');
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { run, busy };
}
