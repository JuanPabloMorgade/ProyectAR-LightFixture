"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { HousingPart } from "./housing";
import type { Mesh } from "../shadowbox/solid-mesh";
const NO_HOUSING: HousingPart[] = [];
export default function Viewer({
  positions,
  indices,
  lit,
  housingParts = NO_HOUSING,
  interior = false,
  printSupport,
}: {
  positions: Float32Array;
  indices: Uint32Array;
  lit: boolean;
  housingParts?: HousingPart[];
  interior?: boolean;
  printSupport?: Mesh;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError("La vista 3D requiere WebGL. Podés seguir exportando el STL.");
      return;
    }
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(36, 1, 0.1, 3000);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: lit ? 0xffdda1 : 0xe9e7e2,
      roughness: 0.8,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const colors = new Float32Array(positions.length);
    const n = positions.length / 6;
    for (let i = 0; i < positions.length / 3; i++) {
      const p = i % n;
      const t = Math.hypot(
        positions[p * 3] - positions[(p + n) * 3],
        positions[p * 3 + 2] - positions[(p + n) * 3 + 2],
      );
      const v = lit ? Math.exp(-0.4 * t) : 1;
      colors.set([v, v, v], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    material.vertexColors = true;
    const mesh = new THREE.Mesh(geo, material);
    const model = new THREE.Group();
    model.add(mesh);
    scene.add(model);
    const resources: { dispose: () => void }[] = [geo, material];
    if (printSupport) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(printSupport.positions, 3),
      );
      geometry.setIndex(new THREE.BufferAttribute(printSupport.indices, 1));
      geometry.computeVertexNormals();
      const surface = new THREE.MeshStandardMaterial({
        color: 0x9773d0,
        roughness: 0.85,
        side: THREE.DoubleSide,
      });
      model.add(new THREE.Mesh(geometry, surface));
      resources.push(geometry, surface);
    }
    for (const part of housingParts) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(part.positions, 3),
      );
      geometry.setIndex(new THREE.BufferAttribute(part.indices, 1));
      geometry.computeVertexNormals();
      const transparent = interior && part.id === "body";
      const surface = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.85,
        transparent,
        opacity: transparent ? 0.2 : 1,
        depthWrite: !transparent,
        side: THREE.DoubleSide,
      });
      const piece = new THREE.Mesh(geometry, surface);
      piece.visible = !(interior && part.id === "lid");
      model.add(piece);
      resources.push(geometry, surface);
    }
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3()),
      center = bounds.getCenter(new THREE.Vector3());
    const extent = Math.max(size.x, size.y, size.z);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x53504a, lit ? 3 : 2));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(-100, 160, 200);
    scene.add(key);
    camera.position
      .copy(center)
      .add(new THREE.Vector3(extent * 0.35, extent * 0.12, extent * 2.4));
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(center);
    controls.enableDamping = true;
    controls.minDistance = extent * 0.5;
    controls.maxDistance = extent * 5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    const observer = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(1, height);
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
      resources.forEach((r) => r.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [positions, indices, lit, housingParts, interior, printSupport]);
  return (
    <div
      className="three-view"
      ref={host}
      aria-label="Modelo 3D de la litofanía; arrastrá para girar"
    >
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
