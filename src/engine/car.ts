// Física, sensores, progresso e tempo de volta de um carro.
import { createActivations, forward, type Layers } from './network.ts';
import { onTrack, type Track } from './track.ts';
import {
  SENSOR_RANGE, SENSOR_STEP, MAX_SPEED, ACCEL, STEER, STEER_SPEED_LOSS,
  STUCK_STEPS, BACKWARD_LIMIT, PROGRESS_WINDOW, STEPS_PER_SECOND,
} from './params.ts';

/** elite = campeão copiado sem mudança; child = filho com mutação; random = cérebro novo sorteado */
export type CarKind = 'elite' | 'child' | 'random';

export interface Brain {
  layers: Layers;
  angles: number[]; // ângulos dos sensores em radianos
}

export class Car {
  id = 0; // número na largada, para a classificação
  readonly acts: Float32Array[];
  readonly sens: Float32Array; // distância medida por sensor
  x = 0; y = 0; a = 0; v = 0;
  px = 0; py = 0; pa = 0; // pose do passo anterior: a tela desenha entre os dois passos
  alive = true;
  idx = 0; // ponto da linha central mais próximo
  progress = 0; // em pontos, soma o deslocamento com volta ao redor
  best = 0; // aptidão: maior progresso alcançado
  lastImprove = 0;
  laps = 0;
  lapStart = 0;

  constructor(readonly genome: Float32Array, readonly kind: CarKind, readonly brain: Brain) {
    this.acts = createActivations(brain.layers);
    this.sens = new Float32Array(brain.angles.length);
  }

  reset(track: Track) {
    this.x = track.center[0][0]; this.y = track.center[0][1]; this.a = track.startAngle; this.v = 0;
    this.px = this.x; this.py = this.y; this.pa = this.a;
    this.alive = true; this.idx = 0; this.progress = 0; this.best = 0;
    this.lastImprove = 0; this.laps = 0; this.lapStart = 0;
  }

  /** Pose entre o passo anterior (alpha = 0) e o atual (alpha = 1), escrita em `out`. */
  poseAt(alpha: number, out: { x: number; y: number; a: number }) {
    let d = this.a - this.pa;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    out.x = this.px + (this.x - this.px) * alpha;
    out.y = this.py + (this.y - this.py) * alpha;
    out.a = this.pa + d * alpha;
    return out;
  }

  /** Um passo. Devolve o tempo (s) de uma volta completa que conta para recorde, senão null. */
  step(t: number, track: Track): number | null {
    this.px = this.x; this.py = this.y; this.pa = this.a;
    const { angles, layers } = this.brain, inp = this.acts[0], S = angles.length;
    for (let s = 0; s < S; s++) {
      const ang = this.a + angles[s], cs = Math.cos(ang), sn = Math.sin(ang);
      let d = 0;
      while (d < SENSOR_RANGE) { d += SENSOR_STEP; if (!onTrack(track, this.x + cs * d, this.y + sn * d)) break; }
      this.sens[s] = d; inp[s] = 1 - d / SENSOR_RANGE;
    }
    inp[S] = this.v / MAX_SPEED;
    const out = forward(this.genome, layers, this.acts);
    this.a += out[0] * STEER * (1 - (STEER_SPEED_LOSS * this.v) / MAX_SPEED);
    this.v = Math.max(0, Math.min(MAX_SPEED, this.v + out[1] * ACCEL));
    this.x += Math.cos(this.a) * this.v; this.y += Math.sin(this.a) * this.v;
    if (!onTrack(track, this.x, this.y)) { this.alive = false; return null; }

    const { center, n: N } = track;
    let bestK = 0, bestD = Infinity;
    for (let k = PROGRESS_WINDOW[0]; k <= PROGRESS_WINDOW[1]; k++) {
      const p = center[(this.idx + k + N) % N], d = (p[0] - this.x) ** 2 + (p[1] - this.y) ** 2;
      if (d < bestD) { bestD = d; bestK = k; }
    }
    this.progress += bestK; this.idx = (this.idx + bestK + N) % N;
    if (this.progress > this.best + 0.5) { this.best = this.progress; this.lastImprove = t; }

    let lap: number | null = null;
    if (this.progress >= (this.laps + 1) * N) {
      if (this.laps > 0) lap = (t - this.lapStart) / STEPS_PER_SECOND; // 1ª volta sai parada, não conta
      this.laps++; this.lapStart = t;
    }
    if (t - this.lastImprove > STUCK_STEPS || this.progress < -BACKWARD_LIMIT) this.alive = false;
    return lap;
  }
}
