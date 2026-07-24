import { NextResponse } from 'next/server';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';
import { ZernioError, zernioRequest } from '@/lib/zernio/client';

export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    const result = await ctx.supabase
      .from('social_posts')
      .select('*')
      .eq('account_id', ctx.accountId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (result.error) throw result.error;
    return NextResponse.json({ posts: result.data ?? [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent');
    const body = await request.json().catch(() => ({}));
    const content = String(body.content ?? '').trim();
    const targets = Array.isArray(body.targets) ? body.targets : [];
    if (!content || !targets.length) {
      return NextResponse.json(
        { error: 'Content and at least one social account are required.' },
        { status: 400 },
      );
    }
    const payload = {
      content,
      platforms: targets.map((target: Record<string, unknown>) => ({
        platform: target.platform,
        accountId: target.accountId,
      })),
      scheduledFor: body.scheduledFor || undefined,
      publishNow: body.publishNow === true,
      timezone: body.timezone || 'UTC',
    };
    const zernio = await zernioRequest<Record<string, unknown>>('/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: body.idempotencyKey
        ? { 'Idempotency-Key': String(body.idempotencyKey) }
        : undefined,
    });
    const postRecord = (zernio.post ?? zernio) as Record<string, unknown>;
    const saved = await ctx.supabase
      .from('social_posts')
      .insert({
        account_id: ctx.accountId,
        created_by_user_id: ctx.userId,
        zernio_post_id: String(postRecord._id ?? postRecord.id ?? ''),
        content,
        targets,
        scheduled_for: body.scheduledFor || null,
        timezone: body.timezone || 'UTC',
        status: body.publishNow ? 'publishing' : 'scheduled',
        raw_payload: zernio,
      })
      .select()
      .single();
    if (saved.error) throw saved.error;
    return NextResponse.json({ post: saved.data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZernioError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return toErrorResponse(error);
  }
}

