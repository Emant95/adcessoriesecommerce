import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

// Small data hook with loading, error and refetch states.
export function useFetch(url) {
  const [state, setState] = useState({ data: null, loading: Boolean(url), error: null });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!url) return undefined;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get(url, { signal: ctrl.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, loading: false, error });
      });
    return () => ctrl.abort();
  }, [url, tick]);

  return { ...state, reload };
}
