import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  ZERNIO_PLATFORMS,
  ZernioError,
  zernioRequest,
  type ZernioPlatform,
} from '@/lib/zernio/client';
import { ensureZernioProfile } from '@/lib/zernio/profile';

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const body = await request.json().catch(() => ({}));
    const platform = String(body.platform ?? '') as ZernioPlatform;
    if (!ZERNIO_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: 'Unsupported platform.' }, { status: 400 });
    }
    const profileId = await ensureZernioProfile({
      supabase: ctx.supabase,
      accountId: ctx.accountId,
      accountName: ctx.account.name,
    });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) throw new Error('NEXT_PUBLIC_SITE_URL is not configured.');
    const params = new URLSearchParams({
      profileId,
      redirect_url: `${siteUrl}/api/social/zernio/callback`,
    });
    const result = await zernioRequest<{ authUrl: string }>(
      `/connect/${platform}?${params.toString()}`,
    );
    return NextResponse.json({ authUrl: result.authUrl });
  } catch (error) {
    if (error instanceof ZernioError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return toErrorResponse(error);
  }
}

