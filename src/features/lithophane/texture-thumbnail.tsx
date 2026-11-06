import { useMemo } from "react";
import { textureProfile, type FrameTexture } from "./frame-texture-config";

/** Small shaded height field, sampled from the same profile as the printable relief. */
export function TextureThumbnail({
  texture,
  scale = 1,
  depth = 0.6,
}: {
  texture: FrameTexture;
  scale?: number;
  depth?: number;
}) {
  const paths = useMemo(() => {
    const layers = Array.from({ length: 8 }, () => "");
    for (let y = 0; y < 50; y++)
      for (let x = 0; x < 80; x++) {
        const u = x * 0.4,
          v = y * 0.4;
        const h = textureProfile(texture, u, v, scale);
        const light =
          3 +
          (depth / 0.6) *
            (5 * (textureProfile(texture, u + 0.4, v, scale) - h) +
              4 * (textureProfile(texture, u, v + 0.4, scale) - h) -
              h);
        const shade = Math.max(0, Math.min(7, Math.round(light)));
        layers[shade] += `M${x} ${y}h1v1h-1z`;
      }
    return layers;
  }, [texture, scale, depth]);
  return (
    <svg
      className="texture-thumbnail"
      viewBox="0 0 80 50"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((path, index) => (
        <path key={index} d={path} fill={`hsl(270 18% ${13 + index * 5}%)`} />
      ))}
    </svg>
  );
}
