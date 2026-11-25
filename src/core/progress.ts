import { biomes } from '../config/biomes';

const storageKey = 'endless-highway-progress-v1';

export class Progress {
  private readonly visited = new Set<string>();
  private best = 0;
  private savedBest = 0;

  constructor() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const data: unknown = JSON.parse(raw);
      if (typeof data !== 'object' || data === null) return;
      if ('best' in data && typeof data.best === 'number' && Number.isFinite(data.best) && data.best >= 0) {
        this.best = this.savedBest = data.best;
      }
      if ('visited' in data && Array.isArray(data.visited)) {
        for (const biome of biomes) if (data.visited.includes(biome.id)) this.visited.add(biome.id);
      }
    } catch { /* Local storage can be disabled. */ }
  }

  get summary() {
    return 'Рекорд дистанции: ' + (this.best / 1000).toFixed(2) + ' км\nОткрыто биомов: ' + this.visited.size + ' из ' + biomes.length;
  }

  update(distance: number, biome: string) {
    const isNew = !this.visited.has(biome);
    this.visited.add(biome);
    this.best = Math.max(this.best, distance);
    if (isNew || this.best - this.savedBest >= 50) this.save();
  }

  save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ best: this.best, visited: [...this.visited] }));
      this.savedBest = this.best;
    } catch { /* The current trip can continue without storage. */ }
  };
}
