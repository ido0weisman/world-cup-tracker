import { useState, useCallback } from 'react';

const STORAGE_KEY = 'wc2026_favourite_matches';

function readFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeToStorage(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function useFavouriteMatches() {
  const [favourites, setFavourites] = useState(readFromStorage);

  const toggle = useCallback((matchId) => {
    setFavourites(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      writeToStorage(next);
      return next;
    });
  }, []);

  const isFavourite = useCallback(
    (matchId) => favourites.has(matchId),
    [favourites]
  );

  return { toggle, isFavourite };
}
