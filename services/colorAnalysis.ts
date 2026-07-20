import { MADEIRA_THREAD_REFERENCE_ROWS } from '../data/madeiraThreads';
import { APPROXIMATE_PMS_REFERENCE_ROWS } from '../data/pmsApprox';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface LabColor {
  l: number;
  a: number;
  b: number;
}

export interface PaletteColor extends RgbColor {
  hex: string;
  share: number;
}

export type MatchConfidence = 'close screen match' | 'near screen match' | 'review physically';

export interface ColorCatalogEntry {
  pms: string;
  hex: string;
  madeira?: string;
  name?: string;
}

export interface PmsReferenceEntry {
  code: string;
  hex: string;
  name?: string;
  source: 'community' | 'imported';
}

export interface ThreadReferenceEntry {
  code: string;
  hex: string;
  name?: string;
  line: string;
  source: 'madeira-electronic-card' | 'imported';
  inInventory?: boolean;
}

export interface RankedColorMatch<T> {
  entry: T;
  deltaE: number;
  confidence: MatchConfidence;
}

export interface CatalogMatch {
  entry: ColorCatalogEntry;
  deltaE: number;
  confidence: MatchConfidence;
}

export interface ImportedReferenceCatalog {
  pms: PmsReferenceEntry[];
  threads: ThreadReferenceEntry[];
}

export interface ImageColorSample {
  color: PaletteColor;
  pixelCount: number;
  variability: number;
  quality: 'high' | 'medium' | 'low';
  notes: string[];
}

export const BUILT_IN_PMS_REFERENCES: PmsReferenceEntry[] = APPROXIMATE_PMS_REFERENCE_ROWS.map(
  ([code, hex]) => ({ code, hex, source: 'community' }),
);

export const BUILT_IN_THREAD_REFERENCES: ThreadReferenceEntry[] = MADEIRA_THREAD_REFERENCE_ROWS.map(
  ([code, hex, name, line]) => ({
    code,
    hex,
    name: name || undefined,
    line,
    source: 'madeira-electronic-card',
  }),
);

const channelToLinear = (value: number) => {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

export const rgbToLab = ({ r, g, b }: RgbColor): LabColor => {
  const linearR = channelToLinear(r);
  const linearG = channelToLinear(g);
  const linearB = channelToLinear(b);
  const x = (linearR * 0.4124 + linearG * 0.3576 + linearB * 0.1805) / 0.95047;
  const y = linearR * 0.2126 + linearG * 0.7152 + linearB * 0.0722;
  const z = (linearR * 0.0193 + linearG * 0.1192 + linearB * 0.9505) / 1.08883;
  const pivot = (value: number) => value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
  const fx = pivot(x);
  const fy = pivot(y);
  const fz = pivot(z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
};

export const deltaE76FromLab = (left: LabColor, right: LabColor) => (
  Math.hypot(left.l - right.l, left.a - right.a, left.b - right.b)
);

export const deltaE76 = (left: RgbColor, right: RgbColor) => (
  deltaE76FromLab(rgbToLab(left), rgbToLab(right))
);

const degreesToRadians = (degrees: number) => degrees * Math.PI / 180;
const radiansToDegrees = (radians: number) => radians * 180 / Math.PI;
const hueAngle = (a: number, b: number) => {
  const angle = radiansToDegrees(Math.atan2(b, a));
  return angle >= 0 ? angle : angle + 360;
};

/**
 * CIEDE2000 color difference. This is the ranking metric used by both the
 * approximate PMS references and the direct Madeira thread matches.
 */
export const deltaE2000FromLab = (left: LabColor, right: LabColor) => {
  const c1 = Math.hypot(left.a, left.b);
  const c2 = Math.hypot(right.a, right.b);
  const averageC = (c1 + c2) / 2;
  const averageC7 = averageC ** 7;
  const g = 0.5 * (1 - Math.sqrt(averageC7 / (averageC7 + 25 ** 7)));
  const a1Prime = (1 + g) * left.a;
  const a2Prime = (1 + g) * right.a;
  const c1Prime = Math.hypot(a1Prime, left.b);
  const c2Prime = Math.hypot(a2Prime, right.b);
  const h1Prime = hueAngle(a1Prime, left.b);
  const h2Prime = hueAngle(a2Prime, right.b);
  const deltaLPrime = right.l - left.l;
  const deltaCPrime = c2Prime - c1Prime;

  let deltaHPrimeDegrees = 0;
  if (c1Prime * c2Prime !== 0) {
    const raw = h2Prime - h1Prime;
    deltaHPrimeDegrees = Math.abs(raw) <= 180 ? raw : raw > 180 ? raw - 360 : raw + 360;
  }
  const deltaHPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(degreesToRadians(deltaHPrimeDegrees / 2));
  const averageLPrime = (left.l + right.l) / 2;
  const averageCPrime = (c1Prime + c2Prime) / 2;

  let averageHPrime = h1Prime + h2Prime;
  if (c1Prime * c2Prime === 0) {
    averageHPrime = h1Prime + h2Prime;
  } else if (Math.abs(h1Prime - h2Prime) <= 180) {
    averageHPrime = (h1Prime + h2Prime) / 2;
  } else if (h1Prime + h2Prime < 360) {
    averageHPrime = (h1Prime + h2Prime + 360) / 2;
  } else {
    averageHPrime = (h1Prime + h2Prime - 360) / 2;
  }

  const t = 1
    - 0.17 * Math.cos(degreesToRadians(averageHPrime - 30))
    + 0.24 * Math.cos(degreesToRadians(2 * averageHPrime))
    + 0.32 * Math.cos(degreesToRadians(3 * averageHPrime + 6))
    - 0.20 * Math.cos(degreesToRadians(4 * averageHPrime - 63));
  const deltaTheta = 30 * Math.exp(-(((averageHPrime - 275) / 25) ** 2));
  const averageLTerm = (averageLPrime - 50) ** 2;
  const sL = 1 + (0.015 * averageLTerm) / Math.sqrt(20 + averageLTerm);
  const sC = 1 + 0.045 * averageCPrime;
  const sH = 1 + 0.015 * averageCPrime * t;
  const averageCPrime7 = averageCPrime ** 7;
  const rC = 2 * Math.sqrt(averageCPrime7 / (averageCPrime7 + 25 ** 7));
  const rT = -rC * Math.sin(degreesToRadians(2 * deltaTheta));
  const lTerm = deltaLPrime / sL;
  const cTerm = deltaCPrime / sC;
  const hTerm = deltaHPrime / sH;
  return Math.sqrt(lTerm ** 2 + cTerm ** 2 + hTerm ** 2 + rT * cTerm * hTerm);
};

export const deltaE2000 = (left: RgbColor, right: RgbColor) => (
  deltaE2000FromLab(rgbToLab(left), rgbToLab(right))
);

export const rgbToHex = ({ r, g, b }: RgbColor) => `#${[r, g, b]
  .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
  .join('')}`.toUpperCase();

export const hexToRgb = (hex: string): RgbColor | null => {
  const normalized = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const getConfidence = (deltaE: number): MatchConfidence => (
  deltaE <= 3 ? 'close screen match' : deltaE <= 8 ? 'near screen match' : 'review physically'
);

export const rankColorMatches = <T extends { hex: string }>(
  color: RgbColor,
  catalog: T[],
  limit = 5,
): RankedColorMatch<T>[] => {
  const sourceLab = rgbToLab(color);
  return catalog
    .map((entry) => {
      const rgb = hexToRgb(entry.hex);
      if (!rgb) return null;
      const deltaE = deltaE2000FromLab(sourceLab, rgbToLab(rgb));
      return { entry, deltaE, confidence: getConfidence(deltaE) };
    })
    .filter((match): match is RankedColorMatch<T> => match !== null)
    .sort((left, right) => left.deltaE - right.deltaE)
    .slice(0, Math.max(0, limit));
};

export const matchCatalogColor = (
  color: RgbColor,
  catalog: ColorCatalogEntry[],
): CatalogMatch | null => rankColorMatches(color, catalog, 1)[0] ?? null;

export const extractPalette = (imageData: ImageData, limit = 6): PaletteColor[] => {
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  const pixels = imageData.data;
  const sampleEvery = Math.max(1, Math.floor((imageData.width * imageData.height) / 120_000));
  let sampled = 0;

  for (let pixel = 0; pixel < pixels.length; pixel += 4 * sampleEvery) {
    if (pixels[pixel + 3] < 128) continue;
    const r = pixels[pixel];
    const g = pixels[pixel + 1];
    const b = pixels[pixel + 2];
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
    sampled += 1;
  }

  const candidates = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .map((bucket) => ({
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
      count: bucket.count,
    }));
  const selected: PaletteColor[] = [];

  for (const candidate of candidates) {
    if (selected.every((color) => deltaE2000(candidate, color) >= 7)) {
      selected.push({
        ...candidate,
        hex: rgbToHex(candidate),
        share: sampled ? candidate.count / sampled : 0,
      });
    }
    if (selected.length >= limit) break;
  }
  return selected;
};

const getImagePixels = (
  imageData: ImageData,
  include: (x: number, y: number) => boolean,
  preferDominant: boolean,
): ImageColorSample | null => {
  const pixels: RgbColor[] = [];
  const totalPixels = imageData.width * imageData.height;
  const sampleEvery = Math.max(1, Math.floor(totalPixels / 100_000));

  for (let y = 0; y < imageData.height; y += sampleEvery) {
    for (let x = 0; x < imageData.width; x += sampleEvery) {
      if (!include(x, y)) continue;
      const offset = (y * imageData.width + x) * 4;
      if (imageData.data[offset + 3] < 128) continue;
      pixels.push({
        r: imageData.data[offset],
        g: imageData.data[offset + 1],
        b: imageData.data[offset + 2],
      });
    }
  }
  if (!pixels.length) return null;

  let selected = pixels;
  if (preferDominant && pixels.length > 1) {
    const buckets = new Map<string, RgbColor[]>();
    for (const pixel of pixels) {
      const key = `${pixel.r >> 4}-${pixel.g >> 4}-${pixel.b >> 4}`;
      const bucket = buckets.get(key) ?? [];
      bucket.push(pixel);
      buckets.set(key, bucket);
    }
    selected = [...buckets.values()].sort((a, b) => b.length - a.length)[0];
  }

  const middle = (channel: keyof RgbColor) => {
    const values = selected.map((pixel) => pixel[channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  };
  const color: PaletteColor = {
    r: middle('r'),
    g: middle('g'),
    b: middle('b'),
    hex: '',
    share: 0,
  };
  color.hex = rgbToHex(color);
  const colorLab = rgbToLab(color);
  const variabilitySample = selected.filter((_, index) => index % Math.max(1, Math.floor(selected.length / 2000)) === 0);
  const variability = variabilitySample.reduce(
    (sum, pixel) => sum + deltaE76FromLab(colorLab, rgbToLab(pixel)),
    0,
  ) / variabilitySample.length;
  const clipped = selected.filter((pixel) => (
    Math.max(pixel.r, pixel.g, pixel.b) >= 250 || Math.min(pixel.r, pixel.g, pixel.b) <= 5
  )).length / selected.length;
  const quality: ImageColorSample['quality'] = variability <= 5 && clipped < 0.2
    ? 'high'
    : variability <= 13 && clipped < 0.45
      ? 'medium'
      : 'low';
  const notes: string[] = [];
  if (variability > 13) notes.push('The selected area contains several colors, texture, or lighting changes.');
  if (clipped >= 0.45) notes.push('Strong highlights or shadows may be shifting this sample.');
  if (selected.length < 25) notes.push('Use a larger sample area for a steadier result.');
  return { color, pixelCount: selected.length, variability, quality, notes };
};

export const sampleCircle = (
  imageData: ImageData,
  centerX: number,
  centerY: number,
  radius: number,
): ImageColorSample | null => {
  const radiusSquared = radius ** 2;
  return getImagePixels(
    imageData,
    (x, y) => (x - centerX) ** 2 + (y - centerY) ** 2 <= radiusSquared,
    false,
  );
};

export const sampleRectangle = (
  imageData: ImageData,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): ImageColorSample | null => {
  const left = Math.min(startX, endX);
  const right = Math.max(startX, endX);
  const top = Math.min(startY, endY);
  const bottom = Math.max(startY, endY);
  return getImagePixels(
    imageData,
    (x, y) => x >= left && x <= right && y >= top && y <= bottom,
    true,
  );
};

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  values.push(current.trim());
  return values;
};

const findHeader = (headers: string[], choices: string[]) => (
  headers.findIndex((header) => choices.includes(header))
);

export const parseColorCatalogCsv = (csv: string): ColorCatalogEntry[] => {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('The catalog needs a header row and at least one color.');
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const pmsIndex = findHeader(headers, ['pms', 'pantone', 'code']);
  const hexIndex = findHeader(headers, ['hex', 'rgb hex', 'color']);
  const madeiraIndex = findHeader(headers, ['madeira', 'thread', 'thread number']);
  const nameIndex = findHeader(headers, ['name']);
  if (pmsIndex < 0 || hexIndex < 0) throw new Error('Catalog columns must include pms and hex.');

  const entries = lines.slice(1).map(parseCsvLine).map((values) => ({
    pms: values[pmsIndex]?.trim(),
    hex: values[hexIndex]?.trim().toUpperCase(),
    madeira: madeiraIndex >= 0 ? values[madeiraIndex]?.trim() : undefined,
    name: nameIndex >= 0 ? values[nameIndex]?.trim() : undefined,
  })).filter((entry) => entry.pms && hexToRgb(entry.hex));
  if (!entries.length) throw new Error('No valid catalog rows were found. Use six-digit HEX values.');
  return entries;
};

export const parseReferenceCatalogCsv = (csv: string): ImportedReferenceCatalog => {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('The catalog needs a header row and at least one color.');
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/_/g, ' '));
  const hexIndex = findHeader(headers, ['hex', 'rgb hex', 'color']);
  const pmsIndex = findHeader(headers, ['pms', 'pantone']);
  const threadIndex = findHeader(headers, ['madeira', 'thread', 'thread number']);
  const codeIndex = findHeader(headers, ['code']);
  const typeIndex = findHeader(headers, ['type']);
  const nameIndex = findHeader(headers, ['name']);
  const lineIndex = findHeader(headers, ['line', 'thread line']);
  if (hexIndex < 0) throw new Error('Catalog columns must include hex.');

  const imported: ImportedReferenceCatalog = { pms: [], threads: [] };
  for (const values of lines.slice(1).map(parseCsvLine)) {
    const hex = values[hexIndex]?.trim().toUpperCase();
    if (!hexToRgb(hex)) continue;
    const type = typeIndex >= 0 ? values[typeIndex]?.trim().toLowerCase() : '';
    const pmsCode = pmsIndex >= 0 ? values[pmsIndex]?.trim() : '';
    const threadCode = threadIndex >= 0 ? values[threadIndex]?.trim() : '';
    const genericCode = codeIndex >= 0 ? values[codeIndex]?.trim() : '';
    const name = nameIndex >= 0 ? values[nameIndex]?.trim() : undefined;
    const line = lineIndex >= 0 ? values[lineIndex]?.trim() : undefined;

    if (pmsCode || (type === 'pms' && genericCode)) {
      imported.pms.push({
        code: pmsCode || genericCode,
        hex,
        name,
        source: 'imported',
      });
    }
    if (threadCode || (type === 'thread' && genericCode)) {
      imported.threads.push({
        code: threadCode || genericCode,
        hex,
        name,
        line: line || 'Imported Madeira',
        source: 'imported',
      });
    }
  }
  if (!imported.pms.length && !imported.threads.length) {
    throw new Error('No valid PMS or thread rows were found.');
  }
  return imported;
};

export const getColorFamily = ({ r, g, b }: RgbColor) => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (lightness < 0.12) return 'Blacks';
  if (lightness > 0.9 && delta < 0.08) return 'Whites';
  if (delta < 0.1) return 'Greys & Silvers';
  let hue = 0;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue < 15 || hue >= 345) return 'Reds';
  if (hue < 45) return lightness < 0.38 ? 'Browns' : 'Oranges';
  if (hue < 70) return lightness > 0.72 ? 'Light Tans' : 'Yellows';
  if (hue < 165) return 'Greens';
  if (hue < 255) return 'Blues';
  if (hue < 290) return 'Purples';
  if (hue < 345) return 'Pinks';
  return 'Reds';
};
