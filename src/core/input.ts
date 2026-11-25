import type { DriveInput } from '../entities/car';

type Key = 'KeyW' | 'KeyA' | 'KeyS' | 'KeyD';
const aliases = new Map<string, Key>([
  ['KeyW', 'KeyW'], ['ArrowUp', 'KeyW'], ['KeyA', 'KeyA'], ['ArrowLeft', 'KeyA'],
  ['KeyS', 'KeyS'], ['ArrowDown', 'KeyS'], ['KeyD', 'KeyD'], ['ArrowRight', 'KeyD'],
]);

export class Input {
  private readonly keyboard = new Set<Key>();
  private readonly pointers = new Map<number, Key>();
  private readonly lifetime = new AbortController();
  private interacted = false;

  constructor() {
    const { signal } = this.lifetime;
    window.addEventListener('keydown', this.onDown, { signal });
    window.addEventListener('keyup', this.onUp, { signal });
    window.addEventListener('blur', this.clear, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); }, { signal });
    document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((button) => {
      const key = aliases.get(button.dataset.key ?? '');
      if (!key) return;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.pointers.set(event.pointerId, key);
        button.classList.add('held');
      }, { signal });
      for (const kind of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
        button.addEventListener(kind, (event) => {
          this.pointers.delete(event.pointerId);
          if (![...this.pointers.values()].includes(key)) button.classList.remove('held');
        }, { signal });
      }
    });
  }

  get drive(): DriveInput {
    return { throttle: this.has('KeyW'), brake: this.has('KeyS'), steering: Number(this.has('KeyD')) - Number(this.has('KeyA')) };
  }

  interact = () => { this.interacted = true; };

  consumeInteraction() {
    const value = this.interacted;
    this.interacted = false;
    return value;
  }

  clear = () => {
    this.keyboard.clear();
    this.pointers.clear();
    this.interacted = false;
    document.querySelectorAll('.touch .held').forEach((button) => button.classList.remove('held'));
  };

  dispose() {
    this.clear();
    this.lifetime.abort();
  }

  private has(key: Key) {
    if (this.keyboard.has(key)) return true;
    for (const value of this.pointers.values()) if (value === key) return true;
    return false;
  }

  private onDown = (event: KeyboardEvent) => {
    if (document.querySelector('dialog[open]') || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = aliases.get(event.code);
    if (key) {
      event.preventDefault();
      this.keyboard.add(key);
    }
    if (event.code === 'KeyE' && !event.repeat) this.interact();
  };

  private onUp = (event: KeyboardEvent) => {
    const key = aliases.get(event.code);
    if (key) this.keyboard.delete(key);
  };
}
