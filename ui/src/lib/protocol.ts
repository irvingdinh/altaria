const encoder = new TextEncoder();

export function encodeStdin(data: string): Uint8Array {
  const encoded = encoder.encode(data);
  const buf = new Uint8Array(1 + encoded.length);
  buf[0] = 0x00;
  buf.set(encoded, 1);
  return buf;
}

export function encodeResize(cols: number, rows: number): Uint8Array {
  const buf = new Uint8Array(5);
  const view = new DataView(buf.buffer);
  buf[0] = 0x01;
  view.setUint16(1, cols);
  view.setUint16(3, rows);
  return buf;
}
