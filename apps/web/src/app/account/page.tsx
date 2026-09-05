'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { User } from '@/lib/types';

export default function AccountPage() {
  const [me, setMe] = useState<User | null>(null);
  const [meError, setMeError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api
      .get<User>('/api/v1/auth/me')
      .then(setMe)
      .catch((err) => setMeError(err instanceof ApiError ? err.message : 'Could not load your account.'));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/api/v1/auth/password', { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change your password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell active="/account">
      <div className="mx-auto max-w-2xl space-y-8 pb-12">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{color:'var(--text)'}}>My Account</h1>
          <p className="text-sm" style={{color:'var(--text-muted)'}}>View your personal credentials, system role, and security settings.</p>
        </div>

        {meError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-400">
            <p className="font-medium">Account Info Error</p>
            <p className="mt-1 text-sm text-rose-300/80">{meError}</p>
          </div>
        )}

        {!meError && !me && (
          <div className="flex h-32 items-center justify-center rounded-xl" style={{border:'1px solid var(--border)',background:'var(--surface)' }}>
            <div className="flex items-center gap-3" style={{color:'var(--text-muted)'}}>
              <div className="h-5 w-5 animate-spin rounded-full" style={{border:'2px solid var(--primary)',borderTopColor:'transparent'}} />
              <span>Loading account profile…</span>
            </div>
          </div>
        )}

        {me && (
          <div className="rounded-xl p-6" style={{border:'1px solid var(--border)',background:'var(--surface)'}}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold" style={{border:'1px solid var(--primary)',background:'color-mix(in srgb, var(--primary) 15%, transparent)',color:'var(--primary)'}}>
                {me.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold" style={{color:'var(--text)'}}>{me.fullName}</h2>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{border:'1px solid var(--primary)',background:'color-mix(in srgb, var(--primary) 12%, transparent)',color:'var(--primary)'}}>
                    {me.role.name}
                  </span>
                </div>
                <p className="text-sm" style={{color:'var(--text-muted)'}}>{me.email}</p>
                <div className="pt-2 text-xs" style={{color:'var(--text-muted)'}}>
                  Account Status: <span className="font-medium" style={{color:'var(--success)'}}>● Active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Change Password Card */}
        <div className="rounded-xl p-6" style={{border:'1px solid var(--border)',background:'var(--surface)'}}>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{color:'var(--text)'}}>Security &amp; Password</h2>
              <p className="text-xs" style={{color:'var(--text-muted)'}}>Update your current password to secure your account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="current-password" className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{color:'var(--text-muted)'}}>
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition"
                style={{border:'1px solid var(--border)',background:'var(--surface-elevated)',color:'var(--text)'}}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="new-password" className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{color:'var(--text-muted)'}}>
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition"
                style={{border:'1px solid var(--border)',background:'var(--surface-elevated)',color:'var(--text)'}}
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{color:'var(--text-muted)'}}>
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition"
                style={{border:'1px solid var(--border)',background:'var(--surface-elevated)',color:'var(--text)'}}
                placeholder="Repeat new password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-400">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-400">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Password changed successfully!</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-50"
              >
                {saving && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
