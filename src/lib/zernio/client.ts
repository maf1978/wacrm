const BASE_URL = 'https://zernio.com/api/v1';

export const ZERNIO_PLATFORMS = [
  'facebook',
  'instagram',
  'linkedin',
  'twitter',
  'tiktok',
  'youtube',
  'threads',
  'reddit',
  'pinterest',
  'bluesky',
  'googlebusiness',
  'telegram',
  'snapchat',
  'discord',
] as const;

export type ZernioPlatform = (typeof ZERNIO_PLATFORMS)[number];

export class ZernioError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ZernioError';
  }
}

export async function zernioRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const apiKey = process.env.ZERNIO_API_KEY;
  if (!apiKey) throw new ZernioError('Zernio is not configured.', 503);

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const record = body as Record<string, unknown>;
    throw new ZernioError(
      String(record.error ?? record.message ?? 'Zernio request failed.'),
      response.status,
      typeof record.code === 'string' ? record.code : undefined,
    );
  }
  return body as T;
}

