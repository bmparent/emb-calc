import { describe, expect, it } from 'vitest';
import { ApparelType } from '../../types';
import { getRelevantAffiliateOffers, type AffiliateOffer } from './affiliateOffers';

const offers: AffiliateOffer[] = [
  { id: 'general', title: 'General', description: '', href: 'https://example.com/general', merchant: 'Example', contexts: ['all'], priority: 1 },
  { id: 'cap', title: 'Cap frame', description: '', href: 'https://example.com/cap', merchant: 'Example', contexts: ['caps'], priority: 10 },
  { id: 'color', title: 'Shade card', description: '', href: 'https://example.com/color', merchant: 'Example', contexts: ['color-work'], priority: 5 },
];

describe('getRelevantAffiliateOffers', () => {
  it('ranks relevant cap and color offers without changing calculator output', () => {
    const result = getRelevantAffiliateOffers({ apparelType: ApparelType.Hat, backingInfo: 'Cap backing', totalColors: 5 }, offers);
    expect(result.map((offer) => offer.id)).toEqual(['cap', 'color', 'general']);
  });

  it('does not show cap-specific offers for shirts', () => {
    const result = getRelevantAffiliateOffers({ apparelType: ApparelType.Tshirt, backingInfo: 'Cutaway', totalColors: 1 }, offers);
    expect(result.map((offer) => offer.id)).toEqual(['general']);
  });
});
