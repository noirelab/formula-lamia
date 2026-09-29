// Controlador da demo: dono da simulação, do laço de animação e dos canvas.
// O React só lê o estado daqui (via subscribe) e chama as ações.
import { Simulation, GhostRace, bestChampion, lapsOn } from '../engine/simulation';
import { Race, type StartMode, type Racer } from '../engine/race';
import type { Brain } from '../engine/car';
import type { Car } from '../engine/car';
import { centerlineFromDrawing, circuitCenter, type Point, type Track } from '../engine/track';
import { CIRCUITS } from '../engine/circuits';
import { randomSeed } from '../engine/rng';
import { WORLD_W, WORLD_H, STEPS_PER_SECOND, layersFor, sensorAngles, type SensorCount } from '../engine/params';
import { renderTrack } from '../render/trackRenderer';
import { drawWorld, drawGhosts, drawStroke } from '../render/worldRenderer';
import { drawDeck, SLIDES, type DeckView, type Lesson } from '../render/deckRenderer';
import { PARENT_FRACTION, PARENT_MIN } from '../engine/params';
import { drawBrain, type Palette } from '../render/brainRenderer';
import { drawChart } from '../render/chartRenderer';
import { World3D } from '../render/world3d';
import { drawRace2D, drawTags, type Tag } from '../render/raceRenderer';
import { loadSaved, store, download, parseBrain, loadLibrary, storeLibrary, LIBRARY_MAX, type SavedBrain, type LibraryBrain } from './champion';

export type Mode = 'train' | 'ghosts' | 'draw' | 'race';

/** O que o apresentador escolheu na folha "Corrida". */
export interface RaceConfig {
  count: number; // participantes, 1 a 30
  names: string; // um por linha (opcional)
  laps: number;
  start: StartMode;
  brain: string; // 'best' = melhor até agora; senão, id de um cérebro da biblioteca
  prize: string;
}

/** Cérebro que vai correr: o melhor até agora nesta pista, avaliado quando a folha abre. */
export interface RaceBrain { genome: Float32Array; brain: Brain; gen: number; laps: number }

const brainOf = (b: SavedBrain): Brain => ({ layers: layersFor(b.sensors), angles: sensorAngles(b.sensors) });

export const parseNames = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 30);

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

const GEN_LINES = [
  (g: number) => `Geração ${g}: filhos dos carros que foram mais longe, com pequenas mudanças.`,
  () => 'Mutação é uma mudança pequena e ao acaso no cérebro. Às vezes ajuda, às vezes atrapalha.',
  () => 'Carros brancos são os campeões copiados. Os azuis são filhos com mutação.',
  () => 'Ninguém ensinou a fazer curva. Eles descobrem sozinhos, geração após geração.',
  () => 'Rede neural: uma conta com muitos números. A evolução vai ajustando esses números.',
];

// Circuito inicial: ?pista=<id> na URL, senão o padrão (o mais confiável nos testes de aprendizado).
export const DEFAULT_CIRCUIT = 'it-1922'; // Monza: 6 de 6 seeds completam volta até a geração 6
function circuitFromUrl(): number | null {
  const id = new URLSearchParams(location.search).get('pista') ?? DEFAULT_CIRCUIT;
  if (id === 'sorteada') return null;
  const i = CIRCUITS.findIndex((c) => c.id === id);
  return i < 0 ? CIRCUITS.findIndex((c) => c.id === DEFAULT_CIRCUIT) : i;
}

function seedFromUrl(): number | null {
  const s = Number(new URLSearchParams(location.search).get('seed'));
  return Number.isInteger(s) && s > 0 ? s : null;
}

const circuitTrack = (i: number | null) => (i === null ? { center: undefined, name: undefined } : { center: circuitCenter(CIRCUITS[i]), name: CIRCUITS[i].name });

export class Demo {
  circuit: number | null = circuitFromUrl(); // índice em CIRCUITS; null = pista sorteada
  sim = new Simulation(seedFromUrl() ?? randomSeed(), {}, circuitTrack(this.circuit).center, circuitTrack(this.circuit).name);
  speed = 1;
  paused = false;
  mode: Mode = 'train';
  present = false;
  view3d = true; // maquete 3D no treino; transição, fantasmas e desenho ficam em 2D
  gl: World3D | null = null;
  selected: Car | null = null;
  narration = '';
  lesson: Lesson | null = null; // dados da última geração que terminou, para explicar
  deck: DeckView | null = null; // apresentação aberta pelo apresentador (tecla E)
  ghosts: GhostRace | null = null;
  stroke: Point[] = [];
  drawing = false;
  drawError = '';
  drawn: Point[] | null = null; // pista desenhada esperando a escolha do visitante
  saved: SavedBrain | null = loadSaved();
  library: LibraryBrain[] = loadLibrary(); // cérebros guardados com nome, para correr quando quiser
  libraryLaps = new Map<string, number>(); // voltas de cada um na pista atual
  message = ''; // aviso curto no painel (salvo, arquivo inválido…)

  private holdUntil = 0;
  private ghostRest = 0;
  private world: CanvasRenderingContext2D | null = null;
  private brain: CanvasRenderingContext2D | null = null;
  private chart: CanvasRenderingContext2D | null = null;
  private deckCtx: CanvasRenderingContext2D | null = null;
  private scale = 1;
  private dpr = 1;
  private trackImg: HTMLCanvasElement | null = null;
  private trackOf: Track | null = null;
  private chartLen = -1;
  private palette: Palette = { accent: '#04497D', cyan: '#F97A25', muted: '#53667A', line: '#C9D6E3', panel: '#FFFFFF', ink: '#0B2239', pink: '#C8262C' };
  private listeners = new Set<() => void>();
  private version = 0;
  private frame = 0;
  private last = 0;
  private dt = 0;
  private owed = 0; // passos devidos: 60 por segundo × velocidade, em qualquer taxa de tela

  constructor() {
    requestAnimationFrame(this.tick);
  }

  // ---------- React ----------
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  getVersion = () => this.version;
  private notify() { this.version++; for (const fn of this.listeners) fn(); }

  // ---------- Canvas ----------
  attachDeck(cv: HTMLCanvasElement | null) { this.deckCtx = cv?.getContext('2d') ?? null; this.resize(); }

  attach(kind: 'world' | 'brain' | 'chart', cv: HTMLCanvasElement | null) {
    this[kind] = cv?.getContext('2d') ?? null;
    this.resize();
  }

  attachGL(cv: HTMLCanvasElement | null) {
    this.gl?.dispose(); this.gl = null;
    if (cv) {
      try { this.gl = new World3D(cv); } catch { this.view3d = false; } // sem WebGL: fica no 2D
    }
    this.resize();
  }

  /** 3D só no treino normal; as outras cenas são desenhadas no canvas 2D. */
  get showing3d() { return this.view3d && !!this.gl && (this.mode === 'train' || this.mode === 'race'); }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.world?.canvas;
    if (w && w.clientWidth) {
      if (this.showing3d) {
        // 3D ocupa a área inteira (qualquer proporção); o canvas 2D por cima só leva os nomes, em px de tela
        w.width = Math.round(w.clientWidth * this.dpr); w.height = Math.round(w.clientHeight * this.dpr);
      } else {
        const px = Math.min(Math.round(w.clientWidth * this.dpr), 3200); // teto: TV 4K não precisa de mais
        this.scale = px / WORLD_W;
        w.width = px; w.height = Math.round(WORLD_H * this.scale);
        this.trackOf = null;
      }
      this.gl?.resize(w.clientWidth, w.clientHeight, this.dpr);
    }
    for (const c of [this.brain, this.chart, this.deckCtx]) {
      if (!c?.canvas.clientWidth) continue;
      c.canvas.width = Math.round(c.canvas.clientWidth * this.dpr);
      c.canvas.height = Math.round(c.canvas.clientHeight * this.dpr);
    }
    this.chartLen = -1;
  }

  // ---------- Laço ----------
  private tick = (now: number) => {
    const dt = Math.min(0.1, (now - (this.last || now)) / 1000);
    this.last = now; this.dt = dt;
    if (this.deck) this.deck.time += dt; // a pista continua rodando na miniatura enquanto o slide está aberto
    if (!this.paused) {
      if (this.mode === 'train') this.advanceTrain(dt);
      else if (this.mode === 'ghosts') this.advanceGhosts(dt);
      else if (this.mode === 'race') this.advanceRace(dt);
    }
    this.readEvents();
    this.render();
    if (++this.frame % 6 === 0) this.notify(); // painel a ~10 Hz basta
    requestAnimationFrame(this.tick);
  };

  private advanceTrain(dt: number) {
    this.owed = Math.min(this.owed + dt * STEPS_PER_SECOND * this.speed, this.speed * 2);
    for (; this.owed >= 1; this.owed--) {
      this.sim.step();
      if (this.sim.finished) { this.endGeneration(); this.owed = 0; break; }
    }
  }

  private endGeneration() {
    const ranked = this.sim.ranked(), gen = this.sim.gen, N = this.sim.track.n;
    this.sim.evolve();
    this.selected = null;
    const l = this.sim.lineage;
    if (!l) return;
    if (!this.lesson) this.say(`Geração ${gen} terminou. Aperte E para explicar como a evolução funciona.`, true);
    this.lesson = {
      gen, ranked, laps: (c) => Math.max(0, c.best) / N,
      parents: l.parents.map((i) => ranked[i]), parentRanks: l.parents, child: this.sim.cars[l.index].genome,
      mutated: l.mutated, fromB: new Set(l.fromB),
      pool: Math.min(ranked.length, Math.max(PARENT_MIN, Math.floor(ranked.length * PARENT_FRACTION))),
      elitism: this.sim.settings.elitism, kinds: this.sim.cars.map((c) => c.kind),
    };
  }

  private advanceGhosts(dt: number) {
    const g = this.ghosts!;
    if (this.ghostRest > 0) {
      this.ghostRest -= dt;
      if (this.ghostRest <= 0) g.reset();
      return;
    }
    this.owed = Math.min(this.owed + dt * STEPS_PER_SECOND * this.speed, this.speed * 2);
    for (; this.owed >= 1; this.owed--) if (g.step()) { this.ghostRest = 2; this.owed = 0; break; }
  }

  private advanceRace(dt: number) {
    const r = this.race!;
    if (r.phase === 'finished') return;
    this.owed = Math.min(this.owed + dt * STEPS_PER_SECOND * this.speed, this.speed * 2);
    for (; this.owed >= 1 && (r.phase as string) !== 'finished'; this.owed--) r.step();
  }

  private readRaceEvents() {
    const r = this.race;
    if (!r) return;
    for (const e of r.drainEvents()) {
      if (e.type === 'phase') {
        if (e.phase === 'grid') this.say(`Grid formado: ${r.standings()[0].name} larga na pole!`, true);
        else if (e.phase === 'lights') this.say('Atenção às luzes…', true);
        else if (e.phase === 'racing') this.say('Luzes apagadas: valendo!', true);
        else if (e.phase === 'finished') this.say(`Fim de corrida! ${r.standings()[0].name} ganhou ${this.raceConfig.prize}!`, true);
      } else if (e.type === 'lead') this.say(`${e.racer.name} assume a liderança!`, true);
      else if (e.type === 'lap') this.say(e.lap === r.laps ? 'Última volta!' : `Volta ${e.lap} de ${r.laps}`, e.lap === r.laps);
      else if (e.type === 'finish' && e.pos === 1) this.say(`${e.racer.name} recebe a bandeirada em 1º!`, true);
      else if (e.type === 'respawn') this.say(`${e.racer.name} saiu da pista e volta com 1 s de penalidade.`);
      else if (e.type === 'fastest' && e.racer.lapTimes.length > 1) {
        this.banner = { kind: 'fastest', racer: e.racer, time: e.time, at: performance.now() };
        this.say(`Volta mais rápida: ${e.racer.name}, ${fmt(e.time)} s`);
      } else if (e.type === 'lapTime' && e.racer === r.standings()[0] && (!this.banner || performance.now() - this.banner.at > 4000))
        this.banner = { kind: 'lap', racer: e.racer, time: e.time, lap: e.lap, at: performance.now() };
    }
    this.trackPositions(r);
  }

  /** Posição de cada carro e quando mudou por último: a transmissão mostra setas de ganho e perda. */
  private trackPositions(r: Race) {
    if (r.phase !== 'racing' && r.phase !== 'finished') { this.posMemo.clear(); return; }
    // Só conta ultrapassagem que se sustenta por 1,5 s: carros colados trocam de ordem o tempo todo.
    const now = performance.now();
    r.standings().forEach((x, i) => {
      const m = this.posMemo.get(x.no);
      if (!m) { this.posMemo.set(x.no, { pos: i, dir: 0, at: 0, cand: i, since: now }); return; }
      if (i !== m.cand) { m.cand = i; m.since = now; }
      else if (i !== m.pos && now - m.since >= 1500) { m.dir = i < m.pos ? 1 : -1; m.pos = i; m.at = now; }
    });
  }

  private readEvents() {
    this.readRaceEvents();
    for (const e of this.sim.drainEvents()) {
      if (e.type === 'genStart') this.say(e.gen === 1 ? 'Os cérebros foram sorteados. Ninguém sabe dirigir ainda.' : GEN_LINES[(e.gen - 2) % GEN_LINES.length](e.gen));
      else if (e.type === 'firstLap') this.say(`Primeira volta completa na geração ${e.gen}!`, true);
      else if (e.type === 'bestLap') this.say(`Nova melhor volta: ${fmt(e.time)} s`, true);
    }
  }

  /** Narração: frases importantes ficam na tela pelo menos 3,5 s. */
  private say(text: string, important = false) {
    const now = performance.now();
    if (!important && now < this.holdUntil) return;
    this.narration = text;
    this.holdUntil = important ? now + 3500 : 0;
  }

  private render() {
    const x = this.world;
    if (x && x.canvas.width) {
      if (this.trackOf !== this.sim.track) { this.trackImg = renderTrack(this.sim.track, this.scale); this.trackOf = this.sim.track; }
      const s = this.scale, img = this.trackImg!;
      const blink = (this.frame >> 3) % 2 === 0; // carro em penalidade pisca
      if (this.mode === 'race' && this.race) this.renderRace(x, s, img, blink);
      else if (this.mode === 'draw') drawStroke(x, s, this.stroke);
      else if (this.mode === 'ghosts' && this.ghosts) drawGhosts(x, s, img, this.ghosts);
      else if (this.showing3d) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, x.canvas.width, x.canvas.height); this.gl!.render(this.sim, this.selected, this.dt, this.alpha); }
      else drawWorld(x, s, img, this.sim, this.selected, this.alpha);
    }
    const k = this.deckCtx;
    if (this.deck && k && k.canvas.width) drawDeck(k, k.canvas.width / WORLD_W, this.deck, this.palette);
    const b = this.brain, focus = this.focus;
    if (b && b.canvas.width && focus && this.frame % 3 === 0) {
      const { width, height } = b.canvas;
      b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, width, height);
      b.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      drawBrain(b, 0, 0, width / this.dpr, height / this.dpr,
        { genome: focus.genome, layers: focus.brain.layers, acts: focus.acts, labels: true }, this.palette);
    }
    const c = this.chart;
    if (c && c.canvas.width && this.chartLen !== this.sim.history.length) {
      this.chartLen = this.sim.history.length;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      drawChart(c, c.canvas.width / this.dpr, c.canvas.height / this.dpr, this.sim.history, this.palette, this.present ? 19 : 13);
    }
  }

  private renderRace(x: CanvasRenderingContext2D, s: number, img: HTMLCanvasElement, blink: boolean) {
    const race = this.race!, lead = race.standings()[0];
    if (!this.showing3d) { drawRace2D(x, s, img, race, this.alpha, blink, this.selected); return; }
    const byCar = new Map(race.racers.map((r) => [r.car, r] as const));
    const shown = race.racers.filter((r) => !(r.penalty > 0 && blink));
    this.gl!.renderScene({
      track: this.sim.track, cars: shown.map((r) => r.car), leader: lead.car, key: `race-${race.seed}`, sensors: false,
      color: (c) => byCar.get(c)!.color,
    }, this.selected, this.dt, this.alpha);
    // nomes por cima do 3D, no canvas 2D transparente
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, x.canvas.width, x.canvas.height);
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const tags: Tag[] = [], pose = { x: 0, y: 0, a: 0 }, chase = this.gl!.camera3d === 'chase';
    const top = new Set(race.standings().slice(0, 3));
    for (const r of shown) {
      if (!chase && !top.has(r) && r.car !== this.selected) continue; // visão geral: só o pódio provisório
      const p = r.car.poseAt(this.alpha, pose), q = this.gl!.project(p.x, p.y, 14);
      if (q) tags.push({ x: q[0], y: q[1], racer: r, lead: r === lead && race.phase !== 'qualifying' });
    }
    drawTags(x, tags, this.gl!.camera3d === 'chase' ? 15 : 12);
  }

  /** Fração do próximo passo já decorrida: a tela desenha entre dois passos. */
  private get alpha() { return this.paused ? 1 : Math.min(1, this.owed); }

  get focus(): Car | null { return this.selected ?? (this.race ? this.race.standings()[0].car : this.sim.leader); }

  // ---------- Ações ----------
  private changed() { this.notify(); }

  setSpeed(n: number) { this.speed = n; this.changed(); }
  togglePause() { this.paused = !this.paused; this.changed(); }
  // Apresentação "Explicar a evolução"
  openDeck() {
    if (!this.lesson) return;
    this.mode = 'train'; this.ghosts = null;
    this.deck = { slide: 0, time: 0, lesson: this.lesson };
    this.changed();
  }
  closeDeck() { this.deck = null; this.changed(); }
  deckGo(i: number) { if (this.deck) { this.deck = { ...this.deck, slide: i, time: 0 }; this.changed(); } }
  deckStep(dir: 1 | -1) {
    const d = this.deck;
    if (!d) return;
    const next = d.slide + dir;
    if (next >= SLIDES.length) { this.closeDeck(); return; } // depois da última folha, volta para a pista
    if (next < 0) return;
    this.deck = { ...d, slide: next, time: 0 };
    this.changed();
  }

  private resetView() { this.banner = null; this.posMemo.clear(); if (this.broadcast && !this.race) this.broadcast = false; this.race = null; this.raceSetup = false; this.deck = null; this.selected = null; this.mode = 'train'; this.ghosts = null; this.holdUntil = 0; }

  /** Troca de pista mantendo os cérebros: próximo circuito do calendário, ou outra sorteada. */
  newTrack() {
    this.setCircuit(this.circuit === null ? null : (this.circuit + 1) % CIRCUITS.length);
  }

  setCircuit(i: number | null) {
    this.resetView();
    this.circuit = i;
    if (i === null) this.sim.newTrack();
    else { const c = circuitTrack(i); this.sim.setTrack(c.center!, c.name!); }
    this.say(`${this.sim.track.name}: pista nova! Se continuarem andando bem, aprenderam a dirigir, e não só a decorar o caminho.`, true);
    this.changed();
  }

  /** Do zero: seed nova (ou a escolhida) e cérebros sorteados, no mesmo circuito (ou na pista sorteada da seed). */
  restart(seed = randomSeed()) {
    this.resetView();
    const c = circuitTrack(this.circuit);
    this.sim.restart(seed, c.center, c.name);
    this.lesson = null; // cérebros novos: a explicação antiga não vale mais
    this.changed();
  }

  setMutation(rate: number) { this.sim.settings.mutationRate = rate; this.changed(); }
  setPopulation(n: number) { this.sim.settings.population = n; this.changed(); }
  setElitism(on: boolean) { this.sim.settings.elitism = on; this.changed(); }

  /** Muda a rede: recomeça do zero na mesma pista. */
  setSensors(n: SensorCount) {
    this.resetView();
    this.sim.settings.sensors = n;
    this.sim.restart(this.sim.seed, this.sim.track.center);
    this.lesson = null;
    this.say(`Agora cada carro enxerga com ${n} sensores. Cérebros novos, do zero.`, true);
    this.changed();
  }

  /** Clique no canvas (coordenadas da tela). */
  pick(clientX: number, clientY: number) {
    if ((this.mode !== 'train' && this.mode !== 'race') || !this.world) return;
    const r = this.world.canvas.getBoundingClientRect();
    let wx = ((clientX - r.left) / r.width) * WORLD_W, wy = ((clientY - r.top) / r.height) * WORLD_H;
    if (this.showing3d) { const p = this.gl!.toWorld(clientX, clientY); if (!p) return; [wx, wy] = p; }
    let best: Car | null = null, bestD = 30 * 30; // raio generoso: dedo em tablet
    for (const c of this.race ? this.race.racers.map((r) => r.car) : this.sim.cars) {
      if (!c.alive) continue;
      const d = (c.x - wx) ** 2 + (c.y - wy) ** 2;
      if (d < bestD) { bestD = d; best = c; }
    }
    this.selected = best;
    if (best) this.towerTab = 'brain';
    this.changed();
  }

  selectCar(c: Car) { if (this.mode === 'train' || this.mode === 'race') { this.selected = c === this.selected ? null : c; if (this.selected) this.towerTab = 'brain'; this.changed(); } }

  // Fantasmas
  startGhosts() {
    if (!this.sim.history.length) return;
    this.resetView();
    this.ghosts = new GhostRace(this.sim);
    this.ghostRest = 0;
    this.mode = 'ghosts';
    this.say('Mesma pista, o campeão de cada geração. Do cinza (os primeiros) ao laranja (o recordista): veja a IA melhorando.', true);
    this.changed();
  }
  stopGhosts() { this.mode = 'train'; this.ghosts = null; this.say(`De volta ao treino, geração ${this.sim.gen}.`, true); this.changed(); }

  // Desenhar pista
  startDraw() {
    this.resetView();
    this.mode = 'draw'; this.stroke = []; this.drawError = ''; this.drawn = null;
    this.say('Desenhe uma pista fechada com o dedo ou o mouse.', true);
    this.changed();
  }
  private toWorld(e: { clientX: number; clientY: number }): Point {
    const r = this.world!.canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * WORLD_W, ((e.clientY - r.top) / r.height) * WORLD_H];
  }
  drawDown(e: PointerEvent) {
    if (this.mode !== 'draw' || this.drawn || !this.world) return;
    this.drawing = true; this.stroke = [this.toWorld(e)]; this.drawError = '';
    this.changed();
  }
  drawMove(e: PointerEvent) {
    if (!this.drawing) return;
    const p = this.toWorld(e), q = this.stroke[this.stroke.length - 1];
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 4) this.stroke.push(p);
  }
  drawUp() {
    if (!this.drawing) return;
    this.drawing = false;
    const r = centerlineFromDrawing(this.stroke);
    if ('error' in r) this.drawError = r.error;
    else this.drawn = r.center;
    this.changed();
  }
  useDrawn(choice: 'keep' | 'fresh' | 'champion') {
    const center = this.drawn!;
    this.drawn = null; this.mode = 'train';
    if (choice === 'fresh') { this.sim.restart(this.sim.seed, center, 'Sua pista'); this.holdUntil = 0; this.lesson = null; }
    else {
      this.sim.setTrack(center, 'Sua pista');
      if (choice === 'champion' && this.saved) this.runChampion(this.saved, false);
      else this.say('Pista sua! Vamos ver se os cérebros atuais conseguem.', true);
    }
    this.changed();
  }
  cancelDraw() { this.mode = 'train'; this.drawn = null; this.drawing = false; this.changed(); }

  // Cérebro campeão
  private bestBrain(): SavedBrain {
    const h = this.sim.history;
    const top = h.reduce((b, r) => (b && b.best >= r.best ? b : r), h[0] as (typeof h)[0] | undefined);
    const genome = top ? top.champion : this.sim.leader!.genome;
    return { version: 1, sensors: this.sim.settings.sensors, genome: Array.from(genome), gen: top?.gen ?? this.sim.gen, laps: +(top?.best ?? 0).toFixed(2) };
  }

  saveChampion() { this.keepBrain(); }

  /**
   * Guarda na biblioteca o melhor cérebro NESTA pista (o que venceria uma corrida aqui).
   * Também vira o "campeão guardado" do Painel.
   */
  keepBrain(name?: string): LibraryBrain | null {
    const b = bestChampion(this.sim);
    const base: SavedBrain = b
      ? { version: 1, sensors: this.sim.settings.sensors, genome: Array.from(b.genome), gen: b.gen, laps: +b.laps.toFixed(2) }
      : this.bestBrain();
    const entry: LibraryBrain = {
      ...base, id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`,
      name: (name?.trim() || `Geração ${base.gen} · ${this.sim.track.name.split(' · ')[0]}`).slice(0, 40), savedAt: Date.now(),
    };
    this.library = [entry, ...this.library].slice(0, LIBRARY_MAX);
    storeLibrary(this.library);
    this.libraryLaps.set(entry.id, base.laps);
    this.saved = base; store(base);
    this.message = `"${entry.name}" guardado neste computador.`;
    this.changed();
    return entry;
  }

  removeBrain(id: string) {
    this.library = this.library.filter((b) => b.id !== id);
    storeLibrary(this.library);
    if (this.raceConfig.brain === id) this.raceConfig = { ...this.raceConfig, brain: 'best' };
    this.changed();
  }

  exportChampion() { download(this.saved ?? this.bestBrain()); }

  async importChampion(file: File) {
    let b: SavedBrain | null = null;
    try { b = parseBrain(JSON.parse(await file.text())); } catch { /* cai no aviso abaixo */ }
    if (!b) { this.message = 'Arquivo inválido. Use um JSON exportado por esta demo.'; this.changed(); return; }
    this.saved = b; store(b);
    this.library = [{ ...b, id: `arq${Date.now().toString(36)}`, name: `${file.name.replace(/\.json$/i, '').slice(0, 30)}`, savedAt: Date.now() }, ...this.library].slice(0, LIBRARY_MAX);
    storeLibrary(this.library);
    this.message = `Cérebro da geração ${b.gen} carregado do arquivo e guardado na biblioteca.`;
    this.runChampion(b);
  }

  /** Mostra um cérebro treinado correndo (numa pista nova, por padrão). */
  runChampion(b = this.saved, newTrack = true) {
    if (!b) return;
    this.resetView();
    if (b.sensors !== this.sim.settings.sensors) {
      this.sim.settings.sensors = b.sensors;
      this.sim.restart(this.sim.seed, this.sim.track.center);
    }
    if (newTrack) {
      this.circuit = this.circuit === null ? null : (this.circuit + 1) % CIRCUITS.length;
      const c = circuitTrack(this.circuit);
      if (c.center) this.sim.setTrack(c.center, c.name!); else this.sim.newTrack();
    }
    this.sim.loadChampion(Float32Array.from(b.genome));
    this.lesson = null;
    this.say('Cérebro campeão carregado. Ele nunca viu esta pista.', true);
    this.changed();
  }

  towerTab: 'chart' | 'brain' = 'chart'; // aba da torre: gráfico ou cérebro do carro em destaque
  setTowerTab(t: 'chart' | 'brain') { this.towerTab = t; this.changed(); }

  panelOpen = false; // painel do apresentador (experimentos, campeão, seed)
  setPanel(open: boolean) { this.panelOpen = open; this.changed(); }

  // ---------- Corrida ----------
  race: Race | null = null;
  broadcast = false; // transmissão em tela cheia (gráficos estilo F1)
  banner: { kind: 'fastest' | 'lap'; racer: Racer; time: number; lap?: number; at: number } | null = null;
  posMemo = new Map<number, { pos: number; dir: 1 | -1 | 0; at: number; cand: number; since: number }>();
  raceSetup = false; // folha "Corrida" aberta
  raceBest: RaceBrain | null = null;
  raceConfig: RaceConfig = { count: 10, names: '', laps: 10, start: 'grid', brain: 'best', prize: 'um bombom' };

  /** Abre a folha e avalia o melhor cérebro nesta pista (roda cada campeão uma vez, sem desenhar). */
  openRaceSetup() {
    if (this.mode === 'race' && this.race?.phase !== 'finished') return; // não interrompe uma corrida
    this.race = null; this.selected = null; this.deck = null; this.ghosts = null; this.mode = 'train';
    const b = bestChampion(this.sim);
    this.raceBest = b && { genome: b.genome, brain: this.sim.brain, gen: b.gen, laps: b.laps };
    // cada cérebro guardado é testado nesta pista: pode ter sido treinado em outra
    this.libraryLaps = new Map(this.library.map((x) => [x.id, lapsOn(Float32Array.from(x.genome), brainOf(x), this.sim.track)]));
    if (this.raceConfig.brain !== 'best' && !this.library.some((x) => x.id === this.raceConfig.brain)) this.raceConfig = { ...this.raceConfig, brain: 'best' };
    // ainda sem treino, mas com cérebro guardado: já vem escolhido o guardado que anda mais nesta pista
    if (this.raceConfig.brain === 'best' && !this.raceBest && this.library.length) {
      const top = [...this.library].sort((a, b) => (this.libraryLaps.get(b.id) ?? 0) - (this.libraryLaps.get(a.id) ?? 0))[0];
      this.raceConfig = { ...this.raceConfig, brain: top.id };
    }
    this.raceSetup = true;
    this.changed();
  }
  closeRaceSetup() { this.raceSetup = false; this.changed(); }

  /** Cérebro escolhido na folha, ou null se não houver. */
  raceBrainFor(src: string): RaceBrain | null {
    if (src === 'best') return this.raceBest;
    const b = this.library.find((x) => x.id === src);
    if (!b) return null;
    return { genome: Float32Array.from(b.genome), brain: brainOf(b), gen: b.gen, laps: this.libraryLaps.get(b.id) ?? b.laps };
  }

  startRace(cfg: RaceConfig = this.raceConfig) {
    const rb = this.raceBrainFor(cfg.brain);
    if (!rb) return;
    cfg = { ...cfg, laps: Math.min(99, Math.max(1, Math.round(cfg.laps) || 1)) }; // valor digitado: sempre 1 a 99
    this.raceConfig = cfg;
    const typed = parseNames(cfg.names), n = Math.min(30, Math.max(cfg.count, typed.length, 1));
    const names = Array.from({ length: n }, (_, i) => typed[i] ?? `Carro ${i + 1}`);
    this.resetView();
    this.race = new Race({ names, laps: cfg.laps, start: cfg.start, genome: rb.genome, brain: rb.brain, track: this.sim.track, seed: randomSeed() });
    this.mode = 'race'; this.owed = 0; this.paused = false;
    // corrida é para assistir: sempre em 1× e já na tela cheia com os gráficos de TV
    this.speed = 1;
    this.toggleBroadcast(true);
    this.say(cfg.start === 'grid' ? 'Volta de classificação: quem fizer o melhor tempo larga na frente.' : 'Todos juntos na largada. Atenção às luzes…', true);
    this.changed();
  }

  toggleBroadcast(on = !this.broadcast) {
    if (!this.race) return;
    this.broadcast = on;
    if (on) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement && !this.present) document.exitFullscreen().catch(() => {});
    this.changed();
  }

  /** Mesmos participantes, sorte nova. */
  raceAgain() { this.startRace(this.raceConfig); }
  endRace() { this.toggleBroadcast(false); this.resetView(); this.say('De volta ao treino.', true); this.changed(); }

  /** Participante de um carro (na corrida). */
  racerOf(c: Car): Racer | undefined { return this.race?.racers.find((r) => r.car === c); }

  toggle3d() { this.view3d = !this.view3d; this.changed(); requestAnimationFrame(() => this.resize()); }

  /** Câmera 3D: visão geral ou seguindo o carro em destaque (líder, ou o escolhido). */
  toggleCamera() {
    if (!this.gl) return;
    this.view3d = true;
    this.gl.camera3d = this.gl.camera3d === 'chase' ? 'overview' : 'chase';
    if (this.gl.camera3d === 'chase') this.say('Câmera no líder: veja o que ele "enxerga" com os sensores.', true);
    this.changed();
  }

  setPresent(on: boolean) { this.present = on; this.changed(); }
}
