"use client";
import { isWallMount } from "./enclosure-config";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RotateCcw, RotateCw, Scan } from "lucide-react";
import {
  IMAGE_SIZE,
  sourceDistance,
  PRINT_PARTS,
  type BoxSettings,
  type WallMask,
} from "./engine";
import { ledLayout, type Fabrication } from "./fabrication";
import { previewParts, previewMesh } from "./preview-model";
import {
  assemblySequence,
  assemblyPlacement,
  assemblyPosition,
} from "./assembly";
import { hasEnclosure } from "./enclosure";
import { isCob } from "./cob";
import { isModular } from "./modular";
import { modularVisuals } from "./modular-visuals";
import { cobVisuals } from "./cob-visuals";

type Props = {
  settings: BoxSettings;
  masks: WallMask[];
  simulation: Uint8ClampedArray;
  artwork?: Uint8ClampedArray;
  step: number;
  fabrication?: Fabrication;
};

export default function AssemblyViewer({
  settings,
  masks,
  simulation,
  artwork,
  step,
  fabrication,
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
    const { steps, lightStep, resultStep } = assemblySequence(fabrication);
    const separated = hasEnclosure(fabrication);
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
      const pieces = previewParts(masks, settings, fabrication, artwork).map(
        (part) => {
          // Use the actual exported mesh, converted from mm to scene centimeters.
          const meshData = previewMesh(part, settings, fabrication);
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(meshData.positions, 3),
          );
          geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
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
        },
      );
      const bulbGeometry = new THREE.SphereGeometry(
        fabrication ? 0.25 : size * 0.035,
        20,
        16,
      );
      const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffd080 });
      const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
      bulb.position.z = sourceDistance(settings);
      scene.add(bulb);
      const bulbs = [bulb];
      if (fabrication && !isCob(fabrication) && !isModular(fabrication)) {
        const { centers } = ledLayout(settings, fabrication);
        bulb.position.x = centers[0][0] / 10;
        bulb.position.y = centers[0][1] / 10;
        for (const [x, y] of centers.slice(1)) {
          const extra = new THREE.Mesh(bulbGeometry, bulbMaterial);
          extra.position.set(x / 10, y / 10, bulb.position.z);
          scene.add(extra);
          bulbs.push(extra);
        }
      }
      const cob =
        fabrication && isCob(fabrication)
          ? cobVisuals(settings, fabrication, resources)
          : undefined;
      if (cob) pieces.find((p) => p.id === "front")!.mesh.add(cob.group);
      const modular =
        fabrication && isModular(fabrication)
          ? modularVisuals(settings, fabrication, resources)
          : undefined;
      if (modular) {
        if (isWallMount(fabrication)) {
          modular.position.z = (settings.wallOffset ?? 0) + settings.depth;
          scene.add(modular);
        } else pieces.find((p) => p.id === "front")!.mesh.add(modular);
      }
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
        const final = currentStep.current === resultStep;
        const rearAccess =
          isWallMount(fabrication) &&
          currentStep.current === 2 &&
          steps[2].part === "battery-cover";
        const extent = final
          ? Math.max(size * 1.3, settings.radius * 1.2)
          : size * (currentStep.current === 0 ? 1.6 : 0.85);
        // Show the rear battery door during its assembly step.
        const distance =
          extent /
          Math.tan(THREE.MathUtils.degToRad(19)) /
          Math.min(camera.aspect, 1);
        controls.target.set(0, 0, final || rearAccess ? 0 : settings.depth / 2);
        camera.position
          .copy(controls.target)
          .add(
            new THREE.Vector3(
              final || rearAccess ? 0.08 : 0.65,
              final || rearAccess ? 0.04 : 0.6,
              rearAccess ? -1 : 1,
            )
              .normalize()
              .multiplyScalar(distance),
          );
        controls.update();
      };
      const setStep = (next: number) => {
        for (const part of pieces) {
          const extra = ["post", "head", "battery-cover"].includes(part.id);
          const placed = next >= assemblyPlacement(part.id, fabrication);
          const active =
            steps[next].part === part.id || (extra && next === lightStep);
          const headFrame =
            isWallMount(fabrication) &&
            isModular(fabrication) &&
            next === lightStep &&
            part.id === "front";
          part.mesh.visible = next === 0 || placed || active || headFrame;
          part.target.set(
            ...assemblyPosition(part.id, settings, !(placed || headFrame)),
          );
          part.material.color.set(active ? 0xb388ff : 0xb9cad0);
          part.material.emissive.set(active ? 0x321853 : 0x000000);
          part.material.opacity =
            (next === lightStep && part.id === "front") ||
            (separated &&
              (next === 2 || next === lightStep) &&
              part.id === "electronics")
              ? 0.14
              : next === 0 || placed
                ? 1
                : 0.16;
          part.material.depthWrite = part.material.opacity === 1;
          if (part.label) part.label.hidden = !(next === 0 || active);
          if (reduceMotion) part.mesh.position.copy(part.target);
        }
        bulbs.forEach((b) => {
          b.visible =
            next >= lightStep && !cob && (!separated || next === lightStep);
        });
        if (cob) {
          cob.emitters.visible = next >= lightStep;
          cob.group.visible = !separated || next === lightStep;
        }
        if (modular)
          modular.visible =
            next >= lightStep && (!separated || next === lightStep);
        wall.visible = next === resultStep;
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
  }, [settings, masks, simulation, fabrication, artwork]);
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
        {(fabrication && (isModular(fabrication) || hasEnclosure(fabrication))
          ? previewParts(masks, settings, fabrication, artwork)
          : PRINT_PARTS
        ).map((part) => (
          <span key={part.id} data-piece={part.id}>
            {part.filename.slice(0, 2)} ·{" "}
            {hasEnclosure(fabrication)
              ? {
                  top: "Superior",
                  bottom: "Inferior",
                  left: "Izquierda",
                  right: "Derecha",
                  front: isWallMount(fabrication)
                    ? "Embellecedor"
                    : "Placa de luz",
                  base: "Base de pared",
                  separator: "Tapa electrónica",
                  post: "Poste",
                  head: "Cabezal",
                  electronics: "Electrónica",
                  face: "Tapa exterior",
                  "battery-cover": "Tapita",
                }[part.id]
              : fabrication && part.id === "front"
                ? hasEnclosure(fabrication)
                  ? "Placa portaluces"
                  : isModular(fabrication)
                    ? "Base modular"
                    : isCob(fabrication)
                      ? "Tapa con rebajes COB"
                      : "Tapa con soporte LED"
                : part.label}
          </span>
        ))}
      </div>
      {error && (
        <p className="assembly-error" role="alert">
          {error}
        </p>
      )}
      <div className="assembly-camera">
        <Button
          variant="unstyled"
          type="button"
          aria-label="Girar vista a la izquierda"
          disabled={!!error}
          onClick={() => api.current?.rotate(-Math.PI / 6)}
        >
          <RotateCcw size={16} />
        </Button>
        <Button
          variant="unstyled"
          type="button"
          aria-label="Girar vista a la derecha"
          disabled={!!error}
          onClick={() => api.current?.rotate(Math.PI / 6)}
        >
          <RotateCw size={16} />
        </Button>
        <Button
          variant="unstyled"
          type="button"
          disabled={!!error}
          onClick={() => api.current?.reset()}
        >
          <Scan size={16} /> Centrar vista
        </Button>
      </div>
      <p className="assembly-gesture">
        Arrastrá para girar · Rueda o dos dedos para acercar
      </p>
    </div>
  );
}
