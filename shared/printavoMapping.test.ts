import { describe, expect, it } from 'vitest';
import { mapPrintavoOrder } from './printavoMapping';

describe('mapPrintavoOrder', () => {
  it('extracts calculator fields without copying unrelated order data', () => {
    const result = mapPrintavoOrder({
      id: 'invoice-1',
      visualId: '1042',
      nickname: 'Team polos',
      totalQuantity: 24,
      lineItemGroups: { nodes: [{
        lineItems: { nodes: [{ description: 'Performance polo', items: 24 }] },
        imprints: { nodes: [{
          id: 'imprint-1',
          details: 'Left chest logo\n8,420 stitches / 6 colors',
          typeOfWork: { name: 'Embroidery' },
        }] },
      }] },
    });
    expect(result.apparelType).toBe('Polo');
    expect(result.quantity).toBe(24);
    expect(result.locations[0]).toMatchObject({ stitches: 8420, colors: 6, position: 'Left Chest' });
    expect(result.warnings).toEqual([]);
  });

  it('skips non-embroidery imprints and flags missing production fields', () => {
    const result = mapPrintavoOrder({
      id: 'quote-1',
      totalQuantity: 12,
      lineItemGroups: { nodes: [{
        lineItems: { nodes: [{ description: 'Trucker cap', items: 12 }] },
        imprints: { nodes: [
          { id: 'screen', details: 'Front print', typeOfWork: { name: 'Screen Print' } },
          { id: 'emb', details: 'Hat front logo', typeOfWork: { name: 'Embroidery' } },
        ] },
      }] },
    });
    expect(result.apparelType).toBe('Hat');
    expect(result.locations).toHaveLength(1);
    expect(result.locations[0].position).toBe('Hat Front');
    expect(result.warnings.length).toBe(2);
  });
});
