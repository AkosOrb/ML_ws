import { useSyncExternalStore } from 'react';

const KEY = 'ml-muhely.quiz';
type Scores = Record<string, { best: number; total: number }>;
const listeners = new Set<() => void>();
let cache: Scores | null = null;

function read(): Scores {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Scores;
  } catch {
    cache = {};
  }
  return cache;
}

/** Record a quiz result, keeping the best score per lesson. */
export function saveScore(id: string, score: number, total: number) {
  const prev = read()[id];
  if (prev && prev.best >= score) return;
  cache = { ...read(), [id]: { best: score, total } };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* private mode: keep in memory only */
  }
  listeners.forEach((l) => l());
}

export function useScores(): Scores {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
  );
}
