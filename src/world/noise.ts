import { randomSource } from './random';

export class Perlin {
  private readonly permutation: number[];

  constructor(seed: number) {
    const random = randomSource(seed);
    const values = Array.from({ length: 256 }, (_, i) => i);
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    this.permutation = [...values, ...values];
  }

  at(x: number, y: number) {
    const ix = Math.floor(x) & 255;
    const iy = Math.floor(y) & 255;
    const dx = x - Math.floor(x);
    const dy = y - Math.floor(y);
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const p = this.permutation;
    const a = p[ix] + iy;
    const b = p[ix + 1] + iy;
    const gradient = (hash: number, u: number, v: number) => {
      const along = (hash & 1) ? -u : u;
      const across = (hash & 2) ? -v : v;
      return (hash & 4) ? along : (along + across) * Math.SQRT1_2;
    };
    return lerp(
      lerp(gradient(p[a], dx, dy), gradient(p[b], dx - 1, dy), fade(dx)),
      lerp(gradient(p[a + 1], dx, dy - 1), gradient(p[b + 1], dx - 1, dy - 1), fade(dx)),
      fade(dy),
    );
  }
}
