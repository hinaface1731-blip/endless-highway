import { Group, MathUtils } from 'three';
import { createEventModels } from '../assets/event-models';
import { config } from '../config/config';
import type { Driver } from '../entities/car';
import type { UI } from '../ui/ui';
import { BiomeSequence } from '../world/biomes';
import type { Chunk } from '../world/chunks';
import { randomSource, weightedChoice } from '../world/random';
import { Road, roadOffset } from '../world/road';

const greetings = [
  'Подбросишь до следующего съезда?', 'Вот это удача. Я уже начал разговаривать со столбами.',
  'Привет! У тебя найдётся свободное место?', 'Спасибо, что притормозил. Уже темнеет.',
  'Добрый день! Я еду туда же, куда и шоссе.',
];
const stories = [
  'Однажды я проехал три штата по карте, нарисованной на салфетке. Салфетка оказалась точнее навигатора.',
  'В детстве мы считали ночью красные огни на горе. Потом выяснилось, что горы там вообще не было.',
  'В пустыне есть заправка, где вместо сдачи дают почтовую открытку. У меня их уже восемь.',
  'Как-то я подобрал попутчика, который знал наизусть названия всех мостов. Одного из них ещё даже не построили.',
  'Если в лесу увидишь дом с синей крышей, остановись. Там пекут лучший хлеб на этой дороге.',
];
const { events, world, car } = config;
type Kind = keyof typeof events.weights;

interface Encounter {
  kind: Kind;
  chunk: number;
  distance: number;
  model: Group;
  phase: 'waiting' | 'approach' | 'dialog' | 'exit' | 'seen';
  elapsed: number;
  alerted?: boolean;
  message?: string;
}

export class RoadEvents {
  private current?: Encounter;
  private cooldownUntil: number = events.earliestChunk;
  private readonly models = createEventModels();
  private readonly retained = new Map<number, Group>();
  private readonly random: () => number;

  constructor(
    group: Group,
    private readonly road: Road,
    private readonly biomes: BiomeSequence,
    private readonly driver: Driver,
    private readonly ui: UI,
    seed: number,
  ) {
    group.add(...this.models.all);
    this.random = randomSource(seed);
  }

  consider(chunk: Chunk) {
    if (this.current || chunk.index < this.cooldownUntil || this.random() >= events.chance) return;
    const mix = this.biomes.at(chunk.start + events.distanceInChunk);
    const occupied = new Set(this.retained.values());
    const variants = this.models.easter.filter(({ root }) => !occupied.has(root));
    const eligible: { value: Kind; weight: number }[] = [
      { value: 'police', weight: mix.from.id === 'jungle' && mix.to.id === 'jungle' ? 0 : events.weights.police },
      { value: 'hitchhiker', weight: events.weights.hitchhiker },
      { value: 'easter', weight: variants.length ? events.weights.easter : 0 },
      { value: 'decoy', weight: occupied.has(this.models.trick.root) ? 0 : events.weights.decoy },
    ];
    const kind = weightedChoice(eligible, this.random);
    if (!kind) return;
    chunk.eventReserved = true;
    const distance = chunk.start + events.distanceInChunk;
    const variant = variants[Math.floor(this.random() * variants.length)];
    const model = kind === 'police' ? this.models.police.root
      : kind === 'hitchhiker' ? this.models.rider : kind === 'easter' ? variant.root : this.models.trick.root;
    const offset = kind === 'hitchhiker' ? 5.35 : kind === 'decoy' ? -8.7 : 10.8;
    this.current = { kind, chunk: chunk.index, distance, model, phase: 'waiting', elapsed: 0, message: kind === 'easter' ? variant.message : undefined };
    if (kind === 'police') return;

    const sample = this.road.sample(distance);
    model.position.copy(this.road.terrain(sample, offset, MathUtils.lerp(mix.from.relief, mix.to.relief, mix.blend)));
    if (kind === 'hitchhiker') model.position.y = sample.position.y - 0.045;
    model.rotation.y = -sample.heading + (kind === 'hitchhiker' ? -0.55 : 0.23);
    model.visible = true;
    if (kind === 'decoy') this.models.trick.reveal(false);
  }

  remove(chunk: Chunk) {
    const retained = this.retained.get(chunk.index);
    if (retained) {
      retained.visible = false;
      this.retained.delete(chunk.index);
    }
    if (this.current?.chunk === chunk.index && !this.driver.locked && !this.driver.forcedPullover) this.finish();
  }

  dispose() {
    this.models.police.dispose();
    this.models.trick.dispose();
    this.models.all.forEach((model) => model.removeFromParent());
  }

  update(delta: number, interact: boolean, time: number) {
    const event = this.current;
    if (!event) {
      this.ui.setInteraction(false);
      return;
    }
    event.elapsed += delta;
    const ahead = event.distance - this.driver.distance;

    if (event.kind === 'police') {
      this.updatePolice(event, ahead, time);
      return;
    }

    if (event.kind === 'hitchhiker' && event.phase === 'waiting') {
      if (!event.alerted && ahead < events.hitchhikerAlertDistance && ahead > events.hitchhikerDistance) {
        event.alerted = true;
        this.ui.toast('Попутчик впереди. Остановитесь рядом, чтобы подобрать его.');
      }
      const nearby = Math.abs(ahead) <= events.hitchhikerDistance;
      const stopped = this.driver.speed <= events.hitchhikerMaxSpeed;
      this.ui.setInteraction(nearby && stopped);
      if (nearby && stopped && interact) this.pickUp(event);
    }

    if (event.phase === 'waiting' && ahead < events.easterDistance) {
      if (event.kind === 'easter') {
        this.ui.toast(event.message!);
        event.phase = 'seen';
      }
      if (event.kind === 'decoy') {
        this.models.trick.reveal(true);
        event.phase = 'seen';
      }
    }
    if (event.kind === 'easter' && event.message === this.models.easter[0].message) {
      event.model.position.y += Math.sin(time * 2.35) * delta * 0.43;
      event.model.rotation.y += delta * 0.42;
    }
    if (event.kind === 'hitchhiker' && event.phase !== 'dialog' && ahead < -events.hitchhikerDistance) this.finish();
    if (event.phase === 'seen' && ahead < -events.easterDistance) this.finish(true);
  }

  private pickUp(event: Encounter) {
    event.phase = 'dialog';
    this.driver.speed = 0;
    this.driver.locked = true;
    const greeting = greetings[Math.floor(this.random() * greetings.length)];
    const story = stories[Math.floor(this.random() * stories.length)];
    this.ui.showDialog({
      eyebrow: 'ПОПУТЧИК', title: greeting, body: story,
      actions: [
        { label: 'Подвезти', primary: true, run: () => {
          this.driver.boostRemaining = car.boostSeconds;
          this.ui.toast('Попутчик в салоне. Скорость +20% на 20 секунд.');
          this.finish();
        } },
        { label: 'Поехать дальше', run: () => this.finish() },
      ],
    });
  }

  private updatePolice(event: Encounter, ahead: number, time: number) {
    if (event.phase === 'waiting') {
      if (ahead > events.policeTriggerDistance) return;
      event.phase = 'approach';
      event.elapsed = 0;
      event.model.visible = true;
      this.driver.forcedPullover = true;
      this.ui.toast('Патруль сзади. Прижимаемся к обочине.');
    }

    const { police } = this.models;
    const exit = event.phase === 'exit';
    const progress = MathUtils.smoothstep(event.elapsed, 0, exit ? events.policeExitSeconds : events.policeApproachSeconds);
    const separation = exit ? MathUtils.lerp(-5.5, 34, progress) : MathUtils.lerp(-29, -5.5, progress);
    const offset = exit ? MathUtils.lerp(2.05, -1.8, MathUtils.smoothstep(event.elapsed, 0, 0.65)) : MathUtils.lerp(-1.3, 2.05, progress);
    const sample = this.road.sample(this.driver.distance + separation);
    police.root.position.copy(roadOffset(sample, offset, 0.013));
    police.root.rotation.set(0, -sample.heading, 0, 'YXZ');
    police.root.rotateX(Math.atan(sample.grade));
    police.lights(time);

    if (event.phase === 'approach' && event.elapsed >= events.policeApproachSeconds) {
      this.driver.speed = 0;
      this.driver.locked = true;
      event.phase = 'dialog';
      this.ui.showDialog({
        eyebrow: 'ДОРОЖНЫЙ ПАТРУЛЬ', title: 'Заглушите двигатель',
        body: 'Офицер просит выйти из машины. Как поступим?',
        actions: [
          { label: 'Дать взятку · $' + events.bribe, primary: true, disabled: this.driver.cash < events.bribe,
            run: () => this.releasePolice(event, events.bribe, 'Патруль отпустил вас.') },
          { label: 'Спорить', run: () => {
            const fined = this.random() < 0.5;
            this.releasePolice(event, fined ? events.fine : 0, fined ? 'Патруль выписал штраф.' : 'Патруль отпустил вас с предупреждением.');
          } },
        ],
      });
    }
    if (exit && event.elapsed >= events.policeExitSeconds) this.finish();
  }

  private releasePolice(event: Encounter, charge: number, message: string) {
    this.driver.cash -= charge;
    this.driver.forcedPullover = false;
    this.driver.locked = false;
    event.phase = 'exit';
    event.elapsed = 0;
    this.ui.toast(message + (charge ? ' −$' + charge : ''));
  }

  private finish(keepModel = false) {
    if (!this.current) return;
    if (keepModel) this.retained.set(this.current.chunk, this.current.model);
    else this.current.model.visible = false;
    this.ui.setInteraction(false);
    this.cooldownUntil = Math.max(this.current.chunk, Math.floor(this.driver.distance / world.chunkLength)) + events.cooldownChunks + 1;
    this.current = undefined;
    this.driver.locked = false;
    this.driver.forcedPullover = false;
  }
}
