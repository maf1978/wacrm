import { NextResponse } from 'next/server';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';
import { ZernioError } from '@/lib/zernio/client';
import { ensureZernioProfile, syncZernioAccounts } from '@/lib/zernio/profile';
import { supabaseAdmin } from '@/lib/automations/admin-client';

function failure(error: unknown) {
  if (error instanceof ZernioError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  return toErrorResponse(error);
}

export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    const mapping = await ctx.supabase
      .from('zernio_profiles')
      .select('zernio_profile_id')
      .eq('account_id', ctx.accountId)
      .maybeSingle();
    if (mapping.error) throw mapping.error;
    if (mapping.data) {
      await syncZernioAccounts({
        supabase: supabaseAdmin(),
        accountId: ctx.accountId,
        profileId: mapping.data.zernio_profile_id,
      });
    }
    const accounts = await ctx.supabase
      .from('social_accounts')
      .select('*')
      .eq('account_id', ctx.accountId)
      .order('platform');
    if (accounts.error) throw accounts.error;
    return NextResponse.json({
      configured: Boolean(process.env.ZERNIO_API_KEY),
      profileId: mapping.data?.zernio_profile_id ?? null,
      accounts: accounts.data ?? [],
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST() {
  try {
    const ctx = await requireRole('admin');
    const profileId = await ensureZernioProfile({
      supabase: ctx.supabase,
      accountId: ctx.accountId,
      accountName: ctx.account.name,
    });
    return NextResponse.json({ profileId }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
