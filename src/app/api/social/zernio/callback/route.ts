import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth/account';
import { syncZernioAccounts } from '@/lib/zernio/profile';
import { supabaseAdmin } from '@/lib/automations/admin-client';

export async function GET(request: Request) {
  const redirect = new URL('/settings?tab=social&connected=1', request.url);
  try {
    const ctx = await getCurrentAccount();
    const mapping = await ctx.supabase
      .from('zernio_profiles')
      .select('zernio_profile_id')
      .eq('account_id', ctx.accountId)
      .single();
    if (!mapping.error) {
      await syncZernioAccounts({
        supabase: supabaseAdmin(),
        accountId: ctx.accountId,
        profileId: mapping.data.zernio_profile_id,
      });
    }
  } catch {
    redirect.searchParams.set('sync', 'pending');
  }
  return NextResponse.redirect(redirect);
}
