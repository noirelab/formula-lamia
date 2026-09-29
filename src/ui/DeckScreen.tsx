import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useDemo, deckRef } from './useDemo';
import { SLIDES } from '../render/deckRenderer';
import logo from '../assets/lamia-icon.webp';

/**
 * "Explicar a evolução" como apresentação de slides: o slide ocupa a tela,
 * e a pista continua rodando numa miniatura no canto (o .stage é reposicionado pelo CSS).
 */
export function DeckScreen() {
  const d = useDemo(), deck = d.deck;
  return (
    <div className="deck-screen" hidden={!deck} role="dialog" aria-label="Explicar a evolução">
      <div className="deck-slide">
        <canvas ref={deckRef} onClick={() => d.deckStep(1)} role="img" aria-label={deck ? `Slide ${deck.slide + 1}: ${SLIDES[deck.slide].title}` : ''} />
      </div>
      <aside className="deck-side">
        <header className="deck-brand">
          <img src={logo} alt="LAMIA" />
          <div>
            <strong>Formula LAMIA</strong>
            {deck && <span>Explicando a geração {deck.lesson.gen}</span>}
          </div>
        </header>
        <ol className="agenda">
          {SLIDES.map((s, i) => (
            <li key={s.title}>
              <button aria-current={deck?.slide === i ? 'step' : undefined} className={deck && i < deck.slide ? 'done' : ''} onClick={() => d.deckGo(i)}>
                <span className="n">{i + 1}</span>{s.title}
              </button>
            </li>
          ))}
        </ol>
        <div className="deck-nav">
          <button className="btn icon" onClick={() => d.deckStep(-1)} disabled={!deck || deck.slide === 0} aria-label="Slide anterior" title="←"><ChevronLeft aria-hidden /></button>
          <button className="btn primary" onClick={() => d.deckStep(1)} title="→ ou clique no slide">
            {deck && deck.slide === SLIDES.length - 1 ? 'Voltar à pista' : 'Próximo'} <ChevronRight aria-hidden />
          </button>
          <button className="btn icon quiet" onClick={() => d.closeDeck()} aria-label="Fechar apresentação" title="Esc"><X aria-hidden /></button>
        </div>
        <p className="live-label"><i aria-hidden="true" />Ao vivo · geração {d.sim.gen} · {d.sim.track.name}</p>
      </aside>
    </div>
  );
}
