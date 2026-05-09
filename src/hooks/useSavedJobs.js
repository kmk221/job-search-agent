import { useCallback, useEffect, useState } from 'react';

const norm = (s) => String(s || '').trim().toLowerCase();

export function useSavedJobs() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSavedJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/get-saved-jobs');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setSavedJobs(Array.isArray(data?.savedJobs) ? data.savedJobs : []);
    } catch (err) {
      setError(err.message || 'Failed to load saved jobs');
      setSavedJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedJobs();
  }, [fetchSavedJobs]);

  const isJobSaved = useCallback(
    (company, roleTitle) => {
      if (!company || !roleTitle) return null;
      const c = norm(company);
      const t = norm(roleTitle);
      return (
        savedJobs.find(
          (entry) => norm(entry.company) === c && norm(entry.roleTitle) === t,
        ) || null
      );
    },
    [savedJobs],
  );

  const updateLocalState = useCallback((action) => {
    if (!action || typeof action !== 'object') return;
    setSavedJobs((prev) => {
      switch (action.type) {
        case 'add': {
          const entry = action.entry;
          if (!entry || !entry.pageId) return prev;
          if (prev.some((e) => e.pageId === entry.pageId)) return prev;
          return [...prev, entry];
        }
        case 'remove': {
          const { pageId } = action;
          if (!pageId) return prev;
          return prev.filter((e) => e.pageId !== pageId);
        }
        default:
          return prev;
      }
    });
  }, []);

  return {
    savedJobs,
    loading,
    error,
    refetch: fetchSavedJobs,
    isJobSaved,
    updateLocalState,
  };
}

export default useSavedJobs;
