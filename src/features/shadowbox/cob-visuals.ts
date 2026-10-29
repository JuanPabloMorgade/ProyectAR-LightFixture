import { isWallMount } from "./enclosure-config";
import * as THREE from "three";
import type { BoxSettings } from "./engine";
import type { Fabrication } from "./fabrication";
import { cobLayout, defaultCob } from "./cob";

/** Preview-only electronics. Never used by fabricationParts or STL export. */
export function cobVisuals(
  s: BoxSettings,
  f: Fabrication,
  resources: { dispose: () => void }[],
) {
  const layout = cobLayout(s, f),
    c = f.cob ?? defaultCob;
  const group = new THREE.Group(),
    emitters = new THREE.Group();
  const stripMaterial = new THREE.MeshBasicMaterial({ color: 0xffedaa });
  const contactMaterial = new THREE.MeshBasicMaterial({ color: 0xc88a43 });
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: 0x81dfed,
    depthTest: false,
  });
  resources.push(stripMaterial, contactMaterial, outlineMaterial);
  layout.segments.forEach((p, i) => {
    const { pocket } = layout.footprints[i];
    const z = -s.thickness / 20 - 0.003;
    const points = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
      [-1, -1],
    ].map(
      ([x, y]) =>
        new THREE.Vector3(
          (pocket.x + (x * pocket.width) / 2) / 10,
          (pocket.y + (y * pocket.height) / 2) / 10,
          z,
        ),
    );
    const outlineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    resources.push(outlineGeometry);
    group.add(new THREE.Line(outlineGeometry, outlineMaterial));
    const segment = new THREE.Group();
    segment.position.set(
      p.x / 10,
      p.y / 10,
      isWallMount(f)
        ? -s.thickness / 20 + (c.recessDepth - c.thickness / 2) / 10
        : s.thickness / 20 - (layout.floor + c.thickness / 2) / 10,
    );
    segment.rotation.z = (p.rotation * Math.PI) / 180;
    const geometry = new THREE.BoxGeometry(
      p.length / 10,
      c.width / 10,
      c.thickness / 10,
    );
    resources.push(geometry);
    segment.add(new THREE.Mesh(geometry, stripMaterial));
    const pads = new THREE.BoxGeometry(0.25, c.width / 10, 0.005);
    resources.push(pads);
    for (const end of [-1, 1]) {
      const pad = new THREE.Mesh(pads, contactMaterial);
      pad.position.set(
        end * (p.length / 20 - 0.15),
        0,
        -c.thickness / 20 - 0.003,
      );
      segment.add(pad);
    }
    emitters.add(segment);
  });
  group.add(emitters);
  return { group, emitters };
}
