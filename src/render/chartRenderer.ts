// Gráfico por geração: voltas em 30 s do melhor carro e da média.
import type { GenRecord } from '../engine/simulation';
import type { Palette } from './brainRenderer';


export function drawChart(x: CanvasRenderingContext2D, w: number, h: number, history: GenRecord[], p: Palette, font = 13) {
  x.clearRect(0, 0, w, h);
  x.font = `${font}px Saira, system-ui, sans-serif`;
  if (history.length === 0) {
    x.fillStyle = p.muted; x.fillText('O gráfico aparece depois da 1ª geração.', 4, h / 2); return;
  }
  const maxY = Math.max(0.5, ...history.map((q) => q.best)) * 1.1;
  const pad = font * 2.2, bottom = h - font * 1.5, n = history.length;
  const X = (i: number) => pad + (n === 1 ? (w - pad - 6) / 2 : (i * (w - pad - 6)) / (n - 1));
  const Y = (v: number) => bottom - (v / maxY) * (bottom - font - 4);
  // pauta a cada volta inteira, como papel de cronometragem
  const step = maxY > 10 ? 2 : 1;
  x.fillStyle = p.muted; x.lineWidth = 1;
  for (let v = 0; v <= maxY; v += step) {
    x.strokeStyle = v ? '#E8EEF5' : p.line;
    x.beginPath(); x.moveTo(pad, Math.round(Y(v)) + 0.5); x.lineTo(w - 4, Math.round(Y(v)) + 0.5); x.stroke();
    x.fillText(String(v), 2, Y(v) + font * 0.35);
  }
  x.textAlign = 'right'; x.fillText(`geração ${n}`, w - 4, h - 2); x.textAlign = 'left';
  const plot = (key: 'best' | 'avg', color: string, lw: number) => {
    x.strokeStyle = color; x.lineWidth = lw; x.lineJoin = 'round'; x.beginPath();
    history.forEach((q, i) => (i ? x.lineTo(X(i), Y(q[key])) : x.moveTo(X(i), Y(q[key]))));
    x.stroke();
    x.fillStyle = color; x.beginPath(); x.arc(X(n - 1), Y(history[n - 1][key]), lw + 1, 0, Math.PI * 2); x.fill();
  };
  plot('avg', p.muted, font / 8);
  plot('best', p.accent, font / 5);
}
