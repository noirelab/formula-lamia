import { describe, it, expect, beforeAll } from 'vitest';
import { Simulation, bestChampion } from '../src/engine/simulation';
import { Race, racerColor, type RaceOptions } from '../src/engine/race';
import { CIRCUITS } from '../src/engine/circuits';
import { circuitCenter } from '../src/engine/track';

let base: Omit<RaceOptions, 'names' | 'laps' | 'start' | 'seed'>;

beforeAll(() => {
  const monza = CIRCUITS.find((c) => c.id === 'it-1922')!;
  const sim = new Simulation(7, {}, circuitCenter(monza), monza.name);
  while (sim.history.length < 12) { while (!sim.finished) sim.step(); sim.evolve(); }
  const champ = bestChampion(sim)!;
  expect(champ.laps).toBeGreaterThan(1); // precisa de um cérebro que já dá volta
  base = { genome: champ.genome, brain: sim.brain, track: sim.track };
}, 60_000);

const names = (n: number) => Array.from({ length: n }, (_, i) => `Aluno ${i + 1}`);
function runToEnd(r: Race) {
  let guard = 0;
  while (r.phase !== 'finished' && guard++ < 500_000) r.step();
  return r;
}

describe('corrida', () => {
  it('passa pelas fases na ordem e todos terminam', () => {
    const r = new Race({ ...base, names: names(6), laps: 3, start: 'grid', seed: 5 });
    const phases: string[] = [];
    let guard = 0;
    while (r.phase !== 'finished' && guard++ < 500_000) {
      r.step();
      for (const e of r.drainEvents()) if (e.type === 'phase') phases.push(e.phase);
    }
    expect(phases).toEqual(['grid', 'lights', 'racing', 'finished']);
    expect(r.racers.every((x) => x.finish !== null && x.lapTimes.length === 3)).toBe(true);
    const st = r.standings();
    for (let i = 1; i < st.length; i++) expect(st[i].finish!).toBeGreaterThanOrEqual(st[i - 1].finish!);
  });

  it('o grid segue a classificação', () => {
    const r = new Race({ ...base, names: names(8), laps: 1, start: 'grid', seed: 9 });
    while (r.phase === 'qualifying') r.step();
    const byQual = [...r.racers].sort((a, b) => a.qualTime! - b.qualTime!);
    byQual.forEach((x, i) => expect(x.grid).toBe(i));
  });

  it('mesma seed, mesma corrida', () => {
    const a = runToEnd(new Race({ ...base, names: names(5), laps: 2, start: 'single', seed: 42 }));
    const b = runToEnd(new Race({ ...base, names: names(5), laps: 2, start: 'single', seed: 42 }));
    expect(a.standings().map((x) => [x.no, x.finish])).toEqual(b.standings().map((x) => [x.no, x.finish]));
  });

  it('é justa: com o mesmo cérebro, cada participante vence ~1/N das vezes', () => {
    const n = 6, races = 240, wins = new Array(n).fill(0);
    for (let k = 0; k < races; k++) wins[runToEnd(new Race({ ...base, names: names(n), laps: 2, start: 'single', seed: 100 + k })).standings()[0].no - 1]++;
    const exp = races / n, chi = wins.reduce((s, w) => s + (w - exp) ** 2 / exp, 0);
    expect(chi).toBeLessThan(20.5); // 5 graus de liberdade, p ≈ 0,001: só falha com viés de verdade
  }, 120_000);

  it('aguenta 30 participantes em 10 voltas', () => {
    const r = runToEnd(new Race({ ...base, names: names(30), laps: 10, start: 'grid', seed: 3 }));
    expect(r.phase).toBe('finished');
    expect(r.standings()[0].finish).not.toBeNull();
  }, 60_000);

  it('30 cores diferentes', () => {
    expect(new Set(Array.from({ length: 30 }, (_, i) => racerColor(i))).size).toBe(30);
  });
});
