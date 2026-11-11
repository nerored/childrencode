import { expect, test } from "bun:test";
import {
  chooseSnap,
  pickSnap,
  preferredEdge,
  SNAP_DISTANCE_PX,
  SNAP_ZONE_MARGIN_X,
  SNAP_ZONE_MARGIN_Y,
  snapTargetDistance,
  socketZone,
} from "./blockGraph";
import type { SnapTarget } from "./blockGraph";

const sockets: SnapTarget<"entry" | "a" | "b">[] = [
  { address: "entry", edge: "next", x: 100, y: 100 },
  { address: "a", edge: "next", x: 100, y: 200 },
  { address: "b", edge: "body", x: 300, y: 100 },
];

test("snaps to the socket under the dragged block edge", () => {
  const snap = pickSnap(sockets, { x: 95, y: 194 });
  expect(snap?.address).toBe("a");
  expect(snap?.edge).toBe("next");
});

test("returns null when every socket is beyond the magnet radius", () => {
  const far = SNAP_DISTANCE_PX + 10;
  expect(pickSnap(sockets, { x: 100 + far, y: 100 + far })).toBeNull();
});

test("the nearest socket wins when two are in range", () => {
  const snap = pickSnap(sockets, { x: 100, y: 160 });
  expect(snap?.address).toBe("a");
});

test("a body socket is reachable sideways", () => {
  const snap = pickSnap(sockets, { x: 290, y: 100 });
  expect(snap?.address).toBe("b");
  expect(snap?.edge).toBe("body");
});

test("the preferred edge follows the dominant drag axis", () => {
  expect(preferredEdge({ dx: 2, dy: 30 })).toBe("next");
  expect(preferredEdge({ dx: 30, dy: 2 })).toBe("body");
});

const wideZone = socketZone({ left: 100, top: 100, right: 524, bottom: 180 });
const wide: SnapTarget<"wide">[] = [
  { address: "wide", edge: "next", x: 100, y: 100, zone: wideZone },
];

test("the snap zone is larger than the source block", () => {
  expect(wideZone.left).toBe(100 - SNAP_ZONE_MARGIN_X);
  expect(wideZone.right).toBe(524 + SNAP_ZONE_MARGIN_X);
  expect(wideZone.top).toBe(100 - SNAP_ZONE_MARGIN_Y);
  expect(wideZone.bottom).toBe(180 + SNAP_ZONE_MARGIN_Y);
  expect(wideZone.right - wideZone.left).toBeGreaterThan(424);
  expect(wideZone.bottom - wideZone.top).toBeGreaterThan(80);
});

test("snaps from the far side of a wide block", () => {
  expect(pickSnap(wide, { x: 500, y: 140 })?.address).toBe("wide");
});

test("snaps from outside the block footprint", () => {
  expect(pickSnap(wide, { x: 540, y: 140 })?.address).toBe("wide");
});

test("does not snap beyond the expanded zone", () => {
  expect(pickSnap(wide, { x: 570, y: 140 })).toBeNull();
});

test("the nearest socket point wins when expanded zones overlap", () => {
  const overlapping: SnapTarget<"above" | "below">[] = [
    { address: "above", edge: "next", x: 100, y: 100, zone: { left: 0, top: 0, right: 600, bottom: 260 } },
    { address: "below", edge: "next", x: 100, y: 200, zone: { left: 0, top: 0, right: 600, bottom: 260 } },
  ];
  expect(pickSnap(overlapping, { x: 300, y: 190 })?.address).toBe("below");
});

test("a zoned socket is measured from its zone centre", () => {
  const target: SnapTarget<"slot"> = {
    address: "slot",
    edge: "next",
    x: 100,
    y: 100,
    zone: { left: 0, top: 60, right: 300, bottom: 140 },
  };
  expect(snapTargetDistance(target, 150, 100)).toBe(0);
});

test("stacked sockets choose the socket under the pointer", () => {
  const above: SnapTarget<"above" | "below"> = {
    address: "above",
    edge: "next",
    x: 100,
    y: 100,
    zone: socketZone({ left: 100, top: 100, right: 310, bottom: 100 }),
  };
  const below: SnapTarget<"above" | "below"> = {
    address: "below",
    edge: "next",
    x: 100,
    y: 156,
    zone: socketZone({ left: 100, top: 156, right: 310, bottom: 156 }),
  };
  const nearest = pickSnap([above, below], { x: 205, y: 156 });
  expect(nearest?.address).toBe("below");
  expect(chooseSnap(nearest, above, { x: 205, y: 156 })?.address).toBe("below");
});
