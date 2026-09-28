// "Explicar a evolução": 7 folhas que o apresentador passa no próprio ritmo,
// sempre com os dados reais da última geração que terminou.
import type { Car, CarKind } from '../engine/car';
import { WORLD_W, WORLD_H, SENSOR_RANGE, MAX_SPEED, ELITE } from '../engine/params';
import { drawBrain, brainLayout, type Palette } from './brainRenderer';
import { drawCar, LEADER, ELITE_COLOR, CHILD, NAVY, TEAL, RED, MUTED, ORANGE_INK } from './worldRenderer';
import { INK } from './trackRenderer';

export interface Lesson {
  gen: number; // geração que terminou
  ranked: Car[]; // do melhor para o pior
  laps: (c: Car) => number;
  parents: Car[]; // pai A e pai B de um filho de exemplo
  parentRanks: number[]; // posições deles (0 = P1)
  child: Float32Array;
  mutated: number[]; // índices dos pesos que mudaram no filho
  fromB: Set<number>; // índices herdados do pai B
  pool: number; // quantos dos melhores podem ser pais
  elitism: boolean;
  kinds: CarKind[]; // composição da nova geração
}

export interface DeckView { slide: number; time: number; lesson: Lesson }

export const SLIDES = [
  { title: 'Enxergar', sub: 'Cada carro mede a distância até a borda em várias direções.' },
  { title: 'Decidir', sub: 'Uma rede neural transforma o que ele vê em volante e acelerador.' },
  { title: 'Classificação', sub: 'Acabaram os 30 segundos. Quem foi mais longe?' },
  { title: 'Escolha dos pais', sub: 'Só os melhores podem ter filhos. Quanto mais bem colocado, mais chance.' },
  { title: 'Cruzamento', sub: 'O filho herda cada conexão de um dos dois pais, sorteada uma a uma.' },
  { title: 'Mutação', sub: 'Algumas conexões do filho mudam um pouquinho, ao acaso.' },
  { title: 'Nova geração', sub: 'Todo mundo volta para a largada, com cérebros novos.' },
];

const DISPLAY = '"Saira Condensed", "Arial Narrow", system-ui, sans-serif';
const BODY = 'Saira, system-ui, sans-serif';
const TEXT = '#0B2239', SOFT = '#3C4F63', FAINT = '#C9D6E3';
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - (1 - t) ** 3);
const num = (n: number, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (p: number) => `${(p * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const carNo = (c: Car) => String(c.id).padStart(3, '0');
const sensorName = (rad: number) => {
  const deg = Math.round((rad * 180) / Math.PI);
  return deg === 0 ? 'frente' : `${Math.abs(deg)}° à ${deg < 0 ? 'esquerda' : 'direita'}`;
};

// Folha ocupando quase todo o palco
const L = 40, T = 28, W = WORLD_W - 80, H = WORLD_H - 56;

function text(x: CanvasRenderingContext2D, s: string, px: number, py: number, font: string, color: string, align: CanvasTextAlign = 'left') {
  x.font = font; x.fillStyle = color; x.textAlign = align; x.fillText(s, px, py); x.textAlign = 'left';
}

function frame(x: CanvasRenderingContext2D, d: DeckView) {
  const { title, sub } = SLIDES[d.slide];
  x.fillStyle = '#fff'; x.fillRect(0, 0, WORLD_W, WORLD_H); // o slide é a tela: papel inteiro
  text(x, String(d.slide + 1), L + 40, T + 74, `800 56px ${DISPLAY}`, ORANGE_INK);
  text(x, title, L + 84, T + 74, `800 56px ${DISPLAY}`, NAVY);
  text(x, sub, L + 40, T + 110, `500 23px ${BODY}`, SOFT);
  x.fillStyle = TEAL; x.fillRect(L + 40, T + 128, W - 80, 4);
  x.fillStyle = LEADER; x.fillRect(L + 40 + (W - 80) * 0.35, T + 135, (W - 80) * 0.65, 4);
}

/** 1. Os raios de verdade do melhor carro, e os números que eles viram. */
function see(x: CanvasRenderingContext2D, s: number, d: DeckView) {
  const car = d.lesson.ranked[0], { angles } = car.brain, k = 1.45, cx = L + 300, cy = T + 560;
  x.setLineDash([6, 8]); x.strokeStyle = FAINT; x.lineWidth = 2;
  x.beginPath(); x.arc(cx, cy, SENSOR_RANGE * k, Math.PI, 2 * Math.PI); x.stroke(); x.setLineDash([]);
  text(x, 'alcance máximo', cx, cy - SENSOR_RANGE * k - 10, `500 16px ${BODY}`, MUTED, 'center');
  angles.forEach((ang, i) => {
    const g = ease(d.time * 1.4 - i * 0.1), dist = car.sens[i], a = -Math.PI / 2 + ang;
    const ex = cx + Math.cos(a) * dist * k * g, ey = cy + Math.sin(a) * dist * k * g;
    x.strokeStyle = NAVY; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(ex, ey); x.stroke();
    if (g >= 1 && dist < SENSOR_RANGE) { x.fillStyle = LEADER; x.beginPath(); x.arc(ex, ey, 8, 0, Math.PI * 2); x.fill(); }
  });
  drawCar(x, s, { x: cx, y: cy, a: -Math.PI / 2 }, LEADER, 3.2);
  text(x, `Carro ${carNo(car)}, o P1`, cx, cy + 50, `700 22px ${DISPLAY}`, TEXT, 'center');

  const x0 = L + 640, rows = [...angles.map((a, i) => [sensorName(a), 1 - car.sens[i] / SENSOR_RANGE] as const), ['velocidade', car.v / MAX_SPEED] as const];
  text(x, 'O que ele vê vira números', x0, T + 186, `700 28px ${DISPLAY}`, NAVY);
  rows.forEach(([name, v], i) => {
    const y = T + 226 + i * 44, g = ease(d.time * 1.6 - 0.3 - i * 0.08);
    text(x, name, x0, y + 18, `500 20px ${BODY}`, i === rows.length - 1 ? ORANGE_INK : TEXT);
    x.fillStyle = '#E8EEF5'; x.fillRect(x0 + 170, y + 4, 210, 18);
    x.fillStyle = i === rows.length - 1 ? LEADER : NAVY; x.fillRect(x0 + 170, y + 4, 210 * Math.max(0, v) * g, 18);
    text(x, num(v * g), x0 + 440, y + 20, `700 22px ${DISPLAY}`, TEXT, 'right');
  });
  text(x, '1 = borda colada no carro  ·  0 = nada à vista', x0, T + 226 + rows.length * 44 + 22, `500 18px ${BODY}`, SOFT);
}

/** 2. A rede do melhor carro, com os valores do último instante na pista. */
function decide(x: CanvasRenderingContext2D, d: DeckView, pal: Palette) {
  const car = d.lesson.ranked[0], { layers, angles } = car.brain, bx = L + 300, by = T + 170, bw = 520, bh = 430;
  drawBrain(x, bx, by, bw, bh, { genome: car.genome, layers, acts: car.acts, maxR: 15, reveal: ease(d.time * 1.2) }, pal);
  const { pos } = brainLayout(bx, by, bw, bh, layers, 0, 15), inp = car.acts[0], out = car.acts[layers.length - 1];
  x.textBaseline = 'middle';
  pos[0].forEach(([px, py], i) => {
    const name = i < angles.length ? `sensor ${sensorName(angles[i])}` : 'velocidade';
    text(x, `${name}  ${num(inp[i])}`, px - 24, py, `500 18px ${BODY}`, TEXT, 'right');
  });
  const [p0, p1] = pos[layers.length - 1];
  text(x, `Volante ${num(out[0])}`, p0[0] + 26, p0[1] - 12, `700 24px ${DISPLAY}`, NAVY);
  text(x, out[0] < 0 ? 'vira à esquerda' : 'vira à direita', p0[0] + 26, p0[1] + 14, `500 18px ${BODY}`, SOFT);
  text(x, `Acelerador ${num(out[1])}`, p1[0] + 26, p1[1] - 12, `700 24px ${DISPLAY}`, NAVY);
  text(x, out[1] < 0 ? 'freia' : 'acelera', p1[0] + 26, p1[1] + 14, `500 18px ${BODY}`, SOFT);
  x.textBaseline = 'alphabetic';
  text(x, 'Cada linha é um peso, um número. Evoluir é achar bons números.', L + W / 2, T + H - 70, `600 21px ${BODY}`, TEXT, 'center');
}

/** 3. Top 6 da geração que acabou. */
function standings(x: CanvasRenderingContext2D, s: number, d: DeckView) {
  const { ranked, laps } = d.lesson, top = ranked.slice(0, 6), max = Math.max(0.1, laps(top[0]));
  top.forEach((c, i) => {
    const y = T + 168 + i * 66, g = ease(d.time * 2 - i * 0.12);
    x.globalAlpha = g;
    text(x, `P${i + 1}`, L + 40, y + 36, `800 36px ${DISPLAY}`, i === 0 ? ORANGE_INK : NAVY);
    x.fillStyle = INK.asphalt; x.beginPath(); x.roundRect(L + 110, y + 10, 56, 36, 5); x.fill();
    drawCar(x, s, { x: L + 138, y: y + 28, a: 0 }, i === 0 ? LEADER : c.kind === 'elite' ? ELITE_COLOR : CHILD, 1.5);
    text(x, `Carro ${carNo(c)}`, L + 186, y + 26, `600 23px ${BODY}`, TEXT);
    text(x, c.kind === 'elite' ? 'campeão copiado' : c.kind === 'child' ? 'filho com mutação' : 'cérebro sorteado', L + 186, y + 50, `500 16px ${BODY}`, SOFT);
    x.fillStyle = '#E8EEF5'; x.fillRect(L + 400, y + 22, W - 600, 14);
    x.fillStyle = i === 0 ? LEADER : NAVY; x.fillRect(L + 400, y + 22, (W - 600) * (laps(c) / max) * g, 14);
    text(x, `${num(laps(c), 1)} voltas`, L + W - 40, y + 36, `700 28px ${DISPLAY}`, NAVY, 'right');
    x.globalAlpha = 1;
  });
  text(x, `E os outros ${ranked.length - 6}? Foram menos longe. A distância é a nota de cada carro.`, L + 40, T + H - 70, `600 21px ${BODY}`, TEXT);
}

/** 4. Chance de cada posição virar pai (sorteio com peso) e os dois sorteados. */
function parents(x: CanvasRenderingContext2D, d: DeckView) {
  const { pool: n, parentRanks, elitism } = d.lesson;
  const prob = (i: number) => Math.sqrt((i + 1) / n) - Math.sqrt(i / n), pmax = prob(0);
  const x0 = L + 60, x1 = L + W - 60, base = T + 470, hmax = 250, bw = (x1 - x0) / n;
  text(x, 'chance de ser sorteado', x0, T + 186, `600 18px ${BODY}`, MUTED);
  for (let i = 0; i < n; i++) {
    const g = ease(d.time * 2.2 - i * 0.02), h = (prob(i) / pmax) * hmax * g, bx = x0 + i * bw;
    const who = parentRanks.indexOf(i);
    x.fillStyle = who === 0 ? NAVY : who === 1 ? LEADER : FAINT;
    x.fillRect(bx + 2, base - h, bw - 4, h);
    if (i === 0 || (i + 1) % 5 === 0 || who >= 0) text(x, `P${i + 1}`, bx + bw / 2, base + 24, `600 16px ${BODY}`, who >= 0 ? TEXT : MUTED, 'center');
    if (who >= 0 && d.time > 0.9) {
      text(x, who === 0 ? 'Pai A' : 'Pai B', bx + bw / 2, base - h - 14, `800 24px ${DISPLAY}`, who === 0 ? NAVY : ORANGE_INK, 'center');
    }
  }
  x.fillStyle = TEXT; x.fillRect(x0, base, x1 - x0, 2);
  const lines = [
    `A cada sorteio, P1 tem ${pct(prob(0))} de chance e P${n} só ${pct(prob(n - 1))}.`,
    `Quem ficou abaixo de P${n} não vira pai: seu cérebro some.`,
    ...(elitism ? [`Os ${ELITE} primeiros também passam direto para a próxima geração, sem mudar nada.`] : []),
  ];
  lines.forEach((l, i) => text(x, l, L + 40, base + 78 + i * 32, `500 21px ${BODY}`, TEXT));
}

/** 5. Filho pintado pela origem de cada conexão. */
function crossover(x: CanvasRenderingContext2D, d: DeckView, pal: Palette) {
  const { parents: [a, b], parentRanks, child, fromB } = d.lesson, layers = a.brain.layers;
  const bw = 270, bh = 330, by = T + 180;
  drawBrain(x, L + 50, by, bw, bh, { genome: a.genome, layers, acts: null, edgeColor: () => NAVY, maxR: 11 }, pal);
  drawBrain(x, L + W - 50 - bw, by, bw, bh, { genome: b.genome, layers, acts: null, edgeColor: () => LEADER, maxR: 11 }, pal);
  drawBrain(x, L + (W - bw) / 2, by, bw, bh, {
    genome: child, layers, acts: null, reveal: ease(d.time * 0.8), maxR: 11,
    edgeColor: (k) => (fromB.has(k) ? LEADER : NAVY),
  }, pal);
  const mid = by + bh / 2;
  const arrow = (x0: number, x1: number, color: string) => {
    x.strokeStyle = color; x.fillStyle = color; x.lineWidth = 5;
    x.beginPath(); x.moveTo(x0, mid); x.lineTo(x1, mid); x.stroke();
    const dir = Math.sign(x1 - x0);
    x.beginPath(); x.moveTo(x1 + dir * 12, mid); x.lineTo(x1 - dir * 4, mid - 11); x.lineTo(x1 - dir * 4, mid + 11); x.fill();
  };
  arrow(L + 50 + bw + 16, L + (W - bw) / 2 - 20, NAVY);
  arrow(L + W - 50 - bw - 16, L + (W + bw) / 2 + 20, LEADER);
  text(x, `Pai A · P${parentRanks[0] + 1}`, L + 50 + bw / 2, by + bh + 40, `800 26px ${DISPLAY}`, NAVY, 'center');
  text(x, `Pai B · P${parentRanks[1] + 1}`, L + W - 50 - bw / 2, by + bh + 40, `800 26px ${DISPLAY}`, ORANGE_INK, 'center');
  text(x, 'Filho', L + W / 2, by + bh + 40, `800 26px ${DISPLAY}`, TEXT, 'center');
  const nb = fromB.size, na = child.length - nb;
  text(x, `Das ${child.length} conexões, ${na} vieram do pai A e ${nb} do pai B. Como tirar cara ou coroa para cada uma.`, L + W / 2, T + H - 70, `600 21px ${BODY}`, TEXT, 'center');
}

/** 6. Conexões mutadas piscando, com exemplos de antes e depois. */
function mutation(x: CanvasRenderingContext2D, d: DeckView, pal: Palette) {
  const { parents: [a, b], child, mutated, fromB } = d.lesson, set = new Set(mutated);
  drawBrain(x, L + 60, T + 170, 560, 400, {
    genome: child, layers: a.brain.layers, acts: null, flash: set, pulse: (d.time * 1.6) % 1, edgeColor: () => '#9FB3C8', maxR: 13,
  }, pal);
  const x0 = L + 690;
  text(x, `${mutated.length} de ${child.length} mudaram`, x0, T + 196, `800 34px ${DISPLAY}`, RED);
  text(x, 'Exemplos:', x0, T + 240, `600 20px ${BODY}`, SOFT);
  mutated.slice(0, 4).forEach((k, i) => {
    const before = (fromB.has(k) ? b : a).genome[k], y = T + 284 + i * 44;
    x.globalAlpha = ease(d.time * 2 - 0.4 - i * 0.2);
    text(x, `conexão ${k + 1}:`, x0, y, `500 20px ${BODY}`, TEXT);
    text(x, `${num(before)}  →  ${num(child[k])}`, x0 + 170, y, `700 24px ${DISPLAY}`, RED);
    x.globalAlpha = 1;
  });
  text(x, 'Às vezes ajuda, às vezes atrapalha.', x0, T + 490, `500 21px ${BODY}`, TEXT);
  text(x, 'Sem mutação, os filhos só repetem', x0, T + 526, `500 21px ${BODY}`, TEXT);
  text(x, 'o que os pais já sabiam.', x0, T + 556, `500 21px ${BODY}`, TEXT);
}

/** 7. A nova população, carro por carro. */
function nextGen(x: CanvasRenderingContext2D, s: number, d: DeckView) {
  const { kinds } = d.lesson, cols = 15, cw = 44, ch = 30, gx = L + 50, gy = T + 176;
  const rows = Math.ceil(kinds.length / cols), scale = Math.min(1, 340 / (rows * ch)), color = (k: CarKind) => (k === 'elite' ? ELITE_COLOR : k === 'random' ? '#9FB3C8' : CHILD);
  x.fillStyle = INK.asphalt; x.beginPath(); x.roundRect(gx - 14, gy - 12, cols * cw + 28, rows * ch * scale + 24, 8); x.fill();
  const shown = d.time * 140;
  kinds.forEach((k, i) => {
    if (i > shown) return;
    drawCar(x, s, { x: gx + (i % cols) * cw + cw / 2, y: gy + Math.floor(i / cols) * ch * scale + (ch * scale) / 2, a: 0 }, color(k), 1.5 * scale);
  });
  const count = (k: CarKind) => kinds.filter((v) => v === k).length, x0 = L + cols * cw + 100;
  ([['elite', 'campeões copiados', 'sem mudança'], ['random', 'cérebros novos', 'sorteados do zero'], ['child', 'filhos', 'cruzamento + mutação']] as const)
    .filter(([k]) => count(k) > 0)
    .forEach(([k, name, how], i) => {
      const y = T + 200 + i * 96;
      x.fillStyle = INK.asphalt; x.beginPath(); x.roundRect(x0, y - 4, 50, 34, 5); x.fill();
      drawCar(x, s, { x: x0 + 25, y: y + 13, a: 0 }, color(k), 1.4);
      text(x, `${count(k)} ${name}`, x0 + 66, y + 18, `800 30px ${DISPLAY}`, NAVY);
      text(x, how, x0 + 66, y + 46, `500 18px ${BODY}`, SOFT);
    });
  text(x, `E tudo recomeça: mais 30 segundos na pista, geração ${d.lesson.gen + 1}.`, L + W / 2, T + H - 70, `600 21px ${BODY}`, TEXT, 'center');
}

/** Slide em tela cheia (canvas próprio, 1200 × 760 lógicos escalados por `s`). */
export function drawDeck(x: CanvasRenderingContext2D, s: number, d: DeckView, pal: Palette) {
  x.setTransform(s, 0, 0, s, 0, 0);
  frame(x, d);
  const brainPal: Palette = { ...pal, panel: '#fff', line: '#9FB3C8', ink: NAVY, pink: RED };
  x.globalAlpha = ease(d.time * 4);
  [() => see(x, s, d), () => decide(x, d, brainPal), () => standings(x, s, d), () => parents(x, d),
    () => crossover(x, d, brainPal), () => mutation(x, d, brainPal), () => nextGen(x, s, d)][d.slide]();
  x.globalAlpha = 1;
}
