import { useEffect, useState } from "react";

const FAVORITES_KEY = "quickturf:favorite-turf-ids";
const FAVORITES_EVENT = "quickturf:favorites-changed";

function readFavoriteIds(): string[] {
  try {
    const value = localStorage.getItem(FAVORITES_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeFavoriteIds(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(new Set(ids))));
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

export function useFavoriteTurfs() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readFavoriteIds());

  useEffect(() => {
    const syncFavorites = () => setFavoriteIds(readFavoriteIds());
    window.addEventListener(FAVORITES_EVENT, syncFavorites);
    window.addEventListener("storage", syncFavorites);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, syncFavorites);
      window.removeEventListener("storage", syncFavorites);
    };
  }, []);

  const isFavorite = (turfId: string) => favoriteIds.includes(turfId);

  const toggleFavorite = (turfId: string) => {
    const current = readFavoriteIds();
    const next = current.includes(turfId)
      ? current.filter(id => id !== turfId)
      : [turfId, ...current];
    writeFavoriteIds(next);
  };

  return { favoriteIds, isFavorite, toggleFavorite };
}
