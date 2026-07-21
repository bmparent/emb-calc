import { getSubscription, requireSession } from '../../_lib/auth';
import { handleError, HttpError, json, requireSameOrigin } from '../../_lib/http';
import { stripeRequest } from '../../_lib/stripe';
import type { AppPagesFunction } from '../../_lib/types';

interface PortalSession { url: string }

export const onRequestPost: AppPagesFunction = async ({ request, env }) => {
  try {
    requireSameOrigin(request, new URL(request.url).origin);
    const session = await requireSession(request, env);
    if (!env.STRIPE_SECRET_KEY || !env.SITE_URL) throw new HttpError(503, 'Billing management is not configured yet.');
    const subscription = await getSubscription(session.user.id, env);
    if (!subscription.customerId) throw new HttpError(404, 'No billing profile was found.');
    const portal = await stripeRequest<PortalSession>(
      env.STRIPE_SECRET_KEY,
      '/billing_portal/sessions',
      new URLSearchParams({
        customer: subscription.customerId,
        return_url: new URL('/calculator/', env.SITE_URL).toString(),
      }),
    );
    return json({ url: portal.url });
  } catch (error) {
    return handleError(error);
  }
};
