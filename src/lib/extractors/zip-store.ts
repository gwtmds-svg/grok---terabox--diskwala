/**
 * Streaming ZIP (STORE, no compression). MP4s don't shrink; we just wrap them
 * so the browser can save the whole Diskwala pack in one click.
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(crc: number, chunk: Uint8Array): number {
  let c = crc ^ 0xffffffff;
  for (let i = 0; i < chunk.length; i++) c = CRC_TABLE[(c ^ chunk[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function safeZipName(name: string, used: Set<string>): string {
  let base = name.replace(/[\\/:*?"<>|]+/g, "_").replace(/^\.+/, "_") || "file";
  if (base.length > 120) {
    const dot = base.lastIndexOf(".");
    const ext = dot > 0 ? base.slice(dot) : "";
    base = base.slice(0, 120 - ext.length) + ext;
  }
  let out = base;
  let i = 2;
  while (used.has(out.toLowerCase())) {
    const dot = base.lastIndexOf(".");
    out = dot > 0 ? `${base.slice(0, dot)}_${i}${base.slice(dot)}` : `${base}_${i}`;
    i++;
  }
  used.add(out.toLowerCase());
  return out;
}

export type ZipSource = {
  name: string;
  open: () => Promise<ReadableStream<Uint8Array> | null>;
};

export function zipStoreStream(files: ZipSource[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const used = new Set<string>();
      const central: Uint8Array[] = [];
      let offset = 0;
      const push = (chunk: Uint8Array) => {
        if (chunk.length) controller.enqueue(chunk);
        offset += chunk.length;
      };

      try {
        for (const file of files) {
          const name = safeZipName(file.name, used);
          const nameBytes = new TextEncoder().encode(name);
          const localHeader = concat(
            u32(0x04034b50),
            u16(20),
            u16(0x0808), // utf-8 + data descriptor
            u16(0),
            u16(0),
            u16(0),
            u32(0),
            u32(0),
            u32(0),
            u16(nameBytes.length),
            u16(0),
            nameBytes,
          );
          const localOffset = offset;
          push(localHeader);

          const body = await file.open();
          let size = 0;
          let crc = 0;
          if (body) {
            const reader = body.getReader();
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              if (!value || !value.length) continue;
              crc = crc32(crc, value);
              size += value.length;
              push(value);
            }
          }

          push(concat(u32(0x08074b50), u32(crc), u32(size), u32(size)));

          central.push(
            concat(
              u32(0x02014b50),
              u16(20),
              u16(20),
              u16(0x0808),
              u16(0),
              u16(0),
              u16(0),
              u32(crc),
              u32(size),
              u32(size),
              u16(nameBytes.length),
              u16(0),
              u16(0),
              u16(0),
              u16(0),
              u32(0),
              u32(localOffset),
              nameBytes,
            ),
          );
        }

        const centralStart = offset;
        for (const c of central) push(c);
        const centralSize = offset - centralStart;
        push(
          concat(
            u32(0x06054b50),
            u16(0),
            u16(0),
            u16(central.length),
            u16(central.length),
            u32(centralSize),
            u32(centralStart),
            u16(0),
          ),
        );
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
