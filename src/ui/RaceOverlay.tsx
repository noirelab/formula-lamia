import { Flag, RotateCcw, Settings2, LogOut, Tv, Play } from 'lucide-react';
import { useDemo } from './useDemo';
import { STEPS_PER_SECOND } from '../engine/params';
import logo from '../assets/lamia-icon.webp';

const num = (n: number, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const clock = (t: number) => `${Math.floor(t / 60)}:${num(t % 60, 1).padStart(4, '0')}`;

/** Semáforo, avisos de fase e pódio, por cima da pista. */
export function RaceOverlay() {
  const d = useDemo(), race = d.race;
  if (!race) return null;
  const st = race.standings(), phase = race.phase;
  const go = phase === 'racing' && race.raceT < 1.5 * STEPS_PER_SECOND;

  return (
    <>
      {phase === 'qualifying' && !d.broadcast && (
        <div className="overlay-top"><span className="chip">Volta de classificação · {Math.floor(race.phaseT / STEPS_PER_SECOND)} s</span></div>
      )}
      {race.waiting && phase === 'grid' && <StartingGrid />}
      {((phase === 'grid' && !race.waiting) || phase === 'lights' || go) && (
        <div className="lights" role="status" aria-label={go ? 'Luzes apagadas: valendo!' : `${race.lightsOn} de 5 luzes acesas`}>
          <div className="gantry">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="pod"><i className={!go && i < race.lightsOn ? 'on' : ''} /><i className={!go && i < race.lightsOn ? 'on' : ''} /></div>
            ))}
          </div>
          <p>{go ? 'Valendo!' : phase === 'grid' ? `${st[0].name} larga na pole` : 'Atenção…'}</p>
        </div>
      )}
      {phase === 'racing' && !go && !d.broadcast && (
        <div className="overlay-top"><span className="chip lap-chip">{race.lap === race.laps ? 'Última volta' : `Volta ${race.lap} de ${race.laps}`}</span></div>
      )}
      {phase === 'finished' && <Podium />}
    </>
  );
}

/** Grid formado depois da classificação: filas de dois, pole em destaque e o botão de largar. */
function StartingGrid() {
  const d = useDemo(), race = d.race!, st = race.standings(), pole = st[0];
  const time = (r: typeof pole, i: number) =>
    r.qualTime === null ? 'sem tempo' : i === 0 ? `${num(r.qualTime, 3)} s` : `+${num(r.qualTime - pole.qualTime!, 3)}`;
  return (
    <div className="grid-screen" role="dialog" aria-label="Grid de largada">
      <div className="gs-panel">
        <header>
          <img src={logo} alt="" />
          <strong>Grid de largada</strong>
          <span>{d.sim.track.name} · {race.laps} {race.laps === 1 ? 'volta' : 'voltas'}</span>
        </header>
        <ol className={`gs-slots${st.length > 16 ? ' dense' : ''}`}>
          {st.map((r, i) => (
            <li key={r.no} className={i === 0 ? 'pole' : undefined} style={{ '--c': r.color, '--k': i } as React.CSSProperties}>
              <b>{i + 1}</b>
              <span className="n">{r.name}</span>
              {i === 0 && <em>Pole</em>}
              <span className="t">{time(r, i)}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="gs-actions">
        <button className="gs-go" autoFocus onClick={() => d.releaseGrid()}><Play aria-hidden /> Iniciar corrida</button>
        <button className="gs-redo" onClick={() => d.raceAgain()} title="Mesmos participantes, sorte nova"><RotateCcw aria-hidden /> Refazer classificação</button>
      </div>
    </div>
  );
}

/** Resultado: pódio dos três primeiros, o resto em caixas e o que fazer depois. */
function Podium() {
  const d = useDemo(), race = d.race!, st = race.standings(), [first, second, third] = st;
  const gap = (r: typeof first) => (r.finish === null ? 'não terminou' : r === first ? clock(r.finish) : `+${num(r.finish - first.finish!)} s`);
  const block = (r: typeof first | undefined, place: 1 | 2 | 3) => r && (
    <div className={`step p${place}`}>
      <span className="who" style={{ background: r.color, color: r.ink }}>{r.name}</span>
      <div className="plinth"><b>{place}º</b><small>{gap(r)}</small></div>
    </div>
  );
  return (
    <div className={`grid-screen result${st.length > 12 ? " many" : ""}`} role="dialog" aria-label="Resultado da corrida">
      <div className="gs-panel">
        <header>
          <img src={logo} alt="" />
          <strong>Resultado final</strong>
          <span>{d.sim.track.name} · {race.laps} {race.laps === 1 ? 'volta' : 'voltas'}</span>
        </header>
        <section className="winner">
          <Flag aria-hidden />
          <h2>{first.name} venceu!</h2>
          <p>Ganhou {d.raceConfig.prize}.</p>
        </section>
        <div className="steps">{block(second, 2)}{block(first, 1)}{block(third, 3)}</div>
        {st.length > 3 && (
          <ol className={`gs-slots flat${st.length > 17 ? ' dense' : ''}`}>
            {st.slice(3).map((r, k) => (
              <li key={r.no} style={{ '--c': r.color, '--k': k } as React.CSSProperties}>
                <b>{k + 4}</b><span className="n">{r.name}</span><span className="t">{gap(r)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="gs-actions">
        <button className="gs-go" autoFocus onClick={() => d.raceAgain()}><RotateCcw aria-hidden /> Correr de novo</button>
        <button className="gs-redo" onClick={() => d.openRaceSetup()}><Settings2 aria-hidden /> Nova corrida</button>
        {!d.broadcast && <button className="gs-redo" onClick={() => d.toggleBroadcast(true)}><Tv aria-hidden /> Tela cheia</button>}
        <button className="gs-redo" onClick={() => d.endRace()}><LogOut aria-hidden /> Voltar ao treino</button>
      </div>
    </div>
  );
}
