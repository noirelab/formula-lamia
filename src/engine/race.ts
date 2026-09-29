// Corrida entre alunos: todos com o MESMO cérebro; quem ganha é decidido pela sorte.
// Sem colisão entre carros (atravessam como fantasmas), para ninguém bloquear ninguém.
// Fases: classificação (só no grid) → grid → luzes → corrida → fim.
import { Car, type Brain } from './car.ts';
import { createRng, type Rng } from './rng.ts';
import type { Track } from './track.ts';
import { STEPS_PER_SECOND, TRACK_SPACING } from './params.ts';

// Calibrados com scripts/check-race.ts (veja o teste de justiça em tests/race.test.ts).
export const RACE = {
  luckSpread: 0.08, // rendimento do motor oscila entre 92% e 100%
  luckTau: 90, // passos (1,5 s) para a oscilação mudar de verdade
  respawnSteps: 60, // 1 s parado depois de sair da pista
  qualLimit: 90 * STEPS_PER_SECOND, // classificação acaba em 90 s mesmo se alguém não completar
  gridHold: 3 * STEPS_PER_SECOND, // tempo mostrando o grid formado
  lightStep: STEPS_PER_SECOND, // uma luz vermelha por segundo, como na F1
  afterWinner: 15 * STEPS_PER_SECOND, // quem não terminou tem 15 s depois do vencedor
  gridRow: 2, // pontos da linha central entre filas (16 unidades)
  gridSide: 11, // deslocamento lateral de cada lado do grid
};

export type StartMode = 'grid' | 'single';
export type RacePhase = 'qualifying' | 'grid' | 'lights' | 'racing' | 'finished';

export interface RaceOptions {
  names: string[]; // um por participante (1 a 30)
  laps: number;
  start: StartMode;
  genome: Float32Array;
  brain: Brain;
  track: Track;
  seed: number;
}

export interface Racer {
  no: number; // número do carro, 1..N
  name: string;
  color: string;
  ink: string; // cor do texto sobre `color`
  car: Car;
  penalty: number; // passos parado depois de um respawn
  respawns: number;
  qualTime: number | null; // s; null = não completou a volta de classificação
  grid: number; // posição de largada, 0 = pole
  lapTimes: number[]; // s
  bestLap: number | null; // s
  finish: number | null; // s de corrida até a bandeirada
}

export type RaceEvent =
  | { type: 'phase'; phase: RacePhase }
  | { type: 'lead'; racer: Racer }
  | { type: 'lap'; lap: number } // o líder começou a volta `lap`
  | { type: 'finish'; racer: Racer; pos: number }
  | { type: 'respawn'; racer: Racer }
  | { type: 'lapTime'; racer: Racer; lap: number; time: number } // alguém completou uma volta
  | { type: 'fastest'; racer: Racer; time: number }; // nova volta mais rápida da prova

/** 30 cores bem separadas: matiz pelo ângulo de ouro, alternando claro e escuro. */
export function racerColor(i: number): string {
  const h = Math.round((i * 137.508 + 20) % 360), l = [60, 48, 70][i % 3], s = [80, 70, 75][i % 3];
  return `hsl(${h} ${s}% ${l}%)`;
}

/** Cor do texto sobre a cor do participante, pela luminância relativa (WCAG) do fundo. */
export function racerInk(i: number): string {
  const h = (i * 137.508 + 20) % 360, l = [60, 48, 70][i % 3] / 100, s = [80, 70, 75][i % 3] / 100;
  const f = (n: number) => { const k = (n + h / 30) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const Y = 0.2126 * lin(f(0)) + 0.7152 * lin(f(8)) + 0.0722 * lin(f(4));
  // contraste com branco (1.05/(Y+.05)) vs com azul-escuro #0B2239 (Y≈0,015)
  return 1.05 / (Y + 0.05) >= (Y + 0.05) / 0.065 ? '#FFFFFF' : '#0B2239';
}

export class Race {
  readonly racers: Racer[];
  readonly laps: number;
  readonly start: StartMode;
  readonly seed: number;
  phase: RacePhase;
  phaseT = 0; // passos desde o começo da fase
  raceT = 0; // passos desde a largada
  lightsOn = 0; // 0 a 5 luzes vermelhas acesas
  events: RaceEvent[] = [];
  private rng: Rng;
  private track: Track;
  private lightsOutAt = 0;
  private leader: Racer | null = null;
  private lastLeadEvent = -Infinity;
  private leaderLap = 0;
  private winnerT: number | null = null;
  fastest: { racer: Racer; time: number } | null = null;

  constructor(o: RaceOptions) {
    this.laps = o.laps; this.start = o.start; this.seed = o.seed; this.track = o.track;
    this.rng = createRng(o.seed);
    this.racers = o.names.map((name, i) => {
      const car = new Car(o.genome, 'elite', o.brain);
      car.id = i + 1; car.luck = { rng: this.rng, spread: RACE.luckSpread, tau: RACE.luckTau }; car.reset(o.track);
      return { no: i + 1, name, color: racerColor(i), ink: racerInk(i), car, penalty: 0, respawns: 0, qualTime: null, grid: i, lapTimes: [], bestLap: null, finish: null };
    });
    this.phase = o.start === 'grid' ? 'qualifying' : 'lights';
    if (o.start === 'single') this.formGrid();
  }

  private setPhase(p: RacePhase) { this.phase = p; this.phaseT = 0; this.events.push({ type: 'phase', phase: p }); }

  /** Posiciona os carros: grid em zigue-zague pela classificação, ou todos no mesmo ponto. */
  private formGrid() {
    if (this.start === 'grid') {
      const order = [...this.racers].sort((a, b) =>
        (a.qualTime ?? Infinity) - (b.qualTime ?? Infinity) || b.car.progress - a.car.progress);
      order.forEach((r, g) => { r.grid = g; });
    }
    for (const r of this.racers) {
      const row = Math.floor(r.grid / 2), side = r.grid % 2 ? 1 : -1;
      if (this.start === 'grid') r.car.placeAt(this.track, 1 + row * RACE.gridRow, side * RACE.gridSide);
      else r.car.placeAt(this.track, 0, 0);
      r.penalty = 0;
    }
    // luzes apagam depois de um intervalo sorteado, como na F1: ninguém adivinha a hora
    this.lightsOutAt = 5 * RACE.lightStep + Math.floor(12 + this.rng.next() * 48);
  }

  /**
   * Instante (s) em que o carro cruzou a linha dentro deste passo: quanto mais fundo passou, mais
   * cedo cruzou. Sem isso, dois carros no mesmo passo empatariam e o número menor levaria.
   * Empate exato vai para sorteio.
   */
  private crossTime(r: Racer, t: number) {
    const over = r.car.progress - r.car.laps * this.track.n; // pontos além da linha
    const perStep = Math.max(0.05, (r.car.v * r.car.power) / TRACK_SPACING);
    return (t - Math.min(1, over / perStep) + this.rng.next() * 1e-6) / STEPS_PER_SECOND;
  }

  /** Passo de um carro, com respawn e penalidade. Devolve true se completou uma volta. */
  private drive(r: Racer, t: number): boolean {
    if (r.penalty > 0) { r.penalty--; return false; }
    const before = r.car.laps;
    r.car.step(t, this.track);
    if (!r.car.alive) {
      r.car.respawn(this.track, t + RACE.respawnSteps);
      r.penalty = RACE.respawnSteps; r.respawns++;
      this.events.push({ type: 'respawn', racer: r });
    }
    return r.car.laps > before;
  }

  step() {
    const t = ++this.phaseT;
    if (this.phase === 'qualifying') {
      for (const r of this.racers) {
        if (r.qualTime !== null) continue;
        if (this.drive(r, t)) r.qualTime = this.crossTime(r, t);
      }
      if (this.racers.every((r) => r.qualTime !== null) || t >= RACE.qualLimit) { this.formGrid(); this.setPhase('grid'); }
    } else if (this.phase === 'grid') {
      if (t >= RACE.gridHold) this.setPhase('lights');
    } else if (this.phase === 'lights') {
      this.lightsOn = Math.min(5, Math.floor(t / RACE.lightStep));
      if (t >= this.lightsOutAt) { this.lightsOn = 0; this.setPhase('racing'); }
    } else if (this.phase === 'racing') {
      const rt = ++this.raceT, arrived: Racer[] = [];
      for (const r of this.racers) {
        if (r.finish !== null) continue;
        if (!this.drive(r, rt)) continue;
        const now = this.crossTime(r, rt), prev = r.lapTimes.reduce((s, v) => s + v, 0), lapT = now - prev;
        r.lapTimes.push(lapT);
        this.events.push({ type: 'lapTime', racer: r, lap: r.lapTimes.length, time: lapT });
        // 1ª volta sai parada: não conta para melhor volta (como no treino)
        if (r.lapTimes.length > 1) {
          if (r.bestLap === null || lapT < r.bestLap) r.bestLap = lapT;
          if (!this.fastest || lapT < this.fastest.time) { this.fastest = { racer: r, time: lapT }; this.events.push({ type: 'fastest', racer: r, time: lapT }); }
        }
        if (r.car.laps >= this.laps) { r.finish = now; arrived.push(r); }
      }
      if (arrived.length) {
        this.winnerT ??= rt;
        const before = this.racers.filter((q) => q.finish !== null).length - arrived.length;
        arrived.sort((a, b) => a.finish! - b.finish!).forEach((r, i) => this.events.push({ type: 'finish', racer: r, pos: before + i + 1 }));
      }
      const lead = this.standings()[0];
      if (lead !== this.leader && rt - this.lastLeadEvent > 2 * STEPS_PER_SECOND && rt > STEPS_PER_SECOND) {
        this.events.push({ type: 'lead', racer: lead }); this.lastLeadEvent = rt;
      }
      this.leader = lead;
      const lap = Math.min(this.laps, lead.car.laps + 1);
      if (lap > this.leaderLap && lead.finish === null) { this.leaderLap = lap; this.events.push({ type: 'lap', lap }); }
      const done = this.racers.every((r) => r.finish !== null) || (this.winnerT !== null && rt - this.winnerT >= RACE.afterWinner);
      if (done) this.setPhase('finished');
    }
  }

  /** Classificação do momento: quem terminou (pela ordem de chegada) e depois quem foi mais longe. */
  standings(): Racer[] {
    if (this.phase === 'qualifying')
      return [...this.racers].sort((a, b) => (a.qualTime ?? Infinity) - (b.qualTime ?? Infinity) || b.car.progress - a.car.progress);
    if (this.phase === 'grid' || this.phase === 'lights') return [...this.racers].sort((a, b) => a.grid - b.grid);
    return [...this.racers].sort((a, b) =>
      (a.finish ?? Infinity) - (b.finish ?? Infinity) || b.car.progress - a.car.progress);
  }

  /** Volta em que o líder está (1..laps). */
  get lap() { return Math.max(1, this.leaderLap); }

  drainEvents(): RaceEvent[] { return this.events.splice(0); }
}
