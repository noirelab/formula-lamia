// Geração de pista, validação e máscara de colisão. Sem DOM: roda em Node.
import type { Rng } from './rng.ts';
import type { CircuitData } from './circuits.ts';
import {
  WORLD_W, WORLD_H, TRACK_W, TRACK_CONTROL_POINTS, TRACK_RADIUS_MIN, TRACK_SPACING,
  TRACK_TURN_MIN, TRACK_TURN_MAX, TRACK_TRIES,
} from './params.ts';

export type Point = [number, number];

export interface Track {
  name: string;
  center: Point[]; // linha central, pontos a cada TRACK_SPACING
  n: number;
  startAngle: number;
  mask: Uint8Array; // 1 = asfalto, WORLD_W × WORLD_H
}

export function perimeter(pts: Point[]): number {
  let per = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    per += Math.hypot(q[0] - p[0], q[1] - p[1]);
  }
  return per;
}

/** Reamostra um polígono fechado com espaçamento constante, inclusive no fechamento. */
export function resampleClosed(pts: Point[], spacing: number): Point[] {
  const per = perimeter(pts), count = Math.max(3, Math.round(per / spacing));
  spacing = per / count;
  const out: Point[] = [[pts[0][0], pts[0][1]]];
  let prev = pts[0], need = spacing;
  for (let i = 1; i <= pts.length && out.length < count; i++) {
    const b = pts[i % pts.length];
    let px = prev[0], py = prev[1], d = Math.hypot(b[0] - px, b[1] - py);
    while (d >= need && out.length < count) {
      const t = need / d;
      px += (b[0] - px) * t; py += (b[1] - py) * t;
      out.push([px, py]); d -= need; need = spacing;
    }
    need -= d; prev = b;
  }
  return out;
}

/** Catmull-Rom fechada pelos pontos de controle, reamostrada a cada TRACK_SPACING. */
export function splineClosed(ctrl: Point[]): Point[] {
  const K = ctrl.length, dense: Point[] = [];
  for (let i = 0; i < K; i++) {
    const p0 = ctrl[(i - 1 + K) % K], p1 = ctrl[i], p2 = ctrl[(i + 1) % K], p3 = ctrl[(i + 2) % K];
    for (let s = 0; s < 50; s++) {
      const t = s / 50, t2 = t * t, t3 = t2 * t;
      const f = (k: 0 | 1) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t
        + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      dense.push([f(0), f(1)]);
    }
  }
  return resampleClosed(dense, TRACK_SPACING);
}

/** Curva mais fechada da pista, em graus (ângulo entre segmentos a cada 4 pontos). */
export function maxTurn(center: Point[]): number {
  const N = center.length;
  let max = 0;
  for (let i = 0; i < N; i++) {
    const a = center[i], b = center[(i + 4) % N], c = center[(i + 8) % N];
    let d = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
    d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
    if (d > max) max = d;
  }
  return (max * 180) / Math.PI;
}

function randomCenterline(rng: Rng): Point[] {
  const K = TRACK_CONTROL_POINTS, cx = WORLD_W / 2, cy = WORLD_H / 2, rx = WORLD_W / 2 - 95, ry = WORLD_H / 2 - 85;
  let r: number[] = [];
  for (let i = 0; i < K; i++) r.push(TRACK_RADIUS_MIN + rng.next() * (1 - TRACK_RADIUS_MIN));
  r = r.map((v, i) => (v * 2 + r[(i + 1) % K] + r[(i + K - 1) % K]) / 4);
  const ctrl = r.map((v, i): Point => {
    const a = (i / K) * Math.PI * 2 + (rng.next() - 0.5) * 0.3;
    return [cx + Math.cos(a) * rx * v, cy + Math.sin(a) * ry * v];
  });
  return splineClosed(ctrl);
}

/** Sorteia pistas até achar uma com curvas desafiadoras, mas possíveis. */
export function generateCenterline(rng: Rng): Point[] {
  let center = randomCenterline(rng);
  for (let i = 1; i < TRACK_TRIES; i++) {
    const turn = maxTurn(center);
    if (turn > TRACK_TURN_MIN && turn < TRACK_TURN_MAX) break;
    center = randomCenterline(rng);
  }
  return center;
}

/** Máscara de colisão: círculos de raio TRACK_W/2 ao longo da linha central. */
export function buildMask(center: Point[]): Uint8Array {
  const mask = new Uint8Array(WORLD_W * WORLD_H), r = TRACK_W / 2, r2 = r * r;
  for (const [cx, cy] of center) {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(WORLD_W - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(WORLD_H - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy, row = y * WORLD_W;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= r2) mask[row + x] = 1;
      }
    }
  }
  return mask;
}

export function makeTrack(center: Point[], name = ''): Track {
  return {
    name,
    center,
    n: center.length,
    startAngle: Math.atan2(center[1][1] - center[0][1], center[1][0] - center[0][0]),
    mask: buildMask(center),
  };
}

export function onTrack(track: Track, x: number, y: number): boolean {
  const xi = x | 0, yi = y | 0;
  if (x < 0 || y < 0 || xi >= WORLD_W || yi >= WORLD_H) return false;
  return track.mask[yi * WORLD_W + xi] === 1;
}

/** Problema da pista, em linguagem de visitante, ou null se estiver boa. */
export function checkTrack(center: Point[]): string | null {
  if (center.length < 60) return 'Pista curta demais. Desenhe um circuito maior.';
  const m = TRACK_W / 2 + 6;
  if (center.some(([x, y]) => x < m || y < m || x > WORLD_W - m || y > WORLD_H - m))
    return 'A pista saiu da tela. Desenhe um pouco mais para dentro.';
  if (maxTurn(center) > TRACK_TURN_MAX) return 'Tem uma curva fechada demais. Nenhum carro consegue fazer. Tente curvas mais abertas.';
  // Pontos distantes no circuito não podem ficar perto: a pista se cruzaria ou encostaria nela mesma.
  const N = center.length, gap = TRACK_W + 14, skip = Math.ceil((gap * 2) / TRACK_SPACING);
  for (let i = 0; i < N; i++)
    for (let j = i + skip; j < N; j++) {
      if (N - (j - i) < skip) continue;
      if (Math.hypot(center[i][0] - center[j][0], center[i][1] - center[j][1]) < gap)
        return 'A pista cruza ou encosta nela mesma. Desenhe um circuito sem se cruzar.';
    }
  return null;
}

/** Traço do visitante (coordenadas do mundo) → linha central suavizada, ou erro. */
export function centerlineFromDrawing(raw: Point[]): { center: Point[] } | { error: string } {
  if (raw.length < 10) return { error: 'Desenhe um circuito inteiro, sem soltar.' };
  const [a, b] = [raw[0], raw[raw.length - 1]];
  if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 90) return { error: 'Feche o circuito: termine perto de onde começou.' };
  const per = perimeter(raw);
  if (per < 700) return { error: 'Pista curta demais. Desenhe um circuito maior.' };
  // ~24 pontos de controle suavizados com os vizinhos tiram o tremido da mão.
  let ctrl = resampleClosed(raw, per / 24);
  const K = ctrl.length;
  ctrl = ctrl.map((p, i): Point => {
    const u = ctrl[(i + K - 1) % K], v = ctrl[(i + 1) % K];
    return [(p[0] * 2 + u[0] + v[0]) / 4, (p[1] * 2 + u[1] + v[1]) / 4];
  });
  const center = splineClosed(ctrl);
  const error = checkTrack(center);
  return error ? { error } : { center };
}

export interface Corner {
  i: number; // índice do ápice na linha central
  sign: 1 | -1; // lado para onde a curva vira
}

/** Curvas numeradas como no mapa oficial: picos de curvatura, da largada em diante. */
export function findCorners(center: Point[], minTurnDeg = 14): Corner[] {
  const N = center.length, h = (i: number) => {
    const a = center[(i + N) % N], b = center[(i + 1 + N) % N];
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  };
  const turn = Array.from({ length: N }, (_, i) => {
    const d = h(i + 4) - h(i - 4);
    return Math.atan2(Math.sin(d), Math.cos(d));
  });
  const lim = (minTurnDeg * Math.PI) / 180, out: Corner[] = [];
  let s0 = 0;
  while (s0 < N && Math.abs(turn[s0]) >= lim) s0++; // começa fora de curva
  if (s0 === N) return out;
  let best = -1;
  for (let k = 1; k <= N; k++) {
    const j = (s0 + k) % N, inside = Math.abs(turn[j]) >= lim && k < N;
    const sameWay = best < 0 || Math.sign(turn[j]) === Math.sign(turn[best]);
    if (inside && sameWay) { if (best < 0 || Math.abs(turn[j]) > Math.abs(turn[best])) best = j; continue; }
    if (best >= 0) out.push({ i: best, sign: turn[best] > 0 ? 1 : -1 });
    best = inside ? j : -1; // curva em S: a próxima começa aqui
  }
  return out.sort((a, b) => a.i - b.i);
}

/** Linha central de um circuito real a partir dos pontos de controle gerados. */
export function circuitCenter(c: CircuitData): Point[] {
  const ctrl: Point[] = [];
  for (let i = 0; i < c.ctrl.length; i += 2) ctrl.push([c.ctrl[i], c.ctrl[i + 1]]);
  return splineClosed(ctrl);
}
