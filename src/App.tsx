import { useEffect } from 'react';
import { Stage } from './ui/Stage';
import { Tower } from './ui/Tower';
import { PresenterPanel } from './ui/PresenterPanel';
import { DeckScreen } from './ui/DeckScreen';
import { RaceSetup } from './ui/RaceSetup';
import { RaceTower } from './ui/RaceTower';
import { demo, useDemo, togglePresent } from './ui/useDemo';
import { SlidersHorizontal, Maximize, Minimize, Flag } from 'lucide-react';
import logo from './assets/lamia-icon.webp';

export default function App() {
  const d = useDemo();

  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement && demo.present) demo.setPresent(false); };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || el.closest('input, textarea')) return;
      if (demo.deck) { // apresentação aberta: setas e passador de slides navegam
        if (['ArrowRight', 'PageDown', 'Enter'].includes(e.key) || e.code === 'Space') { e.preventDefault(); demo.deckStep(1); return; }
        if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); demo.deckStep(-1); return; }
        if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') { demo.closeDeck(); return; }
      }
      if ((e.key === 'e' || e.key === 'E') && demo.mode !== 'race') { demo.openDeck(); return; }
      if (e.code === 'Space' && !el.closest('button')) { e.preventDefault(); demo.togglePause(); }
      else if (e.key === 'f' || e.key === 'F') togglePresent();
      else if (e.key === 'Escape' && demo.present) togglePresent();
      else if (['1', '2', '3', '4'].includes(e.key)) demo.setSpeed([1, 3, 10, 30][+e.key - 1]);
      else if ((e.key === 'n' || e.key === 'N') && demo.mode !== 'race') demo.newTrack();
      else if (e.key === 'v' || e.key === 'V') demo.toggle3d();
      else if (e.key === 'p' || e.key === 'P') demo.setPanel(!demo.panelOpen);
      else if (e.key === 'r' || e.key === 'R') demo.openRaceSetup();
      else if (e.key === 'c' || e.key === 'C') demo.toggleCamera();
      else if ((e.key === 'g' || e.key === 'G') && demo.mode !== 'race') (demo.mode === 'ghosts' ? demo.stopGhosts() : demo.startGhosts());
    };
    const ro = new ResizeObserver(() => demo.resize());
    document.querySelectorAll('canvas').forEach((c) => ro.observe(c));
    document.fonts?.ready.then(() => demo.resize());
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('keydown', onKey);
    return () => { ro.disconnect(); document.removeEventListener('fullscreenchange', onFs); window.removeEventListener('keydown', onKey); };
  }, []);

  return (
    <div className={`app${d.present ? ' present' : ''}${d.deck ? ' deck-open' : ''}`}>
      <header className="masthead">
        <img className="logo" src={logo} alt="LAMIA, Machine Learning for Industry" />
        <h1>A IA aprende a dirigir</h1>
        <div className="tools">
          <button className="btn primary" onClick={() => (d.mode === 'race' ? d.endRace() : d.openRaceSetup())} title="Tecla R">
            <Flag aria-hidden /> {d.mode === 'race' ? 'Encerrar corrida' : 'Corrida'}
          </button>
          <button className="btn" onClick={() => d.setPanel(true)} title="Tecla P"><SlidersHorizontal aria-hidden /> Painel</button>
          <button className="btn icon" onClick={togglePresent} title="Tela cheia (F)" aria-label={d.present ? 'Sair da tela cheia' : 'Tela cheia'}>
            {d.present ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
          </button>
        </div>
        <p className="lede">Nenhum destes {d.sim.cars.length} carros sabe dirigir. A cada 30 segundos, os melhores viram pais, e a próxima geração dirige melhor.</p>
      </header>
      <div className="brand-rule" aria-hidden="true"><i /><i /></div>
      <main className="board">
        <Stage />
        {d.race ? <RaceTower /> : <Tower />}
      </main>
      <PresenterPanel />
      <DeckScreen />
      <RaceSetup />
    </div>
  );
}
