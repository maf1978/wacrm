import type { SupabaseClient } from '@supabase/supabase-js';
import { zernioRequest } from './client';

export async function ensureZernioProfile(input: {
  supabase: SupabaseClient;
  accountId: string;
  accountName: string;
}) {
  const existing = await input.supabase
    .from('zernio_profiles')
    .select('zernio_profile_id')
    .eq('account_id', input.accountId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.zernio_profile_id as string;

  const created = await zernioRequest<{
    profile: { _id: string };
  }>('/profiles', {
    method: 'POST',
    body: JSON.stringify({
      name: input.accountName,
      description: `WACRM workspace ${input.accountId}`,
      color: '#25D366',
    }),
  });
  const inserted = await input.supabase
    .from('zernio_profiles')
    .insert({
      account_id: input.accountId,
      zernio_profile_id: created.profile._id,
    })
    .select('zernio_profile_id')
    .single();
  if (inserted.error) throw inserted.error;
  return inserted.data.zernio_profile_id as string;
}

export async function syncZernioAccounts(input: {
  supabase: SupabaseClient;
  accountId: string;
  profileId: string;
}) {
  const result = await zernioRequest<{
    accounts?: Array<Record<string, unknown>>;
  }>(`/accounts?profileId=${encodeURIComponent(input.profileId)}`);
  const accounts = result.accounts ?? [];
  if (accounts.length) {
    const rows = accounts.map((account) => ({
      account_id: input.accountId,
      zernio_account_id: String(account._id ?? account.accountId),
      platform: String(account.platform ?? 'unknown'),
      username: account.username ? String(account.username) : null,
      display_name: account.displayName ? String(account.displayName) : null,
      profile_url: account.profileUrl ? String(account.profileUrl) : null,
      status: account.isActive === false ? 'disconnected' : 'connected',
      raw_payload: account,
      updated_at: new Date().toISOString(),
    }));
    const upsert = await input.supabase
      .from('social_accounts')
      .upsert(rows, { onConflict: 'account_id,zernio_account_id' });
    if (upsert.error) throw upsert.error;
  }
  return accounts;
}

