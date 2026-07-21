import { getSubscription, requireSession } from '../../_lib/auth';
import { handleError, HttpError, json, requireSameOrigin } from '../../_lib/http';
import { stripeRequest } from '../../_lib/stripe';
import type { AppPagesFunction } from '../../_lib/types';

interface CheckoutSession { url: string | null }

export const onRequestPost: AppPagesFunction = async ({ request, env }) => {
  try {
    requireSameOrigin(request, new URL(request.url).origin);
    const session = await requireSession(request, env);
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID || !env.SITE_URL) {
      throw new HttpError(503, 'Pro billing is not configured yet.');
    }
    const current = await getSubscription(session.user.id, env);
    if (current.active) throw new HttpError(409, 'Your Pro subscription is already active.');
    const body = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': env.STRIPE_PRICE_ID,
      'line_items[0][quantity]': '1',
      client_reference_id: session.user.id,
      customer_email: session.user.email,
      'metadata[user_id]': session.user.id,
      'subscription_data[metadata][user_id]': session.user.id,
      success_url: `${new URL('/calculator/?billing=success', env.SITE_URL)}`,
      cancel_url: `${new URL('/calculator/?billing=cancelled', env.SITE_URL)}`,
      allow_promotion_codes: 'true',
    });
    const checkout = await stripeRequest<CheckoutSession>(env.STRIPE_SECRET_KEY, '/checkout/sessions', body);
    if (!checkout.url) throw new Error('Stripe did not return a checkout URL.');
    return json({ url: checkout.url });
  } catch (error) {
    return handleError(error);
  }
};
