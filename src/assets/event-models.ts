import { Group, MeshBasicMaterial } from 'three';
import { cone, cube, cylinder, material, orb, piece, stone } from './primitives';
import { makeCar } from '../entities/car';

const jacket = material(0xc88459);
const denim = material(0x354551);
const skin = material(0xb77e5c);
const shoes = material(0x372c29);
const hair = material(0x4a392d);
const backpack = material(0x8b6651);
const aluminium = material(0x687e86, 0.43);
const mint = new MeshBasicMaterial({ color: 0x8fe1b4 });
const glass = material(0x4e7c72, 0.23);
const fakeWood = material(0x7a573a);
const cardboard = material(0xe0b981);
const green = material(0x5b8052);

function hitchhiker() {
  const root = new Group();
  piece(root, cube, jacket, 0, 1.24, 0, 0.47, 0.61, 0.26);
  piece(root, cube, backpack, 0, 1.25, -0.21, 0.38, 0.49, 0.26);
  piece(root, cube, skin, 0, 1.58, 0, 0.16, 0.16, 0.15);
  piece(root, orb, skin, 0, 1.73, 0.008, 0.18, 0.22, 0.16);
  piece(root, orb, hair, 0, 1.85, -0.025, 0.19, 0.115, 0.167);
  piece(root, cube, hair, 0, 1.852, 0.121, 0.35, 0.032, 0.175);
  for (const x of [-0.135, 0.135]) {
    piece(root, cube, denim, x, 0.51, 0, 0.18, 0.79, 0.22);
    piece(root, cube, shoes, x, 0.09, 0.07, 0.195, 0.17, 0.39);
  }
  piece(root, cube, jacket, -0.3, 1.17, 0, 0.17, 0.56, 0.19).rotateZ(-0.12);
  piece(root, cube, skin, -0.33, 0.87, 0, 0.145, 0.15, 0.16);
  piece(root, cube, jacket, 0.43, 1.34, 0, 0.47, 0.17, 0.18).rotateZ(-0.21);
  piece(root, cube, skin, 0.72, 1.32, 0, 0.16, 0.138, 0.15);
  piece(root, cube, skin, 0.74, 1.429, 0.01, 0.077, 0.17, 0.09).rotateZ(-0.17);
  return root;
}

function saucer() {
  const root = new Group();
  piece(root, orb, aluminium, 0, 1.33, 0, 2.28, 0.41, 2.28);
  piece(root, orb, glass, 0, 1.61, 0, 0.98, 0.65, 0.98);
  piece(root, cylinder, mint, 0, 1.14, 0, 1.17, 0.1, 1.17);
  for (let i = 0; i < 9; i++) {
    const angle = i * Math.PI * 2 / 9;
    piece(root, stone, mint, Math.cos(angle) * 1.77, 1.31, Math.sin(angle) * 1.77, 0.14, 0.09, 0.14);
  }
  return root;
}

function alien() {
  const root = new Group();
  piece(root, cone, glass, 0, 0.81, 0, 0.45, 1.53, 0.37);
  piece(root, orb, mint, 0, 1.83, 0, 0.42, 0.48, 0.36);
  for (const x of [-0.185, 0.185]) {
    piece(root, orb, shoes, x, 1.86, 0.29, 0.148, 0.145, 0.09).rotateZ(-x);
    piece(root, cylinder, glass, x * 3, 1.12, 0, 0.085, 0.86, 0.085).rotateZ(-x * 4);
  }
  return root;
}

function giantCactus() {
  const root = new Group();
  piece(root, cylinder, green, 0, 4.1, 0, 0.65, 8.2, 0.59);
  piece(root, orb, green, 0, 8.16, 0, 0.65, 0.79, 0.59);
  for (const x of [-1, 1]) {
    piece(root, cylinder, green, x * 0.8, 4.7 + x * 0.72, 0, 0.32, 1.65, 0.31).rotateZ(Math.PI / 2);
    piece(root, cylinder, green, x * 1.52, 5.7 + x * 0.72, 0, 0.32, 2, 0.31);
    piece(root, orb, green, x * 1.52, 6.72 + x * 0.72, 0, 0.32, 0.35, 0.31);
  }
  return root;
}

function decoy() {
  const root = new Group();
  const model = makeCar(true);
  const fake = model.root;
  fake.scale.z = 0.3;
  root.add(fake);
  const stand = new Group();
  stand.rotation.y = -0.65;
  for (const x of [-0.67, 0.67]) {
    piece(stand, cube, fakeWood, x, 0.77, 0.02, 0.15, 1.55, 0.15).rotateX(-0.16);
    piece(stand, cube, fakeWood, x, 0.31, 0.31, 0.15, 1.21, 0.13).rotateX(-0.59);
  }
  piece(stand, cube, cardboard, 0, 1.01, 0, 1.99, 0.84, 0.11);
  piece(stand, cube, denim, 0.15, 1.02, 0.066, 1.62, 0.18, 0.02);
  piece(stand, cube, shoes, 0, 1.44, 0, 1.02, 0.33, 0.108);
  stand.visible = false;
  root.add(stand);
  return { root, dispose: model.dispose, reveal(value: boolean) { fake.visible = !value; stand.visible = value; } };
}

export function createEventModels() {
  const police = makeCar(true);
  const rider = hitchhiker();
  const easter = [
    { root: saucer(), message: 'НЛО у обочины. Делает вид, что не заметило вас.' },
    { root: giantCactus(), message: 'Этот кактус здесь явно дольше, чем шоссе.' },
    { root: alien(), message: 'Кто-то ещё ищет дорогу домой.' },
  ];
  const trick = decoy();
  const all = [police.root, rider, ...easter.map((variant) => variant.root), trick.root];
  all.forEach((model) => { model.visible = false; });
  return { police, rider, easter, trick, all };
}
