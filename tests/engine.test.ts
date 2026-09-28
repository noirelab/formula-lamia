import { describe, it, expect } from 'vitest';
import { createRng } from '../src/engine/rng';
import { forward, createActivations, genomeLength, randomGenome } from '../src/engine/network';
import { nextGeneration } from '../src/engine/genetics';
import { generateCenterline, maxTurn, makeTrack, onTrack, centerlineFromDrawing, checkTrack, type Point } from '../src/engine/track';
import { Simulation } from '../src/engine/simulation';
import { TRACK_SPACING, layersFor, ELITE } from '../src/engine/params';

describe('rede', () => {
  const layers = layersFor(7);
  it('tem o tamanho certo de genoma', () => expect(genomeLength(layers)).toBe(10 * 9 + 2 * 11));
  it('dá saída determinística para genoma fixo', () => {
    const g = new Float32Array(genomeLength(layers)).map((_, i) => Math.sin(i) * 0.5);
    const run = () => {
      const acts = createActivations(layers);
      acts[0].set([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.5]);
      return Array.from(forward(g, layers, acts));
    };
    const a = run();
    expect(run()).toEqual(a);
    expect(a.every((v) => v > -1 && v < 1)).toBe(true);
    // genoma zerado: tanh(0) = 0
    const acts = createActivations(layers);
    expect(Array.from(forward(new Float32Array(g.length), layers, acts))).toEqual([0, 0]);
  });
  it('mesma seed, mesmo genoma', () => {
    expect(randomGenome(layers, createRng(7))).toEqual(randomGenome(layers, createRng(7)));
  });
});

describe('genética', () => {
  const layers = layersFor(7), rng = createRng(1);
  const ranked = Array.from({ length: 150 }, () => randomGenome(layers, rng));
  const opt = { population: 150, elitism: true, mutationRate: 0.1, layers };
  it('mantém o tamanho da população', () => {
    expect(nextGeneration(ranked, opt, rng).genomes).toHaveLength(150);
    expect(nextGeneration(ranked, { ...opt, population: 60 }, rng).genomes).toHaveLength(60);
  });
  it('preserva os campeões sem mudança', () => {
    const b = nextGeneration(ranked, opt, rng);
    for (let i = 0; i < ELITE; i++) { expect(b.genomes[i]).toEqual(ranked[i]); expect(b.kinds[i]).toBe('elite'); }
    expect(b.kinds.filter((k) => k === 'random')).toHaveLength(3);
  });
  it('sem elitismo, ninguém é copiado', () => {
    const b = nextGeneration(ranked, { ...opt, elitism: false }, rng);
    expect(b.kinds.includes('elite')).toBe(false);
    expect(b.genomes).toHaveLength(150);
  });
  it('não altera os pais', () => {
    const before = ranked.map((g) => new Float32Array(g));
    nextGeneration(ranked, { ...opt, mutationRate: 0.4 }, rng);
    expect(ranked).toEqual(before);
  });
});

describe('pista', () => {
  for (const seed of [1, 2, 3, 42]) {
    const center = generateCenterline(createRng(seed));
    it(`seed ${seed}: fechada e com espaçamento constante`, () => {
      const N = center.length;
      for (let i = 0; i < N; i++) {
        const [a, b] = [center[i], center[(i + 1) % N]];
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeCloseTo(TRACK_SPACING, 0);
      }
    });
    it(`seed ${seed}: curvas entre 40° e 60°`, () => {
      const t = maxTurn(center);
      expect(t).toBeGreaterThan(40); expect(t).toBeLessThan(60);
    });
    it(`seed ${seed}: linha central está na máscara`, () => {
      const tr = makeTrack(center);
      expect(center.every(([x, y]) => onTrack(tr, x, y))).toBe(true);
      expect(onTrack(tr, -5, 10)).toBe(false);
    });
  }
  const ellipse = (rx: number, ry: number, n = 80): Point[] =>
    Array.from({ length: n }, (_, i) => [600 + rx * Math.cos((i / n) * 6.283), 380 + ry * Math.sin((i / n) * 6.283)]);
  it('aceita desenho de oval', () => expect('center' in centerlineFromDrawing(ellipse(400, 250))).toBe(true));
  it('recusa desenho aberto', () => expect('error' in centerlineFromDrawing(ellipse(400, 250).slice(0, 50))).toBe(true));
  it('recusa pista que encosta nela mesma', () => {
    // oval achatado: os dois lados ficam a 40 unidades
    expect(checkTrack(generateCenterline(createRng(1)))).toBeNull();
    expect('error' in centerlineFromDrawing(ellipse(450, 20))).toBe(true);
  });
});

describe('aprendizado (protege a calibração)', () => {
  for (const seed of [11, 22, 33]) {
    it(`seed ${seed}: melhor carro passa de 2 voltas em 30 s até a geração 10`, () => {
      const sim = new Simulation(seed);
      while (sim.history.length < 15) {
        while (!sim.finished) sim.step();
        sim.evolve();
      }
      const best = sim.history.map((h) => +h.best.toFixed(2));
      console.log(`seed ${seed}:`, best.join(' '));
      expect(sim.history[0].best).toBeLessThan(1.5); // geração 1 não sabe dirigir
      expect(Math.max(...best.slice(0, 10))).toBeGreaterThan(2);
    }, 120_000);
  }
});

describe('curvas numeradas', () => {
  it('oval tem 2 curvas; pista sorteada tem várias', async () => {
    const { findCorners, resampleClosed } = await import('../src/engine/track');
    const oval = resampleClosed(Array.from({ length: 200 }, (_, i): [number, number] => {
      const a = (i / 200) * Math.PI * 2;
      return [600 + 450 * Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** 0.3, 380 + 250 * Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** 0.3];
    }), 8);
    const n = findCorners(oval).length;
    expect(n).toBeGreaterThanOrEqual(2); expect(n).toBeLessThanOrEqual(4);
    expect(findCorners(generateCenterline(createRng(3))).length).toBeGreaterThan(3);
  });
});

describe('circuitos F1 2026', () => {
  it('todos são pistas válidas, com curvas até 50°', async () => {
    const { CIRCUITS } = await import('../src/engine/circuits');
    const { circuitCenter } = await import('../src/engine/track');
    expect(CIRCUITS.length).toBeGreaterThanOrEqual(10);
    for (const c of CIRCUITS) {
      const center = circuitCenter(c);
      expect(checkTrack(center), c.name).toBeNull();
      expect(maxTurn(center), c.name).toBeLessThanOrEqual(50.5);
    }
  });
});

describe('comparar gerações', () => {
  it('mostra todas as gerações até a recordista', async () => {
    const { GhostRace } = await import('../src/engine/simulation');
    const sim = new Simulation(11);
    while (sim.history.length < 8) { while (!sim.finished) sim.step(); sim.evolve(); }
    const race = new GhostRace(sim);
    const bestGen = race.gens.length;
    // o recordista vai tão longe quanto qualquer outro campeão nesta pista
    for (let t = 1; t <= 1800; t++) race.step();
    const far = Math.max(...race.cars.map((c) => c.best));
    expect(race.cars[bestGen - 1].best).toBe(far);
    expect(race.roles[race.gens.indexOf(bestGen)]).toBe('best');
    expect(race.gens).toEqual(Array.from({ length: bestGen }, (_, i) => i + 1)); // todas até a recordista
    expect(race.cars).toHaveLength(bestGen);
  }, 60_000);
});
