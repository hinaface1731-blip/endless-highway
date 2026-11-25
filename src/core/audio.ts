export class EngineAudio {
  active = false;
  private context?: AudioContext;
  private main?: OscillatorNode;
  private overtone?: OscillatorNode;
  private level?: GainNode;
  private filter?: BiquadFilterNode;

  async toggle() {
    this.active = !this.active;
    if (this.active) {
      try {
        if (!this.context) this.setup();
        await this.context?.resume();
      } catch {
        this.active = false;
      }
    }
    this.update(0, false, false);
    return this.active;
  }

  update(speed: number, throttle: boolean, paused: boolean) {
    if (!this.context || !this.main || !this.overtone || !this.level || !this.filter) return;
    const now = this.context.currentTime;
    const frequency = 29 + speed * 2.15 + (throttle ? 5 : 0);
    this.main.frequency.setTargetAtTime(frequency, now, 0.13);
    this.overtone.frequency.setTargetAtTime(frequency * 2.02, now, 0.15);
    this.filter.frequency.setTargetAtTime(100 + speed * 12.5, now, 0.14);
    this.level.gain.setTargetAtTime(this.active && !paused ? 0.035 + speed * 0.0014 : 0, now, 0.1);
  }

  dispose() {
    void this.context?.close();
  }

  private setup() {
    const ctx = new AudioContext();
    this.context = ctx;
    this.main = ctx.createOscillator();
    this.main.type = 'sawtooth';
    this.overtone = ctx.createOscillator();
    this.overtone.type = 'triangle';
    const mix = ctx.createGain();
    mix.gain.value = 0.38;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 0.8;
    this.level = ctx.createGain();
    this.level.gain.value = 0;
    this.main.connect(this.filter);
    this.overtone.connect(mix).connect(this.filter);
    this.filter.connect(this.level).connect(ctx.destination);
    this.main.start();
    this.overtone.start();
  }
}
