// Gera src/engine/circuits.ts a partir dos traçados reais (GeoJSON de bacinger/f1-circuits, licença MIT).
// Uso: node --experimental-transform-types scripts/build-circuits.ts f1-circuits.geojson [saída.ts]
//
// Na escala da demo (1200 × 760, pista com 54 de largura), grampos reais são impossíveis e trechos
// paralelos se fundem. Cada traçado é suavizado só o necessário para passar em checkTrack.
import { readFileSync, writeFileSync } from 'node:fs';
import { resampleClosed, splineClosed, checkTrack, maxTurn, type Point } from '../src/engine/track.ts';
import { WORLD_W, WORLD_H } from '../src/engine/params.ts';

// Calendário 2026, na ordem das etapas.
const CALENDAR: [id: string, name: string][] = [
  ['au-1953', 'Albert Park · Austrália'],
  ['cn-2004', 'Xangai · China'],
  ['jp-1962', 'Suzuka · Japão'],
  ['bh-2002', 'Sakhir · Bahrein'],
  ['sa-2021', 'Jeddah · Arábia Saudita'],
  ['us-2022', 'Miami · Estados Unidos'],
  ['ca-1978', 'Gilles-Villeneuve · Canadá'],
  ['mc-1929', 'Mônaco'],
  ['es-1991', 'Barcelona-Catalunha · Espanha'],
  ['at-1969', 'Red Bull Ring · Áustria'],
  ['gb-1948', 'Silverstone · Grã-Bretanha'],
  ['be-1925', 'Spa-Francorchamps · Bélgica'],
  ['hu-1986', 'Hungaroring · Hungria'],
  ['nl-1948', 'Zandvoort · Holanda'],
  ['it-1922', 'Monza · Itália'],
  ['es-2026', 'Madring · Madri'],
  ['az-2016', 'Baku · Azerbaijão'],
  ['sg-2008', 'Marina Bay · Singapura'],
  ['us-2012', 'Circuito das Américas · Austin'],
  ['mx-1962', 'Hermanos Rodríguez · México'],
  ['br-1940', 'Interlagos · São Paulo'],
  ['us-2023', 'Las Vegas · Estados Unidos'],
  ['qa-2004', 'Lusail · Catar'],
  ['ae-2009', 'Yas Marina · Abu Dhabi'],
];

const MARGIN = 70;
// Curva máxima permitida. As pistas sorteadas vão até 60°, mas os circuitos reais têm mais curvas
// difíceis por volta; com 50° a população aprende em todas as seeds testadas (scripts/check-circuits.ts).
const TURN_LIMIT = Number(process.env.TURN_LIMIT ?? 50);
// Acima disso o traçado vira uma gota irreconhecível (Mônaco, Suzuka, Baku...): fica de fora.
const MAX_SMOOTHING = 450;

/** Gira e escala para ocupar o máximo da tela. */
function fit(pts: Point[]): Point[] {
  let best = { s: 0, a: 0, box: [0, 0, 0, 0] };
  for (let deg = 0; deg < 180; deg += 3) {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) {
      const rx = x * c - y * sn, ry = x * sn + y * c;
      x0 = Math.min(x0, rx); x1 = Math.max(x1, rx); y0 = Math.min(y0, ry); y1 = Math.max(y1, ry);
    }
    const s = Math.min((WORLD_W - 2 * MARGIN) / (x1 - x0), (WORLD_H - 2 * MARGIN) / (y1 - y0));
    if (s > best.s) best = { s, a, box: [x0, y0, x1, y1] };
  }
  const { s, a, box: [x0, y0, x1, y1] } = best, c = Math.cos(a), sn = Math.sin(a);
  const ox = WORLD_W / 2 - ((x0 + x1) / 2) * s, oy = WORLD_H / 2 - ((y0 + y1) / 2) * s;
  return pts.map(([x, y]) => [(x * c - y * sn) * s + ox, (x * sn + y * c) * s + oy]);
}

const smooth = (p: Point[]): Point[] => p.map((q, i) => {
  const u = p[(i - 1 + p.length) % p.length], v = p[(i + 1) % p.length];
  return [(u[0] + 2 * q[0] + v[0]) / 4, (u[1] + 2 * q[1] + v[1]) / 4];
});

const geo = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out: { id: string; name: string; ctrl: number[]; smoothing: number }[] = [];

for (const [id, name] of CALENDAR) {
  const f = geo.features.find((g: any) => g.properties.id === id);
  if (!f) { console.log(`${id}: não encontrado`); continue; }
  const coords: [number, number][] = f.geometry.coordinates;
  const lat0 = (coords.reduce((m, c) => m + c[1], 0) / coords.length) * (Math.PI / 180);
  let raw: Point[] = coords.map(([lon, lat]) => [lon * Math.cos(lat0) * 111320, -lat * 111320]);
  const [a, b] = [raw[0], raw[raw.length - 1]];
  if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1) raw.pop();

  let pts = resampleClosed(fit(raw), 4), ok: Point[] | null = null, it = 0;
  for (; it <= MAX_SMOOTHING; it++) {
    const ctrl = resampleClosed(pts, 24), center = splineClosed(ctrl);
    if (!checkTrack(center) && maxTurn(center) <= TURN_LIMIT) { ok = ctrl; break; }
    for (let k = 0; k < 4; k++) pts = smooth(pts);
    pts = resampleClosed(fit(pts), 4);
  }
  if (!ok) { console.log(`${name}: descartado (${checkTrack(splineClosed(resampleClosed(pts, 24)))})`); continue; }
  const center = splineClosed(ok);
  console.log(`${name}: ok, suavização ${it}, curva máx. ${maxTurn(center).toFixed(0)}°, ${center.length} pontos`);
  out.push({ id, name, ctrl: ok.flat().map((v) => Math.round(v * 10) / 10), smoothing: it });
}

const target = process.argv[3] ?? 'src/engine/circuits.ts';
if (target.endsWith('.json')) writeFileSync(target, JSON.stringify(out));
else writeFileSync(target, `// Gerado por scripts/build-circuits.ts. Não edite à mão.
// Traçados: bacinger/f1-circuits (MIT, © Tomislav Bacinger), suavizados para a escala da demo.
// ctrl = pontos de controle [x0, y0, x1, y1, ...] para splineClosed.
export interface CircuitData { id: string; name: string; ctrl: number[] }

export const CIRCUITS: CircuitData[] = [
${out.map((c) => `  { id: '${c.id}', name: '${c.name}', ctrl: [${c.ctrl.join(',')}] },`).join('\n')}
];
`);
