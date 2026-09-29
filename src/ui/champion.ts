// Cérebro campeão: localStorage e arquivo JSON. Arquivo vem de fora: validar tudo.
import { genomeLength } from '../engine/network';
import { layersFor, type SensorCount } from '../engine/params';

export interface SavedBrain {
  version: 1;
  sensors: SensorCount;
  genome: number[];
  gen: number;
  laps: number;
}

const KEY = 'ia-dirige:campeao';

export function parseBrain(data: unknown): SavedBrain | null {
  const d = data as Partial<SavedBrain> | null;
  if (!d || d.version !== 1 || ![3, 5, 7].includes(d.sensors as number) || !Array.isArray(d.genome)) return null;
  if (d.genome.length !== genomeLength(layersFor(d.sensors as SensorCount))) return null;
  if (!d.genome.every((v) => typeof v === 'number' && Number.isFinite(v))) return null;
  return { version: 1, sensors: d.sensors as SensorCount, genome: d.genome, gen: Number(d.gen) || 0, laps: Number(d.laps) || 0 };
}

export function loadSaved(): SavedBrain | null {
  try { return parseBrain(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { return null; }
}

export function store(b: SavedBrain) {
  try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* sem storage: só o arquivo */ }
}

/** Cérebro na biblioteca: guardado com nome, para correr quando quiser. */
export interface LibraryBrain extends SavedBrain { id: string; name: string; savedAt: number }

const LIB_KEY = 'ia-dirige:biblioteca';
export const LIBRARY_MAX = 20;

export function loadLibrary(): LibraryBrain[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LIB_KEY) ?? 'null');
    if (Array.isArray(raw)) return raw.flatMap((x) => {
      const b = parseBrain(x);
      return b && typeof x.id === 'string' ? [{ ...b, id: x.id, name: String(x.name ?? `Geração ${b.gen}`).slice(0, 40), savedAt: Number(x.savedAt) || 0 }] : [];
    });
    // versão antiga: um campeão só; vira a primeira entrada da biblioteca
    const old = loadSaved();
    return old ? [{ ...old, id: 'antigo', name: `Geração ${old.gen}`, savedAt: 0 }] : [];
  } catch { return []; }
}

export function storeLibrary(list: LibraryBrain[]) {
  try { localStorage.setItem(LIB_KEY, JSON.stringify(list)); } catch { /* sem storage: só o arquivo */ }
}

export function download(b: SavedBrain) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `cerebro-campeao-g${b.gen}.json` });
  a.click();
  URL.revokeObjectURL(url);
}
