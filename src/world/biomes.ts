import { Color, MathUtils } from 'three';
import { biomes, type Biome } from '../config/biomes';
import { config } from '../config/config';
import { randomSource } from './random';

export interface BiomeMix {
  from: Biome;
  to: Biome;
  blend: number;
}

interface Zone {
  biome: Biome;
  start: number;
  end: number;
}

export class BiomeSequence {
  private readonly random: () => number;
  private readonly nextBiomes: Biome[] = [];
  private readonly zones: Zone[];

  constructor(seed: number) {
    this.random = randomSource(seed);
    this.zones = [{ biome: biomes[0], start: 0, end: this.nextLength() }];
  }

  at(distance: number): BiomeMix {
    while (distance >= this.zones[this.zones.length - 1].end) this.appendZone();
    let low = 0;
    let high = this.zones.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (distance < this.zones[middle].end) high = middle;
      else low = middle + 1;
    }
    const zone = this.zones[low];
    const half = config.biomes.transition / 2;
    if (low > 0 && distance < zone.start + half) {
      return { from: this.zones[low - 1].biome, to: zone.biome, blend: MathUtils.smoothstep(distance, zone.start - half, zone.start + half) };
    }
    if (distance >= zone.end - half) {
      if (low === this.zones.length - 1) this.appendZone();
      return { from: zone.biome, to: this.zones[low + 1].biome, blend: MathUtils.smoothstep(distance, zone.end - half, zone.end + half) };
    }
    return { from: zone.biome, to: zone.biome, blend: 0 };
  }

  private nextLength() {
    const { minLength, maxLength } = config.biomes;
    return MathUtils.lerp(minLength, maxLength, this.random());
  }

  private appendZone() {
    const last = this.zones[this.zones.length - 1];
    if (!this.nextBiomes.length) {
      this.nextBiomes.push(...biomes);
      for (let i = this.nextBiomes.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.nextBiomes[i], this.nextBiomes[j]] = [this.nextBiomes[j], this.nextBiomes[i]];
      }
      if (this.nextBiomes[0] === last.biome) {
        [this.nextBiomes[0], this.nextBiomes[1]] = [this.nextBiomes[1], this.nextBiomes[0]];
      }
    }
    const biome = this.nextBiomes.shift()!;
    this.zones.push({ biome, start: last.end, end: last.end + this.nextLength() });
  }
}

export function dominantBiome(mix: BiomeMix) {
  return mix.blend < 0.5 ? mix.from : mix.to;
}

export function paletteColor(mix: BiomeMix, key: keyof Biome['palette']): Color {
  return new Color(mix.from.palette[key]).lerp(new Color(mix.to.palette[key]), mix.blend);
}
