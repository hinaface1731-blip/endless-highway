export type Prop = 'cactus' | 'pine' | 'house' | 'hedge' | 'tree' | 'palm' | 'jungle' | 'fence' | 'barn' | 'hay' | 'rock' | 'peak' | 'dune' | 'shrub' | 'pole';
export type SignStyle = 'motel' | 'timber' | 'garden' | 'classic' | 'overgrown' | 'rustic' | 'metal' | 'sunbaked';

interface Palette {
  sky: string;
  haze: string;
  sun: string;
  ground: number;
  shoulder: number;
  road: number;
  plants: number;
  accent: number;
}

export interface Biome {
  id: string;
  name: string;
  palette: Palette;
  fog: readonly [near: number, far: number];
  props: readonly Prop[];
  density: number;
  relief: number;
  sign: SignStyle;
}

export const biomes: readonly Biome[] = [
  { id: 'america', name: 'Америка', palette: { sky: '#638b9a', haze: '#e9b693', sun: '#fff0bc', ground: 0xb78057, shoulder: 0xc39a75, road: 0x4a4444, plants: 0x737b50, accent: 0xad604b }, fog: [85, 495], props: ['cactus', 'cactus', 'rock', 'shrub', 'pole', 'peak'], density: 0.85, relief: 0.78, sign: 'motel' },
  { id: 'forest', name: 'Леса', palette: { sky: '#6c939f', haze: '#bcc4a5', sun: '#fff0c6', ground: 0x59664a, shoulder: 0x85735d, road: 0x494a46, plants: 0x405d43, accent: 0xa27257 }, fog: [54, 380], props: ['pine', 'pine', 'pine', 'rock', 'house', 'shrub'], density: 1.3, relief: 0.9, sign: 'timber' },
  { id: 'europe', name: 'Европа', palette: { sky: '#72a3b9', haze: '#e1d6b3', sun: '#fff4d7', ground: 0x96a165, shoulder: 0xb9a88c, road: 0x4b4c50, plants: 0x6f9049, accent: 0xb8654d }, fog: [77, 460], props: ['house', 'hedge', 'hedge', 'tree', 'fence'], density: 1, relief: 0.55, sign: 'garden' },
  { id: 'steppe', name: 'Степь', palette: { sky: '#8faab0', haze: '#e9cf9d', sun: '#fff1c1', ground: 0xae9862, shoulder: 0xc2af85, road: 0x595047, plants: 0xaaad70, accent: 0xd0a461 }, fog: [120, 545], props: ['shrub', 'shrub', 'rock', 'tree', 'pole'], density: 0.6, relief: 0.32, sign: 'classic' },
  { id: 'jungle', name: 'Джунгли', palette: { sky: '#527f76', haze: '#a7b991', sun: '#e4edd0', ground: 0x536c43, shoulder: 0x756b53, road: 0x414f48, plants: 0x44834b, accent: 0x6da679 }, fog: [27, 222], props: ['palm', 'jungle', 'jungle', 'tree', 'rock', 'shrub'], density: 1.5, relief: 0.85, sign: 'overgrown' },
  { id: 'country', name: 'Деревенская глубинка', palette: { sky: '#81a0ac', haze: '#e4c5a0', sun: '#ffebbe', ground: 0xa38a54, shoulder: 0xb78765, road: 0x555049, plants: 0x9a9855, accent: 0xc4944c }, fog: [75, 435], props: ['fence', 'fence', 'barn', 'hay', 'hay', 'tree', 'pole'], density: 0.95, relief: 0.55, sign: 'rustic' },
  { id: 'mountains', name: 'Горы', palette: { sky: '#6d8eac', haze: '#c4d0dc', sun: '#f0eddf', ground: 0x7c8289, shoulder: 0xa3a2a1, road: 0x484c56, plants: 0x657b71, accent: 0x738ba0 }, fog: [115, 610], props: ['peak', 'peak', 'rock', 'rock', 'pine'], density: 0.65, relief: 1.85, sign: 'metal' },
  { id: 'desert', name: 'Пустыня', palette: { sky: '#769aa6', haze: '#f5bb85', sun: '#fff4a7', ground: 0xc68552, shoulder: 0xdba777, road: 0x54494b, plants: 0xa49665, accent: 0xc07b58 }, fog: [85, 490], props: ['dune', 'dune', 'shrub', 'shrub', 'rock'], density: 0.55, relief: 0.7, sign: 'sunbaked' },
];

export const signStyles: Record<SignStyle, { frame: number; post: number; width: number; height: number; lift: number }> = {
  motel: { frame: 0x273935, post: 0x574638, width: 8, height: 4.1, lift: 4.8 },
  timber: { frame: 0x51392c, post: 0x634233, width: 6.7, height: 3.2, lift: 3.5 },
  garden: { frame: 0xede0c8, post: 0x77705b, width: 5.8, height: 3.1, lift: 3.2 },
  classic: { frame: 0x675742, post: 0x80664d, width: 7.5, height: 3.6, lift: 4.1 },
  overgrown: { frame: 0x34473a, post: 0x4e4939, width: 6.8, height: 3.4, lift: 3.8 },
  rustic: { frame: 0x765140, post: 0x573f31, width: 6.3, height: 3.1, lift: 3.4 },
  metal: { frame: 0x677680, post: 0x454f5a, width: 7, height: 3.3, lift: 4.35 },
  sunbaked: { frame: 0xb67d50, post: 0x755044, width: 7.4, height: 3.65, lift: 4.25 },
};
