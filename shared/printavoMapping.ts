export interface PrintavoLineItem {
  itemNumber?: string | null;
  description?: string | null;
  color?: string | null;
  items?: number | null;
}

export interface PrintavoImprint {
  id: string;
  details?: string | null;
  typeOfWork?: { name?: string | null } | null;
}

export interface PrintavoLineItemGroup {
  lineItems?: { nodes?: PrintavoLineItem[] | null } | null;
  imprints?: { nodes?: PrintavoImprint[] | null } | null;
}

export interface PrintavoOrder {
  id: string;
  visualId?: string | null;
  nickname?: string | null;
  totalQuantity?: number | null;
  lineItemGroups?: { nodes?: PrintavoLineItemGroup[] | null } | null;
}

export interface PrintavoCalculatorLocation {
  id: string;
  designNumber: string;
  stitches: number | null;
  colors: number | null;
  quantity: number;
  position: string;
  sourceDetails: string;
}

export interface PrintavoCalculatorImport {
  orderId: string;
  visualId: string;
  nickname: string;
  quantity: number;
  apparelType: 'Tshirt' | 'Polo' | 'Hat' | 'Visor' | 'Bag' | 'Promo';
  locations: PrintavoCalculatorLocation[];
  warnings: string[];
}

const numberFrom = (details: string, pattern: RegExp) => {
  const match = details.match(pattern);
  if (!match) return null;
  const value = Number(match[1].replaceAll(',', ''));
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
};

export const inferLocationPosition = (details: string) => {
  const value = details.toLowerCase();
  if (/left\s*(chest|breast)/.test(value)) return 'Left Chest';
  if (/right\s*(chest|breast)/.test(value)) return 'Right Chest';
  if (/left\s*sleeve/.test(value)) return 'Left Sleeve';
  if (/right\s*sleeve/.test(value)) return 'Right Sleeve';
  if (/hat.*(left|side)|(left|side).*hat/.test(value)) return 'Hat Left Panel';
  if (/hat.*back|back.*hat/.test(value)) return 'Hat Back';
  if (/hat|cap|front panel/.test(value)) return 'Hat Front';
  if (/back/.test(value)) return 'Back';
  if (/side/.test(value)) return 'Product Side';
  return 'Product Front';
};

export const inferApparelType = (items: PrintavoLineItem[]) => {
  const value = items.map((item) => `${item.itemNumber ?? ''} ${item.description ?? ''}`).join(' ').toLowerCase();
  if (/\b(hat|cap|beanie|snapback|trucker)\b/.test(value)) return 'Hat' as const;
  if (/\bvisor\b/.test(value)) return 'Visor' as const;
  if (/\b(polo|golf shirt)\b/.test(value)) return 'Polo' as const;
  if (/\b(bag|tote|backpack|duffel)\b/.test(value)) return 'Bag' as const;
  if (/\b(tee|t-shirt|tshirt|shirt|hoodie|sweatshirt|jacket)\b/.test(value)) return 'Tshirt' as const;
  return 'Promo' as const;
};

export const mapPrintavoOrder = (order: PrintavoOrder): PrintavoCalculatorImport => {
  const groups = order.lineItemGroups?.nodes ?? [];
  const allItems = groups.flatMap((group) => group.lineItems?.nodes ?? []);
  const fallbackQuantity = Math.max(1, Math.round(order.totalQuantity ?? allItems.reduce((sum, item) => sum + (item.items ?? 0), 0)));
  const locations = groups.flatMap((group) => {
    const groupQuantity = Math.max(1, (group.lineItems?.nodes ?? []).reduce((sum, item) => sum + (item.items ?? 0), 0) || fallbackQuantity);
    return (group.imprints?.nodes ?? [])
      .filter((imprint) => !imprint.typeOfWork?.name || /embroider/i.test(imprint.typeOfWork.name))
      .map((imprint, index): PrintavoCalculatorLocation => {
        const details = (imprint.details ?? '').trim();
        const firstLine = details.split(/\r?\n/).find(Boolean)?.trim();
        return {
          id: imprint.id,
          designNumber: (firstLine || `Printavo imprint ${index + 1}`).slice(0, 80),
          stitches: numberFrom(details, /([\d,]+)\s*(?:stitches?|sts?)\b/i),
          colors: numberFrom(details, /(\d+)\s*(?:colou?rs?|threads?)\b/i),
          quantity: groupQuantity,
          position: inferLocationPosition(details),
          sourceDetails: details.slice(0, 500),
        };
      });
  });
  const warnings: string[] = [];
  if (locations.length === 0) warnings.push('No embroidery imprints were found. Add production locations manually.');
  if (locations.some((location) => location.stitches === null)) warnings.push('Some imprints do not include a recognizable stitch count. Add it before calculating.');
  if (locations.some((location) => location.colors === null)) warnings.push('Some imprints do not include a recognizable color count. Review those values.');
  return {
    orderId: order.id,
    visualId: order.visualId ?? order.id,
    nickname: order.nickname ?? '',
    quantity: fallbackQuantity,
    apparelType: inferApparelType(allItems),
    locations,
    warnings,
  };
};
