import * as THREE from "three";
import type { StageTheme } from "../theme";

function material(
  color: number,
  roughness: number,
  metalness: number,
  emissive?: number,
  emissiveIntensity = 0,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive: emissive ?? 0x000000,
    emissiveIntensity,
  });
}

function mesh(geometry: THREE.BufferGeometry, surface: THREE.Material): THREE.Mesh {
  const part = new THREE.Mesh(geometry, surface);
  part.castShadow = true;
  part.receiveShadow = true;
  return part;
}

/** Build the small, friendly rover used as the player's explorer avatar. */
export function buildCoder(theme: StageTheme): THREE.Group {
  const root = new THREE.Group();
  const bodyMaterial = material(theme.coder, 0.38, 0.2);
  const visorMaterial = material(theme.coderVisor, 0.22, 0.1, theme.coderVisor, 0.32);
  const metalMaterial = material(theme.metal, 0.28, 0.72);
  const glowMaterial = material(theme.glow, 0.2, 0.15, theme.glow, 0.85);
  const darkMaterial = material(0x1b2935, 0.3, 0.45);

  const body = mesh(new THREE.CapsuleGeometry(0.205, 0.22, 6, 12), bodyMaterial);
  body.position.y = 0.39;
  body.scale.set(1, 1.05, 0.82);
  root.add(body);

  const chest = mesh(new THREE.SphereGeometry(0.145, 16, 10), metalMaterial);
  chest.position.set(0, 0.42, 0.178);
  chest.scale.set(1.1, 0.72, 0.22);
  root.add(chest);

  const head = mesh(new THREE.SphereGeometry(0.205, 18, 12), bodyMaterial);
  head.position.y = 0.69;
  head.scale.set(1, 0.83, 0.86);
  root.add(head);

  const visor = mesh(new THREE.SphereGeometry(0.145, 18, 10), visorMaterial);
  visor.position.set(0, 0.69, 0.168);
  visor.scale.set(1.12, 0.56, 0.25);
  root.add(visor);

  const backpack = mesh(new THREE.BoxGeometry(0.25, 0.3, 0.12, 3, 4, 2), darkMaterial);
  backpack.position.set(0, 0.43, -0.19);
  backpack.geometry.computeVertexNormals();
  root.add(backpack);

  for (const side of [-1, 1]) {
    const arm = mesh(new THREE.CapsuleGeometry(0.055, 0.19, 5, 8), bodyMaterial);
    arm.position.set(side * 0.24, 0.42, 0.015);
    arm.rotation.z = side * -0.2;
    root.add(arm);

    const hand = mesh(new THREE.SphereGeometry(0.066, 10, 8), metalMaterial);
    hand.position.set(side * 0.27, 0.29, 0.035);
    hand.scale.set(0.9, 0.72, 0.9);
    root.add(hand);

    const foot = mesh(new THREE.SphereGeometry(0.105, 12, 8), darkMaterial);
    foot.position.set(side * 0.115, 0.105, 0.07);
    foot.scale.set(0.82, 0.46, 1.28);
    root.add(foot);
  }

  const antennaStem = mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.105, 8), metalMaterial);
  antennaStem.position.y = 0.92;
  root.add(antennaStem);

  const beacon = mesh(new THREE.SphereGeometry(0.052, 12, 8), glowMaterial);
  beacon.position.y = 0.995;
  root.add(beacon);

  const eye = mesh(new THREE.SphereGeometry(0.018, 8, 6), glowMaterial);
  eye.position.set(0, 0.69, 0.204);
  root.add(eye);

  return root;
}
