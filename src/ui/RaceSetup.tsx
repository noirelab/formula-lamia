import { useEffect, useRef, useState } from 'react';
import { Flag, Minus, Plus, X } from 'lucide-react';
import { useDemo, fmt } from './useDemo';
import { parseNames, type RaceConfig } from './demo';
import { racerColor } from '../engine/race';
import { CIRCUITS } from '../engine/circuits';

const LAPS = [3, 5, 10];

/** Folha "Corrida": participantes, largada, voltas, cérebro, circuito e prêmio. */
export function RaceSetup() {
  const d = useDemo();
  const ref = useRef<HTMLDialogElement>(null);
  const [cfg, setCfg] = useState<RaceConfig>(d.raceConfig);
  const set = (p: Partial<RaceConfig>) => setCfg((c) => ({ ...c, ...p }));

  useEffect(() => {
    const dlg = ref.current!;
    if (d.raceSetup && !dlg.open) { setCfg(d.raceConfig); dlg.showModal(); }
    if (!d.raceSetup && dlg.open) dlg.close();
  }, [d.raceSetup]);

  const typed = parseNames(cfg.names);
  const n = Math.min(30, Math.max(cfg.count, typed.length, 1));
  const rb = d.raceBrainFor(cfg.brain), best = d.raceBest, saved = d.saved;
  const canRace = !!rb && rb.laps >= 1;
  // volta ~ 30 s / (voltas em 30 s); a 1ª sai parada, e a classificação soma mais uma volta
  const lap = rb && rb.laps > 0 ? 30 / rb.laps : 0;
  const est = lap * (cfg.laps + (cfg.start === 'grid' ? 1 : 0)) + (cfg.start === 'grid' ? 8 : 5);
  const mmss = (t: number) => (t >= 60 ? `${Math.floor(t / 60)} min ${Math.round(t % 60)} s` : `${Math.round(t)} s`);

  return (
    <dialog ref={ref} className="race-setup" aria-labelledby="race-title"
      onClose={() => d.closeRaceSetup()}
      onClick={(e) => { if (e.target === e.currentTarget) d.closeRaceSetup(); }}>
      <form method="dialog" className="race-body" onSubmit={(e) => { e.preventDefault(); if (canRace) d.startRace(cfg); }}>
        <header className="race-head">
          <div>
            <h2 id="race-title">Corrida</h2>
            <p>Todos com o mesmo cérebro. Quem ganha é a sorte do motor de cada um.</p>
          </div>
          <button type="button" className="btn icon quiet" onClick={() => d.closeRaceSetup()} aria-label="Fechar"><X aria-hidden /></button>
        </header>

        <div className="race-grid">
          <section className="who">
            <h3>Participantes</h3>
            <div className="stepper">
              <button type="button" className="btn icon" onClick={() => set({ count: n - 1 })} disabled={n <= Math.max(1, typed.length)}
                aria-label="Menos um" title={typed.length > 1 ? 'Para ter menos, apague nomes da lista' : undefined}><Minus aria-hidden /></button>
              <output aria-live="polite">{n}</output>
              <button type="button" className="btn icon" onClick={() => set({ count: Math.min(30, n + 1) })} disabled={n >= 30} aria-label="Mais um"><Plus aria-hidden /></button>
            </div>
            <label className="names">
              <span>Nomes (opcional, um por linha)</span>
              <textarea rows={7} value={cfg.names} placeholder={'Ana\nBruno\nCarla'} spellCheck={false}
                onChange={(e) => set({ names: e.target.value })} />
            </label>
            <ul className="chips" aria-label="Carros">
              {Array.from({ length: n }, (_, i) => (
                <li key={i}><i style={{ background: racerColor(i) }} />{typed[i] ?? `Carro ${i + 1}`}</li>
              ))}
            </ul>
          </section>

          <section className="how">
            <h3>Largada</h3>
            <div className="options" role="radiogroup" aria-label="Largada">
              <button type="button" role="radio" aria-checked={cfg.start === 'grid'} onClick={() => set({ start: 'grid' })}>
                <strong>Grid com classificação</strong><span>Uma volta lançada decide quem larga na frente. Depois, as 5 luzes.</span>
              </button>
              <button type="button" role="radio" aria-checked={cfg.start === 'single'} onClick={() => set({ start: 'single' })}>
                <strong>Largada única</strong><span>Todos saem juntos do mesmo ponto. Mais rápida e 100% igual.</span>
              </button>
            </div>

            <h3>Voltas</h3>
            <div className="seg" role="group" aria-label="Voltas">
              {LAPS.map((v) => <button type="button" key={v} aria-pressed={cfg.laps === v} onClick={() => set({ laps: v })}>{v}</button>)}
            </div>

            <h3>Circuito</h3>
            <label className="pick">
              <span className="sr">Circuito</span>
              <select value={d.circuit ?? 'sorteada'} onChange={(e) => { d.setCircuit(e.target.value === 'sorteada' ? null : +e.target.value); d.openRaceSetup(); }}>
                {CIRCUITS.map((c, i) => <option key={c.id} value={i}>{c.name}</option>)}
                <option value="sorteada">Pista sorteada</option>
              </select>
            </label>

            <h3>Cérebro</h3>
            <div className="options" role="radiogroup" aria-label="Cérebro">
              <button type="button" role="radio" aria-checked={cfg.brain === 'best'} onClick={() => set({ brain: 'best' })} disabled={!best}>
                <strong>Melhor até agora</strong>
                <span>{best ? `Geração ${best.gen}: ${fmt(best.laps)} voltas em 30 s nesta pista.` : 'Treine pelo menos uma geração.'}</span>
              </button>
              <button type="button" role="radio" aria-checked={cfg.brain === 'saved'} onClick={() => set({ brain: 'saved' })} disabled={!saved}>
                <strong>Campeão guardado</strong>
                <span>{saved ? `Geração ${saved.gen}, guardado no Painel.` : 'Nenhum guardado no Painel.'}</span>
              </button>
            </div>

            <h3><label htmlFor="prize">Prêmio</label></h3>
            <input id="prize" className="text" value={cfg.prize} onChange={(e) => set({ prize: e.target.value })} maxLength={40} />
          </section>
        </div>

        <footer className="race-foot">
          {canRace
            ? <p>Duração estimada: <b>{mmss(est)}</b> em 1×.</p>
            : <p className="warn-text" role="alert">{rb ? `Esse cérebro ainda não completa uma volta nesta pista (${fmt(rb.laps)} em 30 s). Treine mais um pouco.` : 'Escolha um cérebro para correr.'}</p>}
          <button type="button" className="btn" onClick={() => d.closeRaceSetup()}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={!canRace}><Flag aria-hidden /> Largar</button>
        </footer>
      </form>
    </dialog>
  );
}
