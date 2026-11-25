import { MathUtils, Vector3 } from 'three';
import { config } from '../config/config';
import { BiomeSequence } from './biomes';
import { Perlin } from './noise';
import { randomSource } from './random';

interface Knot {
  x: number;
  y: number;
  z: number;
  heading: number;
  grade: number;
}

export interface RoadSample {
  position: Vector3;
  heading: number;
  grade: number;
}

const { chunkLength, maxTurnDegrees, maxHeadingDegrees, maxGrade, noiseScale } = config.world;

export class Road {
  private readonly knots = new Map<number, Knot>([[0, { x: 0, y: 0, z: 0, heading: -0.07, grade: 0 }]]);
  private readonly noise: Perlin;
  private lastIndex = 0;
  private firstIndex = 0;

  constructor(private readonly seed: number, private readonly biomes: BiomeSequence) {
    this.noise = new Perlin(seed ^ 138619);
  }

  heightmap(x: number, z: number) {
    return this.noise.at(x * noiseScale + 4.1, z * noiseScale - 6.2) * 29
      + this.noise.at(x * 0.018 - 9.7, z * 0.018 + 1.3) * 5
      + this.noise.at(x * 0.048 + 2.3, z * 0.048 - 5.8) * 1.2;
  }

  sample(distance: number): RoadSample {
    if (distance < 0) {
      const startHeading = -0.07;
      return { position: new Vector3(Math.sin(startHeading) * distance, 0, -Math.cos(startHeading) * distance), heading: startHeading, grade: 0 };
    }
    const index = Math.floor(distance / chunkLength);
    this.ensure(index + 1);
    const a = this.knots.get(index);
    const b = this.knots.get(index + 1);
    if (!a || !b) throw new RangeError('Road sample is behind the retained chunks.');
    const t = distance / chunkLength - index;
    const t2 = t * t;
    const t3 = t2 * t;
    const curve = (start: number, end: number, tangentA: number, tangentB: number) =>
      (2 * t3 - 3 * t2 + 1) * start + (-2 * t3 + 3 * t2) * end
      + chunkLength * ((t3 - 2 * t2 + t) * tangentA + (t3 - t2) * tangentB);
    const derivative = (start: number, end: number, tangentA: number, tangentB: number) =>
      (6 * t2 - 6 * t) * (start - end) / chunkLength
      + (3 * t2 - 4 * t + 1) * tangentA + (3 * t2 - 2 * t) * tangentB;
    const ax = Math.sin(a.heading);
    const bx = Math.sin(b.heading);
    const az = -Math.cos(a.heading);
    const bz = -Math.cos(b.heading);

    return {
      position: new Vector3(curve(a.x, b.x, ax, bx), curve(a.y, b.y, a.grade, b.grade), curve(a.z, b.z, az, bz)),
      heading: Math.atan2(derivative(a.x, b.x, ax, bx), -derivative(a.z, b.z, az, bz)),
      grade: derivative(a.y, b.y, a.grade, b.grade),
    };
  }

  terrain(sample: RoadSample, offset: number, relief: number): Vector3 {
    const { position, heading } = sample;
    const lateral = MathUtils.smoothstep(Math.abs(offset), 11, 66);
    const x = position.x + offset * MathUtils.lerp(Math.cos(heading), 1, lateral);
    const z = position.z + offset * Math.sin(heading) * (1 - lateral);
    const blend = MathUtils.smoothstep(Math.abs(offset), 5.75, 44);
    const hill = this.heightmap(x, z) - this.heightmap(position.x, position.z);
    return new Vector3(x, position.y - 0.09 + hill * blend * relief, z);
  }

  clearsRoad(distance: number, position: Vector3, minimumGap: number) {
    const { sampleSpacing } = config.world;
    const gap = minimumGap + sampleSpacing;
    // The heading limit keeps the road advancing along -Z, even through curves.
    const span = (gap + Math.abs(position.z - this.sample(distance).position.z)) / 0.8;
    const start = Math.max(0, distance - span);
    const end = distance + span;
    for (let along = start; along <= end + sampleSpacing; along += sampleSpacing) {
      const point = this.sample(along).position;
      if (Math.hypot(point.x - position.x, point.z - position.z) < gap) return false;
    }
    return true;
  }

  trim(before: number) {
    while (this.firstIndex < before && this.firstIndex < this.lastIndex) {
      this.knots.delete(this.firstIndex++);
    }
  }

  private ensure(index: number) {
    while (this.lastIndex < index) {
      const current = this.knots.get(this.lastIndex)!;
      const random = randomSource(this.seed ^ Math.imul(this.lastIndex + 1, 9377));
      const turn = MathUtils.degToRad(maxTurnDegrees);
      const limit = MathUtils.degToRad(maxHeadingDegrees);
      const preferred = (random() * 2 - 1) * turn;
      const centerHeight = this.heightmap(current.x, current.z);
      let best = { score: Infinity, x: current.x, z: current.z, heading: current.heading, slope: 0 };

      for (const factor of [-1, -0.5, 0, 0.5, 1]) {
        const heading = MathUtils.clamp(current.heading + factor * turn, -limit, limit);
        const middle = (current.heading + heading) / 2;
        const x = current.x + Math.sin(middle) * chunkLength;
        const z = current.z - Math.cos(middle) * chunkLength;
        const slope = (this.heightmap(x, z) - centerHeight) / chunkLength;
        const score = Math.abs(slope) * 4 + Math.abs(factor * turn - preferred) * 1.25 + Math.abs(heading) * 0.047;
        if (score < best.score) best = { score, x, z, heading, slope };
      }

      const mix = this.biomes.at((this.lastIndex + 1) * chunkLength);
      const elevation = this.heightmap(best.x, best.z) * MathUtils.lerp(mix.from.relief, mix.to.relief, mix.blend) * 0.75;
      const rise = MathUtils.clamp((elevation - current.y) * 0.55, -maxGrade * chunkLength, maxGrade * chunkLength);
      const grade = MathUtils.clamp(MathUtils.lerp(rise / chunkLength, best.slope * 0.65, 0.45), -maxGrade, maxGrade);
      this.knots.set(++this.lastIndex, { x: best.x, y: current.y + rise, z: best.z, heading: best.heading, grade });
    }
  }
}

export function roadOffset(sample: RoadSample, lateral: number, height = 0) {
  return sample.position.clone().add(new Vector3(Math.cos(sample.heading) * lateral, height, Math.sin(sample.heading) * lateral));
}
