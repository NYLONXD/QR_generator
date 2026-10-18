import { DependencyList, useCallback, useEffect, useState } from 'react';

interface LoaderState<T> { data: T | null; error: unknown; loading: boolean }

/**
 * Runs `load` on mount and whenever `deps` change. Keeps the previous data while
 * reloading so the page doesn't flash back to a spinner.
 */
export function useLoader<T>(load: () => Promise<T>, deps: DependencyList = []) {
  const [state, setState] = useState<LoaderState<T>>({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));
    load().then(
      data => { if (!cancelled) setState({ data, error: null, loading: false }); },
      error => { if (!cancelled) setState(s => ({ data: s.data, error, loading: false })); },
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion(v => v + 1), []);
  const setData = useCallback((data: T) => setState(s => ({ ...s, data })), []);
  return { ...state, reload, setData };
}
