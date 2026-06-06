import { useState, useEffect } from 'react';

// Generic data-fetching hook. Accepts any async function and returns
// { data, loading, error } — same pattern used across every page.
// The `cancelled` flag prevents state updates on unmounted components.
export function useFetch(fetchFn, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchFn()
      .then(result  => { if (!cancelled) setData(result); })
      .catch(err    => { if (!cancelled) setError(err.response?.data?.error || 'Something went wrong.'); })
      .finally(()   => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
