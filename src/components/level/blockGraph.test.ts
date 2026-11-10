import { expect, test } from "bun:test";
import { pickSnap, preferredEdge, SNAP_DISTANCE_PX } from "./blockGraph";
import type { SnapTarget } from "./blockGraph";

const sockets: SnapTarget<"entry" | "a" | "b">[] = [
  { address: "entry", edge: "next", x: 100, y: 100 },
  { address: "a", edge: "next", x: 100, y: 200 },
  { address: "b", edge: "body", x: 300, y: 100 },
];

test("snaps to the socket under the dragged block edge", () => {
  const snap = pickSnap(sockets, { x: 95, y: 194 }, { dx: 5, dy: 5 });
  expect(snap?.address).toBe("a");
  expect(snap?.edge).toBe("next");
});

test("returns null when every socket is beyond the magnet radius", () => {
  const far = SNAP_DISTANCE_PX + 10;
  expect(pickSnap(sockets, { x: 100 + far, y: 100 + far }, { dx: 0, dy: 0 })).toBeNull();
});

test("the nearest socket wins when two are in range", () => {
  const snap = pickSnap(sockets, { x: 100, y: 160 }, { dx: 0, dy: 0 });
  expect(snap?.address).toBe("a");
});

test("a body socket is reachable sideways", () => {
  const snap = pickSnap(sockets, { x: 290, y: 100 }, { dx: 8, dy: -8 });
  expect(snap?.address).toBe("b");
  expect(snap?.edge).toBe("body");
});

test("the preferred edge follows the dominant drag axis", () => {
  expect(preferredEdge({ dx: 2, dy: 30 })).toBe("next");
  expect(preferredEdge({ dx: 30, dy: 2 })).toBe("body");
});
