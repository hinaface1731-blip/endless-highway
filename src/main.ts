import { mountScene } from './core/scene';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const errorBanner = document.querySelector<HTMLElement>('#game-error');

if (!canvas || !errorBanner) {
  throw new Error('Отсутствуют элементы для запуска 3D-сцены.');
}

try {
  const dispose = mountScene(canvas);
  import.meta.hot?.dispose(dispose);
} catch (error) {
  errorBanner.hidden = false;
  console.error('Ошибка запуска 3D-сцены.', error);
}
