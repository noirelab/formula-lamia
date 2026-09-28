// Carro estilo F1 em low-poly, ~21 de comprimento (x = frente, y = cima, z = lado).
// Cada peça vira um InstancedMesh: a carroceria recebe a cor do papel do carro (laranja líder,
// branco campeão, azul filho); o resto tem cor fixa, com detalhes no azul-marinho do LAMIA.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface CarPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  tinted: boolean; // true = cor por instância
}

interface Station { x: number; w: number; h: number; y: number; z?: number }

/** Casco por seções transversais em superelipse (n > 2 = mais quadrado). */
function loft(stations: Station[], seg = 14, n = 2.6): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  const e = 2 / n, pw = (v: number) => Math.sign(v) * Math.abs(v) ** e;
  for (const s of stations)
    for (let k = 0; k < seg; k++) {
      const t = (k / seg) * Math.PI * 2;
      pos.push(s.x, s.y + pw(Math.sin(t)) * s.h / 2, (s.z ?? 0) + pw(Math.cos(t)) * s.w / 2);
    }
  for (let i = 0; i < stations.length - 1; i++)
    for (let k = 0; k < seg; k++) {
      const a = i * seg + k, b = i * seg + ((k + 1) % seg), c = a + seg, d = b + seg;
      idx.push(a, c, b, b, c, d);
    }
  // tampas nas pontas
  for (const [i, flip] of [[0, true], [stations.length - 1, false]] as const) {
    const s = stations[i], center = pos.length / 3;
    pos.push(s.x, s.y, s.z ?? 0);
    for (let k = 0; k < seg; k++) {
      const a = i * seg + k, b = i * seg + ((k + 1) % seg);
      if (flip) idx.push(center, b, a); else idx.push(center, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const box = (w: number, h: number, d: number, x: number, y: number, z: number, rz = 0) =>
  new THREE.BoxGeometry(w, h, d).rotateZ(rz).translate(x, y, z);

/** Junta peças com atributos compatíveis (sem UV, sem índice). */
function merge(parts: THREE.BufferGeometry[]) {
  return mergeGeometries(parts.map((p) => {
    const g = p.index ? p.toNonIndexed() : p;
    g.deleteAttribute('uv');
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    return g;
  }))!;
}

function body() {
  const hull = loft([
    { x: 11, w: 0.5, h: 0.45, y: 1.05 }, // ponta do bico
    { x: 9, w: 1.3, h: 0.8, y: 1.2 },
    { x: 6, w: 2, h: 1.3, y: 1.55 },
    { x: 3, w: 2.6, h: 1.8, y: 1.9 }, // frente do cockpit
    { x: 0.5, w: 2.9, h: 2, y: 2.05 },
    { x: -1.5, w: 2.4, h: 3.3, y: 2.7 }, // tomada de ar sobre o piloto
    { x: -3.5, w: 2.2, h: 3, y: 2.6 },
    { x: -6, w: 1.6, h: 2, y: 2.1 },
    { x: -8.6, w: 0.9, h: 1.1, y: 1.7 },
  ]);
  // sidepods em "garrafa de coca": largos na frente, afinando para trás
  const pod = (side: 1 | -1) => loft([
    { x: 2.6, w: 0.4, h: 1.2, y: 1.45, z: side * 2.9 },
    { x: 2, w: 2, h: 1.6, y: 1.5, z: side * 2.9 },
    { x: -1, w: 2.1, h: 1.5, y: 1.45, z: side * 2.7 },
    { x: -4, w: 1.2, h: 1.1, y: 1.35, z: side * 2 },
    { x: -6, w: 0.4, h: 0.7, y: 1.3, z: side * 1.3 },
  ], 12, 3);
  return merge([
    hull, pod(1), pod(-1),
    box(1.5, 0.22, 11.4, 9.9, 0.55, 0), // asa dianteira, elemento principal
    box(1.8, 0.28, 8.2, -9.4, 5.1, 0), // asa traseira, plano principal
    box(1.1, 0.22, 8.2, -10.1, 5.75, 0, 0.35), // flap
    box(0.9, 1.6, 0.3, -5.8, 4.1, 0), // barbatana da tampa do motor
  ]);
}

function carbon() {
  return merge([
    box(12.6, 0.24, 8.6, -1.4, 0.55, 0), // assoalho
    box(1, 0.18, 10.4, 9.1, 0.95, 0, 0.3), // asa dianteira, flap
    box(0.35, 1.2, 2.2, 9.6, 1, 5.6), box(0.35, 1.2, 2.2, 9.6, 1, -5.6), // placas da asa dianteira
    box(0.8, 2.2, 0.7, -8.3, 3.7, 0), // pilone da asa traseira
    box(1.6, 0.25, 6, -8.6, 2.4, 0), // asa de viga, embaixo da traseira
    // halo: arco sobre o cockpit + pilar central
    new THREE.TorusGeometry(1.35, 0.17, 6, 14, Math.PI).rotateY(Math.PI / 2).rotateZ(-0.08).translate(0.9, 3.1, 0),
    box(0.25, 1.1, 0.25, 2.3, 3.35, 0, -0.5),
    box(0.45, 0.3, 0.7, 2.3, 2.75, 1.45), box(0.45, 0.3, 0.7, 2.3, 2.75, -1.45), // retrovisores, colados na lateral do cockpit
    box(0.3, 0.32, 1.05, 1.45, 3.22, 0), // viseira, embutida na frente do capacete
    // suspensão: braços finos do chassi até as rodas
    box(0.2, 0.2, 7.4, 6.2, 1.6, 0), box(0.2, 0.2, 7.6, -6, 1.8, 0),
  ]);
}

/** Detalhes de pintura em azul-marinho LAMIA. */
function accent() {
  return merge([
    box(2.2, 2.2, 0.22, -9.7, 5.2, 4.2), box(2.2, 2.2, 0.22, -9.7, 5.2, -4.2), // placas da asa traseira
    box(1.9, 0.3, 0.9, 10.3, 1.12, 0), // ponta do bico
    loft([{ x: -1.2, w: 2.5, h: 0.5, y: 4.2 }, { x: -3.6, w: 2.3, h: 0.5, y: 4 }, { x: -5.6, w: 1.7, h: 0.4, y: 3.1 }], 12, 3), // faixa na tampa do motor
  ]);
}

function helmet() {
  return merge([new THREE.SphereGeometry(0.8, 14, 10).scale(1.1, 1, 0.95).translate(0.7, 3.15, 0)]);
}

function trim() {
  const rim = (x: number, z: number, r: number) => new THREE.CylinderGeometry(r * 0.55, r * 0.55, 2.35, 14).rotateX(Math.PI / 2).translate(x, r, z);
  return merge([
    rim(6.2, 4.4, 1.75), rim(6.2, -4.4, 1.75), rim(-6, 4.6, 2.05), rim(-6, -4.6, 2.05)]);
}

function tyres() {
  const wheel = (x: number, z: number, r: number, w: number) =>
    new THREE.CylinderGeometry(r, r, w, 20).rotateX(Math.PI / 2).translate(x, r, z);
  return merge([wheel(6.2, 4.4, 1.75, 2), wheel(6.2, -4.4, 1.75, 2), wheel(-6, 4.6, 2.05, 2.4), wheel(-6, -4.6, 2.05, 2.4)]);
}

export function carParts(): CarPart[] {
  return [
    { geometry: body(), material: new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.15 }), tinted: true },
    { geometry: carbon(), material: new THREE.MeshStandardMaterial({ color: '#1B2430', roughness: 0.55, metalness: 0.2 }), tinted: false },
    { geometry: accent(), material: new THREE.MeshStandardMaterial({ color: '#04497D', roughness: 0.4 }), tinted: false },
    { geometry: helmet(), material: new THREE.MeshStandardMaterial({ color: '#F4F7FB', roughness: 0.55 }), tinted: false },
    { geometry: trim(), material: new THREE.MeshStandardMaterial({ color: '#D5DDE5', roughness: 0.3, metalness: 0.6 }), tinted: false },
    { geometry: tyres(), material: new THREE.MeshStandardMaterial({ color: '#12161B', roughness: 0.9 }), tinted: false },
  ];
}
