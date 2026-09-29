import { useEffect, useRef, useState } from 'react';
import { Flag, Minus, Plus, X, Trash2, Save } from 'lucide-react';
import { useDemo, fmt } from './useDemo';
import { MAX_RACERS, newRacer, type RaceConfig } from './demo';
import { CIRCUITS } from '../engine/circuits';

const LAPS = [3, 5, 10];
const MAX_LAPS = 99;

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

  const n = cfg.racers.length;
  const list = useRef<HTMLOListElement>(null);
  /** Muda a quantidade: corta do fim ou completa com carros novos (cor padrão da posição). */
  const resize = (k: number) => {
    k = Math.min(MAX_RACERS, Math.max(1, Math.round(k) || 1));
    set({ racers: Array.from({ length: k }, (_, i) => cfg.racers[i] ?? newRacer(i)) });
  };
  const edit = (i: number, p: Partial<RaceConfig['racers'][number]>) =>
    set({ racers: cfg.racers.map((r, j) => (j === i ? { ...r, ...p } : r)) });
  const focusName = (i: number) => {
    const get = () => list.current?.querySelectorAll<HTMLInputElement>('input[type=text]')[i];
    const el = get();
    if (el) el.focus(); else setTimeout(() => get()?.focus()); // carro recém-criado: espera o React desenhar
  };
  /** Colar vários nomes (um por linha) num campo preenche daquele em diante, criando carros se faltar. */
  const paste = (i: number, text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return false;
    const racers = [...cfg.racers];
    lines.slice(0, MAX_RACERS - i).forEach((name, k) => { racers[i + k] = { ...(racers[i + k] ?? newRacer(i + k)), name }; });
    set({ racers });
    return true;
  };
  const rb = d.raceBrainFor(cfg.brain), best = d.raceBest;
  const [keepName, setKeepName] = useState('');
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
              <button type="button" className="btn icon" onClick={() => resize(n - 1)} disabled={n <= 1} aria-label="Menos um"><Minus aria-hidden /></button>
              <input type="number" className="count-input" min={1} max={MAX_RACERS} value={n} aria-label="Quantidade de participantes"
                onChange={(e) => { if (e.target.value !== '') resize(+e.target.value); }} onFocus={(e) => e.target.select()} />
              <button type="button" className="btn icon" onClick={() => resize(n + 1)} disabled={n >= MAX_RACERS} aria-label="Mais um"><Plus aria-hidden /></button>
              <span className="hint">até {MAX_RACERS}</span>
            </div>
            <ol className="racers" ref={list} aria-label="Carros">
              {cfg.racers.map((r, i) => (
                <li key={i}>
                  <span className="no">{i + 1}</span>
                  <input type="color" value={r.color} onChange={(e) => edit(i, { color: e.target.value })} aria-label={`Cor do carro ${i + 1}`} />
                  <input type="text" className="text" value={r.name} placeholder={`Carro ${i + 1}`} maxLength={24} spellCheck={false}
                    aria-label={`Nome do carro ${i + 1}`}
                    onChange={(e) => edit(i, { name: e.target.value })}
                    onPaste={(e) => { if (paste(i, e.clipboardData.getData('text'))) e.preventDefault(); }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault(); // Enter vai para o próximo nome, criando um carro no fim
                      if (i === n - 1 && n < MAX_RACERS) resize(n + 1);
                      focusName(i + 1);
                    }} />
                  <button type="button" className="btn icon quiet" disabled={n <= 1} aria-label={`Tirar ${r.name || `carro ${i + 1}`}`}
                    onClick={() => set({ racers: cfg.racers.filter((_, j) => j !== i) })}><X aria-hidden /></button>
                </li>
              ))}
            </ol>
            <p className="hint">Enter pula para o próximo nome. Colar uma lista (um nome por linha) preenche vários de uma vez.</p>
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
            <div className="laps-row">
              <div className="seg" role="group" aria-label="Voltas prontas">
                {LAPS.map((v) => <button type="button" key={v} aria-pressed={cfg.laps === v} onClick={() => set({ laps: v })}>{v}</button>)}
              </div>
              <label className="laps-custom">
                <span>ou</span>
                <input type="number" className="text" min={1} max={MAX_LAPS} step={1} value={cfg.laps} aria-label="Número de voltas"
                  onChange={(e) => { const v = Math.round(+e.target.value); if (v >= 1) set({ laps: Math.min(MAX_LAPS, v) }); }} />
                <span>voltas</span>
              </label>
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
              {d.library.map((b) => (
                <div className="kept" key={b.id}>
                  <button type="button" role="radio" aria-checked={cfg.brain === b.id} onClick={() => set({ brain: b.id })}>
                    <strong>{b.name}</strong>
                    <span>Guardado · {fmt(d.libraryLaps.get(b.id) ?? 0)} voltas em 30 s nesta pista{b.sensors !== 7 ? ` · ${b.sensors} sensores` : ''}</span>
                  </button>
                  <button type="button" className="btn icon quiet" onClick={() => { if (cfg.brain === b.id) set({ brain: 'best' }); d.removeBrain(b.id); }}
                    aria-label={`Apagar ${b.name}`} title="Apagar da biblioteca"><Trash2 aria-hidden /></button>
                </div>
              ))}
            </div>
            <div className="keep-row">
              <input className="text" value={keepName} onChange={(e) => setKeepName(e.target.value)} maxLength={40}
                placeholder={best ? `Geração ${best.gen} · ${d.sim.track.name.split(' · ')[0]}` : 'nome do cérebro'} aria-label="Nome para guardar o cérebro" />
              <button type="button" className="btn" disabled={!best} onClick={() => { const e = d.keepBrain(keepName); setKeepName(''); if (e) set({ brain: e.id }); }}>
                <Save aria-hidden /> Guardar o melhor de agora
              </button>
            </div>
            <p className="hint">Guardado fica neste computador para sempre. O padrão continua sendo o melhor treinado até agora.</p>

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
