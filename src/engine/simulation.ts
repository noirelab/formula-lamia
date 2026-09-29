// População, passo da simulação, fim de geração e histórico.
import { createRng, type Rng } from './rng.ts';
import { randomGenome } from './network.ts';
import { nextGeneration, mutate, type Lineage } from './genetics.ts';
import { Car, type Brain, type CarKind } from './car.ts';
import { generateCenterline, makeTrack, type Point, type Track } from './track.ts';
import { DEFAULT_SETTINGS, GEN_STEPS, layersFor, sensorAngles, type Settings } from './params.ts';

export interface GenRecord {
  gen: number;
  best: number; // voltas do melhor carro em 30 s
  avg: number; // média de voltas
  champion: Float32Array; // genoma do melhor carro, para os fantasmas
}

export type SimEvent =
  | { type: 'genStart'; gen: number }
  | { type: 'genEnd'; gen: number; allDead: boolean }
  | { type: 'firstLap'; gen: number }
  | { type: 'bestLap'; gen: number; time: number };

export class Simulation {
  settings: Settings;
  brain!: Brain;
  seed!: number;
  rng!: Rng;
  track!: Track;
  cars: Car[] = [];
  gen = 1;
  t = 0;
  history: GenRecord[] = [];
  bestLap: number | null = null; // segundos, sem contar a 1ª volta
  leader: Car | null = null;
  alive = 0;
  finished = false; // geração acabou; esperando evolve()
  lineage: Lineage | null = null; // exemplo de filho da última reprodução
  events: SimEvent[] = [];
  private lapped = false;

  constructor(seed: number, settings: Partial<Settings> = {}, center?: Point[], name?: string) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.restart(seed, center, name);
  }

  /** Recomeça do zero: cérebros sorteados e, sem `center`, pista nova da seed. */
  restart(seed = this.seed, center?: Point[], name = this.track?.name ?? 'Sua pista') {
    this.seed = seed;
    this.rng = createRng(seed);
    const n = this.settings.sensors;
    this.brain = { layers: layersFor(n), angles: sensorAngles(n) };
    this.track = center ? makeTrack(center, name) : makeTrack(generateCenterline(this.rng), `Circuito sorteado ${seed}`);
    this.gen = 1; this.history = []; this.bestLap = null; this.lapped = false; this.lineage = null;
    const genomes = Array.from({ length: this.settings.population }, () => randomGenome(this.brain.layers, this.rng));
    this.populate(genomes, genomes.map(() => 'random' as CarKind));
  }

  /** Troca a pista mantendo os cérebros. */
  setTrack(center: Point[], name: string) {
    this.track = makeTrack(center, name);
    this.bestLap = null;
    this.populate(this.cars.map((c) => c.genome), this.cars.map((c) => c.kind));
  }

  newTrack() { this.setTrack(generateCenterline(this.rng), 'Circuito sorteado'); }

  /** Começa uma geração a partir de um cérebro treinado: ele mesmo + filhos mutados. */
  loadChampion(genome: Float32Array) {
    this.gen = 1; this.history = []; this.bestLap = null; this.lapped = false; this.lineage = null;
    const genomes = [genome], kinds: CarKind[] = ['elite'];
    while (genomes.length < this.settings.population) {
      const g = new Float32Array(genome);
      mutate(g, this.settings.mutationRate, this.rng);
      genomes.push(g); kinds.push('child');
    }
    this.populate(genomes, kinds);
  }

  private populate(genomes: Float32Array[], kinds: CarKind[]) {
    this.cars = genomes.map((g, i) => new Car(g, kinds[i], this.brain));
    this.cars.forEach((c, i) => { c.id = i + 1; });
    for (const c of this.cars) c.reset(this.track);
    this.t = 0; this.finished = false; this.alive = this.cars.length; this.leader = this.cars[0];
    this.events.push({ type: 'genStart', gen: this.gen });
  }

  step() {
    if (this.finished) return;
    const t = ++this.t;
    let alive = 0, lead: Car | null = null;
    for (const c of this.cars) {
      if (!c.alive) continue;
      const lap = c.step(t, this.track);
      if (c.laps === 1 && !this.lapped) { this.lapped = true; this.events.push({ type: 'firstLap', gen: this.gen }); }
      if (lap !== null && (this.bestLap === null || lap < this.bestLap)) {
        this.bestLap = lap;
        this.events.push({ type: 'bestLap', gen: this.gen, time: lap });
      }
      if (c.alive) { alive++; if (!lead || c.best > lead.best) lead = c; }
    }
    this.alive = alive;
    if (lead) this.leader = lead;
    if (alive === 0 || t >= GEN_STEPS) {
      this.finished = true;
      this.events.push({ type: 'genEnd', gen: this.gen, allDead: alive === 0 });
    }
  }

  /** Carros do mais longe para o mais perto. */
  ranked(): Car[] { return [...this.cars].sort((a, b) => b.best - a.best); }

  evolve() {
    const ranked = this.ranked(), N = this.track.n;
    this.history.push({
      gen: this.gen,
      best: ranked[0].best / N,
      avg: ranked.reduce((s, c) => s + Math.max(0, c.best), 0) / ranked.length / N,
      champion: ranked[0].genome,
    });
    const { population, elitism, mutationRate } = this.settings;
    const b = nextGeneration(ranked.map((c) => c.genome), { population, elitism, mutationRate, layers: this.brain.layers }, this.rng);
    this.lineage = b.example;
    this.gen++;
    this.populate(b.genomes, b.kinds);
  }

  /** Recorde em voltas: histórico ou o líder da geração atual. */
  get record(): number {
    const live = this.leader ? this.leader.best / this.track.n : 0;
    return this.history.reduce((m, h) => Math.max(m, h.best), live);
  }

  drainEvents(): SimEvent[] { return this.events.splice(0); }
}

/**
 * Recordista: roda cada campeão, sem desenhar, na pista ATUAL (o recorde do histórico pode ter
 * sido feito em outra pista). Empate fica com a geração mais nova, que é a mais evoluída.
 * `laps` = voltas que ele fez em 30 s nesta pista.
 */
export function bestChampion(sim: Simulation): { gen: number; genome: Float32Array; laps: number } | null {
  let best: { gen: number; genome: Float32Array; laps: number } | null = null;
  for (const r of sim.history) {
    const c = new Car(r.champion, 'elite', sim.brain);
    c.reset(sim.track);
    for (let t = 1; t <= GEN_STEPS && c.alive; t++) c.step(t, sim.track);
    const laps = c.best / sim.track.n;
    if (!best || laps >= best.laps) best = { gen: r.gen, genome: r.champion, laps };
  }
  return best;
}

export type GhostRole = 'first' | 'mid' | 'last' | 'best';

/** Fantasmas: o campeão de cada geração, da 1ª até a recordista, todos juntos na mesma pista. */
export class GhostRace {
  readonly cars: Car[];
  readonly gens: number[];
  readonly roles: GhostRole[];
  t = 0;

  constructor(readonly sim: Simulation) {
    const h = sim.history, last = h.length;
    const best = bestChampion(sim)!.gen;
    const roleOf = (g: number): GhostRole => (g === best ? 'best' : g === 1 ? 'first' : g === last ? 'last' : 'mid');
    this.gens = Array.from({ length: best }, (_, i) => i + 1);
    this.roles = this.gens.map(roleOf);
    this.cars = this.gens.map((g) => new Car(h[g - 1].champion, 'elite', sim.brain));
    this.reset();
  }

  reset() { this.t = 0; for (const c of this.cars) c.reset(this.sim.track); }

  /** Devolve true quando a corrida acabou. */
  step(): boolean {
    const t = ++this.t;
    let alive = 0;
    for (const c of this.cars) if (c.alive) { c.step(t, this.sim.track); if (c.alive) alive++; }
    return alive === 0 || t >= GEN_STEPS;
  }
}
