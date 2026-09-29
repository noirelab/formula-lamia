// Calibra a sorte da corrida: treina um cérebro e roda muitas corridas por nível de tremido.
// Uso: node --experimental-transform-types scripts/check-race.ts [id-do-circuito] [gerações]
import { Simulation, bestChampion } from '../src/engine/simulation.ts';
import { Race, RACE, type StartMode } from '../src/engine/race.ts';
import { CIRCUITS } from '../src/engine/circuits.ts';
import { circuitCenter } from '../src/engine/track.ts';

const id = process.argv[2] ?? 'it-1922', gens = Number(process.argv[3] ?? 15);
const circuit = CIRCUITS.find((c) => c.id === id)!;
const sim = new Simulation(7, {}, circuitCenter(circuit), circuit.name);
while (sim.history.length < gens) { while (!sim.finished) sim.step(); sim.evolve(); }
const champ = bestChampion(sim)!;
console.log(`${circuit.name}: campeão da geração ${champ.gen}, ${champ.laps.toFixed(2)} voltas em 30 s sem sorte`);
if (champ.laps < 1) { console.error('O campeão ainda não completa uma volta: aumente as gerações (ex.: 20).'); process.exit(1); }

function run(n: number, start: StartMode, laps: number, races: number) {
  const wins = new Array(n).fill(0), gridWins = new Array(n).fill(0);
  let respawns = 0, dur = 0, unfinished = 0, gap12 = 0, gapLast = 0;
  for (let k = 0; k < races; k++) {
    const race = new Race({ names: Array.from({ length: n }, (_, i) => `C${i + 1}`), laps, start, genome: champ.genome, brain: sim.brain, track: sim.track, seed: 1000 + k });
    let guard = 0;
    while (race.phase !== 'finished' && guard++ < 400_000) race.step();
    const w = race.standings()[0];
    wins[w.no - 1]++; gridWins[w.grid]++;
    respawns += race.racers.reduce((s, r) => s + r.respawns, 0);
    dur += race.raceT / 60;
    unfinished += race.racers.filter((r) => r.finish === null).length;
    const st = race.standings(), fin = st.filter((r) => r.finish !== null);
    gap12 += (st[1]?.finish ?? st[0].finish!) - st[0].finish!;
    gapLast += fin[fin.length - 1].finish! - st[0].finish!;
  }
  const exp = races / n, chi = wins.reduce((s, w) => s + (w - exp) ** 2 / exp, 0);
  return {
    chi: chi.toFixed(1), df: n - 1,
    respawnPorCarroPorVolta: (respawns / races / n / laps).toFixed(2),
    duracao: `${(dur / races).toFixed(0)} s`,
    naoTerminou: `${((unfinished / races / n) * 100).toFixed(0)}%`,
    difP1P2: `${(gap12 / races).toFixed(2)} s`, difP1Ultimo: `${(gapLast / races).toFixed(1)} s`,
    poleVence: `${((gridWins[0] / races) * 100).toFixed(0)}% (justo: ${(100 / n).toFixed(0)}%)`,
  };
}

// argv[4]: amplitudes da sorte separadas por vírgula, ex.: 0.03,0.06,0.1
for (const spread of (process.argv[4] ?? '0.03,0.06,0.1').split(',').map(Number)) {
  RACE.luckSpread = spread;
  console.log(`sorte ${spread}`, 'única', JSON.stringify(run(6, 'single', 5, 150)));
  console.log(`sorte ${spread}`, 'grid ', JSON.stringify(run(6, 'grid', 5, 100)));
}
