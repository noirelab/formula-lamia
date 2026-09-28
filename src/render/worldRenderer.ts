// Carros, sensores, fantasmas, transição entre gerações e traço de pista desenhada.
// Tudo em coordenadas do mundo (1200 × 760); `s` é a escala mundo → pixels do canvas.
import type { Car } from '../engine/car';
import type { Simulation, GhostRace } from '../engine/simulation';
import type { Point } from '../engine/track';
import { WORLD_W, SENSOR_RANGE } from '../engine/params';
import { drawPaper, INK } from './trackRenderer';

export const LEADER = '#F97A25', ELITE_COLOR = '#FFFFFF', CHILD = '#7FD3EE', SELECTED = '#FFFFFF';
export const NAVY = '#04497D', TEAL = '#0E85A8', RED = '#C8262C', MUTED = '#53667A', ORANGE_INK = '#B8520B';
const DISPLAY = '"Saira Condensed", "Arial Narrow", system-ui, sans-serif';

type Pose = { x: number; y: number; a: number };

export function drawCar(x: CanvasRenderingContext2D, s: number, c: Pose, color: string, size = 1) {
  const k = s * size, cs = Math.cos(c.a) * k, sn = Math.sin(c.a) * k;
  x.setTransform(cs, sn, -sn, cs, c.x * s, c.y * s);
  x.fillStyle = color; x.beginPath(); x.roundRect(-8.5, -4.25, 17, 8.5, 2.5); x.fill();
  x.fillStyle = 'rgba(4,20,40,.55)'; x.fillRect(2, -2.75, 3.5, 5.5);
  x.setTransform(s, 0, 0, s, 0, 0);
}

function drawSensors(x: CanvasRenderingContext2D, c: Car, color: string, p: Pose = c) {
  const { angles } = c.brain;
  x.strokeStyle = color; x.fillStyle = color; x.lineWidth = 1.5; x.globalAlpha = 0.75;
  for (let i = 0; i < angles.length; i++) {
    const ang = p.a + angles[i], d = c.sens[i], ex = p.x + Math.cos(ang) * d, ey = p.y + Math.sin(ang) * d;
    x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(ex, ey); x.stroke();
    if (d < SENSOR_RANGE) { x.beginPath(); x.arc(ex, ey, 3, 0, Math.PI * 2); x.fill(); }
  }
  x.globalAlpha = 1;
}

function ring(x: CanvasRenderingContext2D, px: number, py: number, r: number, color: string, w = 3) {
  x.strokeStyle = color; x.lineWidth = w; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.stroke();
}

function tag(x: CanvasRenderingContext2D, text: string, px: number, py: number, bg: string, fg = '#fff', size = 16) {
  x.font = `700 ${size}px ${DISPLAY}`;
  const w = x.measureText(text).width + size * 0.9, h = size * 1.4;
  const lx = Math.min(WORLD_W - w - 4, Math.max(4, px - w / 2)), ly = Math.max(4, py - h);
  x.fillStyle = bg; x.beginPath(); x.roundRect(lx, ly, w, h, 4); x.fill();
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, lx + w / 2, ly + h / 2 + 1);
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
}

export const carColor = (c: Car, leader: Car | null) => (c === leader ? LEADER : c.kind === 'elite' ? ELITE_COLOR : CHILD);

/** Treino: todos os carros vivos; `focus` (selecionado ou líder) com sensores. */
const tmp = { x: 0, y: 0, a: 0 };

export function drawWorld(x: CanvasRenderingContext2D, s: number, track: HTMLCanvasElement, sim: Simulation, selected: Car | null, alpha = 1) {
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.drawImage(track, 0, 0);
  x.setTransform(s, 0, 0, s, 0, 0);
  const leader = sim.leader, focus = selected ?? leader;
  for (const c of sim.cars) if (c.alive && c !== leader && c !== focus && c.kind !== 'elite') drawCar(x, s, c.poseAt(alpha, tmp), CHILD);
  for (const c of sim.cars) if (c.alive && c !== leader && c !== focus && c.kind === 'elite') drawCar(x, s, c.poseAt(alpha, tmp), ELITE_COLOR);
  if (leader?.alive && leader !== focus) drawCar(x, s, leader.poseAt(alpha, tmp), LEADER, 1.35);
  if (focus) {
    const p = { ...focus.poseAt(alpha, tmp) };
    if (focus.alive) drawSensors(x, focus, focus === leader ? LEADER : SELECTED, p);
    if (selected) {
      ring(x, p.x, p.y, 20, NAVY, 5); ring(x, p.x, p.y, 20, SELECTED, 2.5);
      tag(x, `Carro ${String(focus.id).padStart(3, '0')}`, p.x, p.y - 26, NAVY);
    }
    drawCar(x, s, p, carColor(focus, leader), 1.35);
  }
}

/** Cor do fantasma: cinza nas primeiras gerações, azul no meio, laranja na recordista. */
export function ghostColor(i: number, n: number, best: boolean) {
  if (best) return LEADER;
  const t = n <= 1 ? 1 : i / (n - 1), a = [0xB7, 0xC6, 0xD6], b = [0x2B, 0x9E, 0xD4];
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(',')})`;
}

/** Fantasmas: um carro por geração, da 1ª até a recordista. */
export function drawGhosts(x: CanvasRenderingContext2D, s: number, track: HTMLCanvasElement, race: GhostRace) {
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.drawImage(track, 0, 0);
  x.setTransform(s, 0, 0, s, 0, 0);
  const n = race.cars.length, bestIdx = race.roles.indexOf('best');
  // mortos embaixo, depois as gerações em ordem, recordista por cima de todos
  const order = race.cars.map((_, i) => i).sort((a, b) =>
    Number(race.cars[b].alive === false) - Number(race.cars[a].alive === false) || Number(a === bestIdx) - Number(b === bestIdx) || a - b);
  for (const i of order) {
    const c = race.cars[i], best = i === bestIdx;
    x.globalAlpha = c.alive ? 0.9 : 0.25;
    drawCar(x, s, c, ghostColor(i, n, best), best ? 2 : 1.5);
  }
  x.globalAlpha = 1;
  for (const i of order) {
    const c = race.cars[i], best = i === bestIdx, g = race.gens[i];
    if (best) tag(x, `Geração ${g} · recorde${c.alive ? '' : ' · bateu'}`, c.x, c.y - 20, c.alive ? LEADER : RED, c.alive ? '#0B2239' : '#fff', 19);
    else if (i === 0) tag(x, `Geração 1${c.alive ? '' : ' · bateu'}`, c.x, c.y - 16, c.alive ? NAVY : RED, '#fff', 16);
    else if (c.alive) tag(x, `G${g}`, c.x, c.y - 14, NAVY, '#fff', 13);
  }
}

/** Traço do visitante: ponto de partida marcado para saber onde fechar. */
export function drawStroke(x: CanvasRenderingContext2D, s: number, pts: Point[]) {
  x.setTransform(s, 0, 0, s, 0, 0);
  drawPaper(x);
  if (!pts.length) return;
  x.lineJoin = 'round'; x.lineCap = 'round';
  x.strokeStyle = INK.asphalt; x.lineWidth = 54;
  x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts) x.lineTo(p[0], p[1]);
  x.stroke();
  x.setLineDash([8, 8]); ring(x, pts[0][0], pts[0][1], 40, LEADER, 3); x.setLineDash([]);
  x.fillStyle = LEADER; x.beginPath(); x.arc(pts[0][0], pts[0][1], 8, 0, Math.PI * 2); x.fill();
}
