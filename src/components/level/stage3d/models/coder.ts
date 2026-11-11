import * as THREE from "three";
import type { StageTheme } from "../theme";

export type CoderAnimState = "idle" | "move" | "turn";

export interface CoderAnimation {
  state: CoderAnimState;
  clips: Record<CoderAnimState, THREE.AnimationClip>;
  setState(state: CoderAnimState): void;
  update(dt: number): void;
}

interface RotationKey {
  time: number;
  x?: number;
  y?: number;
  z?: number;
}

interface PositionKey {
  time: number;
  x?: number;
  y?: number;
  z?: number;
}

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

function bone(name: string, position: THREE.Vector3): THREE.Bone {
  const node = new THREE.Bone();
  node.name = name;
  node.position.copy(position);
  return node;
}

function rotationTrack(node: THREE.Bone, keys: RotationKey[]): THREE.QuaternionKeyframeTrack {
  const values: number[] = [];
  for (const key of keys) {
    const quaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(key.x ?? 0, key.y ?? 0, key.z ?? 0),
    );
    values.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  }
  return new THREE.QuaternionKeyframeTrack(
    `${node.name}.quaternion`,
    keys.map((key) => key.time),
    values,
  );
}

function positionTrack(node: THREE.Bone, keys: PositionKey[]): THREE.VectorKeyframeTrack {
  const values: number[] = [];
  for (const key of keys) {
    values.push(key.x ?? node.position.x, key.y ?? node.position.y, key.z ?? node.position.z);
  }
  return new THREE.VectorKeyframeTrack(
    `${node.name}.position`,
    keys.map((key) => key.time),
    values,
  );
}

interface RigNodes {
  hips: THREE.Bone;
  spine: THREE.Bone;
  head: THREE.Bone;
  armLeft: THREE.Bone;
  armRight: THREE.Bone;
  legLeft: THREE.Bone;
  legRight: THREE.Bone;
}

function buildClips(nodes: RigNodes): Record<CoderAnimState, THREE.AnimationClip> {
  const idle = new THREE.AnimationClip("idle", 2.4, [
    positionTrack(nodes.spine, [
      { time: 0, y: 0.24 },
      { time: 0.6, y: 0.252 },
      { time: 1.2, y: 0.24 },
      { time: 1.8, y: 0.234 },
      { time: 2.4, y: 0.24 },
    ]),
    rotationTrack(nodes.head, [
      { time: 0 },
      { time: 0.8, x: 0.02, z: 0.03 },
      { time: 1.6, x: 0.01, z: -0.025 },
      { time: 2.4 },
    ]),
    rotationTrack(nodes.armLeft, [
      { time: 0 },
      { time: 1.2, x: 0.03, z: 0.04 },
      { time: 2.4 },
    ]),
    rotationTrack(nodes.armRight, [
      { time: 0 },
      { time: 1.2, x: 0.03, z: -0.04 },
      { time: 2.4 },
    ]),
  ]);

  const move = new THREE.AnimationClip("move", 0.8, [
    rotationTrack(nodes.legLeft, [
      { time: 0 },
      { time: 0.2, x: 0.5 },
      { time: 0.4 },
      { time: 0.6, x: -0.5 },
      { time: 0.8 },
    ]),
    rotationTrack(nodes.legRight, [
      { time: 0 },
      { time: 0.2, x: -0.5 },
      { time: 0.4 },
      { time: 0.6, x: 0.5 },
      { time: 0.8 },
    ]),
    rotationTrack(nodes.armLeft, [
      { time: 0 },
      { time: 0.2, x: -0.35 },
      { time: 0.4 },
      { time: 0.6, x: 0.35 },
      { time: 0.8 },
    ]),
    rotationTrack(nodes.armRight, [
      { time: 0 },
      { time: 0.2, x: 0.35 },
      { time: 0.4 },
      { time: 0.6, x: -0.35 },
      { time: 0.8 },
    ]),
    positionTrack(nodes.spine, [
      { time: 0, y: 0.24 },
      { time: 0.2, y: 0.25 },
      { time: 0.4, y: 0.24 },
      { time: 0.6, y: 0.25 },
      { time: 0.8, y: 0.24 },
    ]),
    rotationTrack(nodes.head, [
      { time: 0 },
      { time: 0.2, z: 0.03 },
      { time: 0.4 },
      { time: 0.6, z: -0.03 },
      { time: 0.8 },
    ]),
  ]);

  const turn = new THREE.AnimationClip("turn", 0.6, [
    rotationTrack(nodes.spine, [
      { time: 0 },
      { time: 0.15, y: 0.18 },
      { time: 0.3, y: 0.18 },
      { time: 0.45, y: -0.06 },
      { time: 0.6 },
    ]),
    rotationTrack(nodes.head, [
      { time: 0 },
      { time: 0.15, y: 0.3, z: 0.03 },
      { time: 0.3, y: 0.3, z: 0.03 },
      { time: 0.45, y: -0.12, z: -0.02 },
      { time: 0.6 },
    ]),
    rotationTrack(nodes.armLeft, [
      { time: 0 },
      { time: 0.15, z: 0.12 },
      { time: 0.3, z: 0.12 },
      { time: 0.45, z: -0.04 },
      { time: 0.6 },
    ]),
    rotationTrack(nodes.armRight, [
      { time: 0 },
      { time: 0.15, z: -0.12 },
      { time: 0.3, z: -0.12 },
      { time: 0.45, z: 0.04 },
      { time: 0.6 },
    ]),
    positionTrack(nodes.spine, [
      { time: 0, y: 0.24 },
      { time: 0.3, y: 0.25 },
      { time: 0.6, y: 0.24 },
    ]),
  ]);

  return { idle, move, turn };
}

class CoderRig implements CoderAnimation {
  readonly clips: Record<CoderAnimState, THREE.AnimationClip>;
  state: CoderAnimState = "idle";
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions: Record<CoderAnimState, THREE.AnimationAction>;

  constructor(root: THREE.Object3D, clips: Record<CoderAnimState, THREE.AnimationClip>) {
    this.clips = clips;
    this.mixer = new THREE.AnimationMixer(root);
    const idle = this.mixer.clipAction(clips.idle);
    const move = this.mixer.clipAction(clips.move);
    const turn = this.mixer.clipAction(clips.turn);
    this.actions = { idle, move, turn };
    for (const action of Object.values(this.actions)) {
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.enabled = true;
      action.setEffectiveWeight(0);
      action.play();
    }
    idle.setEffectiveWeight(1);
  }

  setState(next: CoderAnimState): void {
    if (next === this.state) return;
    const previous = this.actions[this.state];
    const action = this.actions[next];
    action.reset();
    action.setEffectiveWeight(1);
    action.fadeIn(0.16);
    action.play();
    previous.fadeOut(0.16);
    this.state = next;
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }
}

/**
 * Build the small explorer robot as a bone-driven rig: every part is parented
 * to a bone (rigid binding) and the Three AnimationMixer drives idle/move/turn
 * clips through the skeleton.
 */
export function buildCoder(theme: StageTheme): THREE.Group {
  const root = new THREE.Group();
  root.name = "coder";

  const hips = bone("coder-hips", new THREE.Vector3(0, 0.12, 0));
  const spine = bone("coder-spine", new THREE.Vector3(0, 0.24, 0));
  const head = bone("coder-head", new THREE.Vector3(0, 0.33, 0));
  const armLeft = bone("coder-arm-left", new THREE.Vector3(-0.22, 0.06, 0));
  const armRight = bone("coder-arm-right", new THREE.Vector3(0.22, 0.06, 0));
  const legLeft = bone("coder-leg-left", new THREE.Vector3(-0.115, -0.02, 0.02));
  const legRight = bone("coder-leg-right", new THREE.Vector3(0.115, -0.02, 0.02));
  root.add(hips);
  hips.add(spine, legLeft, legRight);
  spine.add(head, armLeft, armRight);

  const bodyMaterial = material(theme.coder, 0.38, 0.2);
  const visorMaterial = material(theme.coderVisor, 0.22, 0.1, theme.coderVisor, 0.32);
  const metalMaterial = material(theme.metal, 0.28, 0.72);
  const glowMaterial = material(theme.glow, 0.2, 0.15, theme.glow, 0.85);
  const darkMaterial = material(0x1b2935, 0.3, 0.45);

  const body = mesh(new THREE.CapsuleGeometry(0.205, 0.22, 6, 12), bodyMaterial);
  body.position.y = 0.03;
  body.scale.set(1, 1.05, 0.82);
  spine.add(body);

  const chest = mesh(new THREE.SphereGeometry(0.145, 16, 10), metalMaterial);
  chest.position.set(0, 0.06, 0.178);
  chest.scale.set(1.1, 0.72, 0.22);
  spine.add(chest);

  const backpack = mesh(new THREE.BoxGeometry(0.25, 0.3, 0.12, 3, 4, 2), darkMaterial);
  backpack.position.set(0, 0.07, -0.19);
  spine.add(backpack);

  const headMesh = mesh(new THREE.SphereGeometry(0.205, 18, 12), bodyMaterial);
  headMesh.scale.set(1, 0.83, 0.86);
  head.add(headMesh);

  const visor = mesh(new THREE.SphereGeometry(0.145, 18, 10), visorMaterial);
  visor.position.set(0, 0, 0.168);
  visor.scale.set(1.12, 0.56, 0.25);
  head.add(visor);

  const eye = mesh(new THREE.SphereGeometry(0.018, 8, 6), glowMaterial);
  eye.position.set(0, 0, 0.204);
  head.add(eye);

  for (const [side, armBone] of [
    [-1, armLeft],
    [1, armRight],
  ] as const) {
    const arm = mesh(new THREE.CapsuleGeometry(0.055, 0.19, 5, 8), bodyMaterial);
    arm.position.set(side * 0.02, 0, 0.015);
    arm.rotation.z = side * -0.2;
    armBone.add(arm);

    const hand = mesh(new THREE.SphereGeometry(0.066, 10, 8), metalMaterial);
    hand.position.set(side * 0.05, -0.13, 0.035);
    hand.scale.set(0.9, 0.72, 0.9);
    armBone.add(hand);

    const foot = mesh(new THREE.SphereGeometry(0.105, 12, 8), darkMaterial);
    foot.position.set(0, 0.005, 0.05);
    foot.scale.set(0.82, 0.46, 1.28);
    (side === -1 ? legLeft : legRight).add(foot);
  }

  const antennaStem = mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.105, 8), metalMaterial);
  antennaStem.position.y = 0.23;
  head.add(antennaStem);

  const beacon = mesh(new THREE.SphereGeometry(0.052, 12, 8), glowMaterial);
  beacon.position.y = 0.305;
  head.add(beacon);

  const rig = new CoderRig(root, buildClips({ hips, spine, head, armLeft, armRight, legLeft, legRight }));
  root.userData.coderAnimation = rig;
  return root;
}
