import { useDemo, worldRef, glRef } from './useDemo';
import { Tv, Pause, Play, RotateCcw, SkipForward, PenLine, Layers, Presentation, Video } from 'lucide-react';
import { CIRCUITS } from '../engine/circuits';
import { RaceOverlay } from './RaceOverlay';
import { LEADER, ELITE_COLOR, CHILD, ghostColor } from '../render/worldRenderer';

const SPEEDS = [1, 3, 10, 30];

export function Stage() {
  const d = useDemo();
  const { mode, sim } = d;

  return (
    <section className="stage-col" aria-label="Pista">
      <div className="stage-box">
      <div className="stage" data-mode={mode}>
        <canvas ref={glRef} className="gl" aria-hidden="true" />
        <canvas
          ref={worldRef}
          aria-label={`Mapa do circuito ${sim.track.name} com os carros treinando`}
          onPointerDown={(e) => {
            if (mode === 'draw') { e.currentTarget.setPointerCapture(e.pointerId); d.drawDown(e.nativeEvent); }
            else d.pick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => d.drawMove(e.nativeEvent)}
          onPointerUp={() => d.drawUp()}
          onPointerCancel={() => d.drawUp()}
        />

        {mode === 'draw' && !d.drawn && (
          <div className="overlay-top">
            <span className={d.drawError ? 'chip error' : 'chip'} role={d.drawError ? 'alert' : undefined}>
              {d.drawError || 'Desenhe sem soltar e termine no círculo laranja.'}
            </span>
            <button className="btn" onClick={() => d.cancelDraw()}>Cancelar</button>
          </div>
        )}
        {mode === 'draw' && d.drawn && (
          <div className="sheet-card" role="dialog" aria-label="Pista pronta">
            <h2>Pista pronta. E agora?</h2>
            <div className="stack">
              <button className="btn primary" onClick={() => d.useDrawn('keep')}>Os cérebros atuais tentam correr</button>
              <button className="btn" onClick={() => d.useDrawn('fresh')}>Treinar do zero nesta pista</button>
              <button className="btn" onClick={() => d.useDrawn('champion')} disabled={!d.saved}>O campeão salvo tenta correr</button>
              <button className="btn quiet" onClick={() => d.startDraw()}>Desenhar de novo</button>
            </div>
          </div>
        )}

        {mode === 'ghosts' && d.ghosts && (
          <div className="overlay-top">
            <span className="chip ghost-key">
              <span><i style={{ background: ghostColor(0, 2, false) }} />Geração 1</span>
              <i className="ramp" aria-hidden="true" style={{ background: `linear-gradient(90deg, ${ghostColor(0, 2, false)}, ${ghostColor(1, 2, false)}, ${LEADER})` }} />
              <span><i style={{ background: LEADER }} />Geração {d.ghosts.gens.length} · recorde</span>
            </span>
            <button className="btn primary" onClick={() => d.stopGhosts()}>Voltar ao treino</button>
          </div>
        )}

        <RaceOverlay />
        {d.paused && mode !== 'draw' && !d.deck && <div className="overlay-top"><span className="chip">Pausado. Espaço continua.</span></div>}
      </div>
      </div>

      <div className="caption">
        <strong>{mode === 'draw' ? 'Desenhe sua pista' : sim.track.name}</strong>
        {d.race ? (
          <ul className="legend" aria-label="Participantes">
            {d.race.racers.slice(0, 8).map((r) => <li key={r.no}><i style={{ background: r.color }} />{r.name}</li>)}
            {d.race.racers.length > 8 && <li>+{d.race.racers.length - 8}</li>}
          </ul>
        ) : (
        <ul className="legend" aria-label="Legenda">
          <li><i style={{ background: LEADER }} />Líder</li>
          <li><i style={{ background: ELITE_COLOR }} />Campeão copiado</li>
          <li><i style={{ background: CHILD }} />Filho com mutação</li>
        </ul>
        )}
      </div>

      <div className="bulletin-row">
        <p className="bulletin" aria-live="polite">{d.narration}</p>
        {mode === 'race' ? (
          <div className="actions full-only">
            <button className="btn primary" onClick={() => d.toggleBroadcast(true)} title="Tecla T"><Tv aria-hidden /> Tela cheia da corrida</button>
            <button className="btn" onClick={() => d.endRace()}>Encerrar corrida</button>
          </div>
        ) : (
        <div className="actions full-only">
          <button className="btn" onClick={() => (d.mode === 'ghosts' ? d.stopGhosts() : d.startGhosts())} disabled={!sim.history.length} title="Tecla G" aria-pressed={d.mode === 'ghosts'}>
            <Layers aria-hidden /> {d.mode === 'ghosts' ? 'Voltar ao treino' : 'Comparar gerações'}
          </button>
          <button className="btn primary" onClick={() => (d.deck ? d.closeDeck() : d.openDeck())} disabled={!d.lesson}
            title={d.lesson ? 'Tecla E' : 'Disponível quando a primeira geração terminar'}>
            <Presentation aria-hidden /> {d.deck ? 'Voltar à pista' : 'Explicar a evolução'}
          </button>
        </div>
        )}
      </div>

      <Dock />
    </section>
  );
}

/** Controles do apresentador, agrupados por assunto: corrida, pista, câmera, explicar. */
function Dock() {
  const d = useDemo();
  const chase = d.gl?.camera3d === 'chase';
  return (
    <div className="dock" role="toolbar" aria-label="Controles do apresentador">
      <div className="group" role="group" aria-labelledby="g-run">
        <span className="group-label" id="g-run">Corrida</span>
        <div className="group-row">
          <button className="btn icon" onClick={() => d.togglePause()} title="Espaço" aria-label={d.paused ? 'Continuar' : 'Pausar'}>
            {d.paused ? <Play aria-hidden /> : <Pause aria-hidden />}
          </button>
          <div className="seg" role="group" aria-label="Velocidade">
            {SPEEDS.map((v, i) => (
              <button key={v} aria-pressed={d.speed === v} onClick={() => d.setSpeed(v)} title={`Tecla ${i + 1}`}>{v}×</button>
            ))}
          </div>
          <button className="btn icon" onClick={() => d.restart()} title="Do zero: cérebros novos" aria-label="Recomeçar do zero" disabled={d.mode === 'race'}><RotateCcw aria-hidden /></button>
        </div>
      </div>

      <fieldset className="group" aria-labelledby="g-track" disabled={d.mode === 'race'}>
        <span className="group-label" id="g-track">Pista</span>
        <div className="group-row">
          <label className="pick">
            <span className="sr">Circuito</span>
            <select value={d.circuit ?? 'sorteada'} onChange={(e) => d.setCircuit(e.target.value === 'sorteada' ? null : +e.target.value)}>
              {CIRCUITS.map((c, i) => <option key={c.id} value={i}>{c.name}</option>)}
              <option value="sorteada">Pista sorteada</option>
            </select>
          </label>
          <button className="btn icon" onClick={() => d.newTrack()} title="Próxima pista (N)" aria-label="Próxima pista"><SkipForward aria-hidden /></button>
          <button className="btn icon" onClick={() => d.startDraw()} title="Desenhar uma pista" aria-label="Desenhar uma pista"><PenLine aria-hidden /></button>
        </div>
      </fieldset>

      <div className="group" role="group" aria-labelledby="g-view">
        <span className="group-label" id="g-view">Câmera</span>
        <div className="group-row">
          <div className="seg" role="group" aria-label="Vista">
            <button aria-pressed={!d.view3d} onClick={() => d.view3d && d.toggle3d()} title="Tecla V">2D</button>
            <button aria-pressed={d.view3d} onClick={() => !d.view3d && d.toggle3d()} disabled={!d.gl} title="Tecla V">3D</button>
          </div>
          <button className="btn" aria-pressed={chase} onClick={() => d.toggleCamera()} disabled={!d.gl || !d.view3d} title="Tecla C">
            <Video aria-hidden /> Seguir o líder
          </button>
        </div>
      </div>
    </div>
  );
}

