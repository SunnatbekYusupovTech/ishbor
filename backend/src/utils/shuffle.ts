/**
 * Fisher–Yates shuffle producing a permutation of [0..n-1].
 * `result[displayedIndex] = originalIndex`.
 */
export function shuffledIndices(n: number): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/** Reorder `items` according to a permutation from {@link shuffledIndices}. */
export function applyOrder<T>(items: T[], order: number[]): T[] {
  return order.map((originalIndex) => items[originalIndex]);
}
