import type { Command, Direction } from "../../domain/types";

export const SNAP_DISTANCE_PX = 44;

export type GraphEdge = "next" | "body" | "then" | "else";
export type GraphAddress = string;

export interface DragVector {
  dx: number;
  dy: number;
}

export interface SnapTarget<A extends string> {
  address: A;
  edge: GraphEdge;
  x: number;
  y: number;
}

export interface ResolvedSnap<A extends string> extends SnapTarget<A> {
  distance: number;
}

export function preferredEdge(vector: DragVector): GraphEdge {
  return Math.abs(vector.dy) >= Math.abs(vector.dx) ? "next" : "body";
}

export function pickSnap<A extends string>(
  targets: readonly SnapTarget<A>[],
  pointer: { x: number; y: number },
  vector: DragVector,
): ResolvedSnap<A> | null {
  let best: ResolvedSnap<A> | null = null;
  for (const target of targets) {
    const distance = Math.hypot(pointer.x + vector.dx - target.x, pointer.y + vector.dy - target.y);
    if (distance > SNAP_DISTANCE_PX) continue;
    if (best === null || distance < best.distance) best = { ...target, distance };
  }
  return best;
}

export type CommandNode = Command;
export type { Direction };
