import { useCallback, useEffect, useRef, useState } from 'react';
import { DB_CHANGED_EVENT } from '@/services/mock/db';

type ApiState<T> = { data: T | undefined; loading: boolean; error: string | null; reload: () => void };

/**
 * Loads data from a service on mount (and when `deps` change), like SWR in Health 360.
 * In mock mode it also reloads when data changes in another tab or component.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiState<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcherRef
      .current()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  useEffect(() => {
    window.addEventListener(DB_CHANGED_EVENT, reload);
    return () => window.removeEventListener(DB_CHANGED_EVENT, reload);
  }, [reload]);

  return { data, loading, error, reload };
}
