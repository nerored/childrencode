import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { LevelSpec } from "../../../domain/types";
import type { StageFrame } from "../playback";
import { buildStageScene, cellToWorld, directionToYaw, type StageGround } from "./sceneModel";
import { buildCoder } from "./models/coder";
import { buildRescueBase } from "./models/base";
import { buildCornerMarker, buildPine } from "./models/flora";
import { buildLandmark } from "./models/landmark";
import { buildPenguin } from "./models/penguin";
import { buildGroundCell } from "./models/terrain";

interface GroundHandle {
  ground: StageGround;
  group: THREE.Group;
}

interface PenguinHandle {
  key: string;
  group: THREE.Group;
  collected: boolean;
  rescueTime: number;
}

interface RescueAnimation {
  ring: THREE.Mesh;
  time: number;
}

const MAX_DT = 0.05;
const TAU = Math.PI * 2;

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  const delta = THREE.MathUtils.euclideanModulo(target - current + Math.PI, TAU) - Math.PI;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

function disposeMaterial(material: THREE.Material): void {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) value.dispose();
  }
  material.dispose();
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) mesh.material.forEach(disposeMaterial);
    else if (mesh.material) disposeMaterial(mesh.material);
  });
}

export class StageScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly clock = new THREE.Clock();
  private readonly content = new THREE.Group();
  private readonly dynamic = new THREE.Group();
  private readonly snow = new THREE.Group();
  private readonly groundHandles = new Map<string, GroundHandle>();
  private readonly penguinHandles = new Map<string, PenguinHandle>();
  private readonly rescueAnimations: RescueAnimation[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private visibilityHandler: (() => void) | null = null;
  private rafId: number | null = null;
  private pmremTexture: THREE.Texture | null = null;
  private backgroundTexture: THREE.CanvasTexture | null = null;
  private level: LevelSpec | null = null;
  private spec: ReturnType<typeof buildStageScene> | null = null;
  private agent: THREE.Group | null = null;
  private targetAgentPosition = new THREE.Vector3();
  private targetAgentYaw = 0;
  private agentInitialized = false;
  private snowData: Array<{ position: THREE.Vector3; speed: number; phase: number }> = [];
  private disposed = false;
  private paused = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = 1.35;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 32;

    this.scene.add(this.content, this.dynamic, this.snow);
    this.installLighting();
    this.installEnvironment();
    this.installSnow();
    this.installResizeObserver();
    this.visibilityHandler = () => {
      this.paused = document.hidden;
      if (!this.paused) this.clock.getDelta();
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
    this.paused = document.hidden;
    this.resize();
    this.animate();
  }

  setLevel(level: LevelSpec, frame: StageFrame | null): void {
    if (this.disposed) return;
    this.level = level;
    this.clearContent();
    this.spec = buildStageScene(level, frame);
    this.setBackground(this.spec.theme.sky, this.spec.theme.fog);
    this.scene.fog = new THREE.Fog(this.spec.theme.fog, Math.max(this.spec.width, this.spec.height) * 1.8, Math.max(this.spec.width, this.spec.height) * 4.8);
    this.rebuildLighting(this.spec.width, this.spec.height, this.spec.theme);
    this.buildContent();
    this.resetCamera();
  }

  setFrame(frame: StageFrame | null): void {
    if (this.disposed || this.level === null || this.spec === null) return;
    const next = buildStageScene(this.level, frame);
    const nextVisited = new Map(next.ground.map((ground) => [`${ground.x},${ground.y}`, ground.visited]));
    for (const [key, handle] of this.groundHandles) {
      const visited = nextVisited.get(key) ?? false;
      if (visited !== handle.ground.visited) {
        const replacement = buildGroundCell({ ...handle.ground, visited }, next.theme);
        replacement.position.copy(handle.group.position);
        this.content.remove(handle.group);
        disposeObject(handle.group);
        this.content.add(replacement);
        handle.group = replacement;
        handle.ground = { ...handle.ground, visited };
      }
    }
    const nextRescued = new Set(next.penguins.filter((penguin) => penguin.collected).map((penguin) => `${penguin.x},${penguin.y}`));
    for (const [key, handle] of this.penguinHandles) {
      const collected = nextRescued.has(key);
      if (collected && !handle.collected) {
        handle.collected = true;
        handle.rescueTime = 0;
        this.createRescueRing(handle.group.position, next.theme.glow);
      }
    }
    this.spec = next;
    this.targetAgentPosition.copy(this.worldPosition(next.agent.x, next.agent.y));
    this.targetAgentYaw = directionToYaw(next.agent.direction);
  }

  resetCamera(): void {
    if (this.spec === null) return;
    const span = Math.max(this.spec.width, this.spec.height);
    const distance = THREE.MathUtils.clamp(span * 1.55 + 3, 4.5, 32);
    this.controls.target.set(0, 0.15, 0);
    const horizontal = distance * Math.sin(0.9);
    this.camera.position.set(horizontal / Math.sqrt(2), distance * Math.cos(0.9), horizontal / Math.sqrt(2));
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  orbitBy(deltaRadians: number): void {
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaRadians);
    this.camera.position.copy(this.controls.target).add(offset);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  zoomBy(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) return;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = THREE.MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(offset.normalize().multiplyScalar(distance));
    this.controls.update();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.rafId !== null) window.cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.visibilityHandler) document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.visibilityHandler = null;
    this.controls.dispose();
    disposeObject(this.scene);
    this.backgroundTexture?.dispose();
    this.backgroundTexture = null;
    this.pmremTexture?.dispose();
    this.pmremTexture = null;
    this.renderer.dispose();
    this.groundHandles.clear();
    this.penguinHandles.clear();
    this.rescueAnimations.length = 0;
  }

  private installLighting(): void {
    const hemisphere = new THREE.HemisphereLight(0xdcefff, 0x45616f, 1.15);
    hemisphere.userData.stageLight = true;
    const ambient = new THREE.AmbientLight(0xffffff, 0.06);
    ambient.userData.stageLight = true;
    this.scene.add(hemisphere, ambient);
  }

  private installEnvironment(): void {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.pmremTexture = environment.texture;
    this.scene.environment = this.pmremTexture;
    pmrem.dispose();
  }

  private rebuildLighting(width: number, height: number, theme: ReturnType<typeof buildStageScene>["theme"]): void {
    this.scene.children.filter((child) => child.userData.stageLight).forEach((child) => {
      this.scene.remove(child);
      disposeObject(child);
    });
    const span = Math.max(width, height);
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.userData.stageLight = true;
    sun.position.set(span * 0.8, span * 1.8, span * 0.7);
    sun.castShadow = true;
    const shadowSize = span > 7 ? 1024 : 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    sun.shadow.camera.left = -span;
    sun.shadow.camera.right = span;
    sun.shadow.camera.top = span;
    sun.shadow.camera.bottom = -span;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = span * 5;
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.035;
    this.scene.add(sun);
    const baseLight = new THREE.PointLight(theme.glow, 2.1, 5.5, 2);
    baseLight.userData.stageLight = true;
    const basePosition = this.worldPosition(this.spec?.base.x ?? 0, this.spec?.base.y ?? 0);
    baseLight.position.set(basePosition.x, 1, basePosition.z);
    this.scene.add(baseLight);
  }

  private setBackground(topColor: number, bottomColor: number): void {
    this.backgroundTexture?.dispose();
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (context === null) {
      this.scene.background = new THREE.Color(topColor);
      this.backgroundTexture = null;
      return;
    }
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `#${new THREE.Color(topColor).getHexString()}`);
    gradient.addColorStop(1, `#${new THREE.Color(bottomColor).getHexString()}`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    this.backgroundTexture = new THREE.CanvasTexture(canvas);
    this.backgroundTexture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = this.backgroundTexture;
  }

  private installSnow(): void {
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.045, transparent: true, opacity: 0.7, depthWrite: false });
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(420 * 3);
    for (let index = 0; index < 420; index += 1) {
      const seed = index + 1;
      const x = ((seed * 37) % 101) / 100 - 0.5;
      const y = ((seed * 67) % 101) / 100;
      const z = ((seed * 97) % 101) / 100 - 0.5;
      positions[index * 3] = x * 12;
      positions[index * 3 + 1] = y * 8;
      positions[index * 3 + 2] = z * 12;
      this.snowData.push({ position: new THREE.Vector3(positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]), speed: 0.25 + ((seed * 13) % 17) / 40, phase: seed * 0.31 });
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.snow.add(new THREE.Points(geometry, material));
  }

  private installResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => this.resize());
    if (this.canvas.parentElement) this.resizeObserver.observe(this.canvas.parentElement);
  }

  private resize(): void {
    const parent = this.canvas.parentElement;
    const width = Math.max(1, parent?.clientWidth ?? this.canvas.clientWidth ?? 1);
    const height = Math.max(1, parent?.clientHeight ?? this.canvas.clientHeight ?? 1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private clearContent(): void {
    for (const child of [...this.content.children]) {
      this.content.remove(child);
      disposeObject(child);
    }
    for (const child of [...this.dynamic.children]) {
      this.dynamic.remove(child);
      disposeObject(child);
    }
    this.groundHandles.clear();
    this.penguinHandles.clear();
    this.rescueAnimations.length = 0;
  }

  private buildContent(): void {
    if (this.spec === null) return;
    const { width, height, theme } = this.spec;
    for (const ground of this.spec.ground) {
      const group = buildGroundCell(ground, theme);
      group.position.copy(this.worldPosition(ground.x, ground.y));
      this.content.add(group);
      this.groundHandles.set(`${ground.x},${ground.y}`, { ground, group });
    }
    for (const tree of this.spec.trees) {
      const group = buildPine(tree.variant, theme);
      group.position.copy(this.worldPosition(tree.x, tree.y));
      this.content.add(group);
    }
    for (const corner of this.spec.corners) {
      const group = buildCornerMarker(theme);
      group.position.copy(this.worldPosition(corner.x, corner.y));
      this.content.add(group);
    }
    for (const penguin of this.spec.penguins) {
      const group = buildPenguin(penguin.variant);
      group.position.copy(this.worldPosition(penguin.x, penguin.y));
      group.visible = !penguin.collected;
      this.content.add(group);
      this.penguinHandles.set(`${penguin.x},${penguin.y}`, { key: `${penguin.x},${penguin.y}`, group, collected: penguin.collected, rescueTime: penguin.collected ? 1 : -1 });
    }
    const base = buildRescueBase(theme);
    base.position.copy(this.worldPosition(this.spec.base.x, this.spec.base.y));
    this.content.add(base);
    this.agent = buildCoder(theme);
    this.dynamic.add(this.agent);
    this.agentInitialized = false;
    this.targetAgentPosition.copy(this.worldPosition(this.spec.agent.x, this.spec.agent.y));
    this.targetAgentYaw = directionToYaw(this.spec.agent.direction);
    const landmark = buildLandmark(theme);
    const landmarkPosition = cellToWorld(width - 1, 0, width, height);
    landmark.position.set(landmarkPosition.x + 1.25, 0.2, landmarkPosition.z - 1.25);
    landmark.rotation.y = Math.atan2(-landmark.position.x, -landmark.position.z);
    this.content.add(landmark);
    const groundWidth = width + 2.4;
    const groundDepth = height + 2.4;
    const island = new THREE.Group();
    const iceSide = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.35, 64),
      new THREE.MeshStandardMaterial({ color: theme.iceSide, roughness: 0.8 }),
    );
    iceSide.scale.set(groundWidth, 1, groundDepth);
    iceSide.position.y = -0.335;
    iceSide.receiveShadow = true;
    island.add(iceSide);
    const snowTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.03, 64),
      new THREE.MeshStandardMaterial({ color: theme.snow, roughness: 0.9 }),
    );
    snowTop.scale.set(groundWidth, 1, groundDepth);
    snowTop.position.y = -0.175;
    snowTop.receiveShadow = true;
    island.add(snowTop);
    this.content.add(island);
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.16, 48),
      new THREE.MeshStandardMaterial({ color: theme.iceTop, roughness: 0.68 }),
    );
    plinth.position.set(landmark.position.x, -0.08, landmark.position.z);
    plinth.receiveShadow = true;
    this.content.add(plinth);
  }

  private worldPosition(x: number, y: number): THREE.Vector3 {
    if (this.spec === null) return new THREE.Vector3();
    const point = cellToWorld(x, y, this.spec.width, this.spec.height);
    return new THREE.Vector3(point.x, 0, point.z);
  }

  private createRescueRing(position: THREE.Vector3, color: number): void {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.18, 24), material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    ring.position.y = 0.025;
    this.dynamic.add(ring);
    this.rescueAnimations.push({ ring, time: 0 });
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.rafId = window.requestAnimationFrame(this.animate);
    if (this.paused) return;
    const dt = Math.min(this.clock.getDelta(), MAX_DT);
    this.controls.update();
    this.updateAgent(dt);
    this.updateSnow(dt);
    this.updateWater(dt);
    this.updateRescues(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private updateAgent(dt: number): void {
    if (this.agent === null) return;
    if (!this.agentInitialized) {
      this.agent.position.copy(this.targetAgentPosition);
      this.agent.rotation.y = this.targetAgentYaw;
      this.agentInitialized = true;
      return;
    }
    const blend = 1 - Math.exp(-dt * 10);
    this.agent.position.lerp(this.targetAgentPosition, blend);
    this.agent.rotation.y = dampAngle(this.agent.rotation.y, this.targetAgentYaw, 10, dt);
  }

  private updateSnow(dt: number): void {
    const points = this.snow.children[0] as THREE.Points | undefined;
    const attribute = points?.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (!attribute) return;
    for (let index = 0; index < this.snowData.length; index += 1) {
      const flake = this.snowData[index];
      flake.position.y -= flake.speed * dt;
      flake.position.x += Math.sin(flake.phase + flake.position.y) * dt * 0.03;
      if (flake.position.y < -0.2) flake.position.y = 8;
      attribute.setXYZ(index, flake.position.x, flake.position.y, flake.position.z);
    }
    attribute.needsUpdate = true;
  }

  private updateWater(dt: number): void {
    const elapsed = this.clock.elapsedTime;
    this.content.traverse((object) => {
      if (object.userData.kind !== "water") return;
      const mesh = object as THREE.Mesh;
      const material = mesh.material as THREE.MeshPhysicalMaterial;
      material.envMapIntensity = 1.55 + Math.sin(elapsed * 1.8 + mesh.id) * 0.3;
      material.emissiveIntensity = 0.06 + Math.sin(elapsed * 1.3 + mesh.id) * 0.025;
      mesh.position.y = -0.06 + Math.sin(elapsed * 1.5 + mesh.id) * 0.003 * Math.min(dt * 60, 1);
    });
  }

  private updateRescues(dt: number): void {
    for (const handle of this.penguinHandles.values()) {
      if (!handle.collected || handle.rescueTime < 0) continue;
      handle.rescueTime += dt;
      const progress = THREE.MathUtils.clamp(handle.rescueTime / 0.55, 0, 1);
      handle.group.scale.setScalar(Math.max(0.001, 1 - progress));
      handle.group.position.y = progress * 0.35;
      if (progress >= 1) handle.group.visible = false;
    }
    for (let index = this.rescueAnimations.length - 1; index >= 0; index -= 1) {
      const animation = this.rescueAnimations[index];
      animation.time += dt;
      const progress = THREE.MathUtils.clamp(animation.time / 0.7, 0, 1);
      animation.ring.scale.setScalar(1 + progress * 2.4);
      (animation.ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - progress);
      if (progress >= 1) {
        this.dynamic.remove(animation.ring);
        disposeObject(animation.ring);
        this.rescueAnimations.splice(index, 1);
      }
    }
  }
}

