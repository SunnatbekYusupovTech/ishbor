import { describe, it, expect } from 'vitest';
import { shuffledIndices, applyOrder } from '@/utils/shuffle';

describe('shuffledIndices', () => {
  it('returns a permutation of [0..n-1]', () => {
    const n = 6;
    const order = shuffledIndices(n);
    expect(order).toHaveLength(n);
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('handles n = 0 and n = 1', () => {
    expect(shuffledIndices(0)).toEqual([]);
    expect(shuffledIndices(1)).toEqual([0]);
  });
});

describe('applyOrder round-trip', () => {
  it('displayed index maps back to the original option', () => {
    const options = ['A', 'B', 'C', 'D'];
    const order = shuffledIndices(options.length);
    const displayed = applyOrder(options, order);

    // For every displayed position, order[displayedIndex] recovers the original.
    displayed.forEach((text, displayedIndex) => {
      const originalIndex = order[displayedIndex];
      expect(options[originalIndex]).toBe(text);
    });
  });

  it('translates a correct answer through the permutation', () => {
    const options = ['wrong0', 'correct', 'wrong2'];
    const correctOriginal = 1;
    const order = shuffledIndices(options.length);
    const displayed = applyOrder(options, order);

    // Candidate picks whatever position now shows "correct".
    const picked = displayed.indexOf('correct');
    // Server translation: order[picked] must equal the canonical correct index.
    expect(order[picked]).toBe(correctOriginal);
  });
});
