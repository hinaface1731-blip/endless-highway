export function randomSource(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let bits = Math.imul(state ^ (state >>> 15), state | 1);
    bits ^= bits + Math.imul(bits ^ (bits >>> 7), bits | 61);
    return ((bits ^ (bits >>> 14)) >>> 0) / 4294967296;
  };
}

export function weightedChoice<T>(
  entries: readonly { value: T; weight: number }[],
  random: () => number,
): T | undefined {
  const total = entries.reduce((sum, { weight }) => sum + Math.max(0, weight), 0);
  if (!total) return undefined;

  let position = random() * total;
  for (const { value, weight } of entries) {
    position -= Math.max(0, weight);
    if (position < 0) return value;
  }
  return undefined;
}
