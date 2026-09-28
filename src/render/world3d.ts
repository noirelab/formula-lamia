// Vista 3D (three.js): a pista vira uma maquete branca vista de cima, inclinada.
// O chão é o próprio mapa 2D como textura (pista, zebra, curvas numeradas); por cima,
// barreiras em relevo, árvores de maquete e os 150 carros num único InstancedMesh.
// Coordenadas: mundo (x, y) → three (x, 0, z=y).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Simulation } from '../engine/simulation';
import type { Car } from '../engine/car';
import type { Track } from '../engine/track';
import { WORLD_W, WORLD_H, TRACK_W, SENSOR_RANGE } from '../engine/params';
import { renderTrack } from './trackRenderer';
import { carParts } from './carModel';
import { LEADER, ELITE_COLOR, CHILD, NAVY } from './worldRenderer';

const MAX_CARS = 320; // população vai até 300
const TILT = (52 * Math.PI) / 180; // inclinação da câmera em relação ao chão

export type CameraMode = 'overview' | 'chase';

/** Faixa vertical ao longo de uma linha fechada, com cor alternando a cada `seg` pontos. */
function barrier(center: [number, number][], offset: number, height: number, seg: number, a: THREE.Color, b: THREE.Color) {
  const N = center.length, pos: number[] = [], col: number[] = [], idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const p = center[i % N], q = center[(i + 1) % N], o = center[(i - 1 + N) % N];
    const dx = q[0] - o[0], dy = q[1] - o[1], len = Math.hypot(dx, dy) || 1;
    const x = p[0] + (-dy / len) * offset, z = p[1] + (dx / len) * offset;
    const c = Math.floor(i / seg) % 2 ? a : b;
    pos.push(x, 0, z, x, height, z);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }));
}

export class World3D {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, WORLD_W / WORLD_H, 10, 6000);
  private cars: THREE.InstancedMesh; // carroceria: cor por instância
  private carParts: THREE.InstancedMesh[]; // todas as peças, mesma matriz por carro
  camera3d: CameraMode = 'overview';
  private overview = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private chaseAngle = 0;
  private camReady = false;
  private chaseCar: Car | null = null;
  private pose = { x: 0, y: 0, a: 0 };
  private alpha = 1;
  private chaseGen = 0;
  private groundMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  private trackGroup = new THREE.Group();
  private sensors: THREE.LineSegments;
  private ring: THREE.Mesh;
  private hits: THREE.InstancedMesh; // onde cada sensor toca a borda
  private track: Track | null = null;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  private color = new THREE.Color();
  private ray = new THREE.Raycaster();
  private floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color('#F4F7FB');
    this.scene.fog = new THREE.Fog('#F4F7FB', 2400, 4200);

    this.scene.add(new THREE.HemisphereLight('#FFFFFF', '#C9D6E3', 1.6));
    const sun = new THREE.DirectionalLight('#FFFFFF', 2.2);
    sun.position.set(WORLD_W / 2 - 500, 900, WORLD_H / 2 - 600);
    sun.target.position.set(WORLD_W / 2, 0, WORLD_H / 2);
    sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -760, right: 760, top: 560, bottom: -560, near: 100, far: 2200 });
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005;
    sun.shadow.intensity = 0.55; // sombra de maquete: presente, mas leve
    this.scene.add(sun, sun.target);

    // Mesa da maquete: um pouco maior que o mapa, com borda azul-marinho
    const base = new THREE.Mesh(new THREE.BoxGeometry(WORLD_W + 40, 16, WORLD_H + 40), new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.6 }));
    base.position.set(WORLD_W / 2, -8.2, WORLD_H / 2);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_W, WORLD_H), this.groundMat);
    ground.rotation.x = -Math.PI / 2; ground.position.set(WORLD_W / 2, 0, WORLD_H / 2);
    ground.receiveShadow = true;
    this.scene.add(base, ground, this.trackGroup);

    this.carParts = carParts().map((p) => new THREE.InstancedMesh(p.geometry, p.material, MAX_CARS));
    this.cars = this.carParts[0];
    for (const m of this.carParts) {
      m.castShadow = true;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      this.scene.add(m);
    }

    this.sensors = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: LEADER, transparent: true, opacity: 0.9, depthTest: false }));
    this.sensors.renderOrder = 10; // sempre por cima dos carros e das barreiras
    this.hits = new THREE.InstancedMesh(new THREE.SphereGeometry(2.6, 12, 8), new THREE.MeshBasicMaterial({ color: LEADER, depthTest: false, transparent: true }), 7);
    this.hits.renderOrder = 11; this.hits.frustumCulled = false;
    this.scene.add(this.hits);
    this.sensors.geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(7 * 6), 3));
    this.scene.add(this.sensors);

    this.ring = new THREE.Mesh(new THREE.RingGeometry(16, 21, 40), new THREE.MeshBasicMaterial({ color: NAVY }));
    this.ring.rotation.x = -Math.PI / 2;
    this.scene.add(this.ring);
  }

  private setTrack(track: Track) {
    this.track = track;
    this.groundMat.map?.dispose();
    const tex = new THREE.CanvasTexture(renderTrack(track, 3)); // 3 px por unidade: nítido também na câmera de perto
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.groundMat.map = tex; this.groundMat.needsUpdate = true;

    for (const o of [...this.trackGroup.children]) {
      this.trackGroup.remove(o);
      if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh) o.geometry.dispose();
    }
    const red = new THREE.Color('#C8262C'), white = new THREE.Color('#FFFFFF');
    for (const side of [-1, 1]) {
      const b = barrier(track.center, side * (TRACK_W / 2 + 11), 4, 2, red, white);
      b.castShadow = true; b.receiveShadow = true;
      this.trackGroup.add(b);
    }

    // Árvores de maquete (cones brancos) longe do asfalto, posições fixas por pista
    const spots: number[] = [];
    let h = 2166136261;
    const rnd = () => { h = Math.imul(h ^ (h >>> 13), 1597334677) >>> 0; return h / 4294967296; };
    for (let tries = 0; tries < 4000 && spots.length < 3 * 90; tries++) {
      const x = 20 + rnd() * (WORLD_W - 40), z = 20 + rnd() * (WORLD_H - 40);
      let near = Infinity;
      for (let i = 0; i < track.n; i += 3) near = Math.min(near, Math.hypot(track.center[i][0] - x, track.center[i][1] - z));
      if (near > TRACK_W / 2 + 34) spots.push(x, z, 0.6 + rnd() * 0.6);
    }
    // árvore de maquete: copa redonda sobre um tronco fino
    const crown = new THREE.IcosahedronGeometry(11, 1); crown.translate(0, 22, 0);
    const trunk = new THREE.CylinderGeometry(1.6, 1.6, 12, 6).toNonIndexed(); trunk.translate(0, 6, 0);
    const tree = mergeGeometries([crown, trunk])!;
    const trees = new THREE.InstancedMesh(tree, new THREE.MeshStandardMaterial({ color: '#E3EDF6', roughness: 0.9, flatShading: true }), spots.length / 3);
    for (let i = 0; i < spots.length; i += 3) {
      this.m.compose(this.v.set(spots[i], 0, spots[i + 1]), this.q.identity(), this.s.setScalar(spots[i + 2]));
      trees.setMatrixAt(i / 3, this.m);
    }
    trees.castShadow = true;
    this.trackGroup.add(trees);
  }

  resize(w: number, h: number, dpr: number) {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Enquadra o mapa inteiro: distância pela largura e pela profundidade vista de lado
    const vfov = (this.camera.fov * Math.PI) / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const distW = (WORLD_W / 2 + 30) / Math.tan(hfov / 2);
    const distH = ((WORLD_H / 2 + 30) * Math.sin(TILT) + 40) / Math.tan(vfov / 2);
    const d = Math.max(distW, distH) * 1.02;
    this.overview.pos.set(WORLD_W / 2, Math.sin(TILT) * d, WORLD_H / 2 + Math.cos(TILT) * d);
    this.overview.look.set(WORLD_W / 2, 0, WORLD_H / 2 + 20);
    this.camera.updateProjectionMatrix();
  }

  private place(i: number, c: Car, color: string, size: number) {
    const p = c.poseAt(this.alpha, this.pose);
    this.q.setFromAxisAngle(this.up, -p.a);
    this.m.compose(this.v.set(p.x, 0, p.y), this.q, this.s.setScalar(size));
    for (const part of this.carParts) part.setMatrixAt(i, this.m);
    this.cars.setColorAt(i, this.color.set(color));
  }

  /** `alpha`: fração do passo atual já decorrida (0..1), para mover os carros sem saltos. */
  render(sim: Simulation, selected: Car | null, dt: number, alpha: number) {
    this.alpha = alpha;
    if (this.track !== sim.track) this.setTrack(sim.track);
    const leader = sim.leader, focus = selected ?? leader;
    let n = 0;
    for (const c of sim.cars) {
      if (!c.alive || n >= MAX_CARS) continue;
      const big = c === leader || c === focus;
      this.place(n++, c, c === leader ? LEADER : c.kind === 'elite' ? ELITE_COLOR : CHILD, big ? 1.8 : 1.3); // maior que no 2D: a perspectiva encolhe
    }
    for (const part of this.carParts) { part.count = n; part.instanceMatrix.needsUpdate = true; }
    if (this.cars.instanceColor) this.cars.instanceColor.needsUpdate = true;

    // Sensores do carro em destaque
    const pos = this.sensors.geometry.getAttribute('position') as THREE.BufferAttribute;
    this.sensors.visible = this.hits.visible = !!focus?.alive;
    if (focus?.alive) {
      const { angles } = focus.brain, color = focus === leader ? LEADER : '#FFFFFF';
      (this.sensors.material as THREE.LineBasicMaterial).color.set(color);
      (this.hits.material as THREE.MeshBasicMaterial).color.set(color);
      let h = 0;
      const f = focus.poseAt(alpha, this.pose);
      for (let k = 0; k < 7; k++) {
        const d = k < angles.length ? Math.min(focus.sens[k], SENSOR_RANGE) : 0, a = f.a + (angles[k] ?? 0);
        const ex = f.x + Math.cos(a) * d, ez = f.y + Math.sin(a) * d;
        pos.setXYZ(k * 2, f.x, 6, f.y);
        pos.setXYZ(k * 2 + 1, ex, 6, ez);
        if (k < angles.length && d < SENSOR_RANGE) {
          this.m.makeTranslation(ex, 6, ez);
          this.hits.setMatrixAt(h++, this.m);
        }
      }
      this.hits.count = h;
      this.hits.instanceMatrix.needsUpdate = true;
      pos.needsUpdate = true;
    }
    this.ring.visible = !!selected;
    if (selected) { const p = selected.poseAt(alpha, this.pose); this.ring.position.set(p.x, 0.6, p.y); }

    this.moveCamera(this.chaseTarget(sim, selected), dt);
    this.renderer.render(this.scene, this.camera);
  }

  /** Carro seguido: o escolhido, ou o líder, mas sem trocar a cada ultrapassagem entre empatados. */
  private chaseTarget(sim: Simulation, selected: Car | null): Car | null {
    if (selected) return selected;
    const leader = sim.leader, c = this.chaseCar;
    const stale = !c || !c.alive || this.chaseGen !== sim.gen || (leader && leader.best > c.best + 25);
    if (stale) { this.chaseCar = leader; this.chaseGen = sim.gen; }
    return this.chaseCar;
  }

  /** Visão geral fixa, ou atrás e acima do carro em destaque, com suavização. */
  private moveCamera(focus: Car | null, dt: number) {
    const targetPos = this.v, targetLook = this.s;
    if (this.camera3d === 'chase' && focus) {
      const f = focus.poseAt(this.alpha, this.pose);
      // suaviza a direção para a câmera não tremer com o volante
      let d = f.a - this.chaseAngle;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.chaseAngle += d * (1 - Math.exp(-dt * 6));
      const cs = Math.cos(this.chaseAngle), sn = Math.sin(this.chaseAngle);
      targetPos.set(f.x - cs * 140, 85, f.y - sn * 140);
      targetLook.set(f.x + cs * 40, 0, f.y + sn * 40);
    } else {
      targetPos.copy(this.overview.pos); targetLook.copy(this.overview.look);
      if (focus) this.chaseAngle = focus.a;
    }
    // o carro anda ~480 unidades/s em 1×: a câmera precisa acompanhar rápido
    const k = this.camReady ? 1 - Math.exp(-dt * (this.camera3d === "chase" ? 10 : 4)) : 1;
    this.camPos.lerp(targetPos, k); this.camLook.lerp(targetLook, k);
    this.camReady = true;
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  /** Ponto do mundo sob o cursor (para clicar num carro), ou null fora do chão. */
  toWorld(clientX: number, clientY: number): [number, number] | null {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const hit = this.ray.ray.intersectPlane(this.floor, new THREE.Vector3());
    return hit ? [hit.x, hit.z] : null;
  }

  dispose() { this.renderer.dispose(); }
}
