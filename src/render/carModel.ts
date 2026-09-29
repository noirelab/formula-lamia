// Carro de F1 "( FREE ) Formula One LP-830 SDC", de SDC PERFORMANCE (sketchfab.com/3Duae), CC-BY 4.0.
// Preparado fora do app: sem logos, 11,6 mil triângulos, 21 de comprimento (x = frente, y = cima, z = lado).
// Cada material vira um InstancedMesh: a carroceria recebe a cor do papel do carro (laranja líder,
// branco campeão, azul filho); o resto mantém a cor do modelo.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import carUrl from '../assets/f1.glb?url';

export interface CarPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  tinted: boolean; // true = cor por instância
}

const BODY = 'Material.001'; // pintura da carroceria no modelo original

const gltf = await new GLTFLoader().loadAsync(carUrl);

export function carParts(): CarPart[] {
  const parts: CarPart[] = [];
  gltf.scene.updateMatrixWorld();
  gltf.scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
    const tinted = o.material.name === BODY;
    const material = tinted ? new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.15 }) : o.material;
    parts.push({ geometry, material, tinted });
  });
  return parts.sort((a, b) => +b.tinted - +a.tinted); // carroceria primeiro: world3d pinta a peça 0
}
