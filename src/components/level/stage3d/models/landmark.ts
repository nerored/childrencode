import * as THREE from "three";
import type { StageTheme } from "../theme";

const PI2 = Math.PI * 2;

function material(color: number, roughness = 0.72, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function glowMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.25,
    roughness: 0.3,
    metalness: 0.05,
  });
}

function mesh<T extends THREE.BufferGeometry>(geometry: T, mat: THREE.Material): THREE.Mesh<T> {
  const result = new THREE.Mesh(geometry, mat);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  mat: THREE.Material,
  radialSegments = 12,
): THREE.Mesh<THREE.CylinderGeometry> {
  return mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), mat);
}

function box(width: number, height: number, depth: number, mat: THREE.Material): THREE.Mesh<THREE.BoxGeometry> {
  return mesh(new THREE.BoxGeometry(width, height, depth), mat);
}

function sphere(radius: number, mat: THREE.Material, widthSegments = 12, heightSegments = 8): THREE.Mesh<THREE.SphereGeometry> {
  return mesh(new THREE.SphereGeometry(radius, widthSegments, heightSegments), mat);
}

function addCylinderBetween(group: THREE.Group, start: THREE.Vector3, end: THREE.Vector3, radius: number, mat: THREE.Material): void {
  const delta = end.clone().sub(start);
  const part = cylinder(radius, radius, delta.length(), mat, 8);
  part.position.copy(start).add(end).multiplyScalar(0.5);
  part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  group.add(part);
}

function buildWindmill(theme: StageTheme): THREE.Group {
  const group = new THREE.Group();
  const wood = material(theme.wood, 0.82);
  const darkWood = material(theme.trunk, 0.86);
  const metal = material(theme.metal, 0.46, 0.68);
  const snow = material(theme.snow, 0.9);

  const tower = cylinder(0.32, 0.43, 1.42, wood, 10);
  tower.position.y = 0.71;
  group.add(tower);
  const roof = new THREE.ConeGeometry(0.43, 0.27, 10);
  const cap = mesh(roof, snow);
  cap.position.y = 1.555;
  group.add(cap);

  const balcony = new THREE.TorusGeometry(0.38, 0.035, 6, 16);
  const balconyRail = mesh(balcony, darkWood);
  balconyRail.rotation.x = Math.PI / 2;
  balconyRail.position.y = 1.05;
  group.add(balconyRail);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * PI2;
    const rail = cylinder(0.018, 0.018, 0.23, darkWood, 6);
    rail.position.set(Math.cos(angle) * 0.38, 1.16, Math.sin(angle) * 0.38);
    group.add(rail);
  }

  const hub = sphere(0.11, metal, 10, 6);
  hub.position.set(0, 1.43, 0.37);
  group.add(hub);
  for (let i = 0; i < 4; i += 1) {
    const sail = new THREE.Group();
    const angle = Math.PI / 4 + i * (Math.PI / 2);
    sail.rotation.z = angle;
    const spar = box(0.08, 0.76, 0.07, darkWood);
    spar.position.y = 0.39;
    sail.add(spar);
    const cloth = box(0.17, 0.52, 0.035, snow);
    cloth.position.set(0.075, 0.47, 0.015);
    sail.add(cloth);
    sail.position.set(0, 1.43, 0.39);
    group.add(sail);
  }
  return group;
}

function buildTidegate(theme: StageTheme): THREE.Group {
  const group = new THREE.Group();
  const ice = material(theme.iceTop, 0.32, 0.08);
  const edge = material(theme.iceEdge, 0.4, 0.12);
  const glow = glowMaterial(theme.glow);

  for (const x of [-0.48, 0.48]) {
    const pylon = cylinder(0.22, 0.3, 1.72, ice, 8);
    pylon.position.set(x, 0.86, 0);
    group.add(pylon);
    const cap = new THREE.ConeGeometry(0.27, 0.25, 8);
    const capMesh = mesh(cap, edge);
    capMesh.position.set(x, 1.845, 0);
    group.add(capMesh);
  }
  const arch = new THREE.TorusGeometry(0.48, 0.11, 8, 18, Math.PI);
  const archMesh = mesh(arch, ice);
  archMesh.rotation.z = Math.PI;
  archMesh.position.y = 1.42;
  group.add(archMesh);

  for (let i = 0; i < 5; i += 1) {
    const x = -0.31 + i * 0.155;
    const length = 0.12 + (i % 3) * 0.055;
    const icicle = new THREE.ConeGeometry(0.045, length, 6);
    const icicleMesh = mesh(icicle, theme.snow === theme.iceTop ? ice : material(theme.snow, 0.72));
    icicleMesh.position.set(x, 1.27 - length / 2, 0.02);
    group.add(icicleMesh);
  }
  const bell = sphere(0.13, glow, 12, 8);
  bell.position.set(0, 0.99, 0.08);
  group.add(bell);
  const bellTop = cylinder(0.035, 0.035, 0.23, edge, 8);
  bellTop.position.set(0, 1.17, 0.08);
  group.add(bellTop);
  return group;
}

function gearShape(teeth: number, innerRadius: number, outerRadius: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const points = teeth * 4;
  for (let i = 0; i < points; i += 1) {
    const radius = i % 4 === 1 || i % 4 === 2 ? outerRadius : innerRadius;
    const angle = (i / points) * PI2;
    const point = new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
    if (i === 0) shape.moveTo(point.x, point.y);
    else shape.lineTo(point.x, point.y);
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.11, 0, PI2, false);
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.018, bevelThickness: 0.018, curveSegments: 1 });
}

function buildGears(theme: StageTheme): THREE.Group {
  const group = new THREE.Group();
  const metal = material(theme.metal, 0.32, 0.82);
  const accent = material(theme.accent, 0.35, 0.72);
  const plinthMat = material(theme.iceSide, 0.82, 0.08);
  const plinth = box(1.18, 0.18, 0.82, plinthMat);
  plinth.position.y = 0.09;
  group.add(plinth);

  const first = mesh(gearShape(12, 0.31, 0.43, 0.12), metal);
  first.rotation.x = -Math.PI / 2;
  first.rotation.z = 0.12;
  first.position.set(-0.18, 0.82, 0);
  group.add(first);
  const second = mesh(gearShape(10, 0.255, 0.36, 0.12), accent);
  second.rotation.x = -Math.PI / 2;
  second.rotation.z = -0.25;
  second.position.set(0.32, 0.82, 0.02);
  group.add(second);
  for (const [x, z] of [[-0.22, 0], [0.38, 0.02]] as const) {
    const axle = cylinder(0.075, 0.075, 0.18, plinthMat, 10);
    axle.position.set(x, 0.89, z);
    group.add(axle);
  }
  return group;
}

function buildLantern(theme: StageTheme): THREE.Group {
  const group = new THREE.Group();
  const wood = material(theme.wood, 0.88);
  const metal = material(theme.metal, 0.48, 0.55);
  const glow = glowMaterial(theme.glow);
  const snow = material(theme.snow, 0.78);
  const pine = material(theme.pineDark, 0.9);

  const post = cylinder(0.105, 0.15, 1.65, wood, 8);
  post.position.y = 0.825;
  group.add(post);
  const brace = box(0.52, 0.07, 0.07, wood);
  brace.position.set(0.2, 1.48, 0);
  group.add(brace);
  const lanternBody = box(0.3, 0.34, 0.3, glow);
  lanternBody.position.set(0.43, 1.25, 0);
  group.add(lanternBody);
  const lanternTop = new THREE.ConeGeometry(0.23, 0.14, 4);
  const top = mesh(lanternTop, metal);
  top.position.set(0.43, 1.49, 0);
  group.add(top);
  for (const x of [0.3, 0.56]) {
    const rail = cylinder(0.018, 0.018, 0.36, metal, 6);
    rail.position.set(x, 1.25, 0);
    group.add(rail);
  }
  const pineBase = cylinder(0.13, 0.18, 0.18, wood, 7);
  pineBase.position.set(-0.34, 0.09, 0.08);
  group.add(pineBase);
  for (let i = 0; i < 3; i += 1) {
    const tier = new THREE.ConeGeometry(0.29 - i * 0.07, 0.45, 7);
    const tierMesh = mesh(tier, pine);
    tierMesh.position.set(-0.34, 0.28 + i * 0.25, 0.08);
    group.add(tierMesh);
    const frost = new THREE.ConeGeometry(0.13 - i * 0.025, 0.08, 7);
    const frostMesh = mesh(frost, snow);
    frostMesh.position.set(-0.34, 0.48 + i * 0.25, 0.08);
    group.add(frostMesh);
  }
  return group;
}

/** Build the deterministic decorative centerpiece for a themed stage. */
export function buildLandmark(theme: StageTheme): THREE.Group {
  let model: THREE.Group;
  switch (theme.landmark) {
    case "windmill":
      model = buildWindmill(theme);
      break;
    case "tidegate":
      model = buildTidegate(theme);
      break;
    case "gears":
      model = buildGears(theme);
      break;
    case "lantern":
      model = buildLantern(theme);
      break;
  }
  const scale = THREE.MathUtils.clamp(theme.landmarkScale, 0.8, 1.3);
  model.scale.setScalar(scale);
  return model;
}
