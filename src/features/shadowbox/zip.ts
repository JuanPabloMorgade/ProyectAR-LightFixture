/** A ZIP archive with stored entries: no compression or external dependencies. */
export function zipFiles(
  files: { name: string; data: Uint8Array }[],
): ArrayBuffer {
  const encoder = new TextEncoder();
  const entries = files.map((file) => ({
    ...file,
    name: encoder.encode(file.name),
  }));
  const localSize = entries.reduce(
    (sum, file) => sum + 30 + file.name.length + file.data.length,
    0,
  );
  const directorySize = entries.reduce(
    (sum, file) => sum + 46 + file.name.length,
    0,
  );
  if (
    entries.length > 65535 ||
    localSize + directorySize + 22 >= 0xffffffff ||
    entries.some((file) => file.name.length > 65535)
  )
    throw new Error("Los archivos son demasiado grandes para el ZIP.");
  const buffer = new ArrayBuffer(localSize + directorySize + 22);
  const bytes = new Uint8Array(buffer),
    view = new DataView(buffer);
  const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
    let crc = index;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    return crc >>> 0;
  });
  let local = 0,
    directory = localSize;
  for (const file of entries) {
    let crc = 0xffffffff;
    for (const byte of file.data)
      crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
    crc = (crc ^ 0xffffffff) >>> 0;
    view.setUint32(local, 0x04034b50, true);
    view.setUint16(local + 4, 20, true);
    view.setUint16(local + 6, 0x0800, true); // UTF-8 filenames.
    view.setUint16(local + 12, 0x21, true); // 1980-01-01, a valid DOS date.
    view.setUint32(local + 14, crc, true);
    view.setUint32(local + 18, file.data.length, true);
    view.setUint32(local + 22, file.data.length, true);
    view.setUint16(local + 26, file.name.length, true);
    bytes.set(file.name, local + 30);
    bytes.set(file.data, local + 30 + file.name.length);
    view.setUint32(directory, 0x02014b50, true);
    view.setUint16(directory + 4, 20, true);
    view.setUint16(directory + 6, 20, true);
    view.setUint16(directory + 8, 0x0800, true);
    view.setUint16(directory + 14, 0x21, true);
    view.setUint32(directory + 16, crc, true);
    view.setUint32(directory + 20, file.data.length, true);
    view.setUint32(directory + 24, file.data.length, true);
    view.setUint16(directory + 28, file.name.length, true);
    view.setUint32(directory + 42, local, true);
    bytes.set(file.name, directory + 46);
    local += 30 + file.name.length + file.data.length;
    directory += 46 + file.name.length;
  }
  view.setUint32(directory, 0x06054b50, true);
  view.setUint16(directory + 8, entries.length, true);
  view.setUint16(directory + 10, entries.length, true);
  view.setUint32(directory + 12, directorySize, true);
  view.setUint32(directory + 16, localSize, true);
  return buffer;
}
