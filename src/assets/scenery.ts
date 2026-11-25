import { BufferAttribute, Color, Group, Mesh, MeshLambertMaterial, MeshStandardMaterial, CylinderGeometry } from 'three';
import type { BufferGeometry, Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Prop } from '../config/biomes';
import { alpinePeak, gableRoof } from './landforms';
import { cone, cube, cylinder, geometryForBaking, material, orb, piece, stone } from './primitives';

const leaf = material(0x54764a);
const brightLeaf = material(0x72914f);
const darkLeaf = material(0x354d39);
const pineLeaf = material(0x31604c);
const trunk = material(0x634937);
const sand = material(0xc29366);
const rust = material(0x9c644c);
const tan = material(0xb49b87);
const plaster = material(0xf0d4a7);
const roof = material(0xba6149);
const shadow = material(0x392e2b);
const straw = material(0xc39a43);
const stoneGrey = material(0x756964);
const snow = material(0xe5e7e2);
const cactus = material(0x687f54);
const cDark = material(0x526845);
const thinCyl = new CylinderGeometry(1, 1, 1, 6);
const mesa = new CylinderGeometry(0.67, 1, 1, 7);
const roofShape = gableRoof();
const peak = alpinePeak();
const flag = material(0xd9a264);

function bake(group: Group) {
  group.updateMatrixWorld(true);
  const parts: BufferGeometry[] = [];
  group.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const part = geometryForBaking(child.geometry);
    part.applyMatrix4(child.matrixWorld);
    const color = (child.material as MeshStandardMaterial).color;
    const values = new Float32Array(part.attributes.position.count * 3);
    for (let i = 0; i < values.length; i += 3) color.toArray(values, i);
    part.setAttribute('color', new BufferAttribute(values, 3));
    parts.push(part);
  });
  const geometry = mergeGeometries(parts)!;
  parts.forEach((part) => part.dispose());
  return geometry;
}

type MeshPart = (geometry: BufferGeometry, surface: Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => Mesh;

function house(make: MeshPart, barn: boolean, detailed: boolean) {
  make(cube, barn ? rust : plaster, 0, 1.35, 0, 4.4, 2.7, 3.2);
  make(roofShape, barn ? tan : roof, 0, 2.68, 0, 4.75, barn ? 1.55 : 1.15, 3.61);
  make(cube, shadow, 0.6, 0.85, 1.62, barn ? 1.5 : 0.72, 1.7, 0.06);
  if (detailed) {
    make(cube, shadow, -1.25, 1.55, 1.62, 0.83, 0.78, 0.06);
    make(cube, tan, -1.25, 1.55, 1.67, 0.08, 0.76, 0.04);
    make(cube, rust, -1.05, 3.25, -0.52, 0.4, 1.3, 0.42);
  }
}

function construct(kind: Prop | 'mesa' | 'grass' | 'gravel', detailed: boolean) {
  const group = new Group();
  const make: MeshPart = (...args) => piece(group, ...args);
  switch (kind) {
    case 'cactus':
      make(thinCyl, cactus, 0, 1.85, 0, 0.29, 3.7, 0.28);
      make(orb, cactus, 0, 3.65, 0, 0.29, 0.38, 0.28);
      make(thinCyl, cDark, -0.72, 2.05, 0, 0.17, 1.3, 0.17).rotation.z = 0.12;
      make(thinCyl, cactus, -0.38, 1.53, 0, 0.17, 0.79, 0.17).rotation.z = 1.25;
      if (detailed) {
        make(thinCyl, cactus, 0.55, 2.58, 0, 0.15, 1.12, 0.15).rotation.z = -0.2;
        make(thinCyl, cDark, 0.28, 2.13, 0, 0.15, 0.62, 0.15).rotation.z = -1.19;
        make(orb, cactus, 0.65, 3.08, 0, 0.15, 0.22, 0.15);
      }
      break;
    case 'pine':
      make(thinCyl, trunk, 0, 0.7, 0, 0.15, 1.4, 0.15);
      make(cone, darkLeaf, 0, 1.75, 0, 1.08, 2.4, 1.08);
      if (detailed) make(cone, pineLeaf, 0, 2.46, 0, 0.89, 2.1, 0.9);
      make(cone, pineLeaf, 0, 3.25, 0, 0.64, 1.92, 0.65);
      break;
    case 'tree':
    case 'jungle':
      make(thinCyl, trunk, 0, 1.3, 0, 0.21, 2.7, 0.19).rotation.z = -0.08;
      make(stone, kind === 'jungle' ? darkLeaf : leaf, 0, 2.9, 0, 1.5, 1.01, 1.4);
      if (detailed) {
        make(stone, brightLeaf, 0.97, 2.9, 0.16, 0.92, 0.72, 0.8);
        make(stone, leaf, -1, 2.97, 0.07, 0.92, 0.83, 0.9);
        if (kind === 'jungle') {
          make(thinCyl, leaf, -1.45, 1.62, 0.24, 0.055, 2.25, 0.055).rotation.z = -0.1;
          make(thinCyl, darkLeaf, 1.17, 1.87, 0.49, 0.06, 1.7, 0.06);
        }
      }
      break;
    case 'palm':
      make(thinCyl, trunk, 0, 1.85, 0, 0.19, 3.75, 0.2).rotation.z = -0.13;
      for (let i = 0; i < (detailed ? 7 : 4); i++) {
        const angle = i * 2.4;
        make(stone, i % 2 ? leaf : brightLeaf, 0.24 + Math.cos(angle) * 0.72, 3.64 - i * 0.026, Math.sin(angle) * 0.72, 1.23, 0.14, 0.28).rotation.set(0, -angle, -0.22);
      }
      break;
    case 'house':
    case 'barn':
      house(make, kind === 'barn', detailed);
      break;
    case 'hedge':
      make(stone, leaf, 0, 0.47, 0, 1.8, 0.66, 0.54);
      if (detailed) make(stone, brightLeaf, -1, 0.58, 0, 0.8, 0.52, 0.56);
      break;
    case 'fence':
      for (const x of [-1.7, 0, 1.7]) make(cube, trunk, x, 0.65, 0, 0.15, 1.4, 0.14).rotation.z = x / 19;
      make(cube, tan, 0, 0.75, 0, 3.6, 0.16, 0.12).rotation.z = 0.06;
      if (detailed) make(cube, trunk, 0, 0.36, 0, 3.7, 0.15, 0.13).rotation.z = -0.035;
      break;
    case 'hay':
      make(cylinder, straw, 0, 0.62, 0, 0.65, 1.02, 0.65).rotation.z = Math.PI / 2;
      if (detailed) make(cylinder, sand, 0, 0.62, 0, 0.53, 1.04, 0.54).rotation.z = Math.PI / 2;
      break;
    case 'pole':
      make(cube, trunk, 0, 2.45, 0, 0.14, 4.9, 0.15);
      make(cube, trunk, 0, 4.63, 0, 1.38, 0.11, 0.12);
      if (detailed) for (const x of [-0.54, 0.54]) make(thinCyl, flag, x, 4.76, 0, 0.062, 0.16, 0.062);
      break;
    case 'rock':
    case 'gravel':
      make(stone, kind === 'rock' ? tan : stoneGrey, 0, 0.23, 0, 0.8, 0.51, 0.68).rotateY(0.71);
      if (kind === 'rock' && detailed) make(stone, sand, 0.55, 0.14, 0.33, 0.38, 0.27, 0.45);
      break;
    case 'peak':
      make(peak.rock, stoneGrey, 0, 0, 0, 1, 1, 1);
      make(peak.snow, snow, 0, 0, 0, 1, 1, 1);
      break;
    case 'mesa':
      make(mesa, rust, 0, 0.32, 0, 1.35, 0.79, 0.97);
      make(mesa, tan, 0, 0.73, 0, 0.88, 0.22, 0.63);
      make(mesa, rust, 0, 0.91, 0, 0.59, 0.18, 0.43);
      if (detailed) make(cone, sand, 0.71, 0.21, 0.19, 0.95, 0.53, 0.73);
      break;
    case 'dune':
      make(orb, sand, 0, -0.06, 0, 2.45, 0.52, 1.33).rotation.y = -0.39;
      break;
    case 'shrub':
      make(stone, darkLeaf, 0, 0.28, 0, 0.59, 0.39, 0.55);
      if (detailed) make(stone, brightLeaf, -0.22, 0.41, 0.02, 0.4, 0.31, 0.45);
      break;
    case 'grass': {
      const grass = material(0xffffff);
      for (let i = 0; i < (detailed ? 5 : 2); i++) {
        const turn = (i - 2) * 0.3;
        make(cone, grass, turn * 0.17, 0.25 + (i % 2) * 0.06, 0.045 * (i % 3), 0.06, 0.54, 0.045).rotation.z = -turn;
      }
      grass.dispose();
      break;
    }
  }
  return bake(group);
}

export type SceneryKind = Prop | 'mesa' | 'grass' | 'gravel';

export class SceneryAssets {
  readonly material = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  private readonly cache = new Map<string, BufferGeometry>();
  private readonly footprints = new Map<SceneryKind, number>();

  geometry(kind: SceneryKind, detailed: boolean) {
    const key = kind + (detailed ? '/near' : '/far');
    let geometry = this.cache.get(key);
    if (!geometry) {
      geometry = construct(kind, detailed);
      this.cache.set(key, geometry);
    }
    return geometry;
  }

  footprint(kind: SceneryKind) {
    let radius = this.footprints.get(kind);
    if (radius !== undefined) return radius;
    radius = 0;
    for (const detailed of [true, false]) {
      const positions = this.geometry(kind, detailed).getAttribute('position');
      for (let i = 0; i < positions.count; i++) radius = Math.max(radius, Math.hypot(positions.getX(i), positions.getZ(i)));
    }
    this.footprints.set(kind, radius);
    return radius;
  }

  dispose() {
    for (const geometry of this.cache.values()) geometry.dispose();
    this.material.dispose();
  }
}

export function sceneryTint(plant: number, kind: SceneryKind, variation: number) {
  if (kind === 'grass') return new Color(plant).multiplyScalar(variation);
  return new Color(variation, variation, variation);
}
