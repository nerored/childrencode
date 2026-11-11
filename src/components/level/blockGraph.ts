import type { Command, Direction } from "../../domain/types";

export const SNAP_DISTANCE_PX = 44;
export const SNAP_ZONE_MARGIN_X = 24;
export const SNAP_ZONE_MARGIN_Y = 88;

export type GraphEdge = "next" | "body" | "then" | "else";
export type GraphAddress = string;

export interface DragVector {
  dx: number;
  dy: number;
}

export interface SnapZone {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SnapRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SnapTarget<A extends string> {
  address: A;
  edge: GraphEdge;
  x: number;
  y: number;
  zone?: SnapZone;
}

export interface ResolvedSnap<A extends string> extends SnapTarget<A> {
  distance: number;
}

export function socketZone(rect: SnapRect): SnapZone {
  return {
    left: rect.left - SNAP_ZONE_MARGIN_X,
    top: rect.top - SNAP_ZONE_MARGIN_Y,
    right: rect.right + SNAP_ZONE_MARGIN_X,
    bottom: rect.bottom + SNAP_ZONE_MARGIN_Y,
  };
}

export function preferredEdge(vector: DragVector): GraphEdge {
  return Math.abs(vector.dy) >= Math.abs(vector.dx) ? "next" : "body";
}

function distanceToZone(zone: SnapZone, x: number, y: number): number {
  const dx = x < zone.left ? zone.left - x : x > zone.right ? x - zone.right : 0;
  const dy = y < zone.top ? zone.top - y : y > zone.bottom ? y - zone.bottom : 0;
  return Math.hypot(dx, dy);
}

export function pickSnap<A extends string>(
  targets: readonly SnapTarget<A>[],
  pointer: { x: number; y: number },
): ResolvedSnap<A> | null {
  const anchorX = pointer.x;
  const anchorY = pointer.y;
  let best: ResolvedSnap<A> | null = null;
  let bestZoneDistance = Number.POSITIVE_INFINITY;

  for (const target of targets) {
    const pointDistance = Math.hypot(anchorX - target.x, anchorY - target.y);
    let zoneDistance: number;

    if (target.zone === undefined) {
      if (pointDistance > SNAP_DISTANCE_PX) continue;
      zoneDistance = pointDistance;
    } else {
      zoneDistance = distanceToZone(target.zone, anchorX, anchorY);
      if (zoneDistance > 0) continue;
    }

    if (
      best === null ||
      zoneDistance < bestZoneDistance ||
      (zoneDistance === bestZoneDistance && pointDistance < best.distance)
    ) {
      best = { ...target, distance: pointDistance };
      bestZoneDistance = zoneDistance;
    }
  }

  return best;
}

export type CommandNode = Command;
export type { Direction };
