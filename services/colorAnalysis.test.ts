import { describe, expect, it } from 'vitest';
import {
  deltaE2000FromLab,
  deltaE76,
  getColorFamily,
  matchCatalogColor,
  parseColorCatalogCsv,
  parseReferenceCatalogCsv,
  rankColorMatches,
  sampleRectangle,
} from './colorAnalysis';

describe('color analysis', () => {
  it('parses a user-provided PMS and Madeira catalog', () => {
    const catalog = parseColorCatalogCsv('pms,hex,madeira,name\nSample Blue,#0047AB,1842,Blue');
    expect(catalog).toEqual([{ pms: 'Sample Blue', hex: '#0047AB', madeira: '1842', name: 'Blue' }]);
  });

  it('finds the nearest imported catalog color', () => {
    const catalog = parseColorCatalogCsv('pms,hex,madeira\nBlue,#0000FF,1842\nRed,#FF0000,1637');
    expect(matchCatalogColor({ r: 2, g: 4, b: 250 }, catalog)?.entry.pms).toBe('Blue');
  });

  it('returns zero distance for identical colors', () => {
    expect(deltaE76({ r: 10, g: 20, b: 30 }, { r: 10, g: 20, b: 30 })).toBeCloseTo(0);
  });

  it('matches the published CIEDE2000 reference pair', () => {
    expect(deltaE2000FromLab(
      { l: 50, a: 2.6772, b: -79.7751 },
      { l: 50, a: 0, b: -82.7485 },
    )).toBeCloseTo(2.0425, 4);
  });

  it('ranks several direct thread alternatives', () => {
    const matches = rankColorMatches(
      { r: 250, g: 10, b: 10 },
      [
        { code: 'red', hex: '#FF0000' },
        { code: 'blue', hex: '#0000FF' },
        { code: 'dark-red', hex: '#A00000' },
      ],
      2,
    );
    expect(matches.map((match) => match.entry.code)).toEqual(['red', 'dark-red']);
  });

  it('imports legacy PMS and Madeira columns into separate libraries', () => {
    const imported = parseReferenceCatalogCsv('pms,hex,madeira,name,line\n186,#C8102E,1637,Red,Polyneon 40');
    expect(imported.pms[0]).toMatchObject({ code: '186', hex: '#C8102E' });
    expect(imported.threads[0]).toMatchObject({ code: '1637', line: 'Polyneon 40' });
  });

  it('uses the dominant color in a selected area', () => {
    const imageData = {
      width: 4,
      height: 1,
      data: new Uint8ClampedArray([
        255, 0, 0, 255,
        250, 5, 5, 255,
        245, 10, 10, 255,
        0, 0, 255, 255,
      ]),
    } as ImageData;
    expect(sampleRectangle(imageData, 0, 0, 3, 0)?.color.hex).toBe('#FA0505');
  });

  it('maps colors to inventory families', () => {
    expect(getColorFamily({ r: 10, g: 30, b: 220 })).toBe('Blues');
    expect(getColorFamily({ r: 245, g: 245, b: 245 })).toBe('Whites');
  });
});
