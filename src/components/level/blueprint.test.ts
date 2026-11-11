import { describe, expect, test } from "bun:test";
import {
  clampZoom,
  DEFAULT_BLUEPRINT_VIEW,
  MAX_BLUEPRINT_ZOOM,
  MIN_BLUEPRINT_ZOOM,
  panViewBy,
  zoomViewAt,
} from "./blueprint";
import type { BlueprintPoint, BlueprintView } from "./blueprint";

const EPSILON = 1e-9;

function screenOf(view: BlueprintView, point: BlueprintPoint): BlueprintPoint {
  return {
    x: view.x + point.x * view.zoom,
    y: view.y + point.y * view.zoom,
  };
}

function localOf(view: BlueprintView, point: BlueprintPoint): BlueprintPoint {
  return {
    x: (point.x - view.x) / view.zoom,
    y: (point.y - view.y) / view.zoom,
  };
}

describe("clampZoom", () => {
  test("default view starts at 100% inside the bounds", () => {
    expect(DEFAULT_BLUEPRINT_VIEW.zoom).toBe(1);
    expect(DEFAULT_BLUEPRINT_VIEW.zoom).toBeGreaterThanOrEqual(MIN_BLUEPRINT_ZOOM);
    expect(DEFAULT_BLUEPRINT_VIEW.zoom).toBeLessThanOrEqual(MAX_BLUEPRINT_ZOOM);
  });

  test("clamps below the minimum", () => {
    expect(clampZoom(0.3)).toBe(MIN_BLUEPRINT_ZOOM);
  });

  test("clamps above the maximum", () => {
    expect(clampZoom(2)).toBe(MAX_BLUEPRINT_ZOOM);
  });

  test("keeps an in-range zoom", () => {
    expect(clampZoom(1.2)).toBe(1.2);
  });

  test("falls back to 1 for non-finite values", () => {
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe("zoomViewAt", () => {
  test("keeps the cursor point fixed on both axes for a panned view", () => {
    const view: BlueprintView = { x: 28, y: 20, zoom: 1 };
    const point: BlueprintPoint = { x: 240, y: 150 };
    const local = localOf(view, point);

    const zoomed = zoomViewAt(view, point, 1.4);

    expect(zoomed.zoom).toBe(1.4);
    expect(screenOf(zoomed, local).x).toBeCloseTo(point.x, 9);
    expect(screenOf(zoomed, local).y).toBeCloseTo(point.y, 9);
  });

  test("still fixes the point when the target zoom is out of range", () => {
    const view: BlueprintView = { x: -40, y: 12, zoom: 0.9 };
    const point: BlueprintPoint = { x: 100, y: 220 };
    const local = localOf(view, point);

    const zoomedIn = zoomViewAt(view, point, 9);
    expect(zoomedIn.zoom).toBe(MAX_BLUEPRINT_ZOOM);
    expect(screenOf(zoomedIn, local).x).toBeCloseTo(point.x, 9);
    expect(screenOf(zoomedIn, local).y).toBeCloseTo(point.y, 9);

    const zoomedOut = zoomViewAt(view, point, 0.1);
    expect(zoomedOut.zoom).toBe(MIN_BLUEPRINT_ZOOM);
    expect(screenOf(zoomedOut, local).x).toBeCloseTo(point.x, 9);
    expect(screenOf(zoomedOut, local).y).toBeCloseTo(point.y, 9);
  });

  test("zooming in then out at the same point restores the view", () => {
    const view: BlueprintView = { x: 16, y: 8, zoom: 0.8 };
    const point: BlueprintPoint = { x: 320, y: 180 };

    const inView = zoomViewAt(view, point, 1.25);
    const back = zoomViewAt(inView, point, view.zoom);

    expect(Math.abs(back.x - view.x)).toBeLessThanOrEqual(EPSILON);
    expect(Math.abs(back.y - view.y)).toBeLessThanOrEqual(EPSILON);
    expect(back.zoom).toBeCloseTo(view.zoom, 9);
  });

  test("returns a fresh view and never mutates its inputs", () => {
    const view = Object.freeze({ x: 4, y: 6, zoom: 1 });
    const point = Object.freeze({ x: 50, y: 60 });

    const next = zoomViewAt(view, point, 1.6);

    expect(next).not.toBe(view);
    expect(view).toEqual({ x: 4, y: 6, zoom: 1 });
    expect(point).toEqual({ x: 50, y: 60 });
  });
});

describe("panViewBy", () => {
  test("accumulates positive and negative offsets while preserving zoom", () => {
    const view: BlueprintView = { x: 28, y: 20, zoom: 1.25 };

    const right = panViewBy(view, 12, -7);
    expect(right).toEqual({ x: 40, y: 13, zoom: 1.25 });

    const back = panViewBy(right, -12, 7);
    expect(back).toEqual(view);
  });

  test("returns a fresh view and never mutates its input", () => {
    const view = Object.freeze({ x: 0, y: 0, zoom: 0.6 });

    const panned = panViewBy(view, -5, 9);

    expect(panned).not.toBe(view);
    expect(view).toEqual({ x: 0, y: 0, zoom: 0.6 });
  });
});
