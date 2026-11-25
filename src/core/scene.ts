import {
  DirectionalLight, Fog, Group, HemisphereLight, MathUtils, PerspectiveCamera, Scene, Vector3, WebGLRenderer,
} from 'three';
import { Billboards } from '../billboards/billboards';
import { config } from '../config/config';
import { Driver } from '../entities/car';
import { RoadEvents } from '../events/events';
import { UI } from '../ui/ui';
import { BiomeSequence, dominantBiome, paletteColor, type BiomeMix } from '../world/biomes';
import { ChunkStream } from '../world/chunks';
import { Road, roadOffset } from '../world/road';
import { EngineAudio } from './audio';
import { Input } from './input';
import { startLoop } from './loop';
import { Progress } from './progress';

const roadSeed = 91872;
const scenerySeed = 14470;
const billboardSeed = 4409;

export function mountScene(canvas: HTMLCanvasElement): () => void {
  const mobile = matchMedia('(pointer: coarse)').matches;
  const renderer = new WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
  const scene = new Scene();
  const world = new Group();
  const origin = new Vector3();
  scene.add(world);
  const camera = new PerspectiveCamera(config.camera.fieldOfView, 1, config.camera.near, config.camera.far);
  const lookTarget = new Vector3();
  const fog = new Fog(0xe9b693, 85, 495);
  scene.fog = fog;

  const { sky, ground, ambientIntensity, sun, sunIntensity, sunPosition } = config.lighting;
  const daylight = new DirectionalLight(sun, sunIntensity);
  daylight.position.set(...sunPosition);
  const ambient = new HemisphereLight(sky, ground, ambientIntensity);
  scene.add(ambient, daylight);

  const lifetime = new AbortController();
  const { signal } = lifetime;
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const biomes = new BiomeSequence(seed);
  const road = new Road(roadSeed, biomes);
  const driver = new Driver(road);
  const ui = new UI();
  const input = new Input();
  const progress = new Progress();
  const audio = new EngineAudio();
  const events = new RoadEvents(world, road, biomes, driver, ui, seed ^ 27731);
  const billboards = new Billboards(canvas, camera, road, biomes, ui.billboard, billboardSeed);
  const chunks = new ChunkStream(world, road, biomes, scenerySeed, (chunk) => events.consider(chunk), (chunk) => {
    billboards.remove(chunk);
    events.remove(chunk);
  });
  world.add(driver.model.root);

  let time = 0;
  let hudTimer = 0;
  let currentChunk = -1;
  let lastRebase = 0;
  let latestMix: BiomeMix | undefined;
  let wasInDialog = false;
  let resolutionScale = 1;
  let sampleFrames = 0;
  let sampleDuration = 0;
  const rendering = config.rendering;

  function resize() {
    const { clientWidth, clientHeight } = canvas;
    if (!clientWidth || !clientHeight) return;
    camera.aspect = clientWidth / clientHeight;
    camera.fov = camera.aspect < 0.72 ? 68 : config.camera.fieldOfView;
    camera.updateProjectionMatrix();
    const pixelRatio = Math.min(window.devicePixelRatio, mobile ? rendering.mobilePixelRatio : rendering.maxPixelRatio);
    renderer.setPixelRatio(pixelRatio * resolutionScale);
    renderer.setSize(clientWidth, clientHeight, false);
  }

  function stream() {
    chunks.update(driver.distance);
    const index = Math.floor(driver.distance / config.world.chunkLength);
    if (index === currentChunk) return;
    currentChunk = index;
    for (const chunk of chunks.chunks.values()) {
      if (chunk.index < index + config.world.ahead && chunk.index > Math.max(0, index - config.world.behind)) {
        billboards.consider(chunk);
      }
    }
  }

  function adjustCamera(delta: number) {
    const { distance, height, lookAhead, damping } = config.camera;
    const behind = road.sample(driver.distance - distance);
    const ahead = road.sample(driver.distance + lookAhead);
    const targetPosition = roadOffset(behind, driver.offset * 0.59, height).sub(origin);
    const targetLook = roadOffset(ahead, driver.offset * 0.18, 0.95).sub(origin);
    const blend = delta ? 1 - Math.exp(-damping * delta) : 1;
    camera.position.lerp(targetPosition, blend);
    lookTarget.lerp(targetLook, blend);
    camera.lookAt(lookTarget);
    camera.updateMatrixWorld();
  }

  function updateAtmosphere(mix: BiomeMix) {
    if (latestMix?.from === mix.from && latestMix.to === mix.to && latestMix.blend === mix.blend) return;
    latestMix = mix;
    const skyColor = paletteColor(mix, 'sky');
    const haze = paletteColor(mix, 'haze');
    const sunColor = paletteColor(mix, 'sun');
    ui.game.style.setProperty('--sky', '#' + skyColor.getHexString());
    ui.game.style.setProperty('--haze', '#' + haze.getHexString());
    ui.game.style.setProperty('--sun', '#' + sunColor.getHexString());
    fog.color.copy(haze);
    fog.near = MathUtils.lerp(mix.from.fog[0], mix.to.fog[0], mix.blend);
    fog.far = MathUtils.lerp(mix.from.fog[1], mix.to.fog[1], mix.blend);
    ambient.groundColor.copy(paletteColor(mix, 'ground')).multiplyScalar(0.68);
    daylight.color.set(0xffffff).lerp(sunColor, 0.48);
  }

  const pause = () => {
    if (ui.paused) {
      ui.closeDialog();
      return;
    }
    if (ui.hasDialog) return;
    input.clear();
    progress.save();
    ui.showDialog({
      eyebrow: 'ДАЛЬНИЙ СВЕТ', title: 'Пауза',
      body: progress.summary,
      actions: [{ label: 'Продолжить поездку', primary: true, run: () => {} }],
    }, 'pause');
  };

  ui.pause.addEventListener('click', pause, { signal });
  ui.interact.addEventListener('click', input.interact, { signal });
  ui.sound.addEventListener('click', async () => { ui.setSound(await audio.toggle()); }, { signal });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Escape' && !event.repeat && !ui.hasDialog) {
      event.preventDefault();
      pause();
    }
  }, { signal });
  window.addEventListener('pagehide', progress.save, { signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) progress.save();
  }, { signal });

  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  stream();
  driver.pose();
  adjustCamera(0);
  const initialMix = biomes.at(driver.distance);
  updateAtmosphere(initialMix);
  progress.update(0, dominantBiome(initialMix).id);
  ui.refresh(driver, dominantBiome(initialMix));

  const stop = startLoop({
    update(delta) {
      const controls = input.drive;
      if (ui.paused) {
        audio.update(driver.speed, false, true);
        return;
      }
      time += delta;
      events.update(delta, input.consumeInteraction(), time);
      if (ui.hasDialog && !wasInDialog) input.clear();
      wasInDialog = ui.hasDialog;
      driver.update(delta, controls);
      stream();

      if (driver.distance - lastRebase >= config.world.rebaseInterval) {
        const next = road.sample(driver.distance).position;
        camera.position.add(origin).sub(next);
        lookTarget.add(origin).sub(next);
        origin.copy(next);
        world.position.copy(origin).negate();
        lastRebase = driver.distance;
      }

      adjustCamera(delta);
      hudTimer += delta;
      if (hudTimer >= 0.075) {
        hudTimer = 0;
        const mix = biomes.at(driver.distance);
        const biome = dominantBiome(mix);
        updateAtmosphere(mix);
        progress.update(Math.max(0, driver.distance - config.car.initialDistance), biome.id);
        ui.refresh(driver, biome);
        audio.update(driver.speed, controls.throttle, driver.locked || document.hidden);
      }
    },
    render(_interpolation, frameDelta) {
      if (!document.hidden && frameDelta > 0 && frameDelta < 1 && resolutionScale > rendering.minResolutionScale) {
        sampleFrames++;
        sampleDuration += frameDelta;
        if (sampleDuration >= rendering.sampleSeconds) {
          const fpsFloor = mobile ? rendering.mobileFpsFloor : rendering.desktopFpsFloor;
          if (sampleFrames / sampleDuration < fpsFloor) {
            resolutionScale = Math.max(rendering.minResolutionScale, resolutionScale * rendering.resolutionStep);
            resize();
          }
          sampleFrames = sampleDuration = 0;
        }
      }
      billboards.update(driver.model.root.position, origin, time, !ui.hasDialog);
      renderer.render(scene, camera);
    },
  });

  return () => {
    stop();
    observer.disconnect();
    lifetime.abort();
    input.dispose();
    ui.dispose();
    chunks.dispose();
    events.dispose();
    driver.model.dispose();
    billboards.dispose();
    audio.dispose();
    renderer.dispose();
  };
}
