import { requireActiveSubscription, requireSession } from '../../_lib/auth';
import { handleError, HttpError, json } from '../../_lib/http';
import { getPrintavoCredentials, printavoRequest } from '../../_lib/printavo';
import type { AppPagesFunction } from '../../_lib/types';
import { mapPrintavoOrder, type PrintavoOrder } from '../../../shared/printavoMapping';

const ORDER_QUERY = `
  query CalculatorOrder($id: ID!) {
    order(id: $id) {
      __typename
      ... on Invoice {
        id visualId nickname totalQuantity
        lineItemGroups(first: 50) {
          nodes {
            lineItems(first: 100) { nodes { itemNumber description color items } }
            imprints(first: 50) { nodes { id details typeOfWork { name } } }
          }
        }
      }
      ... on Quote {
        id visualId nickname totalQuantity
        lineItemGroups(first: 50) {
          nodes {
            lineItems(first: 100) { nodes { itemNumber description color items } }
            imprints(first: 50) { nodes { id details typeOfWork { name } } }
          }
        }
      }
    }
  }
`;

export const onRequestGet: AppPagesFunction = async ({ request, env }) => {
  try {
    const session = await requireSession(request, env);
    await requireActiveSubscription(session.user, env);
    const id = new URL(request.url).searchParams.get('id') ?? '';
    if (!id || id.length > 256) throw new HttpError(400, 'Enter a valid Printavo order ID.');
    const credentials = await getPrintavoCredentials(session.user.id, env);
    const data = await printavoRequest<{ order: PrintavoOrder | null }>(credentials, ORDER_QUERY, { id });
    if (!data.order) throw new HttpError(404, 'Printavo order was not found.');
    return json({ order: mapPrintavoOrder(data.order) });
  } catch (error) {
    return handleError(error);
  }
};
