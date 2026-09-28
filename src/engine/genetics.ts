// Seleção, cruzamento, mutação e elitismo.
import type { Rng } from './rng.ts';
import { randomGenome, type Layers } from './network.ts';
import type { CarKind } from './car.ts';
import { ELITE, RANDOMS, PARENT_FRACTION, PARENT_MIN, CROSSOVER_CHANCE, MUTATION_SIZE } from './params.ts';

export interface BreedOptions {
  population: number;
  elitism: boolean;
  mutationRate: number;
  layers: Layers;
}

/** Um filho de exemplo, para a animação de transição contar a história. */
export interface Lineage {
  index: number; // posição do filho na nova população
  parents: number[]; // posições no ranking da geração anterior
  mutated: number[]; // índices dos pesos que mudaram
  fromB: number[]; // índices dos pesos herdados do segundo pai
}

export interface Breeding {
  genomes: Float32Array[];
  kinds: CarKind[];
  example: Lineage | null;
}

export function crossover(a: Float32Array, b: Float32Array, rng: Rng, fromB?: number[]): Float32Array {
  const c = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) {
    if (rng.next() < 0.5) c[i] = a[i];
    else { c[i] = b[i]; fromB?.push(i); }
  }
  return c;
}

/** Muda cada peso com probabilidade `rate`. Devolve os índices alterados. */
export function mutate(g: Float32Array, rate: number, rng: Rng): number[] {
  const changed: number[] = [];
  for (let i = 0; i < g.length; i++) if (rng.next() < rate) { g[i] += rng.gauss() * MUTATION_SIZE; changed.push(i); }
  return changed;
}

/** `ranked`: genomas da geração anterior, do melhor para o pior. */
export function nextGeneration(ranked: Float32Array[], opt: BreedOptions, rng: Rng): Breeding {
  const genomes: Float32Array[] = [], kinds: CarKind[] = [];
  if (opt.elitism) for (let i = 0; i < Math.min(ELITE, ranked.length); i++) { genomes.push(ranked[i]); kinds.push('elite'); }
  for (let i = 0; i < RANDOMS; i++) { genomes.push(randomGenome(opt.layers, rng)); kinds.push('random'); }

  const pool = Math.min(ranked.length, Math.max(PARENT_MIN, Math.floor(ranked.length * PARENT_FRACTION)));
  const pick = () => Math.floor(rng.next() ** 2 * pool); // viés de ranking
  let example: Lineage | null = null;
  while (genomes.length < opt.population) {
    const a = pick();
    let child: Float32Array, parents: number[];
    const fromB: number[] = [];
    if (rng.next() < CROSSOVER_CHANCE) {
      const b = pick();
      child = crossover(ranked[a], ranked[b], rng, fromB); parents = [a, b];
    } else {
      child = new Float32Array(ranked[a]); parents = [a];
    }
    const mutated = mutate(child, opt.mutationRate, rng);
    if (!example && parents.length === 2 && parents[0] !== parents[1] && mutated.length) example = { index: genomes.length, parents, mutated, fromB };
    genomes.push(child); kinds.push('child');
  }
  return { genomes, kinds, example };
}
