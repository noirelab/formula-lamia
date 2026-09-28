// Todos os parâmetros do motor num só lugar.
// Calibrados em simulação headless: não mude sem rodar `npm test` (teste de aprendizado).

export const WORLD_W = 1200;
export const WORLD_H = 760;
export const TRACK_W = 54;

export const TRACK_CONTROL_POINTS = 16;
export const TRACK_RADIUS_MIN = 0.35;
export const TRACK_SPACING = 8;
export const TRACK_TURN_MIN = 40; // graus
export const TRACK_TURN_MAX = 60;
export const TRACK_TRIES = 300;

export const SENSOR_RANGE = 220;
export const SENSOR_STEP = 4;
export const SENSOR_SETS: Record<SensorCount, number[]> = {
  3: [-50, 0, 50],
  5: [-90, -30, 0, 30, 90],
  7: [-90, -50, -20, 0, 20, 50, 90],
};
export type SensorCount = 3 | 5 | 7;

export const HIDDEN = 10;
export const OUTPUTS = 2; // [0] volante, [1] acelerador/freio

export const MAX_SPEED = 8;
export const ACCEL = 0.2;
export const STEER = 0.085;
export const STEER_SPEED_LOSS = 0.65; // em alta velocidade vira menos: precisa aprender a frear

export const ELITE = 4;
export const RANDOMS = 3;
export const PARENT_FRACTION = 0.2;
export const PARENT_MIN = 10;
export const CROSSOVER_CHANCE = 0.5;
export const MUTATION_SIZE = 0.5;

export const GEN_STEPS = 1800; // 30 s a 60 passos/s
export const STEPS_PER_SECOND = 60;
export const STUCK_STEPS = 120;
export const BACKWARD_LIMIT = 10;
export const PROGRESS_WINDOW: [number, number] = [-6, 12];

export interface Settings {
  population: number; // 50–300
  sensors: SensorCount;
  elitism: boolean;
  mutationRate: number; // 0,01–0,40
}

export const DEFAULT_SETTINGS: Settings = {
  population: 150,
  sensors: 7,
  elitism: true,
  mutationRate: 0.1,
};

export const sensorAngles = (n: SensorCount) => SENSOR_SETS[n].map((a) => (a * Math.PI) / 180);
export const layersFor = (n: SensorCount) => [n + 1, HIDDEN, OUTPUTS];
