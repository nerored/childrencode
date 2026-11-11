import * as THREE from "three";
import type { StageTheme } from "../theme";

const TAU = Math.PI * 2;
const BASE_RED = 0xd6453f;
const BASE_RED_DARK = 0xa9322c;
const FLAG_RED = 0xe23b32;

function material(color: number, roughness = 0.82, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const result = new THREE.Mesh(geometry, mat);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function addBlock(
  group: THREE.Group,
  radius: number,
  y: number,
  angle: number,
  width: number,
  height: number,
  depth: number,
  color: number,
): void {
  const block = mesh(new THREE.BoxGeometry(width, height, depth), material(color));
  block.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
  block.rotation.y = angle;
  block.scale.set(1, 1, 0.94);
  group.add(block);
}

/** Build the compact, asset-free igloo rescue base used by Stage3D. */
export function buildRescueBase(theme: StageTheme): THREE.Group {
  const root = new THREE.Group();
  root.name = "rescue-base";

  const baseRedMaterial = material(BASE_RED_DARK, 0.8);
  const snowMaterial = material(theme.snow, 0.94);
  const doorMaterial = material(theme.iglooDoor, 0.72);
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: theme.glow,
    emissive: theme.glow,
    emissiveIntensity: 1.8,
    roughness: 0.3,
  });
  const metalMaterial = material(theme.metal, 0.48, 0.18);

  // Low polygon rings make the dome read as hand-built blocks instead of a sphere.
  const rings = [
    { radius: 0.39, y: 0.17, count: 10, height: 0.14, depth: 0.22 },
    { radius: 0.31, y: 0.31, count: 9, height: 0.13, depth: 0.2 },
    { radius: 0.2, y: 0.44, count: 7, height: 0.12, depth: 0.17 },
    { radius: 0.09, y: 0.56, count: 5, height: 0.1, depth: 0.14 },
  ];
  for (let ringIndex = 0; ringIndex < rings.length; ringIndex += 1) {
    const ring = rings[ringIndex];
    const phase = ringIndex % 2 === 0 ? 0 : Math.PI / ring.count;
    for (let index = 0; index < ring.count; index += 1) {
      const angle = phase + (index * TAU) / ring.count;
      const width = (ring.radius * TAU) / ring.count * 0.86;
      const varied = 1 + (((index * 7 + ringIndex * 3) % 5) - 2) * 0.018;
      const blockColor =
        ringIndex === 0 && index % 3 === 0
          ? theme.snow
          : (index + ringIndex) % 3 === 0
            ? BASE_RED_DARK
            : BASE_RED;
      addBlock(
        root,
        ring.radius,
        ring.y,
        angle,
        width * varied,
        ring.height,
        ring.depth,
        blockColor,
      );
    }
  }

  // A shallow snow skirt hides the block bottoms and keeps the footprint grounded.
  const skirt = mesh(new THREE.CylinderGeometry(0.47, 0.5, 0.08, 16), snowMaterial);
  skirt.position.y = 0.04;
  root.add(skirt);
  const cap = mesh(new THREE.SphereGeometry(0.1, 8, 5), snowMaterial);
  cap.scale.y = 0.5;
  cap.position.y = 0.63;
  root.add(cap);

  // Tunnel and doorway are deliberately on local +Z (the approach side).
  const tunnel = mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.25, 10), baseRedMaterial);
  tunnel.rotation.x = Math.PI / 2;
  tunnel.position.set(0, 0.17, 0.4);
  root.add(tunnel);
  const doorway = mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.018, 16), doorMaterial);
  doorway.name = "doorway";
  doorway.rotation.x = Math.PI / 2;
  doorway.position.set(0, 0.17, 0.535);
  doorway.userData.role = "doorway";
  root.add(doorway);
  const lintel = mesh(new THREE.BoxGeometry(0.28, 0.1, 0.12), snowMaterial);
  lintel.position.set(0, 0.34, 0.45);
  root.add(lintel);

  // Red beacon flag on the dome: a metal pole, a wavy red cloth, and a warm finial.
  const pole = mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.42, 8), metalMaterial);
  pole.name = "flag-pole";
  pole.position.set(0, 0.81, 0);
  root.add(pole);

  const flagGeometry = new THREE.PlaneGeometry(0.3, 0.18, 6, 3);
  const flagPosition = flagGeometry.getAttribute("position") as THREE.BufferAttribute;
  for (let index = 0; index < flagPosition.count; index += 1) {
    const localX = flagPosition.getX(index);
    const localY = flagPosition.getY(index);
    const wave = Math.sin((localX / 0.3 + 0.5) * TAU) * 0.024;
    flagPosition.setZ(index, wave + (localY / 0.18) * 0.008);
  }
  flagGeometry.computeVertexNormals();
  const flag = mesh(
    flagGeometry,
    new THREE.MeshStandardMaterial({ color: FLAG_RED, roughness: 0.58, side: THREE.DoubleSide }),
  );
  flag.name = "red-flag";
  flag.position.set(0.17, 0.91, 0);
  root.add(flag);

  const finial = mesh(new THREE.OctahedronGeometry(0.05, 1), glowMaterial);
  finial.name = "flag-finial";
  finial.position.set(0, 1.03, 0);
  root.add(finial);

  return root;
}
