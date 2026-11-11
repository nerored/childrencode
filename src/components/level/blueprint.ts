/**
 * Pure view model for the blueprint canvas.
 *
 * The scene element applies `translate(x, y) scale(zoom)` with a `0 0`
 * transform origin, so a scene-local point maps to the viewport as
 * `screen = view.x + local * view.zoom`. These helpers keep that mapping
 * consistent without touching React or the DOM.
 */

export interface BlueprintView {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface BlueprintPoint {
  readonly x: number;
  readonly y: number;
}

export const MIN_BLUEPRINT_ZOOM = 0.6;
export const MAX_BLUEPRINT_ZOOM = 1.6;
export const BLUEPRINT_ZOOM_STEP = 0.2;
export const WHEEL_ZOOM_SENSITIVITY = 0.0012;
export const BLUEPRINT_GRID_PX = 20;

export const DEFAULT_BLUEPRINT_VIEW: BlueprintView = {
  x: 28,
  y: 20,
  zoom: 1,
};

/** Clamp a zoom factor into the allowed range; non-finite input resets to 1. */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    return 1;
  }
  return Math.min(MAX_BLUEPRINT_ZOOM, Math.max(MIN_BLUEPRINT_ZOOM, zoom));
}

/**
 * Zoom to `nextZoom` while keeping the scene point under `point` fixed.
 * `point` is in viewport-local pixels.
 */
export function zoomViewAt(
  view: BlueprintView,
  point: BlueprintPoint,
  nextZoom: number,
): BlueprintView {
  const zoom = clampZoom(nextZoom);
  const k = zoom / view.zoom;
  return {
    x: point.x - (point.x - view.x) * k,
    y: point.y - (point.y - view.y) * k,
    zoom,
  };
}

/** Translate the canvas without changing its zoom. */
export function panViewBy(
  view: BlueprintView,
  dx: number,
  dy: number,
): BlueprintView {
  return { x: view.x + dx, y: view.y + dy, zoom: view.zoom };
}
