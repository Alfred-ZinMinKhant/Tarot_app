/**
 * Randomness for draws. Readings use the platform CSPRNG via expo-crypto (never Math.random);
 * the daily card uses a seeded PRNG so it is the same all day for the same person.
 */
import { getRandomBytes } from 'expo-crypto';

/** Returns a uniformly distributed integer in [0, max). */
export type RandomInt = (max: number) => number;

const TWO_32 = 2 ** 32;

function assertRange(max: number): void {
  if (!Number.isInteger(max) || max <= 0 || max > TWO_32) {
    throw new RangeError(`max must be an integer in 1..2^32, got ${max}`);
  }
}

/**
 * Cryptographically secure uniform integer. Uses rejection sampling so there is no modulo bias:
 * 32-bit values at or above the largest multiple of `max` are discarded and redrawn.
 */
export function secureRandomInt(max: number, bytes: (n: number) => Uint8Array = getRandomBytes): number {
  assertRange(max);
  const limit = Math.floor(TWO_32 / max) * max;
  for (;;) {
    const b = bytes(4);
    const x = ((b[0]! << 24) >>> 0) + (b[1]! << 16) + (b[2]! << 8) + b[3]!;
    if (x < limit) return x % max;
  }
}

export const secureRandom: RandomInt = (max) => secureRandomInt(max);

export { hashString } from '@/utils/hash';

/** Deterministic PRNG (mulberry32) producing uniform integers, for the daily card and tests. */
export function seededRandom(seed: number): RandomInt {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / TWO_32;
  };
  return (max) => {
    assertRange(max);
    return Math.floor(next() * max);
  };
}
