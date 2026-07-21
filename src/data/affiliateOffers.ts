import { ApparelType } from '../../types';

export type OfferContext = 'all' | 'caps' | 'apparel' | 'backing' | 'color-work';

export interface AffiliateOffer {
  id: string;
  title: string;
  description: string;
  href: string;
  merchant: string;
  contexts: OfferContext[];
  priority: number;
}

export interface AffiliateRecommendationContext {
  apparelType: ApparelType;
  backingInfo: string;
  totalColors: number;
}

/**
 * Intentionally empty at launch. Add an offer only after the merchant,
 * destination, disclosure, terms, and tracking parameters have been reviewed.
 */
export const AFFILIATE_OFFERS: AffiliateOffer[] = [];

export function getRelevantAffiliateOffers(
  context: AffiliateRecommendationContext,
  offers: AffiliateOffer[] = AFFILIATE_OFFERS,
  limit = 3,
): AffiliateOffer[] {
  const activeContexts = new Set<OfferContext>(['all']);
  if ([ApparelType.Hat, ApparelType.Visor].includes(context.apparelType)) activeContexts.add('caps');
  else activeContexts.add('apparel');
  if (context.backingInfo.trim()) activeContexts.add('backing');
  if (context.totalColors >= 4) activeContexts.add('color-work');

  return offers
    .filter((offer) => offer.contexts.some((item) => activeContexts.has(item)))
    .sort((left, right) => right.priority - left.priority)
    .slice(0, Math.max(0, limit));
}
