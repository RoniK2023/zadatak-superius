import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

/**
 * Loads data from the API and exposes loading / error / data / reload.
 * `path` may be null to skip loading.
 */
export function useApi(path, query) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const queryKey = JSON.stringify(query ?? {});
  const requestId = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!path) return;
      const id = ++requestId.current;
      if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await api(path, { query: JSON.parse(queryKey) });
        if (id === requestId.current) setState({ data, error: null, loading: false });
      } catch (error) {
        if (id === requestId.current) setState((s) => ({ ...s, error, loading: false }));
      }
    },
    [path, queryKey],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load, setData: (data) => setState((s) => ({ ...s, data })) };
}
