import {
  Camera, CanvasTexture, Group, MathUtils, Mesh, MeshBasicMaterial,
  PlaneGeometry, Raycaster, SRGBColorSpace, TextureLoader, Vector2, Vector3,
} from 'three';
import type { Texture } from 'three';
import { cube, material, piece, stone } from '../assets/primitives';
import { advertisers, type Advertiser } from '../config/billboards';
import { signStyles, type SignStyle } from '../config/biomes';
import { config } from '../config/config';
import { BiomeSequence } from '../world/biomes';
import type { Chunk } from '../world/chunks';
import { randomSource } from '../world/random';
import { Road } from '../world/road';

interface Billboard {
  group: Group;
  faces: Mesh[];
  advertiser: Advertiser;
  distance: number;
  worldPosition: Vector3;
  baseAngle: number;
  style: SignStyle;
}

const panel = new PlaneGeometry(1, 1);
const ivy = material(0x3e653e);
const signMaterials = Object.fromEntries(Object.entries(signStyles).map(([style, values]) =>
  [style, { frame: material(values.frame), post: material(values.post) }])) as Record<SignStyle, { frame: ReturnType<typeof material>; post: ReturnType<typeof material> }>;

function fallback(ad: Advertiser) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = ad.color;
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#e9c884';
  ctx.lineWidth = 5;
  ctx.strokeRect(12, 12, 488, 232);
  ctx.fillStyle = '#ffe6af';
  ctx.font = 'bold 43px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = ad.companyName.split(' ');
  ctx.fillText(words.slice(0, -1).join(' ') || words[0], 256, words.length > 1 ? 103 : 128, 450);
  if (words.length > 1) ctx.fillText(words[words.length - 1], 256, 155, 450);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export class Billboards {
  private readonly signs = new Map<number, Billboard>();
  private readonly surfaces = new Map<Advertiser, MeshBasicMaterial>();
  private readonly textures = new Set<Texture>();
  private readonly ray = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly projected = new Vector3();
  private hovered?: Billboard;
  private mobile = matchMedia('(pointer: coarse)').matches;
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
    private readonly road: Road,
    private readonly biomes: BiomeSequence,
    private readonly label: HTMLElement,
    private readonly seed: number,
  ) {
    const loader = new TextureLoader();
    for (const ad of advertisers) {
      const placeholder = fallback(ad);
      this.textures.add(placeholder);
      const surface = new MeshBasicMaterial({ map: placeholder, toneMapped: false });
      this.surfaces.set(ad, surface);
      if (ad.image) loader.load(ad.image, (texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = 4;
        this.textures.add(texture);
        surface.map = texture;
        surface.needsUpdate = true;
      }, undefined, () => { /* Keep the fallback. */ });
    }
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerdown', this.onClick);
    canvas.addEventListener('pointerleave', this.clearHover);
  }

  consider(chunk: Chunk) {
    if (chunk.billboardChecked || chunk.index === 0) return;
    chunk.billboardChecked = true;
    if (chunk.eventReserved || !advertisers.length) return;
    const random = randomSource(this.seed ^ Math.imul(chunk.index, 4271));
    if (random() >= config.billboards.chance) return;
    const ad = chunk.index <= 2 ? advertisers[0] : advertisers[Math.floor(random() * advertisers.length)];
    const distance = chunk.start + (chunk.index === 1 ? 9 : 13 + random() * 23);
    const mix = this.biomes.at(distance);
    const biome = random() < mix.blend ? mix.to : mix.from;
    const side = chunk.index <= 2 ? (chunk.index === 1 ? 1 : -1) : random() < 0.5 ? -1 : 1;
    const spec = signStyles[biome.sign];
    const surface = signMaterials[biome.sign];
    const sample = this.road.sample(distance);
    const ground = this.road.terrain(sample, side * (chunk.index === 1 ? 10.9 : 10.3 + random() * 3.5), MathUtils.lerp(mix.from.relief, mix.to.relief, mix.blend));
    const group = new Group();
    group.position.copy(ground).sub(chunk.center);
    const angle = -sample.heading - side * 0.34;
    group.rotation.y = angle;
    const { width, height, lift } = spec;
    const postHeight = lift - height / 2;
    for (const x of [-width * 0.32, width * 0.32]) {
      piece(group, cube, surface.post, x, postHeight / 2, 0, biome.sign === 'metal' ? 0.18 : 0.24, postHeight, 0.23);
    }
    const rim = 0.14;
    for (const edge of [-1, 1]) {
      piece(group, cube, surface.frame, 0, lift + edge * (height + rim) / 2, 0, width + 2 * rim, rim, 0.26);
      piece(group, cube, surface.frame, edge * (width + rim) / 2, lift, 0, rim, height, 0.26);
    }
    if (biome.sign === 'metal') {
      const span = width * 0.64;
      const length = Math.hypot(span, postHeight);
      const slant = Math.atan2(span, postHeight);
      for (const side of [-1, 1]) {
        piece(group, cube, surface.post, 0, postHeight / 2, 0, 0.11, length, 0.18).rotation.z = side * slant;
      }
    }
    if (biome.sign === 'overgrown') {
      for (let i = 0; i < 8; i++) piece(group, stone, ivy, -width * 0.51 + Math.sin(i * 1.2) * 0.37, lift - height * 0.68 + i * height / 7, 0.19, 0.49, 0.47, 0.33);
    }
    const faces = [-1, 1].map((faceSide) => {
      const face = piece(group, panel, this.surfaces.get(ad)!, 0, lift, faceSide * 0.13, width, height, 1);
      if (faceSide < 0) face.rotateY(Math.PI);
      face.userData = { url: ad.url, companyName: ad.companyName };
      return face;
    });
    group.userData = { url: ad.url, companyName: ad.companyName };
    chunk.group.add(group);
    this.signs.set(chunk.index, { group, faces, advertiser: ad, distance, worldPosition: ground.clone().setY(ground.y + lift), baseAngle: angle, style: biome.sign });
  }

  remove(chunk: Chunk) {
    if (this.hovered === this.signs.get(chunk.index)) this.clearHover();
    this.signs.delete(chunk.index);
  }

  update(player: Vector3, origin: Vector3, time: number, enabled: boolean) {
    let closest: Billboard | undefined;
    let limit: number = config.billboards.promptDistance;
    for (const sign of this.signs.values()) {
      if (sign.style === 'metal') sign.group.rotation.y = sign.baseAngle + Math.sin(time * 1.45 + sign.distance) * 0.028;
      if (!enabled) continue;
      const distance = Math.hypot(sign.worldPosition.x - player.x, sign.worldPosition.z - player.z);
      if (distance < limit) {
        limit = distance;
        closest = sign;
      }
    }
    const sign = enabled ? this.hovered ?? closest : undefined;
    this.label.hidden = !sign;
    if (!sign) return;
    const location = this.projected.copy(sign.worldPosition);
    location.y += signStyles[sign.style].height * 0.55;
    location.sub(origin).project(this.camera);
    if (location.z < -1 || location.z > 1 || Math.abs(location.x) > 1.16 || Math.abs(location.y) > 1.16) {
      this.label.hidden = true;
      return;
    }
    this.label.style.left = MathUtils.clamp(50 + location.x * 50, 11, 89).toFixed(1) + '%';
    this.label.style.top = MathUtils.clamp(50 - location.y * 50, 12, 89).toFixed(1) + '%';
    this.label.querySelector('strong')!.textContent = sign.advertiser.companyName;
    this.label.querySelector('small')!.hidden = this.mobile;
  }

  dispose() {
    this.disposed = true;
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerdown', this.onClick);
    this.canvas.removeEventListener('pointerleave', this.clearHover);
    this.clearHover();
    this.surfaces.forEach((surface) => surface.dispose());
    this.textures.forEach((texture) => texture.dispose());
  }

  private pick(event: PointerEvent) {
    const bounds = this.canvas.getBoundingClientRect();
    this.ndc.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
    this.ray.setFromCamera(this.ndc, this.camera);
    const signs = [...this.signs.values()];
    const hit = this.ray.intersectObjects(signs.flatMap((sign) => sign.faces), false)[0];
    return hit && signs.find((sign) => sign.faces.some((face) => face === hit.object));
  }

  private onMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    this.mobile = false;
    this.hovered = this.pick(event);
    this.canvas.style.cursor = this.hovered ? 'pointer' : '';
  };

  private onClick = (event: PointerEvent) => {
    if (event.pointerType === 'touch') this.mobile = true;
    if (event.button !== 0) return;
    const billboard = this.pick(event);
    if (billboard) window.open(billboard.advertiser.url, '_blank', 'noopener,noreferrer');
  };

  private clearHover = () => {
    this.hovered = undefined;
    this.canvas.style.cursor = '';
  };
}
