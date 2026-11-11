import * as THREE from "three";

const BODY_COLOR = 0x1c2733;
const BELLY_COLOR = 0xf2f8fb;
const BEAK_COLOR = 0xe08a2e;
const FOOT_COLOR = 0xd67a27;
const EYE_COLOR = 0x101820;
const GLINT_COLOR = 0xffffff;

function standard(color: number, roughness = 0.72, metalness = 0.02): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addMesh(group: THREE.Group, mesh: THREE.Mesh): void {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function ellipsoid(
  group: THREE.Group,
  material: THREE.Material,
  position: THREE.Vector3,
  scale: THREE.Vector3,
  segments = 16,
  rings = 10,
): void {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, rings), material);
  mesh.position.copy(position);
  mesh.scale.copy(scale);
  addMesh(group, mesh);
}

export function buildPenguin(variant: number): THREE.Group {
  const normalized = ((Math.trunc(variant) % 4) + 4) % 4;
  const scale = [1, 1.04, 1.06, 1.02][normalized];
  const yaw = [-0.06, 0.045, 0.1, -0.09][normalized];
  const headTilt = [-0.035, 0.025, -0.06, 0.05][normalized];
  const wingLift = [0.04, 0.075, 0.02, 0.06][normalized];

  const group = new THREE.Group();
  group.scale.set(scale * 0.7, scale, scale * 0.7);
  group.rotation.y = yaw;

  const body = standard(BODY_COLOR, 0.82);
  const belly = standard(BELLY_COLOR, 0.68);
  const beak = standard(BEAK_COLOR, 0.48);
  const feet = standard(FOOT_COLOR, 0.55);
  const eyes = standard(EYE_COLOR, 0.35);
  const glint = standard(GLINT_COLOR, 0.25);

  // The contact plane is y=0; the body is an upright, gently tapered ovoid.
  ellipsoid(group, body, new THREE.Vector3(0, 0.38, 0), new THREE.Vector3(0.29, 0.39, 0.22), 20, 14);
  ellipsoid(group, body, new THREE.Vector3(0, 0.68, -0.01), new THREE.Vector3(0.235, 0.235, 0.21), 18, 12);

  // A shallow overlapping oval gives the belly a readable front-facing patch.
  ellipsoid(group, belly, new THREE.Vector3(0, 0.39, 0.205), new THREE.Vector3(0.205, 0.285, 0.035), 18, 12);
  ellipsoid(group, belly, new THREE.Vector3(0, 0.61, 0.175), new THREE.Vector3(0.16, 0.16, 0.035), 16, 10);

  const wingGeometry = new THREE.SphereGeometry(1, 14, 8);
  const leftWing = new THREE.Mesh(wingGeometry, body);
  leftWing.position.set(-0.245, 0.42 + wingLift, 0.015);
  leftWing.scale.set(0.115, 0.3, 0.095);
  leftWing.rotation.set(0.08, -0.34, -0.28);
  addMesh(group, leftWing);
  const rightWing = new THREE.Mesh(wingGeometry, body);
  rightWing.position.set(0.245, 0.42 + wingLift, 0.015);
  rightWing.scale.set(0.115, 0.3, 0.095);
  rightWing.rotation.set(0.08, 0.34, 0.28);
  addMesh(group, rightWing);

  const head = group.children[1];
  head.rotation.z = headTilt;

  // Cone axis is +Y by default; rotate the beak to project from the face at +Z.
  const beakMesh = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 12), beak);
  beakMesh.position.set(0, 0.665, 0.25);
  beakMesh.rotation.x = Math.PI / 2;
  addMesh(group, beakMesh);

  for (const side of [-1, 1]) {
    ellipsoid(group, eyes, new THREE.Vector3(side * 0.078, 0.73, 0.195), new THREE.Vector3(0.034, 0.034, 0.022), 12, 8);
    ellipsoid(group, glint, new THREE.Vector3(side * 0.068, 0.742, 0.215), new THREE.Vector3(0.011, 0.011, 0.008), 8, 6);
  }

  // Flattened orange ovals read as webbed feet while keeping the footprint tight.
  for (const side of [-1, 1]) {
    ellipsoid(group, feet, new THREE.Vector3(side * 0.115, 0.075, 0.095), new THREE.Vector3(0.115, 0.045, 0.14), 14, 8);
    ellipsoid(group, feet, new THREE.Vector3(side * 0.115, 0.076, 0.17), new THREE.Vector3(0.092, 0.035, 0.07), 12, 8);
  }

  return group;
}
