import { expect, test } from "vitest";
import {
  postHeadMesh,
  HEAD_INSERTION,
  POST_TO_EMITTER,
  HEAD_ARM_WIDTH,
  HEAD_ARM_DEPTH,
  HEAD_STOP,
} from "../src/features/shadowbox/head-mount";
import { closed, materialAt } from "./mesh-assertions";
import { WALL_POST_DIAMETER } from "../src/features/shadowbox/modular-config";

test.each([
  { diameter: 15, thickness: 0.6, emitter: 1, wire: 6, clearance: 0.1 },
  { diameter: 20, thickness: 1.2, emitter: 5, wire: 4, clearance: 0.25 },
  { diameter: 40, thickness: 4, emitter: 15, wire: 2, clearance: 0.8 },
])(
  "post collar, shoulder, cable route and circular board seat fit at $diameter mm",
  ({ diameter, thickness, emitter, wire, clearance }) => {
    const mesh = postHeadMesh(
      diameter,
      thickness,
      emitter,
      wire,
      clearance,
      0.63,
    );
    closed(mesh);
    const seat = (diameter + clearance) / 2,
      center = seat + 2;
    const point = (radius: number, theta: number, z: number) => [
      center + radius * Math.cos(theta),
      center + radius * Math.sin(theta),
      z,
    ];
    const seatZ = HEAD_INSERTION + POST_TO_EMITTER + emitter;
    // The illuminated portion stays narrow at both ends and in the middle,
    // even when using the largest supported star board.
    for (const u of [0.05, 0.5, 0.95]) {
      const z =
        HEAD_INSERTION + HEAD_STOP + u * (seatZ - HEAD_INSERTION - HEAD_STOP);
      const outer =
        (1 - u) * ((WALL_POST_DIAMETER + clearance) / 2 + 2) + u * (seat + 2);
      const radial = outer - HEAD_ARM_DEPTH / 2;
      for (const sign of [-1, 1]) {
        const p = (r: number, tangent: number) => [
          center + sign * r * Math.cos(0.63) - tangent * Math.sin(0.63),
          center + sign * r * Math.sin(0.63) + tangent * Math.cos(0.63),
          z,
        ];
        expect(materialAt(mesh, p(radial, 0))).toBe(true);
        expect(materialAt(mesh, p(radial, HEAD_ARM_WIDTH / 2 - 0.1))).toBe(
          true,
        );
        expect(materialAt(mesh, p(radial, HEAD_ARM_WIDTH / 2 + 0.1))).toBe(
          false,
        );
        expect(materialAt(mesh, p(radial, -HEAD_ARM_WIDTH / 2 - 0.1))).toBe(
          false,
        );
        expect(materialAt(mesh, p(outer + 0.1, 0))).toBe(false);
        expect(materialAt(mesh, p(outer - HEAD_ARM_DEPTH - 0.1, 0))).toBe(
          false,
        );
      }
    }
    for (let i = 0; i < 16; i++) {
      const angle = ((i + 0.23) * Math.PI) / 8;
      // Tube volume is clear; the collar wraps around it with a diametral clearance.
      expect(
        materialAt(mesh, point(WALL_POST_DIAMETER / 2 - 0.05, angle, 3)),
      ).toBe(false);
      expect(
        materialAt(
          mesh,
          point((WALL_POST_DIAMETER + clearance) / 2 + 0.5, angle, 3),
        ),
      ).toBe(true);
      // The tube stops here while its cable channel stays open.
      expect(
        materialAt(
          mesh,
          point(WALL_POST_DIAMETER / 2 - 0.5, angle, HEAD_INSERTION + 0.5),
        ),
      ).toBe(true);
      expect(
        materialAt(mesh, point(wire / 2 - 0.1, angle, HEAD_INSERTION + 0.5)),
      ).toBe(false);
      // The real board fits in the front pocket and rests against a rear shelf.
      expect(
        materialAt(
          mesh,
          point(diameter / 2 - 0.1, angle, seatZ + thickness / 2),
        ),
      ).toBe(false);
      expect(
        materialAt(mesh, point(seat + 1, angle, seatZ + thickness / 2)),
      ).toBe(true);
      expect(
        materialAt(mesh, point(seat - 1, angle, seatZ + thickness + 1)),
      ).toBe(true);
    }
    expect(materialAt(mesh, [center, center, seatZ + thickness + 1])).toBe(
      false,
    );
  },
);
