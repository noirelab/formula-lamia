import { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, Minus, Timer, Video, Pause, Play, RotateCcw, Flag, Minimize } from 'lucide-react';
import { useDemo } from './useDemo';
import { CAMERA_ORDER } from './demo';
import { CAMERA_LABEL } from '../render/world3d';
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
        {d.view3d && d.gl && <small className="cam"><Video aria-hidden /> {d.gl.shotLabel.toLocaleUpperCase('pt-BR')}</small>}
      </section>


      {banner && race.phase === 'racing' && (
        <section key={banner.at} className={`bc-banner ${banner.kind}`} role="status">
          {banner.kind === 'fastest' ? <Timer aria-hidden /> : <i style={{ background: banner.racer.color }} />}
          <span className="t">{banner.kind === 'fastest' ? 'VOLTA MAIS RÁPIDA' : `VOLTA ${banner.lap} · LÍDER`}</span>
          <span className="n">{banner.racer.name}</span>
          <b>{num(banner.time)} s</b>
        </section>
      )}

      <BroadcastBar />
    </div>
  );
}

const SPEEDS = [1, 3, 10, 30];

/** Barra de controles por cima da transmissão: aparece ao mexer o mouse e some 3 s depois. */
function BroadcastBar() {
  const d = useDemo(), race = d.race!;
  const [shown, setShown] = useState(true);
  useEffect(() => {
    let timer = 0;
    const wake = () => { setShown(true); clearTimeout(timer); timer = window.setTimeout(() => setShown(false), 3000); };
    wake();
    window.addEventListener('pointermove', wake); window.addEventListener('keydown', wake);
    return () => { clearTimeout(timer); window.removeEventListener('pointermove', wake); window.removeEventListener('keydown', wake); };
  }, []);
  return (
    <nav className={`bc-bar${shown ? '' : ' hidden'}`} aria-label="Controles da corrida" onPointerEnter={() => setShown(true)}>
      <button className="btn icon" onClick={() => d.togglePause()} aria-label={d.paused ? 'Continuar' : 'Pausar'} title="Espaço">
        {d.paused ? <Play aria-hidden /> : <Pause aria-hidden />}
      </button>
      <div className="seg" role="group" aria-label="Velocidade">
        {SPEEDS.map((v, i) => <button key={v} aria-pressed={d.speed === v} onClick={() => d.setSpeed(v)} title={`Tecla ${i + 1}`}>{v}×</button>)}
      </div>
      <span className="sep" aria-hidden="true" />
      <div className="seg" role="group" aria-label="Vista">
        <button aria-pressed={!d.view3d} onClick={() => d.view3d && d.toggle3d()} title="Tecla V">2D</button>
        <button aria-pressed={d.view3d} onClick={() => !d.view3d && d.toggle3d()} disabled={!d.gl} title="Tecla V">3D</button>
      </div>
      <div className="seg" role="group" aria-label="Câmera">
        {CAMERA_ORDER.map((m) => (
          <button key={m} aria-pressed={d.view3d && d.gl?.camera3d === m} onClick={() => d.setCamera(m)} disabled={!d.gl} title="Tecla C">{CAMERA_LABEL[m]}</button>
        ))}
      </div>
      <span className="sep" aria-hidden="true" />
      <button className="btn" onClick={() => d.raceAgain()} title="Mesmos participantes, sorte nova"><RotateCcw aria-hidden /> {race.phase === 'finished' ? 'Correr de novo' : 'Reiniciar'}</button>
      <button className="btn" onClick={() => d.endRace()}><Flag aria-hidden /> Encerrar</button>
      <button className="btn icon" onClick={() => d.toggleBroadcast(false)} aria-label="Sair da tela cheia" title="T ou Esc"><Minimize aria-hidden /></button>
    </nav>
  );
}
