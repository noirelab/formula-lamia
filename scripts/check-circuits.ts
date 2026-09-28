// Quantas gerações cada circuito leva para alguém completar uma volta (2 seeds, 12 gerações).
// Uso: node --experimental-transform-types scripts/check-circuits.ts circuits.json
import { readFileSync } from 'node:fs';
import { Simulation } from '../src/engine/simulation.ts';
import { splineClosed, type Point } from '../src/engine/track.ts';

const data: { id: string; name: string; ctrl: number[] }[] = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const c of data) {
  const ctrl: Point[] = [];
  for (let i = 0; i < c.ctrl.length; i += 2) ctrl.push([c.ctrl[i], c.ctrl[i + 1]]);
  const res = [11, 22].map((seed) => {
    const sim = new Simulation(seed, {}, splineClosed(ctrl));
    while (sim.history.length < 12) { while (!sim.finished) sim.step(); sim.evolve(); }
    const b = sim.history.map((h) => h.best);
    return { first: b.findIndex((v) => v >= 1) + 1, g10: Math.max(...b.slice(0, 10)) };
  });
  console.log(`${c.id}\t${c.name}\tvolta na geração ${res.map((r) => r.first || '-').join('/')}\tmelhor até G10 ${res.map((r) => r.g10.toFixed(1)).join('/')}`);
}
