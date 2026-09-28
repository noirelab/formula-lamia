// Desenha a pista uma vez num canvas offscreen (cache), como o mapa de um programa de corrida:
// papel quadriculado, fita de asfalto azul-grafite, zebra nas bordas e curvas numeradas.
import { findCorners, type Point, type Track } from '../engine/track';
import { WORLD_W, WORLD_H, TRACK_W } from '../engine/params';

export const INK = {
  paper: '#F4F7FB',
  grid: '#E1E9F2',
  gridBold: '#CCD9E7',
  navy: '#04497D',
  asphalt: '#22364D',
  kerb: '#C8262C',
  white: '#FFFFFF',
};

export function pathTrack(c: CanvasRenderingContext2D, center: Point[]) {
  c.beginPath();
  c.moveTo(center[0][0], center[0][1]);
  for (let i = 1; i < center.length; i++) c.lineTo(center[i][0], center[i][1]);
  c.closePath();
}

/** Papel quadriculado do mapa (também usado no modo desenhar). */
export function drawPaper(t: CanvasRenderingContext2D) {
  t.fillStyle = INK.paper; t.fillRect(0, 0, WORLD_W, WORLD_H);
  t.lineWidth = 1;
  for (let x = 0; x <= WORLD_W; x += 40) {
    t.strokeStyle = x % 200 ? INK.grid : INK.gridBold;
    t.beginPath(); t.moveTo(x + 0.5, 0); t.lineTo(x + 0.5, WORLD_H); t.stroke();
  }
  for (let y = 0; y <= WORLD_H; y += 40) {
    t.strokeStyle = y % 200 ? INK.grid : INK.gridBold;
    t.beginPath(); t.moveTo(0, y + 0.5); t.lineTo(WORLD_W, y + 0.5); t.stroke();
  }
}

export function renderTrack(track: Track, scale: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = Math.round(WORLD_W * scale); cv.height = Math.round(WORLD_H * scale);
  const t = cv.getContext('2d')!;
  t.scale(scale, scale);
  drawPaper(t);

  const { center } = track;
  t.lineJoin = 'round'; t.lineCap = 'round';
  // sombra suave da fita, como papel impresso levemente em relevo
  t.save();
  t.shadowColor = 'rgba(4,40,80,0.18)'; t.shadowBlur = 18; t.shadowOffsetY = 6;
  t.lineWidth = TRACK_W + 22; t.strokeStyle = INK.navy; pathTrack(t, center); t.stroke();
  t.restore();
  t.lineWidth = TRACK_W + 16; t.strokeStyle = INK.white; pathTrack(t, center); t.stroke();
  t.lineWidth = TRACK_W + 10; t.setLineDash([12, 12]); t.strokeStyle = INK.kerb; pathTrack(t, center); t.stroke(); t.setLineDash([]);
  t.lineWidth = TRACK_W; t.strokeStyle = INK.asphalt; pathTrack(t, center); t.stroke();
  t.lineWidth = 1.5; t.strokeStyle = 'rgba(255,255,255,0.22)'; t.setLineDash([10, 14]); pathTrack(t, center); t.stroke(); t.setLineDash([]);

  // Linha de largada quadriculada
  const [sx, sy] = center[0], sq = 6;
  t.save(); t.translate(sx, sy); t.rotate(track.startAngle);
  for (let k = -TRACK_W / 2, n = 0; k < TRACK_W / 2; k += sq, n++)
    for (let c = 0; c < 2; c++) { t.fillStyle = (n + c) % 2 ? '#0B1622' : '#fff'; t.fillRect(c * sq - sq, k, sq, sq); }
  t.restore();

  // Curvas numeradas do lado de fora
  const N = center.length;
  t.font = `700 15px "Saira Condensed", "Arial Narrow", sans-serif`;
  t.textAlign = 'center'; t.textBaseline = 'middle';
  findCorners(center).forEach((c, k) => {
    const a = center[(c.i - 2 + N) % N], b = center[(c.i + 2) % N], p = center[c.i];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    // normal à esquerda da direção; a curva vira para `sign`, o rótulo vai para o outro lado
    const nx = (dy / len) * c.sign, ny = (-dx / len) * c.sign;
    const off = TRACK_W / 2 + 30;
    const x = Math.min(WORLD_W - 16, Math.max(16, p[0] + nx * off)), y = Math.min(WORLD_H - 16, Math.max(16, p[1] + ny * off));
    t.fillStyle = INK.white; t.strokeStyle = INK.navy; t.lineWidth = 2;
    t.beginPath(); t.arc(x, y, 12, 0, Math.PI * 2); t.fill(); t.stroke();
    t.fillStyle = INK.navy; t.fillText(String(k + 1), x, y + 1);
  });
  t.textAlign = 'left'; t.textBaseline = 'alphabetic';
  return cv;
}
