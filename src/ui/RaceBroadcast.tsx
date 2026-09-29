import { ChevronUp, ChevronDown, Minus, Timer, Video, X } from 'lucide-react';
import { useDemo } from './useDemo';
import { STEPS_PER_SECOND } from '../engine/params';
import type { Race, Racer } from '../engine/race';
import logo from '../assets/lamia-icon.webp';

const num = (n: number, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const clock = (t: number) => `${Math.floor(t / 60)}:${num(t % 60, 1).padStart(4, '0')}`;
const short = (name: string) => name.toLocaleUpperCase('pt-BR').slice(0, 12);

/** Diferença para o líder (ou intervalo para o carro da frente), como na torre da F1. */
function gapText(race: Race, st: Racer[], i: number, N: number, interval: boolean): string {
  const r = st[i], ref = interval ? st[i - 1] : st[0];
  if (r.penalty > 0) return 'SAIU';
  if (ref.finish !== null && r.finish !== null) return `+${num(r.finish - ref.finish, 1)}`;
  const behind = Math.max(0, ref.car.progress - r.car.progress), laps = Math.floor(behind / N);
  if (laps >= 1) return `+${laps} V`;
  const pace = Math.max(1, st[0].car.progress) / Math.max(1, race.raceT / STEPS_PER_SECOND);
  return `+${num(behind / pace, 1)}`;
}

/** Transmissão em tela cheia: torre de tempos, relógio, cartão do piloto e faixas de volta. */
export function RaceBroadcast() {
  const d = useDemo(), race = d.race;
  if (!race || !d.broadcast) return null;
  const st = race.standings(), N = d.sim.track.n, now = performance.now();
  const racing = race.phase === 'racing' || race.phase === 'finished';
  // alterna entre diferença para o líder e intervalo para o da frente a cada 8 s, como na TV
  const interval = racing && Math.floor(race.raceT / (8 * STEPS_PER_SECOND)) % 2 === 1;
  const focus = (d.selected && race.racers.find((r) => r.car === d.selected)) || st[0];
  const pos = st.indexOf(focus);
  const header = { qualifying: 'CLASSIFICAÇÃO', grid: 'GRID', lights: 'GRID', racing: `VOLTA ${race.lap}/${race.laps}`, finished: 'BANDEIRADA' }[race.phase];
  const banner = d.banner && now - d.banner.at < 4500 ? d.banner : null;

  return (
    <div className="broadcast" aria-live="off">
      <section className="bc-tower" aria-label="Classificação da corrida">
        <header>
          <img src={logo} alt="" />
          <strong>{header}</strong>
        </header>
        {racing && <div className="bc-mode">{interval ? 'INTERVALO' : 'DIFERENÇA P/ LÍDER'}</div>}
        <ol className={st.length > 20 ? 'dense' : ''}>
          {st.map((r, i) => {
            const memo = d.posMemo.get(r.no), fresh = race.phase === 'racing' && memo && memo.dir !== 0 && now - memo.at < 2000;
            const gained = racing ? r.grid - i : 0;
            return (
              <li key={r.no} className={[fresh ? (memo!.dir > 0 ? 'up' : 'down') : '', r === focus ? 'focus' : ''].join(' ')}
                onClick={() => d.selectCar(r.car)}>
                <span className="p">{i + 1}</span>
                <i style={{ background: r.color }} />
                <span className="n">{short(r.name)}</span>
                <span className="fl">{race.fastest?.racer === r && <Timer aria-label="volta mais rápida" />}</span>
                <span className="g">
                  {race.phase === 'qualifying' ? (r.qualTime !== null ? num(r.qualTime) : '—')
                    : !racing ? (r.qualTime !== null ? num(r.qualTime) : '')
                    : i === 0 ? (r.finish !== null ? clock(r.finish) : 'LÍDER') : gapText(race, st, i, N, interval)}
                </span>
                {racing && (
                  <span className={`c ${gained > 0 ? 'gain' : gained < 0 ? 'loss' : ''}`} aria-label={`${gained >= 0 ? 'ganhou' : 'perdeu'} ${Math.abs(gained)}`}>
                    {gained > 0 ? <ChevronUp aria-hidden /> : gained < 0 ? <ChevronDown aria-hidden /> : <Minus aria-hidden />}
                    {gained !== 0 && Math.abs(gained)}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="bc-clock" aria-label="Tempo de corrida">
        <span>{d.sim.track.name.toLocaleUpperCase('pt-BR')}</span>
        <strong>{racing ? clock(race.raceT / STEPS_PER_SECOND) : race.phase === 'qualifying' ? clock(race.phaseT / STEPS_PER_SECOND) : '0:00,0'}</strong>
        {race.fastest && <small><Timer aria-hidden /> {short(race.fastest.racer.name)} {num(race.fastest.time)} s</small>}
      </section>

      {race.phase === 'racing' && (
        <section className="bc-card" aria-label={`Piloto em destaque: ${focus.name}`}>
          <div className="bar" style={{ background: focus.color }} />
          <div className="who"><b>P{pos + 1}</b><span>{focus.name}</span></div>
          <dl>
            <div><dt>Última volta</dt><dd>{focus.lapTimes.length ? `${num(focus.lapTimes[focus.lapTimes.length - 1])} s` : '—'}</dd></div>
            <div><dt>Melhor volta</dt><dd className={race.fastest?.racer === focus ? 'purple' : ''}>{focus.bestLap !== null ? `${num(focus.bestLap)} s` : '—'}</dd></div>
            <div><dt>Largou</dt><dd>P{focus.grid + 1}</dd></div>
            <div><dt>Posições</dt><dd className={focus.grid - pos > 0 ? 'gain' : focus.grid - pos < 0 ? 'loss' : ''}>
              {focus.grid - pos > 0 ? `+${focus.grid - pos}` : focus.grid - pos}</dd></div>
            <div><dt>Saídas</dt><dd>{focus.respawns}</dd></div>
          </dl>
        </section>
      )}

      {banner && race.phase === 'racing' && (
        <section key={banner.at} className={`bc-banner ${banner.kind}`} role="status">
          {banner.kind === 'fastest' ? <Timer aria-hidden /> : <i style={{ background: banner.racer.color }} />}
          <span className="t">{banner.kind === 'fastest' ? 'VOLTA MAIS RÁPIDA' : `VOLTA ${banner.lap} · LÍDER`}</span>
          <span className="n">{banner.racer.name}</span>
          <b>{num(banner.time)} s</b>
        </section>
      )}

      <nav className="bc-controls" aria-label="Controles da transmissão">
        <button className="btn icon" onClick={() => d.toggleCamera()} aria-pressed={d.gl?.camera3d === 'chase'} title="Câmera no destaque (C)" aria-label="Câmera no destaque"><Video aria-hidden /></button>
        <button className="btn icon" onClick={() => d.toggleBroadcast(false)} title="Sair da transmissão (T ou Esc)" aria-label="Sair da transmissão"><X aria-hidden /></button>
      </nav>
    </div>
  );
}
