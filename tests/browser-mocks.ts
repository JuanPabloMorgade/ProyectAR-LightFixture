import { vi } from "vitest";

export function mockCanvasAndImages() {
  const context = {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(
      (_x: number, _y: number, width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
        width,
        height,
      }),
    ),
    createImageData: vi.fn((width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    })),
    putImageData: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    beginPath: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    ellipse: vi.fn(),
    fillText: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,AA==",
  );

  class MockImage {
    src = "";
    width = 512;
    height = 420;
    naturalWidth = 512;
    naturalHeight = 420;
    decode = vi.fn(async () => {});
  }
  vi.stubGlobal("Image", MockImage);
  vi.stubGlobal(
    "ImageData",
    class {
      constructor(
        public data: Uint8ClampedArray,
        public width: number,
        public height: number,
      ) {}
    },
  );
}
