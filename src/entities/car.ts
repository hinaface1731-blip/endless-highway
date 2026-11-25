import {
  CanvasTexture, DoubleSide, Float32BufferAttribute, Group, MathUtils, Mesh, MeshBasicMaterial, PlaneGeometry, BufferGeometry,
} from 'three';
import type { Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cube, cylinder, geometryForBaking, material, piece } from '../assets/primitives';
import { config } from '../config/config';
import { Road, roadOffset } from '../world/road';

const bodyRed = material(0xc44728, 0.4);
const redShade = material(0x862e24, 0.56);
const stripe = material(0xf5d8a6);
const rubber = material(0x242527);
const bumper = material(0x9f9b8e, 0.38);
const glass = material(0x334c56, 0.28);
const darkGlass = material(0x263337, 0.36);
const rearLight = new MeshBasicMaterial({ color: 0xf65738 });
const frontLight = new MeshBasicMaterial({ color: 0xffe2a1 });
const policePaint = material(0xcbd4d2, 0.52);
const policeBlue = new MeshBasicMaterial({ color: 0x619cff });
const policeRed = new MeshBasicMaterial({ color: 0xff4f30 });
const redOff = material(0x692e32);
const blueOff = material(0x2a446a);
const tireTread = material(0x39393d);

function bodyShape(sections: readonly (readonly [z: number, halfWidth: number, low: number, high: number])[]) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < sections.length; i++) {
    const [z, w, low, high] = sections[i];
    positions.push(-w, low, z, w, low, z, w, high, z, -w, high, z);
    if (i > 0) {
      for (let j = 0; j < 4; j++) {
        const a = (i - 1) * 4 + j;
        const b = (i - 1) * 4 + (j + 1) % 4;
        indices.push(a, b, a + 4, b, b + 4, a + 4);
      }
    }
  }
  const last = (sections.length - 1) * 4;
  indices.push(0, 3, 2, 0, 2, 1, last, last + 1, last + 2, last, last + 2, last + 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const chassisGeometry = bodyShape([
  [-2.23, 0.79, 0.39, 0.69], [-1.91, 1.02, 0.33, 0.9], [-0.9, 1.04, 0.31, 0.86],
  [0.75, 1, 0.34, 0.86], [1.8, 1.03, 0.37, 0.91], [2.04, 0.94, 0.44, 0.81],
]);
const cabinGeometry = bodyShape([
  [-0.95, 0.79, 0.82, 0.93], [-0.47, 0.65, 0.85, 1.48], [0.52, 0.66, 0.86, 1.5], [1.43, 0.82, 0.82, 0.91],
]);

function licensePlate() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 46;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#ecd8a5';
  context.fillRect(0, 0, 128, 46);
  context.strokeStyle = '#503c33';
  context.strokeRect(3, 3, 122, 40);
  context.fillStyle = '#382e28';
  context.font = 'bold 28px monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('HWY 48', 64, 25);
  const texture = new CanvasTexture(canvas);
  return new MeshBasicMaterial({ map: texture });
}

function shadow() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 11, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(22,15,13,.62)');
  gradient.addColorStop(0.52, 'rgba(22,15,13,.44)');
  gradient.addColorStop(1, 'rgba(22,15,13,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new CanvasTexture(canvas);
  const mesh = new Mesh(new PlaneGeometry(3.7, 5.95), new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0.09, 0.08, 0.22);
  return mesh;
}

function batchBody(body: Group) {
  const batches = new Map<Material, BufferGeometry[]>();
  for (const part of body.children) {
    if (!(part instanceof Mesh) || Array.isArray(part.material)) continue;
    part.updateMatrix();
    const geometry = geometryForBaking(part.geometry).applyMatrix4(part.matrix);
    const surface: Material = part.material;
    if (!batches.has(surface)) batches.set(surface, []);
    batches.get(surface)!.push(geometry);
  }
  body.clear();
  return [...batches].map(([surface, geometries]) => {
    const merged = mergeGeometries(geometries)!;
    geometries.forEach((geometry) => geometry.dispose());
    body.add(new Mesh(merged, surface));
    return merged;
  });
}

export function makeCar(police = false) {
  const root = new Group();
  const body = new Group();
  const contactShadow = shadow();
  root.add(contactShadow, body);
  piece(body, chassisGeometry, police ? policePaint : bodyRed, 0, 0, 0, 1, 1, 1);
  piece(body, cabinGeometry, glass, 0, 0, 0, 1, 1, 1);
  piece(body, cube, police ? policePaint : bodyRed, 0, 1.494, 0.032, 1.34, 0.035, 1.02);
  piece(body, cube, rubber, 0, 0.645, 2.047, 1.74, 0.3, 0.07);
  piece(body, cube, bumper, 0, 0.459, 2.06, 1.94, 0.085, 0.115);
  piece(body, cube, redShade, 0, 0.775, 1.97, 1.93, 0.09, 0.15);
  piece(body, cube, rubber, 0, 0.556, -2.202, 1.63, 0.14, 0.135);
  piece(body, cube, bumper, 0, 0.425, -2.24, 1.68, 0.085, 0.085);

  for (const side of [-1, 1]) {
    const sideFrame = piece(body, cube, police ? rubber : redShade, side * 0.913, 0.83, 0.13, 0.034, 0.07, 2.3);
    sideFrame.rotation.y = side * 0.012;
    piece(body, cube, rubber, side * 0.69, 0.93, -0.51, 0.095, 0.07, 0.12);
    piece(body, cube, police ? policePaint : bodyRed, side * 0.752, 0.976, -0.51, 0.19, 0.1, 0.17);
    piece(body, cube, frontLight, side * 0.66, 0.636, -2.266, 0.31, 0.11, 0.014);
    piece(body, cube, bumper, side * 0.71, 0.343, 1.98, 0.14, 0.10, 0.29);
    for (let i = 0; i < 3; i++) {
      piece(body, cube, rearLight, side * (0.55 + i * 0.115), 0.661, 2.087, 0.082, 0.117, 0.02);
    }
    if (!police) {
      piece(body, cube, stripe, side * 0.143, 1.515, 0.027, 0.105, 0.009, 0.99);
      piece(body, cube, stripe, side * 0.143, 0.897, 1.594, 0.105, 0.014, 0.55).rotation.x = -0.074;
      piece(body, cube, stripe, side * 0.143, 0.894, -1.42, 0.105, 0.014, 0.91).rotation.x = 0.039;
    }

    for (const z of [-1.45, 1.39]) {
      const wheel = piece(body, cylinder, rubber, side * 0.95, 0.363, z, 0.366, 0.31, 0.366);
      wheel.rotation.z = Math.PI / 2;
      piece(body, cylinder, tireTread, side * 1.107, 0.363, z, 0.28, 0.012, 0.28).rotation.z = Math.PI / 2;
      piece(body, cylinder, bumper, side * 1.117, 0.363, z, 0.175, 0.015, 0.175).rotation.z = Math.PI / 2;
      piece(body, cylinder, rubber, side * 1.128, 0.363, z, 0.083, 0.018, 0.083).rotation.z = Math.PI / 2;
    }
  }

  const windowGeometry = new PlaneGeometry(1.18, 0.98);
  const window = new Mesh(windowGeometry, darkGlass);
  window.material.side = DoubleSide;
  window.rotation.x = -0.98;
  window.position.set(0, 1.196, 0.976);
  body.add(window);
  for (let i = 0; i < 4; i++) {
    const z = 0.66 + i * 0.18;
    piece(body, cube, rubber, 0, 1.5 - (z - 0.52) * 0.65, z, 1.13 + i * 0.067, 0.021, 0.035);
  }
  if (police) piece(body, cube, rubber, 0, 1.541, 0.08, 1.08, 0.048, 0.26);
  const batchedGeometries = batchBody(body);
  windowGeometry.dispose();

  const plateSurface = licensePlate();
  const plate = new Mesh(new PlaneGeometry(0.42, 0.149), plateSurface);
  plate.position.set(0, 0.609, 2.09);
  body.add(plate);
  const red = piece(body, cube, redOff, -0.27, 1.575, 0.08, 0.44, 0.13, 0.25);
  const blue = piece(body, cube, blueOff, 0.27, 1.575, 0.08, 0.44, 0.13, 0.25);
  red.visible = blue.visible = police;
  return {
    root, body,
    lights(time: number) {
      const flash = Math.floor(time * 5.8) % 2 === 0;
      red.material = flash ? policeRed : redOff;
      blue.material = flash ? blueOff : policeBlue;
    },
    dispose() {
      batchedGeometries.forEach((geometry) => geometry.dispose());
      for (const mesh of [contactShadow, plate]) {
        mesh.geometry.dispose();
        mesh.material.map?.dispose();
        mesh.material.dispose();
      }
    },
  };
}

export interface DriveInput {
  throttle: boolean;
  brake: boolean;
  steering: number;
}

const { car, world } = config;
export class Driver {
  readonly model = makeCar();
  distance: number = car.initialDistance;
  offset: number = car.initialOffset;
  speed: number = car.initialSpeed;
  cash: number = car.startCash;
  boostRemaining = 0;
  forcedPullover = false;
  locked = false;
  private steering = 0;

  constructor(private readonly road: Road) {}

  update(delta: number, input: DriveInput) {
    this.boostRemaining = Math.max(0, this.boostRemaining - delta);
    if (!this.locked) {
      const boost = this.boostRemaining ? car.boostFactor : 1;
      const speedLimit = car.maxSpeed * boost;
      const acceleration = this.forcedPullover ? -Math.max(4.8, this.speed / 2.05)
        : input.brake ? -car.braking : input.throttle ? car.acceleration * boost : -car.rollingDrag;
      this.speed = MathUtils.clamp(this.speed + acceleration * delta, 0, speedLimit);
      this.distance += this.speed * delta;
      this.steering = MathUtils.damp(this.steering, this.forcedPullover ? 0.28 : input.steering, car.steerDamping, delta);
      const limit = world.roadWidth / 2 - 1.04;
      if (this.forcedPullover) {
        this.offset = MathUtils.damp(this.offset, limit, 1.9, delta);
      } else {
        this.offset = MathUtils.clamp(this.offset + this.steering * car.lateralSpeed * Math.min(1, this.speed / 8) * delta, -limit, limit);
      }
    }
    this.pose();
  }

  pose() {
    const sample = this.road.sample(this.distance);
    const { root, body } = this.model;
    root.position.copy(roadOffset(sample, this.offset, 0.013));
    root.rotation.set(0, -sample.heading, 0, 'YXZ');
    root.rotateX(Math.atan(sample.grade));
    body.rotation.y = -this.steering * Math.min(1, this.speed / 5) * 0.13;
    body.rotation.z = -this.steering * Math.min(1, this.speed / 5) * 0.035;
  }
}
