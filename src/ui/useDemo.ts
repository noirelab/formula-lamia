import { useSyncExternalStore } from 'react';
import { Demo } from './demo';

export const demo = new Demo();

// Refs estáveis: um ref novo a cada render faria o canvas ser redimensionado sem parar.
export const worldRef = (el: HTMLCanvasElement | null) => demo.attach('world', el);
export const brainRef = (el: HTMLCanvasElement | null) => demo.attach('brain', el);
export const glRef = (el: HTMLCanvasElement | null) => demo.attachGL(el);
export const deckRef = (el: HTMLCanvasElement | null) => demo.attachDeck(el);
export const chartRef = (el: HTMLCanvasElement | null) => demo.attach('chart', el);

export function useDemo() {
  useSyncExternalStore(demo.subscribe, demo.getVersion);
  return demo;
}

export const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

// Tela cheia de verdade quando possível; Esc do navegador também sai do modo.
export function togglePresent() {
  const on = !demo.present;
  demo.setPresent(on);
  if (on) document.documentElement.requestFullscreen?.().catch(() => {});
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

// Só em desenvolvimento: `demo` no console para inspecionar a simulação.
if (import.meta.env.DEV) Object.assign(window, { demo });
