import { useDemo } from './useDemo';
import { STEPS_PER_SECOND } from '../engine/params';
import type { Race, Racer } from '../engine/race';

const num = (n: number, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const clock = (t: number) => `${Math.floor(t / 60)}:${num(t % 60, 1).padStart(4, '0')}`;

/** Diferença para o líder: em voltas quando já tomou volta, senão em segundos pelo ritmo do líder. */
function gap(race: Race, r: Racer, lead: Racer, N: number): string {
  if (lead.finish !== null && r.finish !== null) return `+${num(r.finish - lead.finish)} s`;
  const behind = Math.max(0, lead.car.progress - r.car.progress), laps = Math.floor(behind / N);
  if (laps >= 1) return `+${laps} ${laps === 1 ? 'volta' : 'voltas'}`;
  const pace = Math.max(1, lead.car.progress) / Math.max(1, race.raceT / STEPS_PER_SECOND); // pontos por segundo
  return `+${num(behind / pace)} s`;
}

function detail(race: Race, r: Racer, i: number, lead: Racer, N: number): string {
  if (race.phase === 'qualifying') return r.qualTime !== null ? `${num(r.qualTime)} s` : 'na volta';
  if (race.phase === 'grid' || race.phase === 'lights') return i === 0 ? 'pole' : r.qualTime !== null ? `${num(r.qualTime)} s` : '';
  if (i === 0) return r.finish !== null ? clock(r.finish) : `volta ${Math.min(race.laps, r.car.laps + 1)}`;
  if (race.phase === 'finished' && r.finish === null) return 'não terminou';
  return gap(race, r, lead, N);
}

/** Torre de cronometragem da corrida (substitui a torre do treino). */
export function RaceTower() {
  const d = useDemo(), race = d.race!;
  const st = race.standings(), lead = st[0];
  const title = { qualifying: 'Classificação', grid: 'Grid de largada', lights: 'Grid de largada', racing: `Volta ${race.lap} de ${race.laps}`, finished: 'Resultado final' }[race.phase];

  return (
    <aside className={`tower race-tower${race.racers.length > 12 ? ' many' : ''}`}>
      <section className="gen-block">
        <div className="gen-head"><span>Corrida · {race.racers.length} {race.racers.length === 1 ? 'carro' : 'carros'}</span><span className="timer">sorte nº {race.seed}</span></div>
        <div className="race-title">{title}</div>
        <div className="clock" aria-hidden="true">
          <div style={{ width: `${race.phase === 'racing' || race.phase === 'finished' ? (Math.min(race.laps, lead.car.laps) / race.laps) * 100 : 0}%` }} />
        </div>
      </section>

      <section className="race-list">
        <ol className="standings">
          {st.map((r, i) => (
            <li key={r.no} className={[r.penalty > 0 ? 'out' : '', r.car === d.selected ? 'sel' : ''].join(' ')}>
              <button onClick={() => d.selectCar(r.car)} aria-label={`Seguir ${r.name}`}>
                <span className="pos">{i + 1}</span>
                <i className="swatch" style={{ background: r.color }} />
                <span className="car">{r.name}</span>
                <span className="kind">{r.penalty > 0 ? 'saiu da pista' : ''}</span>
                <span className="dist">{detail(race, r, i, lead, d.sim.track.n)}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}
