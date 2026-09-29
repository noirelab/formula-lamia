import { Flag, RotateCcw, Settings2, LogOut } from 'lucide-react';
import { useDemo } from './useDemo';
import { STEPS_PER_SECOND } from '../engine/params';

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
      {phase === 'qualifying' && (
        <div className="overlay-top"><span className="chip">Volta de classificação · {Math.floor(race.phaseT / STEPS_PER_SECOND)} s</span></div>
      )}
      {(phase === 'grid' || phase === 'lights' || go) && (
        <div className="lights" role="status" aria-label={go ? 'Luzes apagadas: valendo!' : `${race.lightsOn} de 5 luzes acesas`}>
          <div className="gantry">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="pod"><i className={!go && i < race.lightsOn ? 'on' : ''} /><i className={!go && i < race.lightsOn ? 'on' : ''} /></div>
            ))}
          </div>
          <p>{go ? 'Valendo!' : phase === 'grid' ? `${st[0].name} larga na pole` : 'Atenção…'}</p>
        </div>
      )}
      {phase === 'racing' && !go && (
        <div className="overlay-top"><span className="chip lap-chip">{race.lap === race.laps ? 'Última volta' : `Volta ${race.lap} de ${race.laps}`}</span></div>
      )}
      {phase === 'finished' && <Podium />}
    </>
  );
}

function Podium() {
  const d = useDemo(), race = d.race!, st = race.standings(), [first, second, third] = st;
  const block = (r: typeof first | undefined, place: 1 | 2 | 3) => r && (
    <div className={`step p${place}`}>
      <span className="who" style={{ background: r.color, color: r.ink }}>{r.name}</span>
      <div className="plinth"><b>{place}º</b>{r.finish !== null && <small>{place === 1 ? clock(r.finish) : `+${num(r.finish - first.finish!)} s`}</small>}</div>
    </div>
  );
  return (
    <div className="podium" role="dialog" aria-label="Resultado da corrida">
      <Flag className="checkered" aria-hidden />
      <h2>{first.name} venceu!</h2>
      <p className="prize">Ganhou {d.raceConfig.prize}.</p>
      <div className="steps">{block(second, 2)}{block(first, 1)}{block(third, 3)}</div>
      {st.length > 3 && (
        <ol className="rest" start={4}>
          {st.slice(3).map((r) => <li key={r.no}><i style={{ background: r.color }} />{r.name}</li>)}
        </ol>
      )}
      <div className="podium-actions">
        <button className="btn primary" onClick={() => d.raceAgain()}><RotateCcw aria-hidden /> Correr de novo</button>
        <button className="btn" onClick={() => d.openRaceSetup()}><Settings2 aria-hidden /> Nova corrida</button>
        <button className="btn quiet" onClick={() => d.endRace()}><LogOut aria-hidden /> Voltar ao treino</button>
      </div>
    </div>
  );
}
