/**
 * Seedable pseudo-random number generator (mulberry32).
 *
 * All gameplay randomness MUST go through an instance of this class so that
 * battles, recruitment and fusion are reproducible in tests with a fixed seed.
 * Never call Math.random() inside game rules.
 */
export class Rng {
  private state: number;

  constructor(seed: number = Date.now() >>> 0) {
    // Ensure a non-zero 32-bit state.
    this.state = (seed >>> 0) || 0x9e3779b9;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** True with probability p (0..1). */
  chance(p: number): boolean {
    if (p <= 0) return false;
    if (p >= 1) return true;
    return this.next() < p;
  }

  /** Picks a random element; throws on empty array. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick called with empty array');
    return items[this.int(0, items.length - 1)]!;
  }

  /** In-place Fisher–Yates shuffle, returns the same array. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [items[i], items[j]] = [items[j]!, items[i]!];
    }
    return items;
  }

  /** Snapshot of internal state for save/restore. */
  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state >>> 0 || 0x9e3779b9;
  }
}
