'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type SocialAccount = {
  id: string;
  zernio_account_id: string;
  platform: string;
  username: string | null;
  display_name: string | null;
  profile_url: string | null;
  status: string;
};

const platforms = [
  'instagram',
  'facebook',
  'linkedin',
  'googlebusiness',
  'threads',
  'tiktok',
  'youtube',
  'twitter',
] as const;

export function SocialSettings() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/social/zernio');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not load social accounts.');
      setAccounts(body.accounts ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load social accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedAccounts = useMemo(
    () => accounts.filter((account) => selected.includes(account.id)),
    [accounts, selected],
  );

  async function connect(platform: string) {
    setConnecting(platform);
    try {
      const response = await fetch('/api/social/zernio/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not start connection.');
      window.location.assign(body.authUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start connection.');
      setConnecting(null);
    }
  }

  async function publish() {
    setPublishing(true);
    try {
      const response = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          publishNow: true,
          idempotencyKey: crypto.randomUUID(),
          targets: selectedAccounts.map((account) => ({
            platform: account.platform,
            accountId: account.zernio_account_id,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not publish post.');
      toast.success('Post submitted to Zernio.');
      setContent('');
      setSelected([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish post.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Social accounts</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Connect channels through Zernio. Credentials stay in the hosted OAuth flow.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-2 size-4" /> Sync
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {platforms.map((platform) => (
              <Button
                key={platform}
                variant="outline"
                disabled={connecting !== null}
                onClick={() => void connect(platform)}
                className="justify-between capitalize"
              >
                {platform === 'googlebusiness' ? 'Google Business' : platform}
                {connecting === platform ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ExternalLink className="size-4" />
                )}
              </Button>
            ))}
          </div>

          <div className="mt-6 space-y-2">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading connected accounts…</p>
            ) : accounts.length ? (
              accounts.map((account) => (
                <label
                  key={account.id}
                  className="border-border flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(account.id)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, account.id]
                          : current.filter((id) => id !== account.id),
                      )
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium capitalize">
                      {account.display_name || account.username || account.platform}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {account.platform} · {account.status}
                    </span>
                  </span>
                </label>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                No social accounts connected yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publish now</CardTitle>
          <p className="text-muted-foreground text-sm">
            Select connected accounts above, then publish one caption across them.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write your social post…"
            rows={6}
          />
          <Button
            disabled={!content.trim() || !selected.length || publishing}
            onClick={() => void publish()}
          >
            {publishing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Send className="mr-2 size-4" />
            )}
            Publish to {selected.length || 0} account{selected.length === 1 ? '' : 's'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

