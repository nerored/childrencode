import * as THREE from "three";
import type { StageTheme } from "../theme";

function material(color: number, roughness = 0.8, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addMesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  meshMaterial: THREE.Material,
  position?: THREE.Vector3,
  rotation?: THREE.Euler,
  scale?: THREE.Vector3,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  if (position) mesh.position.copy(position);
  if (rotation) mesh.rotation.copy(rotation);
  if (scale) mesh.scale.copy(scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function seeded(variant: number, salt: number): number {
  const value = Math.sin((variant + 1) * (salt * 12.9898 + 78.233)) * 43758.5453;
  return value - Math.floor(value);
}

export function buildPine(variant: number, theme: StageTheme): THREE.Group {
  const group = new THREE.Group();
  const height = 1.28 + (variant % 4) * 0.14;
  const layers = 3 + (variant % 2);
  const trunkHeight = height * 0.43;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.1, trunkHeight, 8),
    material(theme.trunk, 0.95),
  );
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const canopyMaterial = material(theme.pineDark, 0.88);
  const lightMaterial = material(theme.pineLight, 0.84);
  const snowMaterial = material(theme.snow, 0.76);
  const canopyRotation = seeded(variant, 1) * Math.PI * 2;
  const canopyBase = trunkHeight + 0.02;
  for (let index = 0; index < layers; index += 1) {
    const fraction = index / (layers - 1);
    const radius = 0.31 - fraction * 0.13;
    const coneHeight = 0.38 - fraction * 0.07;
    const y = canopyBase + index * 0.19;
    addMesh(
      group,
      new THREE.ConeGeometry(radius, coneHeight, 10),
      index % 2 === 0 ? canopyMaterial : lightMaterial,
      new THREE.Vector3(0, y + coneHeight / 2, 0),
      new THREE.Euler(0, canopyRotation + index * 0.6, 0),
    );
    if (index >= layers - 2) {
      addMesh(
        group,
        new THREE.ConeGeometry(radius * 0.72, coneHeight * 0.23, 10),
        snowMaterial,
        new THREE.Vector3(0, y + coneHeight * 0.84, 0),
        new THREE.Euler(0, canopyRotation + index * 0.6, 0),
      );
    }
  }
  group.rotation.y = canopyRotation * 0.18;
  return group;
}

export function buildRock(variant: number, theme: StageTheme): THREE.Group {
  const group = new THREE.Group();
  const rockMaterial = material(theme.rock, 0.92);
  const snowMaterial = material(theme.snow, 0.8);
  const count = 2 + (variant % 3);
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + seeded(variant, 3) * 0.45;
    const radius = 0.14 + seeded(variant + index, 4) * 0.08;
    const width = 0.22 + seeded(variant + index, 5) * 0.12;
    const height = 0.19 + seeded(variant + index, 6) * 0.12;
    const geometry = new THREE.IcosahedronGeometry(0.5, 1);
    const position = new THREE.Vector3(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
    const chunk = addMesh(
      group,
      geometry,
      rockMaterial,
      position,
      new THREE.Euler(seeded(variant + index, 7), seeded(variant + index, 8), seeded(variant + index, 9)),
      new THREE.Vector3(width, height, width * (0.8 + seeded(variant + index, 10) * 0.35)),
    );
    if (index % 2 === 0) {
      addMesh(
        group,
        new THREE.SphereGeometry(0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.28),
        snowMaterial,
        new THREE.Vector3(position.x, position.y + height * 0.42, position.z),
        chunk.rotation,
        new THREE.Vector3(width * 0.75, height * 0.25, width * 0.75),
      );
    }
  }
  return group;
}

export function buildCornerMarker(theme: StageTheme): THREE.Group {
  const group = new THREE.Group();
  const edgeMaterial = material(theme.iceEdge, 0.65, 0.05);
  const topMaterial = material(theme.iceTop, 0.62, 0.04);
  const snowMaterial = material(theme.snow, 0.72);
  addMesh(group, new THREE.CylinderGeometry(0.2, 0.24, 0.14, 8), edgeMaterial, new THREE.Vector3(0, 0.07, 0));
  addMesh(
    group,
    new THREE.ConeGeometry(0.16, 0.3, 6),
    topMaterial,
    new THREE.Vector3(-0.07, 0.28, 0),
    new THREE.Euler(0, 0.25, -0.12),
  );
  addMesh(
    group,
    new THREE.ConeGeometry(0.13, 0.24, 6),
    edgeMaterial,
    new THREE.Vector3(0.1, 0.24, 0.03),
    new THREE.Euler(0, 1.1, 0.1),
  );
  addMesh(
    group,
    new THREE.ConeGeometry(0.1, 0.2, 6),
    snowMaterial,
    new THREE.Vector3(0.01, 0.48, 0),
    new THREE.Euler(0, 0.5, 0),
  );
  return group;
}
