"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { IMAGE_SIZE, type BoxSettings, type WallMask } from "./engine";

export default function ShadowViewer({
  settings,
  masks,
  simulation,
  rays,
}: {
  settings: BoxSettings;
  masks: WallMask[];
  simulation: Uint8ClampedArray;
  rays: boolean;
}) {
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
    scene.background = new THREE.Color("#192c32");
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
    const size = Math.max(settings.width, settings.height, settings.depth);
    camera.position.set(size * 1.3, size * 0.85, size * 1.9);
    const target = new THREE.Vector3(0, 0, settings.depth * 0.45);
    camera.lookAt(target);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.minDistance = size * 0.6;
    controls.maxDistance = size * 5;
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const key = new THREE.DirectionalLight(0xffe8ba, 2);
    key.position.set(settings.width, settings.height, settings.depth * 2);
    scene.add(key);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 18, 12),
      new THREE.MeshBasicMaterial({ color: 0xffdc87 }),
    );
    bulb.position.z = (settings.depth * settings.lightPercent) / 100;
    scene.add(bulb);
    const halo = new THREE.PointLight(0xffd58d, 35, Math.max(size * 3, 30));
    halo.position.copy(bulb.position);
    scene.add(halo);
    const disposables: (
      THREE.BufferGeometry | THREE.Material | THREE.Texture
    )[] = [bulb.geometry, bulb.material as THREE.Material];
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
    if (rays) {
      const points: number[] = [];
      let count = 0;
      for (const wall of masks)
        for (let row = 0; row < wall.rows && count < 42; row += 4)
          for (let col = 0; col < wall.columns && count < 42; col += 5)
            if (wall.cells[row * wall.columns + col]) {
              const u = (col / wall.columns - 0.5) * wall.span,
                z = (row / wall.rows) * wall.depth;
              const x =
                wall.face === "left"
                  ? -settings.width / 2
                  : wall.face === "right"
                    ? settings.width / 2
                    : wall.face === "top" || wall.face === "bottom"
                      ? u
                      : 0;
              const y =
                wall.face === "bottom"
                  ? -settings.height / 2
                  : wall.face === "top"
                    ? settings.height / 2
                    : u;
              points.push(0, 0, bulb.position.z, x, y, z);
              count++;
            }
      const linesGeo = new THREE.BufferGeometry();
      linesGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(points, 3),
      );
      const linesMat = new THREE.LineBasicMaterial({
        color: 0xffcf77,
        transparent: true,
        opacity: 0.28,
      });
      scene.add(new THREE.LineSegments(linesGeo, linesMat));
      disposables.push(linesGeo, linesMat);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const observer = new ResizeObserver(() => {
      const box = el.getBoundingClientRect();
      renderer.setSize(box.width, box.height);
      camera.aspect = box.width / Math.max(box.height, 1);
      camera.updateProjectionMatrix();
    });
    observer.observe(el);
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });
    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [settings, masks, simulation, rays]);
  return (
    <div
      ref={host}
      className="shadow-three"
      aria-label="Vista 3D de la caja de sombras"
    >
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
