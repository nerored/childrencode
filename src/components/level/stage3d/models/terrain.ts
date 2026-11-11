import * as THREE from "three";
import type { StageGround } from "../sceneModel";
import type { StageTheme } from "../theme";

const TILE = 0.94;

function standard(color: number, roughness: number, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function visitedColor(base: number, accent: number, visited: boolean, amount: number): number {
  if (!visited) return base;
  const baseColor = new THREE.Color(base);
  const accentColor = new THREE.Color(accent);
  return baseColor.lerp(accentColor, amount).getHex();
}

function addMesh(group: THREE.Group, mesh: THREE.Mesh): void {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function box(
  group: THREE.Group,
  size: THREE.Vector3,
  position: THREE.Vector3,
  material: THREE.Material,
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  addMesh(group, mesh);
  return mesh;
}

function buildIce(ground: StageGround, theme: StageTheme): THREE.Group {
  const group = new THREE.Group();
  box(group, new THREE.Vector3(TILE, 0.18, TILE), new THREE.Vector3(0, -0.09, 0), standard(theme.iceSide, 0.72));
  const topMaterial = standard(visitedColor(theme.iceTop, theme.accent, ground.visited, 0.18), 0.6);
  box(group, new THREE.Vector3(0.88, 0.025, 0.88), new THREE.Vector3(0, -0.002, 0), topMaterial);

  const frost = standard(theme.snow, 0.82);
  const frostGeometry = new THREE.CylinderGeometry(0.025, 0.04, 0.012, 6);
  for (let index = 0; index < 3; index += 1) {
    const mesh = new THREE.Mesh(frostGeometry, frost);
    const angle = ((ground.variant * 73 + index * 121) % 360) * Math.PI / 180;
    const radius = 0.21 + ((ground.variant + index) % 3) * 0.08;
    mesh.position.set(Math.cos(angle) * radius, 0.014, Math.sin(angle) * radius);
    mesh.scale.set(1.8, 1, 0.7);
    addMesh(group, mesh);
  }
  return group;
}

function buildWater(ground: StageGround, theme: StageTheme): THREE.Group {
  const group = new THREE.Group();
  box(group, new THREE.Vector3(0.9, 0.2, 0.9), new THREE.Vector3(0, -0.18, 0), standard(theme.waterDeep, 0.9));

  const waterMaterial = new THREE.MeshPhysicalMaterial({
    color: visitedColor(theme.waterTop, theme.accent, ground.visited, 0.16),
    roughness: 0.16,
    metalness: 0.06,
    transmission: 0,
    transparent: true,
    opacity: 0.94,
    envMapIntensity: 1.2,
    clearcoat: 0.35,
    clearcoatRoughness: 0.12,
  });
  waterMaterial.emissive.setHex(visitedColor(theme.waterDeep, theme.accent, ground.visited, 0.08));
  waterMaterial.emissiveIntensity = ground.visited ? 0.12 : 0.04;
  const water = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.025, 0.86), waterMaterial);
  water.position.y = -0.06;
  water.userData.kind = "water";
  addMesh(group, water);

  const rimMaterial = standard(theme.iceEdge, 0.5);
  for (const [x, z, sx, sz] of [
    [0, -0.435, 0.9, 0.035],
    [0, 0.435, 0.9, 0.035],
    [-0.435, 0, 0.035, 0.9],
    [0.435, 0, 0.035, 0.9],
  ] as const) {
    box(group, new THREE.Vector3(sx, 0.035, sz), new THREE.Vector3(x, -0.025, z), rimMaterial);
  }
  return group;
}

function buildBridge(ground: StageGround, theme: StageTheme): THREE.Group {
  const group = new THREE.Group();
  const deckMaterial = standard(visitedColor(theme.bridge, theme.accent, ground.visited, 0.2), 0.62, 0.08);
  const railMaterial = standard(theme.wood, 0.65, 0.04);
  for (let index = 0; index < 4; index += 1) {
    const offset = -0.33 + index * 0.22;
    box(group, new THREE.Vector3(0.82, 0.07, 0.16), new THREE.Vector3(0, 0.0, offset), deckMaterial);
  }
  for (const x of [-0.38, 0.38]) {
    box(group, new THREE.Vector3(0.055, 0.04, 0.84), new THREE.Vector3(x, 0.05, 0), railMaterial);
  }
  for (const z of [-0.34, 0.34]) {
    box(group, new THREE.Vector3(0.09, 0.13, 0.09), new THREE.Vector3(-0.31, -0.08, z), railMaterial);
    box(group, new THREE.Vector3(0.09, 0.13, 0.09), new THREE.Vector3(0.31, -0.08, z), railMaterial);
  }
  return group;
}

export function buildGroundCell(ground: StageGround, theme: StageTheme): THREE.Group {
  switch (ground.kind) {
    case "water":
      return buildWater(ground, theme);
    case "bridge":
      return buildBridge(ground, theme);
    case "ice":
      return buildIce(ground, theme);
  }
}
