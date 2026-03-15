const PREFIX_STDIN = 0x00;
const PREFIX_RESIZE = 0x01;
const PREFIX_EXIT = 0x02;

export type ServerMessage =
  | { type: "output"; data: Uint8Array }
  | { type: "exit"; code: number };

const encoder = new TextEncoder();

export function encodeStdin(data: string): Uint8Array {
  const encoded = encoder.encode(data);
  const msg = new Uint8Array(1 + encoded.length);
  msg[0] = PREFIX_STDIN;
  msg.set(encoded, 1);
  return msg;
}

export function encodeResize(cols: number, rows: number): Uint8Array {
  const msg = new Uint8Array(5);
  const view = new DataView(msg.buffer);
  msg[0] = PREFIX_RESIZE;
  view.setUint16(1, cols);
  view.setUint16(3, rows);
  return msg;
}

export function parseServerMessage(data: ArrayBuffer): ServerMessage {
  const bytes = new Uint8Array(data);
  if (bytes.length >= 2 && bytes[0] === PREFIX_EXIT) {
    return { type: "exit", code: bytes[1] };
  }
  return { type: "output", data: bytes };
}
