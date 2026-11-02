import { DependencyList, useEffect, useRef, useState } from 'react';

type Result<T> = { key: string; data: T | null; error: unknown };

/**
 * Loads on mount and whenever `deps` change. `reload` refetches without clearing what is on screen
 * (`loading` is only true for a first load of the current deps); `setData` patches the cached value
 * for optimistic edits.
 */
export function useAsync<T>(load: () => Promise<T>, deps: DependencyList = []) {
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; });

  const key = JSON.stringify(deps);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result<T>>({ key: '', data: null, error: null });

  useEffect(() => {
    let live = true;
    loadRef.current().then(
      (data) => { if (live) setResult({ key, data, error: null }); },
      (error) => { if (live) setResult((r) => ({ key, data: r.key === key ? r.data : null, error })); },
    );
    return () => { live = false; };
  }, [key, tick]);

  const current = result.key === key;
  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    loading: !current,
    reload: () => setTick((t) => t + 1),
    setData: (v: T | null | ((prev: T | null) => T | null)) =>
      setResult((r) => ({ ...r, key, data: typeof v === 'function' ? (v as (p: T | null) => T | null)(r.key === key ? r.data : null) : v })),
  };
}
