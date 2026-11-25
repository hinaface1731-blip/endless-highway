import {
  BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry,
} from 'three';
import type { BufferGeometry, Material } from 'three';

export const cube = new BoxGeometry();
export const stone = new DodecahedronGeometry(1, 0);
export const cone = new ConeGeometry(1, 1, 6);
export const cylinder = new CylinderGeometry(1, 1, 1, 8);
export const orb = new SphereGeometry(1, 7, 5);
export const material = (color: number, roughness = 0.85) => new MeshStandardMaterial({ color, roughness, flatShading: true });

export function geometryForBaking(source: BufferGeometry) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  geometry.deleteAttribute('uv');
  return geometry;
}

export function piece(
  parent: Group,
  geometry: BufferGeometry,
  surface: Material,
  x: number, y: number, z: number,
  width: number, height: number, depth: number,
) {
  const mesh = new Mesh(geometry, surface);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  parent.add(mesh);
  return mesh;
}
