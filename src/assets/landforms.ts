import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

function facets(positions: Vector3[], indices: number[]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions.flatMap(({ x, y, z }) => [x, y, z]), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function gableRoof() {
  const end = (z: number) => [new Vector3(-0.5, 0, z), new Vector3(0.5, 0, z), new Vector3(0, 1, z)];
  return facets([...end(-0.5), ...end(0.5)], [
    0, 2, 1, 3, 4, 5,
    0, 3, 2, 3, 5, 2,
    2, 5, 1, 5, 4, 1,
    0, 1, 3, 1, 4, 3,
  ]);
}

export function alpinePeak() {
  const profile = [0.94, 1.12, 0.84, 1.00, 0.85, 1.07, 0.93, 1.02];
  const snowline = [0.77, 0.63, 0.83, 0.67, 0.71, 0.87, 0.72, 0.64];
  const ring = (radius: (i: number) => number, height: (i: number) => number, drift: number) =>
    profile.map((jag, i) => {
      const angle = i * Math.PI / 4;
      const reach = jag * radius(i);
      return new Vector3(Math.cos(angle) * reach + drift, height(i), Math.sin(angle) * reach * 0.92 - drift * 0.7);
    });
  const base = ring(() => 1.27, () => -0.19, 0);
  const ledges = ring(() => 0.8, (i) => 0.22 + (i % 3) * 0.09, -0.06);
  const ridge = ring((i) => 1.03 - snowline[i], (i) => snowline[i], 0.08);
  const summit = new Vector3(0.15, 1.18, -0.13);
  const sides = profile.length;
  const rock: number[] = [];
  const cap: number[] = [];
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    for (const ringStart of [0, sides]) {
      const a = ringStart + i;
      const b = ringStart + next;
      rock.push(a, a + sides, b, b, a + sides, b + sides);
    }
    cap.push(i, sides, next);
  }
  return { rock: facets([...base, ...ledges, ...ridge], rock), snow: facets([...ridge, summit], cap) };
}
