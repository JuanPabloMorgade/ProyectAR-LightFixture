import { isWallMount } from "./enclosure-config";
import * as THREE from "three";
import type { BoxSettings } from "./engine";
import type { Fabrication } from "./fabrication";
import { modularLayout } from "./modular";

/** Hardware reference only; never included in fabricationParts or STL exports. */
export function modularVisuals(
  s: BoxSettings,
  f: Fabrication,
  resources: { dispose: () => void }[],
) {
  const l = modularLayout(s, f),
    m = l.m;
  const group = new THREE.Group();
  const geometry = new THREE.CylinderGeometry(
    m.starDiameter / 20,
    m.starDiameter / 20,
    m.starThickness / 10,
    48,
  );
  geometry.rotateX(Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({
    color: 0x343e47,
    metalness: 0.6,
    roughness: 0.5,
  });
  const board = new THREE.Mesh(geometry, material);
  const front = s.thickness / 20;
  const boardTop = l.headZ + 5 + 2 + m.starThickness;
  const mounted = isWallMount(f);
  const frontOrigin = (s.wallOffset ?? 0) + s.depth;
  board.position.z = mounted
    ? (l.emitterLocal + m.emitterHeight + m.starThickness / 2) / 10 -
      frontOrigin
    : front - (boardTop - m.starThickness / 2) / 10;
  group.add(board);
  const padGeo = new THREE.BoxGeometry(m.starDiameter / 60, 0.25, 0.025);
  const padMat = new THREE.MeshStandardMaterial({
    color: 0xd1aa64,
    metalness: 0.7,
    roughness: 0.4,
  });
  for (const sign of [-1, 1]) {
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(
      (sign * m.starDiameter) / 30,
      0,
      mounted
        ? (l.emitterLocal + m.emitterHeight) / 10 - frontOrigin - 0.015
        : front - boardTop / 10 - 0.015,
    );
    group.add(pad);
  }
  resources.push(geometry, material, padGeo, padMat);
  return group;
}
