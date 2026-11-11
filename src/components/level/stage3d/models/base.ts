import * as THREE from "three";
import type { StageTheme } from "../theme";

const TAU = Math.PI * 2;

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

  const iglooMaterial = material(theme.igloo, 0.9);
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
      addBlock(
        root,
        ring.radius,
        ring.y,
        angle,
        width * varied,
        ring.height,
        ring.depth,
        ringIndex === 0 && index % 3 === 0 ? theme.snow : theme.igloo,
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
  const tunnel = mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.25, 10), iglooMaterial);
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

  // Small beacon: intentionally no PointLight, so scene lighting remains centralized.
  const pole = mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.34, 8), metalMaterial);
  pole.position.set(-0.27, 0.77, 0.02);
  root.add(pole);
  const marker = mesh(new THREE.OctahedronGeometry(0.065, 1), glowMaterial);
  marker.name = "beacon-marker";
  marker.position.set(-0.27, 0.96, 0.02);
  marker.userData.role = "beacon";
  root.add(marker);
  const pennant = mesh(new THREE.BufferGeometry(), material(theme.accent, 0.8));
  const pennantVertices = new Float32Array([
    -0.27, 0.88, 0.02,
    -0.27, 0.78, 0.02,
    -0.08, 0.84, 0.02,
  ]);
  pennant.geometry.setAttribute("position", new THREE.BufferAttribute(pennantVertices, 3));
  pennant.geometry.computeVertexNormals();
  pennant.geometry.setIndex([0, 1, 2]);
  pennant.name = "beacon-pennant";
  root.add(pennant);

  return root;
}
