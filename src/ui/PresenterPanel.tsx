import { useEffect, useRef, useState } from 'react';
import { X, Save, Upload, Download, Flag } from 'lucide-react';
import { useDemo, fmt } from './useDemo';
import type { SensorCount } from '../engine/params';

/**
 * Gaveta do apresentador: tudo que o público não precisa ver.
 * <dialog> nativo: prende o foco, fecha com Esc e escurece o fundo.
 */
export function PresenterPanel() {
  const d = useDemo();
  const s = d.sim.settings;
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingSensors, setPendingSensors] = useState<SensorCount | null>(null);
  const [seedText, setSeedText] = useState('');

  useEffect(() => {
    const dlg = ref.current!;
    if (d.panelOpen && !dlg.open) dlg.showModal();
    if (!d.panelOpen && dlg.open) dlg.close();
  }, [d.panelOpen]);

  return (
    <dialog ref={ref} className="panel" aria-labelledby="panel-title"
      onClose={() => d.setPanel(false)}
      onClick={(e) => { if (e.target === e.currentTarget) d.setPanel(false); }}>
      <div className="panel-body">
        <header className="panel-head">
          <h2 id="panel-title">Painel do apresentador</h2>
          <button className="btn icon quiet" onClick={() => d.setPanel(false)} aria-label="Fechar painel"><X aria-hidden /></button>
        </header>

        <section>
          <h3>Experimente mudar</h3>
          <p className="lead">Para o visitante curioso: mude uma coisa e veja se a evolução fica mais rápida ou mais lenta.</p>
          <div className="field">
            <label htmlFor="mut"><span>Mutação</span><output>{Math.round(s.mutationRate * 100)}%</output></label>
            <input id="mut" type="range" min={1} max={40} value={Math.round(s.mutationRate * 100)} onChange={(e) => d.setMutation(+e.target.value / 100)} />
            <p className="hint">Chance de cada conexão mudar. Pouca: aprende devagar. Muita: bagunça o que já sabia.</p>
          </div>
          <div className="field">
            <label htmlFor="pop"><span>Carros por geração</span><output>{s.population}</output></label>
            <input id="pop" type="range" min={50} max={300} step={10} value={s.population} onChange={(e) => d.setPopulation(+e.target.value)} />
            <p className="hint">Mais carros, mais chances de alguém acertar. Vale a partir da próxima geração.</p>
          </div>
          <div className="field">
            <div className="label-row"><span>Sensores</span></div>
            <div className="seg" role="group" aria-label="Número de sensores">
              {([3, 5, 7] as const).map((n) => (
                <button key={n} aria-pressed={s.sensors === n} onClick={() => setPendingSensors(n === s.sensors ? null : n)}>{n}</button>
              ))}
            </div>
            {pendingSensors ? (
              <div className="confirm" role="alert">
                <p>Mudar os sensores muda o cérebro. Os carros recomeçam do zero.</p>
                <div className="pair">
                  <button className="btn primary" onClick={() => { d.setSensors(pendingSensors); setPendingSensors(null); }}>Recomeçar com {pendingSensors}</button>
                  <button className="btn" onClick={() => setPendingSensors(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <p className="hint">Com menos sensores o carro enxerga menos. Será que ainda aprende?</p>
            )}
          </div>
          <div className="field">
            <label className="check">
              <input type="checkbox" checked={s.elitism} onChange={(e) => d.setElitism(e.target.checked)} />
              <span>Guardar os 4 campeões sem mudança</span>
            </label>
            <p className="hint">Desligado, todos sofrem mutação, e uma geração pode esquecer o que a anterior aprendeu.</p>
          </div>
        </section>

        <section>
          <h3>Cérebro campeão</h3>
          <p className="lead">{d.saved
            ? `Guardado: geração ${d.saved.gen}, ${fmt(d.saved.laps)} voltas em 30 s, ${d.saved.sensors} sensores.`
            : 'Nada guardado ainda. Treine em 30×, troque de pista algumas vezes e guarde o melhor.'}</p>
          <div className="stack">
            <button className="btn primary wide" onClick={() => { d.runChampion(); d.setPanel(false); }} disabled={!d.saved}>
              <Flag aria-hidden /> Correr com o campeão na próxima pista
            </button>
            <button className="btn wide" onClick={() => d.saveChampion()}><Save aria-hidden /> Guardar o melhor de agora</button>
            <p className="hint">{d.library.length ? `${d.library.length} ${d.library.length === 1 ? 'cérebro guardado' : 'cérebros guardados'}: escolha qual corre na folha Corrida (R).` : 'Os cérebros guardados aparecem na folha Corrida (R).'}</p>
            <div className="pair tight">
              <button className="btn" onClick={() => d.exportChampion()}><Download aria-hidden /> Exportar</button>
              <button className="btn" onClick={() => fileRef.current?.click()}><Upload aria-hidden /> Importar</button>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr" tabIndex={-1}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) d.importChampion(f); e.target.value = ''; }} />
          {d.message && <p className="note" role="status">{d.message}</p>}
        </section>

        <section>
          <h3>Repetir uma execução</h3>
          <p className="lead">A seed decide todos os sorteios. Mesma seed e mesma pista, mesma corrida.</p>
          <form className="seed" onSubmit={(e) => { e.preventDefault(); const n = parseInt(seedText, 10); if (n > 0) d.restart(n); }}>
            <span>Atual <b>{d.sim.seed}</b></span>
            <input type="number" min={1} placeholder="outra seed" aria-label="Seed para recomeçar" value={seedText} onChange={(e) => setSeedText(e.target.value)} />
            <button className="btn" type="submit">Recomeçar</button>
          </form>
        </section>

        <section>
          <h3>Atalhos</h3>
          <dl className="keys">
            <dt>Espaço</dt><dd>pausa</dd>
            <dt>1 a 4</dt><dd>velocidade</dd>
            <dt>E</dt><dd>explicar a evolução (→ ← passam as folhas)</dd>
            <dt>G</dt><dd>comparar gerações</dd>
            <dt>N</dt><dd>próxima pista</dd>
            <dt>V</dt><dd>vista 2D ou 3D</dd>
            <dt>C</dt><dd>câmera seguindo o líder</dd>
            <dt>F</dt><dd>tela cheia</dd>
            <dt>P</dt><dd>este painel</dd>
          </dl>
        </section>
      </div>
    </dialog>
  );
}
