'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { OrgSettings } from '@/lib/types';

const C = {
  surface: 'var(--surface, #10151d)',
  elevated: 'var(--surface-elevated, #171e29)',
  border: 'var(--border, #232d3f)',
  borderHover: 'var(--border-hover, #3b4962)',
  accent: 'var(--primary, #3b82f6)',
  accentGlow: 'rgba(59, 130, 246, 0.15)',
  text: 'var(--text, #f1f5f9)',
  muted: 'var(--text-muted, #94a3b8)',
  subtle: 'var(--text-muted, #64748b)',
  success: 'var(--success, #10b981)',
  danger: 'var(--danger, #ef4444)',
};

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const;

function str(v: string | null): string {
  return v ?? '';
}

interface FormState {
  name: string;
  logoUrl: string;
  addressLine1: string;
  addressLine2: string;
  contactEmail: string;
  contactPhone: string;
  defaultCurrency: string;
  quotationFooterText: string;
}

function settingsToForm(s: OrgSettings): FormState {
  return {
    name: s.name,
    logoUrl: str(s.logoUrl),
    addressLine1: str(s.addressLine1),
    addressLine2: str(s.addressLine2),
    contactEmail: str(s.contactEmail),
    contactPhone: str(s.contactPhone),
    defaultCurrency: s.defaultCurrency,
    quotationFooterText: str(s.quotationFooterText),
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [logoError, setLogoError] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<OrgSettings>('/api/v1/org-settings')
      .then((s) => {
        setSettings(s);
        setForm(settingsToForm(s));
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Could not load organisation settings.')
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    setLogoError(false);
  }, [form?.logoUrl]);

  function field<K extends keyof FormState>(key: K) {
    return (value: string) =>
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaveError(null);

    if (!form.name.trim()) {
      setSaveError('Organisation name is required.');
      return;
    }
    if (form.logoUrl && !/^https?:\/\/.+/.test(form.logoUrl)) {
      setSaveError('Logo URL must be a valid HTTP/HTTPS URL.');
      return;
    }
    if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      setSaveError('Contact email must be a valid email address.');
      return;
    }

    const body: Record<string, string | null> = {
      name: form.name.trim(),
      logoUrl: form.logoUrl.trim() || null,
      addressLine1: form.addressLine1.trim() || null,
      addressLine2: form.addressLine2.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      defaultCurrency: form.defaultCurrency,
      quotationFooterText: form.quotationFooterText.trim() || null,
    };

    setSaving(true);
    try {
      const updated = await api.patch<OrgSettings>('/api/v1/org-settings', body);
      setSettings(updated);
      setForm(settingsToForm(updated));
      setSavedAt(new Date());
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (settings) {
      setForm(settingsToForm(settings));
      setSaveError(null);
    }
  }

  return (
    <AppShell active="/settings">
      <div className="mx-auto max-w-4xl space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Organisation Settings</h1>
            <p className="text-sm text-slate-400">
              Manage your company branding, default currency, and quotation terms for client PDFs.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Admin Privileges Required
          </div>
        </div>

        {loading && (
          <div className="flex h-48 items-center justify-center rounded-xl border border-slate-800 bg-[#10151d]">
            <div className="flex items-center gap-3 text-slate-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
              <span>Loading organisation settings…</span>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-400">
            <p className="font-medium">Failed to load settings</p>
            <p className="mt-1 text-sm text-rose-300/80">{error}</p>
          </div>
        )}

        {!loading && form && (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Section 1: Organisation Branding */}
            <div className="rounded-xl border border-slate-800 bg-[#10151d] p-6 shadow-lg shadow-black/20">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0v-4m0 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Identity & Branding</h2>
                  <p className="text-xs text-slate-400">Company name and logo used on generated quotation headers</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="org-name" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Organisation Name <span className="text-blue-400">*</span>
                  </label>
                  <input
                    id="org-name"
                    value={form.name}
                    onChange={(e) => field('name')(e.target.value)}
                    placeholder="Acme Agency Inc."
                    maxLength={150}
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-800 bg-[#171e29] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="org-logo" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Logo Image URL
                  </label>
                  <input
                    id="org-logo"
                    value={form.logoUrl}
                    onChange={(e) => field('logoUrl')(e.target.value)}
                    placeholder="https://example.com/assets/logo.png"
                    maxLength={500}
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-800 bg-[#171e29] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Direct public image link (PNG, SVG, JPG). Used in quotation headers.
                  </p>

                  {form.logoUrl && !logoError && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-800 bg-[#171e29] p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.logoUrl}
                        alt="Logo preview"
                        className="h-10 max-w-[160px] object-contain"
                        onError={() => setLogoError(true)}
                      />
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400">
                        Live Preview
                      </span>
                    </div>
                  )}
                  {form.logoUrl && logoError && (
                    <p className="mt-2 text-xs font-medium text-rose-400">
                      ⚠️ Could not load image from this URL. Please verify it is publicly accessible.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Contact Information */}
            <div className="rounded-xl border border-slate-800 bg-[#10151d] p-6 shadow-lg shadow-black/20">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Contact Details</h2>
                  <p className="text-xs text-slate-400">Printed on proposal footers and PDF contact details</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="org-email" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Contact Email
                  </label>
                  <input
                    id="org-email"
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => field('contactEmail')(e.target.value)}
                    placeholder="billing@agency.com"
                    maxLength={255}
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-800 bg-[#171e29] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label htmlFor="org-phone" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Contact Phone
                  </label>
                  <input
                    id="org-phone"
                    value={form.contactPhone}
                    onChange={(e) => field('contactPhone')(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    maxLength={40}
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-800 bg-[#171e29] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label htmlFor="org-addr1" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Address Line 1
                  </label>
                  <input
                    id="org-addr1"
                    value={form.addressLine1}
                    onChange={(e) => field('addressLine1')(e.target.value)}
                    placeholder="742 Evergreen Terrace"
                    maxLength={200}
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-800 bg-[#171e29] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label htmlFor="org-addr2" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Address Line 2
                  </label>
                  <input
                    id="org-addr2"
                    value={form.addressLine2}
                    onChange={(e) => field('addressLine2')(e.target.value)}
                    placeholder="Suite 100, New York, NY 10001"
                    maxLength={200}
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-800 bg-[#171e29] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Currency & Defaults */}
            <div className="rounded-xl border border-slate-800 bg-[#10151d] p-6 shadow-lg shadow-black/20">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Financial Defaults</h2>
                  <p className="text-xs text-slate-400">Default currency used across estimation profiles and quotations</p>
                </div>
              </div>

              <div>
                <label htmlFor="org-currency" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Default Currency
                </label>
                <select
                  id="org-currency"
                  value={form.defaultCurrency}
                  onChange={(e) => field('defaultCurrency')(e.target.value)}
                  disabled={saving}
                  className="w-full sm:w-64 rounded-lg border border-slate-800 bg-[#171e29] px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 cursor-pointer"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Pre-populates new pricing profiles. Existing pricing rules and active contracts remain unchanged.
                </p>
              </div>
            </div>

            {/* Section 4: Quotation PDF Footer */}
            <div className="rounded-xl border border-slate-800 bg-[#10151d] p-6 shadow-lg shadow-black/20">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100">PDF Quotation Footer</h2>
                  <p className="text-xs text-slate-400">Legal disclaimers, payment instructions, and terms shown on exported PDFs</p>
                </div>
              </div>

              <div>
                <label htmlFor="org-footer" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Footer Terms & Conditions
                </label>
                <textarea
                  id="org-footer"
                  value={form.quotationFooterText}
                  onChange={(e) => field('quotationFooterText')(e.target.value)}
                  placeholder="Payment terms: 50% deposit upon acceptance, balance due within 14 days of completion."
                  maxLength={2000}
                  rows={4}
                  disabled={saving}
                  className="w-full resize-none rounded-lg border border-slate-800 bg-[#171e29] px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Appears at the very bottom of client PDFs</span>
                  <span className={form.quotationFooterText.length > 1800 ? 'text-amber-400' : ''}>
                    {form.quotationFooterText.length} / 2000
                  </span>
                </div>
              </div>
            </div>

            {/* Error / Success Feedback */}
            {saveError && (
              <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-400">
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{saveError}</span>
              </div>
            )}

            {savedAt && !saveError && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-400">
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Organisation settings saved successfully at {savedAt.toLocaleTimeString()}!</span>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="rounded-lg border border-slate-800 bg-[#171e29] px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
              >
                Reset Changes
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-50"
              >
                {saving && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
