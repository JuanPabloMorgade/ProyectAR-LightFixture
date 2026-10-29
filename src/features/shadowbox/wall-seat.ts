import { solidMesh, type Bounds } from "./solid-mesh";
import type { Face } from "./engine";

/** mm: a single collar carries slim external ribs; walls sleeve over it. */
export const WALL_SEAT_RAIL = 1.2;
export const WALL_SEAT_ENTRY = 0.4;
export const WALL_BASE_FLOOR = 2;
export const BATTERY_DOOR_PLATE = 1.2;
export const BATTERY_DOOR_TOP = 2.8;

export function wallSeatFit(
  thickness: number,
  clearance: number,
  joints = true,
) {
  const groove = Math.min(0.9, thickness - 0.6);
  return {
    inset: (joints ? thickness : thickness / 2) + clearance / 2,
    groove,
    engagement: groove - clearance / 2,
  };
}

export function wallSeatTabs(span: number): [number, number][] {
  const half = 0.6;
  return [0.25, 0.75].map((p) => [span * p - half, span * p + half]);
}

/** Closed rear sleeve only, also used to project its real opaque shadow. */
export function wallSleeveMesh(
  face: Face,
  span: number,
  thickness: number,
  clearance: number,
  start: number,
  joints: boolean,
) {
  const horizontal = face === "top" || face === "bottom";
  const length = span + (joints ? thickness : 0);
  const corner = (joints ? thickness : thickness / 2) + clearance / 2;
  const rear = WALL_BASE_FLOOR + clearance / 2 - start;
  const fit = wallSeatFit(thickness, clearance, joints);
  const cuts: Bounds[] = joints
    ? wallSeatTabs(span).flatMap(([a, b]) => {
        const extra = thickness / 2;
        return [
          [
            a + extra - clearance / 2,
            b + extra + clearance / 2,
            rear,
            -0.3,
            thickness - fit.groove,
            thickness,
          ],
          [
            a + extra - clearance / 2 - WALL_SEAT_ENTRY,
            b + extra + clearance / 2 + WALL_SEAT_ENTRY,
            rear,
            rear + 0.6,
            thickness - fit.groove,
            thickness,
          ],
        ] as Bounds[];
      })
    : [];
  return solidMesh(
    [
      [
        horizontal ? 0 : corner,
        horizontal ? length : length - corner,
        rear,
        0,
        0,
        thickness,
      ],
    ],
    cuts,
  );
}
