"use client";
import { isWallMount } from "./enclosure-config";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  IMAGE_SIZE,
  sourceDistance,
  type BoxSettings,
  type WallMask,
} from "./engine";
import { ledLayout, type Fabrication } from "./fabrication";
import { previewParts, previewMesh } from "./preview-model";
import { assemblyPosition } from "./assembly";
import { isCob } from "./cob";
import { isModular } from "./modular";
import { hasEnclosure } from "./enclosure";
import { modularVisuals } from "./modular-visuals";
import { cobVisuals } from "./cob-visuals";

export default function ShadowViewer({
  settings,
  masks,
  simulation,
  artwork,
  interior = false,
  fabrication,
}: {
  settings: BoxSettings;
  masks: WallMask[];
  simulation: Uint8ClampedArray;
  artwork?: Uint8ClampedArray;
  interior?: boolean;
  fabrication?: Fabrication;
}) {
  const resetView = useRef<(() => void) | null>(null);
  const host = useRef<HTMLDivElement>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError(
        "La vista 3D requiere WebGL. Podés usar el diseñador y exportar archivos.",
      );
      return;
    }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#100b18");
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 3000);
    const size = Math.max(settings.width, settings.height, settings.depth);
    const separated = hasEnclosure(fabrication);
    camera.position.set(size * 1.3, size * 0.85, size * 1.9);
    const target = new THREE.Vector3(0, 0, settings.depth * 0.45);
    camera.lookAt(target);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.minDistance = size * 0.6;
    controls.maxDistance = Math.max(size * 5, settings.radius * 8);
    const frame = () => {
      const distance = Math.max(
        size * 2.4,
        (interior ? size : settings.radius * 1.05) /
          Math.tan(THREE.MathUtils.degToRad(19)) /
          Math.min(camera.aspect, 1),
      );
      camera.position.set(
        size * (interior ? 0.8 : 0.12),
        size * (interior ? 0.55 : 0.08),
        target.z + distance,
      );
      controls.target.copy(target);
      controls.update();
    };
    resetView.current = frame;
    if (separated) frame();
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const key = new THREE.DirectionalLight(0xffe8ba, 2);
    key.position.set(settings.width, settings.height, settings.depth * 2);
    scene.add(key);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 18, 12),
      new THREE.MeshBasicMaterial({ color: 0xffdc87 }),
    );
    bulb.position.z = sourceDistance(settings);
    scene.add(bulb);
    const halo = new THREE.PointLight(0xffd58d, 35, Math.max(size * 3, 30));
    halo.position.copy(bulb.position);
    scene.add(halo);
    const disposables: { dispose: () => void }[] = [
      bulb.geometry,
      bulb.material as THREE.Material,
    ];
    if (fabrication && !isCob(fabrication) && !isModular(fabrication)) {
      const layout = ledLayout(settings, fabrication);
      bulb.scale.setScalar(0.25 / 0.55);
      bulb.position.x = layout.centers[0][0] / 10;
      bulb.position.y = layout.centers[0][1] / 10;
      for (const [x, y] of layout.centers.slice(1)) {
        const extra = new THREE.Mesh(bulb.geometry, bulb.material);
        extra.scale.copy(bulb.scale);
        extra.position.set(x / 10, y / 10, bulb.position.z);
        scene.add(extra);
      }
    }
    if (fabrication && isCob(fabrication)) {
      bulb.visible = false;
      const cobResources: { dispose: () => void }[] = [];
      const { group } = cobVisuals(settings, fabrication, cobResources);
      group.position.z = (settings.wallOffset ?? 0) + settings.depth;
      group.visible = isWallMount(fabrication) || !separated || interior;
      scene.add(group);
      disposables.push(...cobResources);
    }
    if (fabrication && isModular(fabrication)) {
      const hardware = modularVisuals(settings, fabrication, disposables);
      hardware.position.z = (settings.wallOffset ?? 0) + settings.depth;
      hardware.visible = isWallMount(fabrication) || !separated || interior;
      scene.add(hardware);
      bulb.scale.setScalar(0.25 / 0.55);
    }
    if (separated && !interior) bulb.visible = false;
    if (!fabrication) {
      const wallColor = new THREE.Color("#b4c4c5");
      for (const wall of masks) {
        const cv = document.createElement("canvas");
        cv.width = wall.columns;
        cv.height = wall.rows;
        const cx = cv.getContext("2d")!,
          im = cx.createImageData(wall.columns, wall.rows);
        for (let y = 0; y < wall.rows; y++)
          for (let x = 0; x < wall.columns; x++) {
            const cut = wall.cells[y * wall.columns + x];
            const p = ((wall.rows - 1 - y) * wall.columns + x) * 4;
            im.data[p] = 255;
            im.data[p + 1] = 255;
            im.data[p + 2] = 255;
            im.data[p + 3] = cut ? 0 : 255;
          }
        cx.putImageData(im, 0, 0);
        const texture = new THREE.CanvasTexture(cv);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.LinearFilter;
        const geometry = new THREE.PlaneGeometry(wall.span, settings.depth);
        const basis =
          wall.face === "top" || wall.face === "bottom"
            ? new THREE.Matrix4().makeBasis(
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(0, 0, 1),
                new THREE.Vector3(0, -1, 0),
              )
            : new THREE.Matrix4().makeBasis(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, 0, 1),
                new THREE.Vector3(1, 0, 0),
              );
        geometry.applyMatrix4(basis);
        const material = new THREE.MeshStandardMaterial({
          color: wallColor,
          side: THREE.DoubleSide,
          transparent: true,
          map: texture,
          alphaTest: 0.5,
          roughness: 0.88,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          wall.face === "left"
            ? -settings.width / 2
            : wall.face === "right"
              ? settings.width / 2
              : 0,
          wall.face === "bottom"
            ? -settings.height / 2
            : wall.face === "top"
              ? settings.height / 2
              : 0,
          settings.depth / 2,
        );
        scene.add(mesh);
        disposables.push(geometry, material, texture);
      }
      const lidGeometry = new THREE.PlaneGeometry(
          settings.width,
          settings.height,
        ),
        lidMaterial = new THREE.MeshStandardMaterial({
          color: "#40565a",
          roughness: 0.9,
          side: THREE.DoubleSide,
        });
      const lid = new THREE.Mesh(lidGeometry, lidMaterial);
      lid.position.z = settings.depth;
      scene.add(lid);
      disposables.push(lidGeometry, lidMaterial);
    } else {
      for (const part of previewParts(masks, settings, fabrication, artwork)) {
        const meshData = previewMesh(part, settings, fabrication);
        const origin = assemblyPosition(part.id, settings, false);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(meshData.positions, 3),
        );
        geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
        geometry.computeVertexNormals();
        const transparent = separated
          ? interior &&
            [
              "front",
              "electronics",
              "base",
              "separator",
              "battery-cover",
            ].includes(part.id)
          : part.id === "front" &&
            (isCob(fabrication) || isModular(fabrication));
        const material = new THREE.MeshStandardMaterial({
          color:
            part.id === "face" ||
            (isWallMount(fabrication) &&
              ["front", "separator"].includes(part.id))
              ? 0xe3d9c6
              : part.id === "front"
                ? 0x40565a
                : 0xb4c4c5,
          roughness: 0.88,
          side: THREE.DoubleSide,
          transparent,
          opacity: transparent ? 0.14 : 1,
          depthWrite: !transparent,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...origin);
        if (
          isWallMount(fabrication) &&
          part.id === "separator" &&
          fabrication.enclosure?.front === "design"
        ) {
          const edges = new THREE.EdgesGeometry(geometry, 35);
          const ink = new THREE.LineBasicMaterial({
            color: 0x5d4d38,
            transparent: true,
            opacity: 0.65,
          });
          const outline = new THREE.LineSegments(edges, ink);
          outline.position.z = 0.001;
          mesh.add(outline);
          disposables.push(edges, ink);
        }
        if (
          separated &&
          interior &&
          (part.id === "face" || part.id === "front")
        )
          mesh.visible = false;
        scene.add(mesh);
        disposables.push(geometry, material);
      }
    }
    const projection = document.createElement("canvas");
    projection.width = IMAGE_SIZE;
    projection.height = IMAGE_SIZE;
    projection
      .getContext("2d")!
      .putImageData(
        new ImageData(
          new Uint8ClampedArray(simulation),
          IMAGE_SIZE,
          IMAGE_SIZE,
        ),
        0,
        0,
      );
    const projectedTexture = new THREE.CanvasTexture(projection),
      projectedGeometry = new THREE.PlaneGeometry(
        settings.radius * 2,
        settings.radius * 2,
      ),
      projectedMaterial = new THREE.MeshBasicMaterial({
        map: projectedTexture,
        side: THREE.DoubleSide,
      });
    const projected = new THREE.Mesh(projectedGeometry, projectedMaterial);
    projected.position.z = -0.2;
    scene.add(projected);
    disposables.push(projectedGeometry, projectedMaterial, projectedTexture);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const observer = new ResizeObserver(() => {
      const box = el.getBoundingClientRect();
      renderer.setSize(box.width, box.height);
      camera.aspect = box.width / Math.max(box.height, 1);
      camera.updateProjectionMatrix();
      if (separated) frame();
    });
    observer.observe(el);
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });
    return () => {
      resetView.current = null;
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [settings, masks, simulation, interior, fabrication, artwork]);
  return (
    <div
      ref={host}
      className="shadow-three"
      aria-label="Vista 3D de la caja de sombras"
    >
      <button
        type="button"
        className="shadow-viewer-reset"
        onClick={() => resetView.current?.()}
      >
        Centrar vista frontal
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
