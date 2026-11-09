/**
 * Seeded pseudo-random numbers (mulberry32). The generator state is a single
 * 32-bit integer that lives inside the game state, so identical seeds and
 * actions reproduce identical games on every platform.
 */

export type RngState = number

export function seedRng(seed: number | string): RngState {
  if (typeof seed === 'number') return seed >>> 0
  // FNV-1a over the string's UTF-16 code units.
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Returns a float in [0, 1) and the next generator state. */
export function nextRandom(state: RngState): [value: number, next: RngState] {
  const next = (state + 0x6d2b79f5) >>> 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}

/** Returns an integer in [0, bound) and the next generator state. */
export function nextInt(state: RngState, bound: number): [value: number, next: RngState] {
  const [value, next] = nextRandom(state)
  return [Math.floor(value * bound), next]
}

/** Fisher-Yates shuffle; returns a new array and the next generator state. */
export function shuffle<T>(items: readonly T[], state: RngState): [shuffled: T[], next: RngState] {
  const result = items.slice()
  let rng = state
  for (let i = result.length - 1; i > 0; i--) {
    const [j, next] = nextInt(rng, i + 1)
    rng = next
    const tmp = result[i] as T
    result[i] = result[j] as T
    result[j] = tmp
  }
  return [result, rng]
}
