// Visualização da rede neural: conexões pelo peso, neurônios pela ativação.
import type { Layers } from '../engine/network';

export interface Palette { accent: string; cyan: string; muted: string; line: string; panel: string; ink: string; pink: string }

export interface BrainView {
  genome: Float32Array;
  layers: Layers;
  acts: Float32Array[] | null; // null = sem ativações (bolinhas apagadas)
  flash?: Set<number>; // pesos mutados, piscam
  pulse?: number; // 0..1, fase da piscada
  labels?: boolean; // "volante ← / →" e "acelera / freia"
  font?: number;
  /** Cor própria por conexão (ex.: de qual pai veio). null = cor normal pelo sinal do peso. */
  edgeColor?: (k: number) => string | null;
  reveal?: number; // 0..1: fração das conexões já desenhadas, da esquerda para a direita
  maxR?: number; // raio máximo das bolinhas (folhas grandes usam maior)
}

/** Onde fica cada neurônio: pos[camada][i] = [x, y]; r = raio da bolinha. */
export function brainLayout(left: number, top: number, w: number, h: number, layers: Layers, labelW = 0, maxR = 9) {
  const r = Math.max(4, Math.min(maxR, h / (Math.max(...layers) * 2.6)));
  const cols = layers.map((_, l) => left + r + 2 + (l / (layers.length - 1)) * (w - labelW - 2 * r - 4));
  const pos = layers.map((n, l) =>
    Array.from({ length: n }, (_, i): [number, number] => [cols[l], top + r + 2 + (n === 1 ? 0.5 : i / (n - 1)) * (h - 2 * r - 4)]));
  return { r, pos };
}

export function drawBrain(x: CanvasRenderingContext2D, left: number, top: number, w: number, h: number, v: BrainView, p: Palette) {
  const { layers, genome, acts } = v, font = v.font ?? 13;
  const { r, pos } = brainLayout(left, top, w, h, layers, v.labels ? font * 7.4 : 0, v.maxR);

  let o = 0;
  for (let l = 1; l < layers.length; l++) {
    const nIn = layers[l - 1], nOut = layers[l];
    for (let j = 0; j < nOut; j++) {
      const b = o + j * (nIn + 1);
      for (let i = 0; i < nIn; i++) {
        const k = b + i, wgt = genome[k];
        if (v.reveal !== undefined && k / genome.length > v.reveal) continue;
        const flash = v.flash?.has(k), own = v.edgeColor?.(k) ?? null;
        const beat = 0.5 + 0.5 * Math.sin((v.pulse ?? 0) * Math.PI * 2);
        x.strokeStyle = flash ? p.pink : own ?? (wgt > 0 ? p.accent : p.cyan);
        x.globalAlpha = flash ? 0.7 + 0.3 * beat : own ? 0.45 + Math.min(0.45, Math.abs(wgt) * 0.2) : Math.min(0.8, Math.abs(wgt) * 0.25);
        x.lineWidth = flash ? 3 + 2 * beat : Math.max(own ? 1 : 0, Math.min(3, Math.abs(wgt) * 0.9));
        x.beginPath(); x.moveTo(pos[l - 1][i][0], pos[l - 1][i][1]); x.lineTo(pos[l][j][0], pos[l][j][1]); x.stroke();
      }
    }
    o += nOut * (nIn + 1);
  }
  x.globalAlpha = 1;
  pos.forEach((col, l) => col.forEach(([px, py], i) => {
    const a = acts ? acts[l][i] : 0;
    x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2);
    x.fillStyle = p.panel; x.fill();
    x.globalAlpha = Math.min(1, Math.abs(a));
    x.fillStyle = a >= 0 ? p.accent : p.cyan; x.fill();
    x.globalAlpha = 1; x.strokeStyle = p.line; x.lineWidth = 1; x.stroke();
  }));

  if (v.labels && acts) {
    const out = pos[layers.length - 1], a = acts[layers.length - 1];
    x.fillStyle = p.ink; x.font = `600 ${font}px Saira, system-ui, sans-serif`; x.textBaseline = 'middle';
    x.fillText(a[0] < 0 ? 'vira à esquerda' : 'vira à direita', out[0][0] + r + 6, out[0][1]);
    x.fillText(a[1] < 0 ? 'freia' : 'acelera', out[1][0] + r + 6, out[1][1]);
    x.textBaseline = 'alphabetic';
  }
}
