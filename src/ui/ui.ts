import type { Biome } from '../config/biomes';
import { config } from '../config/config';
import type { Driver } from '../entities/car';

export interface DialogContent {
  eyebrow: string;
  title: string;
  body: string;
  actions: readonly { label: string; primary?: boolean; disabled?: boolean; run: () => void }[];
}

export class UI {
  readonly game = document.querySelector<HTMLElement>('#game')!;
  readonly billboard = this.find<HTMLElement>('billboard');
  readonly sound = this.find<HTMLButtonElement>('sound');
  readonly pause = this.find<HTMLButtonElement>('pause');
  readonly interact = this.find<HTMLButtonElement>('interact');
  readonly dialog = this.find<HTMLDialogElement>('dialog');
  private readonly speed = this.find<HTMLElement>('speed');
  private readonly distance = this.find<HTMLElement>('distance');
  private readonly cash = this.find<HTMLElement>('cash');
  private readonly biome = this.find<HTMLElement>('biome');
  private readonly boost = this.find<HTMLElement>('boost');
  private readonly gauge = this.find<HTMLElement>('gauge');
  private readonly message = this.find<HTMLElement>('toast');
  private readonly title = this.find<HTMLElement>('title');
  private readonly eyebrow = this.find<HTMLElement>('eyebrow');
  private readonly body = this.find<HTMLElement>('body');
  private readonly actions = this.find<HTMLElement>('actions');
  private timer: ReturnType<typeof setTimeout> | undefined;
  private actionKind: 'event' | 'pause' | undefined;
  private previousValues = { speed: '', distance: '', cash: '', biome: '', boost: '' };

  constructor() {
    this.dialog.addEventListener('cancel', this.onCancel);
  }

  get paused() { return this.actionKind === 'pause'; }
  get hasDialog() { return this.actionKind !== undefined; }

  refresh(driver: Driver, biome: Biome) {
    const speed = Math.round(driver.speed * 3.6).toString().padStart(3, '0');
    const distance = (Math.max(0, driver.distance - config.car.initialDistance) / 1000).toFixed(2);
    const cash = (driver.cash < 0 ? '−$' : '$') + Math.abs(driver.cash);
    const boost = driver.boostRemaining > 0 ? '+20% · ' + Math.ceil(driver.boostRemaining) + ' с' : '';
    const values = { speed, distance, cash, biome: biome.name, boost };
    for (const key of ['speed', 'distance', 'cash', 'biome', 'boost'] as const) {
      if (values[key] === this.previousValues[key]) continue;
      this[key].textContent = values[key];
      this.previousValues[key] = values[key];
      if (key === 'speed') this.gauge.style.setProperty('--angle', Math.min(260, Number(speed) / 160 * 260) + 'deg');
      if (key === 'boost') this.boost.hidden = !boost;
    }
  }

  setInteraction(active: boolean) {
    this.interact.hidden = !active;
  }

  toast(text: string) {
    clearTimeout(this.timer);
    this.message.textContent = text;
    this.message.hidden = false;
    this.timer = setTimeout(() => { this.message.hidden = true; }, 3800);
  }

  setSound(active: boolean) {
    this.sound.setAttribute('aria-pressed', String(active));
    const label = active ? 'Выключить звук' : 'Включить звук';
    this.sound.setAttribute('aria-label', label);
    this.sound.title = label;
  }

  showDialog(content: DialogContent, kind: 'event' | 'pause' = 'event') {
    if (this.hasDialog) return;
    this.actionKind = kind;
    this.eyebrow.textContent = content.eyebrow;
    this.title.textContent = content.title;
    this.body.textContent = content.body;
    this.actions.replaceChildren();
    this.interact.hidden = true;
    for (const action of content.actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.disabled = action.disabled === true;
      if (action.primary) button.className = 'primary';
      button.addEventListener('click', () => {
        this.closeDialog();
        action.run();
      });
      this.actions.append(button);
    }
    this.dialog.showModal();
  }

  closeDialog() {
    this.actionKind = undefined;
    if (this.dialog.open) this.dialog.close();
  }

  dispose() {
    clearTimeout(this.timer);
    this.closeDialog();
    this.dialog.removeEventListener('cancel', this.onCancel);
  }

  private find<T extends HTMLElement>(name: string) {
    return document.querySelector<T>('[data-ui="' + name + '"]')!;
  }

  private onCancel = (event: Event) => {
    event.preventDefault();
    if (this.paused) this.closeDialog();
  };
}
