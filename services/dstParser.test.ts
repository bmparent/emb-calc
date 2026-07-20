import { describe, expect, it } from 'vitest';
import { parseDstBuffer } from './dstParser';

const makeDst = (records: number[][], overrides: { stitches?: number; colors?: number } = {}) => {
  const headerText = [
    'LA:TEST DESIGN',
    `ST:${String(overrides.stitches ?? 1).padStart(7, '0')}`,
    `CO:${String(overrides.colors ?? 0).padStart(3, '0')}`,
    '+X:00001',
    '-X:00000',
    '+Y:00000',
    '-Y:00000',
  ].join('\r') + '\r';
  const header = new Uint8Array(512).fill(0x20);
  header.set(new TextEncoder().encode(headerText));
  const payload = new Uint8Array(records.flat());
  const combined = new Uint8Array(header.length + payload.length);
  combined.set(header);
  combined.set(payload, header.length);
  return combined.buffer;
};

describe('parseDstBuffer', () => {
  it('decodes stitches, colors, bounds, and the end command', () => {
    const result = parseDstBuffer(makeDst([
      [0x01, 0x00, 0x03], // stitch +1 x (0.1 mm)
      [0x00, 0x00, 0xc3], // color change
      [0x00, 0x00, 0xf3], // end
    ], { stitches: 1, colors: 1 }));

    expect(result.label).toBe('TEST DESIGN');
    expect(result.decodedStitches).toBe(1);
    expect(result.colors).toBe(2);
    expect(result.widthMm).toBeCloseTo(0.1);
    expect(result.hasEndCommand).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('infers a trim from three consecutive jump records', () => {
    const result = parseDstBuffer(makeDst([
      [0x01, 0x00, 0x83],
      [0x01, 0x00, 0x83],
      [0x01, 0x00, 0x83],
      [0x01, 0x00, 0x03],
      [0x00, 0x00, 0xf3],
    ], { stitches: 4 }));

    expect(result.jumpCount).toBe(3);
    expect(result.trimCount).toBe(1);
    expect(result.travelDistanceMm).toBeCloseTo(0.3);
  });

  it('warns when the file has no end command', () => {
    const result = parseDstBuffer(makeDst([[0x01, 0x00, 0x03]]));
    expect(result.hasEndCommand).toBe(false);
    expect(result.warnings.some((warning) => warning.includes('end command'))).toBe(true);
  });

  it('rejects non-DST headers', () => {
    expect(() => parseDstBuffer(new ArrayBuffer(512))).toThrow(/recognizable Tajima DST header/);
  });
});
