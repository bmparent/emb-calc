export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const json = (value: unknown, status = 200, headers: HeadersInit = {}) => new Response(
  JSON.stringify(value),
  {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  },
);

export const handleError = (error: unknown) => {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  console.error('Unhandled API error', error instanceof Error ? error.message : 'unknown');
  return json({ error: 'The request could not be completed.' }, 500);
};

export const readJson = async <T>(request: Request, maximumBytes = 16_384): Promise<T> => {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > maximumBytes) throw new HttpError(413, 'Request is too large.');
  try {
    return await request.json<T>();
  } catch {
    throw new HttpError(400, 'Enter valid request data.');
  }
};

export const requireSameOrigin = (request: Request, siteUrl: string) => {
  const expected = new URL(siteUrl).origin;
  const origin = request.headers.get('origin');
  if (!origin || origin !== expected) throw new HttpError(403, 'Request origin is not allowed.');
};

export const normalizeSiteUrl = (value: string) => new URL(value).origin;
