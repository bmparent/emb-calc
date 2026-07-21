export type AnalyticsParameters = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    embroideryCalcAnalyticsConsent?: boolean;
    embroideryCalcAnalyticsMode?: 'gtm' | 'ga';
  }
}

export function bucketQuantity(quantity: number): string {
  if (quantity <= 12) return '1-12';
  if (quantity <= 48) return '13-48';
  if (quantity <= 144) return '49-144';
  return '145+';
}

export function bucketLocationCount(count: number): string {
  if (count <= 1) return '1';
  if (count === 2) return '2';
  return '3+';
}

export function bucketMachineHeads(heads: number): string {
  if (heads <= 1) return '1';
  if (heads <= 6) return '2-6';
  return '7+';
}

export function trackEvent(name: string, parameters: AnalyticsParameters = {}): void {
  if (typeof window === 'undefined' || !window.embroideryCalcAnalyticsConsent) return;

  const safeParameters = Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => value !== undefined),
  );
  if (window.embroideryCalcAnalyticsMode === 'gtm') {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event: name, ...safeParameters });
    return;
  }
  window.gtag?.('event', name, safeParameters);
}
