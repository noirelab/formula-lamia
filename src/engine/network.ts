// Rede feedforward com tanh em todas as camadas. Genoma = Float32Array com
// pesos e bias de cada neurônio em sequência: [w0..wn-1, bias] por neurônio.
import type { Rng } from './rng.ts';

export type Layers = number[];

export const genomeLength = (layers: Layers) =>
  layers.slice(1).reduce((s, n, i) => s + n * (layers[i] + 1), 0);

export function randomGenome(layers: Layers, rng: Rng): Float32Array {
  const g = new Float32Array(genomeLength(layers));
  for (let i = 0; i < g.length; i++) g[i] = rng.gauss();
  return g;
}

export const createActivations = (layers: Layers) => layers.map((n) => new Float32Array(n));

/** acts[0] já preenchido com as entradas; devolve a camada de saída. */
export function forward(g: Float32Array, layers: Layers, acts: Float32Array[]): Float32Array {
  let o = 0;
  for (let l = 1; l < layers.length; l++) {
    const nIn = layers[l - 1], nOut = layers[l], prev = acts[l - 1], cur = acts[l];
    for (let j = 0; j < nOut; j++) {
      const b = o + j * (nIn + 1);
      let s = g[b + nIn];
      for (let i = 0; i < nIn; i++) s += g[b + i] * prev[i];
      cur[j] = Math.tanh(s);
    }
    o += nOut * (nIn + 1);
  }
  return acts[layers.length - 1];
}
