import { useDemo, chartRef, brainRef, fmt } from './useDemo';
import { carColor } from '../render/worldRenderer';
import { GEN_STEPS, STEPS_PER_SECOND } from '../engine/params';

const KIND = { elite: 'campeão', child: 'filho', random: 'novo' } as const;
const KIND_LONG = { elite: 'campeão copiado', child: 'filho com mutação', random: 'cérebro sorteado' } as const;

/** Torre de classificação: geração, top da sessão ao vivo, recordes, gráfico e cérebro. */
export function Tower() {
  const d = useDemo();
  const { sim } = d, N = sim.track.n, focus = d.focus, tab = d.present ? 'chart' : d.towerTab;
  // Na TV só 5 linhas: é o que cabe legível a 3 m ao lado do gráfico (PRODUCT.md, princípio 1).
  const rows = [...sim.cars].sort((a, b) => Number(b.alive) - Number(a.alive) || b.best - a.best).slice(0, d.present ? 5 : 8);
  const secs = Math.floor(sim.t / STEPS_PER_SECOND), total = GEN_STEPS / STEPS_PER_SECOND;

  return (
    <aside className="tower">
      <section className="gen-block">
        <div className="gen-head">
          <span>Geração</span>
          <span className="timer">{secs} s de {total}</span>
        </div>
        <div className="gen">{sim.gen}</div>
        <div className="clock" aria-hidden="true"><div style={{ width: `${(sim.t / GEN_STEPS) * 100}%` }} /></div>
      </section>

      <section>
        <div className="st-title"><h2>Classificação ao vivo</h2><span>voltas</span></div>
        <ol className="standings">
          {rows.map((c, i) => (
            <li key={c.id} className={c.alive ? (c === d.selected ? 'sel' : '') : 'out'}>
              <button onClick={() => d.selectCar(c)} aria-label={`Ver o cérebro do carro ${c.id}`}>
                <span className="pos">{i + 1}</span>
                <i className="swatch" style={{ background: carColor(c, sim.leader) }} />
                <span className="car">Carro {String(c.id).padStart(3, '0')}</span>
                <span className="kind">{c.alive ? KIND[c.kind] : 'bateu'}</span>
                <span className="dist">{fmt(Math.max(0, c.best) / N)}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="count full-only">{sim.alive} de {sim.cars.length} carros na pista</p>
      </section>

      <section className="stats">
        <div><b>{fmt(sim.record)}</b><small>recorde em voltas</small></div>
        <div><b>{sim.bestLap === null ? '–' : `${fmt(sim.bestLap)} s`}</b><small>melhor volta</small></div>
      </section>

      <section className="tabbed">
        <div className="tabs full-only" role="tablist" aria-label="Painel da torre">
          <button role="tab" aria-selected={tab === 'chart'} onClick={() => d.setTowerTab('chart')}>Evolução</button>
          <button role="tab" aria-selected={tab === 'brain'} onClick={() => d.setTowerTab('brain')}>
            {d.selected ? `Cérebro do carro ${String(d.selected.id).padStart(3, '0')}` : 'Cérebro do líder'}
          </button>
        </div>
        <div role="tabpanel" hidden={tab !== 'chart'}>
          <h2 className="present-only">Evolução por geração</h2>
          <canvas className="small" id="chart" ref={chartRef} role="img" aria-label="Gráfico de voltas por geração" />
          <div className="key"><span><i className="k-best" />melhor carro</span><span><i className="k-avg" />média</span><span className="unit">voltas em 30 s</span></div>
        </div>
        <div role="tabpanel" hidden={tab !== 'brain'}>
          {focus && <span className={`tag ${focus.kind}`}>{KIND_LONG[focus.kind]}</span>}
          <canvas className="small" id="brain" ref={brainRef} role="img" aria-label="Rede neural do carro em destaque" />
          <p className="hint">Sensores entram à esquerda, volante e acelerador saem à direita. Clique num carro para ver o cérebro dele.</p>
        </div>
      </section>


    </aside>
  );
}
