export const HEAD_PIN_WIDTH = 2.8;
export const HEAD_PIN_LENGTH = 4;
export const HEAD_DOCK_DEPTH = 1;
export const headDockInset = (thickness: number) => thickness + 2;

/** Slots between the wall joint tabs, on the wall-facing side of the front frame. */
export function headDockSlots(
  width: number,
  panelHeight: number,
  clearance: number,
  thickness = 2,
) {
  return [-1, 1].map((sign) => ({
    x: sign * (width / 2 - headDockInset(thickness)),
    y: -panelHeight / 8,
    width: HEAD_PIN_WIDTH + clearance,
    height: HEAD_PIN_LENGTH + clearance,
    depth: HEAD_DOCK_DEPTH,
  }));
}
