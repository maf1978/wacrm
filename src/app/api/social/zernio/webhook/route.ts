import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { verifyZernioSignature } from '@/lib/zernio/webhook';

function stringAt(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value) return value;
  }
  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (
    !verifyZernioSignature(
      rawBody,
      request.headers.get('x-zernio-signature'),
    )
  ) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const eventId =
    request.headers.get('x-zernio-event-id') ??
    stringAt(payload, ['id', 'eventId']);
  const eventType = stringAt(payload, ['type', 'event', 'eventType']);
  if (!eventId || !eventType) {
    return NextResponse.json(
      { error: 'Webhook id and type are required.' },
      { status: 400 },
    );
  }

  const data =
    payload.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : payload;
  const account =
    data.account && typeof data.account === 'object'
      ? (data.account as Record<string, unknown>)
      : {};
  const profileValue = account.profileId ?? data.profileId ?? payload.profileId;
  const profileId =
    typeof profileValue === 'string'
      ? profileValue
      : profileValue && typeof profileValue === 'object'
        ? stringAt(profileValue as Record<string, unknown>, ['_id', 'id'])
        : null;

  const admin = supabaseAdmin();
  let accountId: string | null = null;
  if (profileId) {
    const mapping = await admin
      .from('zernio_profiles')
      .select('account_id')
      .eq('zernio_profile_id', profileId)
      .maybeSingle();
    accountId = mapping.data?.account_id ?? null;
  }

  const inserted = await admin.from('zernio_webhook_events').insert({
    event_id: eventId,
    event_type: eventType,
    account_id: accountId,
    payload,
    processed_at: new Date().toISOString(),
  });
  if (inserted.error?.code === '23505') {
    return NextResponse.json({ accepted: true, duplicate: true });
  }
  if (inserted.error) {
    console.error('[zernio webhook] event persistence failed:', inserted.error);
    return NextResponse.json({ error: 'Could not accept event.' }, { status: 500 });
  }

  if (accountId && ['post.published', 'post.failed', 'post.partial'].includes(eventType)) {
    const postValue = data.post ?? payload.post;
    const post =
      postValue && typeof postValue === 'object'
        ? (postValue as Record<string, unknown>)
        : data;
    const postId = stringAt(post, ['_id', 'id', 'postId']);
    if (postId) {
      await admin
        .from('social_posts')
        .update({
          status: eventType.replace('post.', ''),
          error_message:
            eventType === 'post.failed'
              ? String(data.error ?? 'Publishing failed.')
              : null,
          raw_payload: payload,
          updated_at: new Date().toISOString(),
        })
        .eq('account_id', accountId)
        .eq('zernio_post_id', postId);
    }
  }

  return NextResponse.json({ accepted: true });
}

