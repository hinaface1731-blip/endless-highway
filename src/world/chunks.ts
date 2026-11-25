import {
  BufferGeometry, Color, Float32BufferAttribute, Group, InstancedMesh, MathUtils, Mesh, MeshLambertMaterial, Object3D, Vector3,
} from 'three';
import { SceneryAssets, sceneryTint, type SceneryKind } from '../assets/scenery';
import { config } from '../config/config';
import { BiomeSequence, paletteColor } from './biomes';
import { randomSource } from './random';
import { Road, roadOffset } from './road';

interface Instance {
  position: Vector3;
  scale: Vector3;
  angle: number;
  color: Color;
}

export interface Chunk {
  index: number;
  start: number;
  group: Group;
  center: Vector3;
  geometry: BufferGeometry;
  near: Group;
  far: Group;
  eventReserved: boolean;
  billboardChecked: boolean;
}

class Surface {
  private readonly positions: number[] = [];
  private readonly colors: number[] = [];
  private readonly indices: number[] = [];

  constructor(private readonly origin: Vector3) {}

  strip(rows: readonly Vector3[][], colors: readonly Color[][]) {
    const start = this.positions.length / 3;
    const width = rows[0].length;
    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < width; col++) {
        const { x, y, z } = rows[row][col];
        const { r, g, b } = colors[row][col];
        this.positions.push(x - this.origin.x, y - this.origin.y, z - this.origin.z);
        this.colors.push(r, g, b);
        if (col + 1 < width && row + 1 < rows.length) {
          const a = start + row * width + col;
          this.indices.push(a, a + 1, a + width, a + 1, a + width + 1, a + width);
        }
      }
    }
  }

  finish() {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(this.colors, 3));
    geometry.setIndex(this.indices);
    geometry.computeVertexNormals();
    return geometry;
  }
}

const { chunkLength, sampleSpacing, roadWidth, shoulderWidth, terrainOffsets } = config.world;
const edge = roadWidth / 2;
const shoulderEdge = edge + shoulderWidth;
const white = new Color(0xe8d9bc);
const yellow = new Color(0xf6bd56);
const asphaltOffsets = [-shoulderEdge, -edge - 0.018, -edge, -3.1, -2.65, -1.47, -0.95, 0, 0.95, 1.47, 2.65, 3.1, edge, edge + 0.018, shoulderEdge];
const gravelTone = [0.92, 0.98, 1.05, 1.02, 0.99, 0.91, 0.97, 1.02, 0.97, 0.91, 0.99, 1.02, 1.05, 0.98, 0.92];
const initialRoadside = [
  { distance: 17, offset: -10.4, kind: 'cactus', scale: 1.42 },
  { distance: 27, offset: 11.1, kind: 'cactus', scale: 1.12 },
  { distance: 38, offset: -13, kind: 'pole', scale: 1.32 },
  { distance: 47, offset: 16, kind: 'cactus', scale: 1.32 },
  { distance: 80, offset: -32, kind: 'mesa', scale: 15 },
  { distance: 110, offset: 36, kind: 'mesa', scale: 18 },
  { distance: 144, offset: -48, kind: 'mesa', scale: 27 },
] as const;

export class ChunkStream {
  readonly chunks = new Map<number, Chunk>();
  private readonly groundMaterial = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  private readonly scenery = new SceneryAssets();

  constructor(
    readonly group: Group,
    private readonly road: Road,
    private readonly biomes: BiomeSequence,
    private readonly seed: number,
    private readonly onCreate: (chunk: Chunk) => void,
    private readonly onExit: (chunk: Chunk) => void,
  ) {}

  update(distance: number) {
    const index = Math.floor(distance / chunkLength);
    const first = Math.max(0, index - config.world.behind);
    for (const [i, chunk] of this.chunks) {
      if (i < first) this.remove(chunk);
    }
    for (let i = first; i <= index + config.world.ahead; i++) {
      if (this.chunks.has(i)) continue;
      const chunk = this.create(i);
      this.chunks.set(i, chunk);
      this.group.add(chunk.group);
      this.onCreate(chunk);
    }
    for (const chunk of this.chunks.values()) {
      const detail = Math.abs(distance - chunk.start - chunkLength / 2) < config.world.lodDistance;
      chunk.near.visible = detail;
      chunk.far.visible = !detail;
    }
    this.road.trim(Math.max(0, first - 1));
  }

  dispose() {
    for (const chunk of this.chunks.values()) this.remove(chunk);
    this.scenery.dispose();
    this.groundMaterial.dispose();
  }

  private remove(chunk: Chunk) {
    this.onExit(chunk);
    this.group.remove(chunk.group);
    chunk.geometry.dispose();
    for (const lod of [chunk.near, chunk.far]) lod.children.forEach((mesh) => (mesh as InstancedMesh).dispose());
    this.chunks.delete(chunk.index);
  }

  private create(index: number): Chunk {
    const start = index * chunkLength;
    const center = this.road.sample(start + chunkLength / 2).position;
    const group = new Group();
    group.position.copy(center);
    const surface = new Surface(center);
    const landRows: Vector3[][] = [];
    const landColors: Color[][] = [];
    const roadRows: Vector3[][] = [];
    const roadColors: Color[][] = [];
    for (let i = 0; i <= chunkLength / sampleSpacing; i++) {
      const distance = start + i * sampleSpacing;
      const sample = this.road.sample(distance);
      const mix = this.biomes.at(distance);
      const relief = MathUtils.lerp(mix.from.relief, mix.to.relief, mix.blend);
      const earth = paletteColor(mix, 'ground');
      const track = paletteColor(mix, 'road');
      const verge = paletteColor(mix, 'shoulder');
      const accent = paletteColor(mix, 'accent');
      const ground = terrainOffsets.map((offset) => this.road.terrain(sample, offset, relief));
      landRows.push(ground);
      landColors.push(ground.map(({ y }, n) => {
        const offset = terrainOffsets[n];
        const variation = Math.sin(distance * 0.115 + offset * 0.38) * 0.047
          + Math.sin(distance * 0.042 - offset * 0.1) * 0.065;
        const rock = MathUtils.clamp((y - sample.position.y) * 0.017 + 0.05, 0, 0.52);
        return earth.clone().lerp(accent, rock).multiplyScalar(1 + variation);
      }));
      roadRows.push(asphaltOffsets.map((offset) => roadOffset(sample, offset, 0.013 - Math.max(0, Math.abs(offset) - edge) * 0.058)));
      roadColors.push(asphaltOffsets.map((offset, n) => (Math.abs(offset) > edge ? verge : track).clone().multiplyScalar(gravelTone[n] * (1 + Math.sin(distance * 0.52) * 0.016))));
    }
    surface.strip(landRows, landColors);
    surface.strip(roadRows, roadColors);

    const mark = (from: number, to: number, low: number, high: number, color: Color) => {
      const segments = Math.ceil((to - from) / sampleSpacing);
      const rows = Array.from({ length: segments + 1 }, (_, i) => {
        const sample = this.road.sample(MathUtils.lerp(from, to, i / segments));
        return [roadOffset(sample, low, 0.038), roadOffset(sample, high, 0.038)];
      });
      surface.strip(rows, rows.map(() => [color, color]));
    };
    for (const side of [-1, 1]) mark(start, start + chunkLength, side * (edge - 0.24) - 0.057, side * (edge - 0.24) + 0.057, white);
    for (let dash = 2; dash < chunkLength; dash += 10) mark(start + dash, start + dash + 5, -0.095, 0.095, yellow);

    const geometry = surface.finish();
    group.add(new Mesh(geometry, this.groundMaterial));
    const { near, far } = this.populate(index, center);
    group.add(near, far);
    return { index, start, group, center, geometry, near, far, eventReserved: false, billboardChecked: false };
  }

  private populate(index: number, center: Vector3) {
    const random = randomSource(this.seed ^ Math.imul(index + 1, 10799));
    const start = index * chunkLength;
    const batches = new Map<SceneryKind, Instance[]>();
    const place = (kind: SceneryKind, distance: number, offset: number, scale: Vector3, angle: number, color: Color) => {
      const sample = this.road.sample(distance);
      const mix = this.biomes.at(distance);
      const relief = MathUtils.lerp(mix.from.relief, mix.to.relief, mix.blend);
      const position = this.road.terrain(sample, offset, relief).sub(center);
      if (!batches.has(kind)) batches.set(kind, []);
      batches.get(kind)!.push({ position, scale, angle, color });
    };

    for (const prop of initialRoadside) {
      if (Math.floor(prop.distance / chunkLength) !== index) continue;
      place(prop.kind, prop.distance, prop.offset, new Vector3(prop.scale, prop.scale, prop.scale), 0.37, new Color(0xffffff));
    }

    for (let n = 0; n < config.world.grassPerChunk; n++) {
      const distance = start + random() * chunkLength;
      const mix = this.biomes.at(distance);
      const biome = random() < mix.blend ? mix.to : mix.from;
      if (random() > biome.density / 1.55) continue;
      const kind = random() < 0.2 ? 'gravel' : 'grass';
      const offset = (random() < 0.5 ? -1 : 1) * (shoulderEdge + 0.15 + Math.pow(random(), 1.9) * 22);
      const size = 0.32 + random() * (kind === 'grass' ? 0.81 : 0.38);
      place(kind, distance, offset, new Vector3(size, size * (0.75 + random() * 0.85), size), random() * 6.28, sceneryTint(biome.palette.plants, kind, 0.72 + random() * 0.62));
    }

    for (let n = 0; n < 31; n++) {
      const distance = start + random() * chunkLength;
      const mix = this.biomes.at(distance);
      const biome = random() < mix.blend ? mix.to : mix.from;
      if (random() > biome.density / 1.6) continue;
      let kind: SceneryKind = biome.props[Math.floor(random() * biome.props.length)];
      if (kind === 'peak' && biome.id === 'america') kind = 'mesa';
      const large = kind === 'peak' || kind === 'mesa';
      const architecture = kind === 'house' || kind === 'barn';
      const side = random() < 0.5 ? -1 : 1;
      const offset = side * (large ? 39 + random() * 129 : architecture ? 15 + random() * 46 : 8.5 + Math.pow(random(), 1.85) * 67);
      const size = large ? 10 + random() * 29 : kind === 'dune' ? 2.4 + random() * 4.5 : 0.67 + random() * 0.94;
      const angle = architecture ? side * 0.8 + random() * 0.35 : random() * 6.28;
      place(kind, distance, offset, new Vector3(size, size * (large ? 0.49 + random() * 0.61 : 0.87 + random() * 0.44), size), angle, sceneryTint(biome.palette.plants, kind, 0.71 + random() * 0.58));
    }

    const near = new Group();
    const far = new Group();
    const dummy = new Object3D();
    for (const [kind, instances] of batches) {
      for (const detailed of [true, false]) {
        const visible = detailed ? instances : instances.filter((_, i) => kind !== 'grass' || i % 3 === 0);
        const mesh = new InstancedMesh(this.scenery.geometry(kind, detailed), this.scenery.material, visible.length);
        visible.forEach(({ position, scale, angle, color }, i) => {
          dummy.position.copy(position);
          dummy.scale.copy(scale);
          dummy.rotation.y = angle;
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          mesh.setColorAt(i, color);
        });
        mesh.computeBoundingSphere();
        (detailed ? near : far).add(mesh);
      }
    }
    return { near, far };
  }
}
