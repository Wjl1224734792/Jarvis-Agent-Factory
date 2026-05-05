import { deflateSync, crc32 } from "node:zlib";

/**
 * 生成一个 1x1 彩色 RGB PNG Buffer。
 * 当 CSS 用 object-cover 缩放填满容器时，表现为纯色矩形，确保种子图片可见。
 */
export function createColoredPixelPng(r: number, g: number, b: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: 1×1, 8-bit RGB
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0);
  ihdrData.writeUInt32BE(1, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;

  // 1 像素 RGB raw 数据（filter byte 0 + R,G,B）
  const raw = Buffer.from([0, r, g, b]);

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdrData),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);

  const crcVal = crc32(Buffer.concat([typeBuf, data])) >>> 0;
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/** 不同类别种子数据使用的彩色像素 PNG，便于在页面上区分 */
export const SEED_PIXEL = {
  blue: createColoredPixelPng(79, 137, 229),
  green: createColoredPixelPng(34, 197, 94),
  orange: createColoredPixelPng(249, 115, 22),
  purple: createColoredPixelPng(168, 85, 247),
  teal: createColoredPixelPng(20, 184, 166),
  slate: createColoredPixelPng(100, 116, 139),
  amber: createColoredPixelPng(245, 158, 11)
} as const;
