// Corrida no 2D e etiquetas de nome (as etiquetas também vão por cima do 3D).
import type { Race, Racer } from '../engine/race';
import type { Car } from '../engine/car';
import { drawCar } from './worldRenderer';

const DISPLAY = '"Saira Condensed", "Arial Narrow", system-ui, sans-serif';
const tmp = { x: 0, y: 0, a: 0 };

export interface Tag { x: number; y: number; racer: Racer; lead: boolean }

/** Etiqueta com o nome na cor do participante. (x, y) no espaço atual do contexto. */
export function drawTags(x: CanvasRenderingContext2D, tags: Tag[], size: number) {
  x.textAlign = 'center'; x.textBaseline = 'middle';
  // líder por último, por cima dos outros
  for (const t of [...tags].sort((a, b) => Number(a.lead) - Number(b.lead))) {
    const fs = t.lead ? size * 1.25 : size;
    x.font = `700 ${fs}px ${DISPLAY}`;
    const text = t.lead ? `1º ${t.racer.name}` : t.racer.name;
    const w = x.measureText(text).width + fs * 0.8, h = fs * 1.4;
    x.globalAlpha = t.racer.penalty > 0 ? 0.5 : 1;
    x.fillStyle = t.racer.color; x.beginPath(); x.roundRect(t.x - w / 2, t.y - h, w, h, 4); x.fill();
    if (t.lead) { x.strokeStyle = '#0B2239'; x.lineWidth = 2; x.stroke(); }
    x.fillStyle = t.racer.ink; x.fillText(text, t.x, t.y - h / 2 + 1);
  }
  x.globalAlpha = 1; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
}

/** Corrida no mapa 2D: cada carro na sua cor; quem saiu da pista pisca durante a penalidade. */
export function drawRace2D(x: CanvasRenderingContext2D, s: number, track: HTMLCanvasElement, race: Race, alpha: number, blink: boolean, selected: Car | null) {
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.drawImage(track, 0, 0);
  x.setTransform(s, 0, 0, s, 0, 0);
  const st = race.standings(), lead = st[0], top = new Set(st.slice(0, 3)), tags: Tag[] = [];
  for (const r of race.racers) {
    if (r.penalty > 0 && blink) continue;
    const p = r.car.poseAt(alpha, tmp);
    drawCar(x, s, p, r.color, 1.3);
    // nomes só do pódio provisório (e do carro escolhido): com 30 juntos, viraria uma sopa de letras
    if (top.has(r) || r.car === selected) tags.push({ x: p.x, y: p.y - 12, racer: r, lead: r === lead && race.phase !== 'qualifying' });
  }
  drawTags(x, tags, 13);
}
