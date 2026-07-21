import React, { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { ApparelType } from '../types';
import { getRelevantAffiliateOffers } from '../src/data/affiliateOffers';
import { trackEvent } from '../src/lib/analytics';

interface Props {
  apparelType: ApparelType;
  backingInfo: string;
  totalColors: number;
}

export const SupplyRecommendations: React.FC<Props> = ({ apparelType, backingInfo, totalColors }) => {
  const offers = useMemo(() => getRelevantAffiliateOffers({ apparelType, backingInfo, totalColors }), [apparelType, backingInfo, totalColors]);
  if (!offers.length) return null;

  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="recommended-supplies-heading">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600">Relevant supplies · Affiliate links</p>
      <h2 id="recommended-supplies-heading" className="mt-2 text-lg font-black text-slate-950">Options for this job</h2>
      <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">These optional links are selected from the job context. They do not change the estimate or ranking.</p>
      <div className="mt-4 space-y-3">
        {offers.map((offer) => (
          <a
            key={offer.id}
            href={offer.href}
            target="_blank"
            rel="sponsored noreferrer"
            onClick={() => trackEvent('affiliate_offer_clicked', { offer_id: offer.id, merchant: offer.merchant })}
            className="block rounded-2xl border border-slate-200 p-4 hover:border-indigo-300 hover:bg-indigo-50/40"
          >
            <span className="flex items-center justify-between gap-3 text-sm font-black text-slate-900">{offer.title}<ExternalLink className="h-4 w-4 text-indigo-600" /></span>
            <span className="mt-1 block text-xs font-medium leading-relaxed text-slate-500">{offer.description}</span>
          </a>
        ))}
      </div>
      <a className="mt-4 inline-block text-xs font-black text-indigo-700" href="/affiliate-disclosure/">How recommendations are funded →</a>
    </aside>
  );
};
