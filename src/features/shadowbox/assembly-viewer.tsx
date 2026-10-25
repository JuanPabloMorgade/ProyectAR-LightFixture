"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RotateCcw, RotateCw, Scan } from "lucide-react";
import {
  IMAGE_SIZE,
  PRINT_PARTS,
  printParts,
  type BoxSettings,
  type WallMask,
} from "./engine";
import { ASSEMBLY_STEPS, PLACEMENT_ORDER, assemblyPosition } from "./assembly";

type Props = {
  settings: BoxSettings;
  masks: WallMask[];
  simulation: Uint8ClampedArray;
  step: number;
};

export default function AssemblyViewer({
  settings,
  masks,
  simulation,
  step,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const currentStep = useRef(step);
  currentStep.current = step;
  const api = useRef<{
    setStep: (step: number) => void;
    reset: () => void;
    rotate: (angle: number) => void;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError(
        "No se pudo iniciar la vista 3D. Podés seguir las instrucciones de cada paso.",
      );
      return;
    }
    const resources: { dispose: () => void }[] = [];
    let observer: ResizeObserver | undefined;
    const scene = new THREE.Scene();
    const size = Math.max(settings.width, settings.height, settings.depth);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 3000);
    const controls = new OrbitControls(camera, renderer.domElement);
    resources.push(controls);
    controls.enableDamping = true;
    controls.minDistance = size * 0.6;
    controls.maxDistance = Math.max(size * 10, settings.radius * 8);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const dispose = () => {
      api.current = null;
      observer?.disconnect();
      renderer.setAnimationLoop(null);
      resources.forEach((resource) => resource.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
    try {
      scene.add(new THREE.HemisphereLight(0xf3e7ff, 0x31253b, 2.4));
      const light = new THREE.DirectionalLight(0xffeed6, 3);
      light.position.set(size, size * 2, size * 3);
      scene.add(light);
      const pieces = printParts(masks, settings).map((part) => {
        // Use the actual exported mesh, converted from mm to scene centimeters.
        const positions = new Float32Array(part.positions.length);
        for (let i = 0; i < positions.length; i += 3) {
          const x = part.positions[i] / 10,
            y = part.positions[i + 1] / 10;
          const z = part.positions[i + 2] / 10 - settings.thickness / 20;
          const point =
            part.id === "front"
              ? [x - settings.width / 2, y - settings.height / 2, z]
              : part.id === "top" || part.id === "bottom"
                ? [x - settings.width / 2, -z, y - settings.depth / 2]
                : [z, x - settings.height / 2, y - settings.depth / 2];
          positions.set(point, i);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3),
        );
        geometry.setIndex(new THREE.BufferAttribute(part.indices, 1));
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({
          color: 0xb9cad0,
          roughness: 0.65,
          side: THREE.DoubleSide,
          transparent: true,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...assemblyPosition(part.id, settings, true));
        scene.add(mesh);
        resources.push(geometry, material);
        return {
          id: part.id,
          mesh,
          material,
          target: mesh.position.clone(),
          label: labels.current?.querySelector<HTMLElement>(
            `[data-piece="${part.id}"]`,
          ),
        };
      });
      const bulbGeometry = new THREE.SphereGeometry(size * 0.035, 20, 16);
      const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffd080 });
      const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
      bulb.position.z = (settings.depth * settings.lightPercent) / 100;
      scene.add(bulb);
      resources.push(bulbGeometry, bulbMaterial);

      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = IMAGE_SIZE;
      canvas
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
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const wallGeometry = new THREE.PlaneGeometry(
        settings.radius * 2,
        settings.radius * 2,
      );
      const wallMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
      });
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.z = -0.3;
      scene.add(wall);
      resources.push(texture, wallGeometry, wallMaterial);
      const reset = () => {
        const final = currentStep.current === 7;
        const extent = final
          ? Math.max(size * 1.3, settings.radius * 1.2)
          : size * (currentStep.current === 0 ? 1.6 : 0.85);
        // Fit both portrait and landscape viewports; keep the box front-facing.
        const distance =
          extent /
          Math.tan(THREE.MathUtils.degToRad(19)) /
          Math.min(camera.aspect, 1);
        controls.target.set(0, 0, final ? 0 : settings.depth / 2);
        camera.position
          .copy(controls.target)
          .add(
            new THREE.Vector3(0.65, 0.6, 1)
              .normalize()
              .multiplyScalar(distance),
          );
        controls.update();
      };
      const setStep = (next: number) => {
        for (const part of pieces) {
          const placed = next > PLACEMENT_ORDER.indexOf(part.id);
          const active = ASSEMBLY_STEPS[next].part === part.id;
          part.mesh.visible = next === 0 || placed;
          part.target.set(...assemblyPosition(part.id, settings, !placed));
          part.material.color.set(active ? 0xb388ff : 0xb9cad0);
          part.material.emissive.set(active ? 0x321853 : 0x000000);
          part.material.opacity =
            next === 6 && part.id === "front"
              ? 0.14
              : next === 0 || placed
                ? 1
                : 0.16;
          part.material.depthWrite = part.material.opacity === 1;
          if (part.label) part.label.hidden = !(next === 0 || active);
          if (reduceMotion) part.mesh.position.copy(part.target);
        }
        bulb.visible = next >= 6;
        wall.visible = next === 7;
        reset();
      };
      api.current = {
        setStep,
        reset,
        rotate: (angle) => {
          camera.position
            .sub(controls.target)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
            .add(controls.target);
          controls.update();
        },
      };
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.setAttribute(
        "aria-label",
        "Modelo 3D de las piezas del diseño actual",
      );
      el.appendChild(renderer.domElement);
      const resize = () => {
        const { width, height } = el.getBoundingClientRect();
        renderer.setSize(width, height);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
        reset();
      };
      observer = new ResizeObserver(resize);
      observer.observe(el);
      resize();
      setStep(currentStep.current);
      const projected = new THREE.Vector3();
      let previous = performance.now();
      renderer.setAnimationLoop((now) => {
        const alpha = reduceMotion
          ? 1
          : 1 - Math.exp(-Math.min((now - previous) / 1000, 0.1) * 8);
        previous = now;
        for (const part of pieces) {
          part.mesh.position.lerp(part.target, alpha);
          if (part.label && !part.label.hidden) {
            projected.copy(part.mesh.position).project(camera);
            part.label.style.left = `${(projected.x * 0.5 + 0.5) * 100}%`;
            part.label.style.top = `${(-projected.y * 0.5 + 0.5) * 100}%`;
            part.label.style.visibility =
              Math.abs(projected.z) <= 1 ? "visible" : "hidden";
          }
        }
        controls.update();
        renderer.render(scene, camera);
      });
    } catch {
      dispose();
      setError(
        "No se pudo preparar el modelo 3D. Las instrucciones siguen disponibles.",
      );
      return;
    }
    return dispose;
  }, [settings, masks, simulation]);
  useEffect(() => {
    api.current?.setStep(step);
  }, [step]);
  return (
    <div className="assembly-visual">
      <div className="assembly-canvas" ref={host} />
      <div
        className="assembly-labels"
        ref={labels}
        aria-hidden="true"
        hidden={!!error}
      >
        {PRINT_PARTS.map((part) => (
          <span key={part.id} data-piece={part.id}>
            {part.filename.slice(0, 2)} · {part.label}
          </span>
        ))}
      </div>
      {error && (
        <p className="assembly-error" role="alert">
          {error}
        </p>
      )}
      <div className="assembly-camera">
        <button
          type="button"
          aria-label="Girar vista a la izquierda"
          disabled={!!error}
          onClick={() => api.current?.rotate(-Math.PI / 6)}
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          aria-label="Girar vista a la derecha"
          disabled={!!error}
          onClick={() => api.current?.rotate(Math.PI / 6)}
        >
          <RotateCw size={16} />
        </button>
        <button
          type="button"
          disabled={!!error}
          onClick={() => api.current?.reset()}
        >
          <Scan size={16} /> Centrar vista
        </button>
      </div>
      <p className="assembly-gesture">
        Arrastrá para girar · Rueda o dos dedos para acercar
      </p>
    </div>
  );
}
