'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { EstimationQuestion, EstimationQuestionOption, PricingProfile, PricingRule, ProjectType } from '@/lib/types';

// Keep this in sync with the backend's SUPPORTED_CURRENCIES allow-list
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const;
const RULE_TYPES = ['complexity', 'urgency'] as const;

const C = {
  surface: 'var(--surface, #10151d)', elevated: 'var(--surface-elevated, #161c26)', border: 'var(--border, #232b38)',
  primary: 'var(--primary, #3aa0ff)', secondary: 'var(--secondary, #8b7cf6)', success: 'var(--success, #34c78e)',
  warning: 'var(--warning, #e8b34d)', danger: 'var(--danger, #e5566a)', text: 'var(--text, #eef2f7)', muted: 'var(--text-muted, #8894a6)',
};

// ─── Icons ───────────────────────────────────────────────────────────
const IcDollar = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);
const IcPlus = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IcCheck = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IcSliders = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);
const IcGrid = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);
const IcHelp = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IcChevronRight = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IcChevronDown = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────

interface ProfileFormState {
  name: string;
  description: string;
  baseHourlyRateDollars: string;
  minimumPriceDollars: string;
  currency: string;
}

const EMPTY_PROFILE_FORM: ProfileFormState = {
  name: '', description: '', baseHourlyRateDollars: '', minimumPriceDollars: '', currency: 'USD',
};

function toCents(dollars: string): number {
  const n = parseFloat(dollars);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

// ─── Rules Panel ─────────────────────────────────────────────────────

interface RuleFormState {
  ruleType: 'complexity' | 'urgency'; key: string; label: string; multiplier: string;
}
const EMPTY_RULE_FORM: RuleFormState = { ruleType: 'complexity', key: '', label: '', multiplier: '1.0' };

function RulesPanel({ profile }: { profile: PricingProfile }) {
  const [rules, setRules] = useState<PricingRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RuleFormState>(EMPTY_RULE_FORM);
  const [editingRuleId, setEditingRuleId] = useState<string | 'new' | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<PricingRule[]>(`/api/v1/pricing-profiles/${profile.id}/rules`)
      .then(setRules)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load rules.'));
  }
  useEffect(load, [profile.id]);

  function startCreate() { setForm(EMPTY_RULE_FORM); setEditingRuleId('new'); }
  function startEdit(rule: PricingRule) {
    setForm({ ruleType: rule.ruleType, key: rule.key, label: rule.label, multiplier: rule.multiplier });
    setEditingRuleId(rule.id);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (editingRuleId === 'new') {
        await api.post('/api/v1/pricing-rules', {
          profileId: profile.id, ruleType: form.ruleType, key: form.key, label: form.label, multiplier: parseFloat(form.multiplier),
        });
      } else if (editingRuleId) {
        await api.patch(`/api/v1/pricing-rules/${editingRuleId}`, {
          label: form.label, multiplier: parseFloat(form.multiplier),
        });
      }
      setEditingRuleId(null); load();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not save this rule.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(rule: PricingRule) {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try { await api.delete(`/api/v1/pricing-rules/${rule.id}`); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Could not delete this rule.'); }
  }

  const grouped = RULE_TYPES.map((type) => ({
    type, items: (rules ?? []).filter((r) => r.ruleType === type),
  }));

  return (
    <div style={{ padding: '24px', background: `${C.elevated}66`, borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
            Multipliers & Rules
          </h4>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Configure how complexity and urgency scale the final price for {profile.name}.</p>
        </div>
        {editingRuleId === null && (
          <button onClick={startCreate} style={{
            padding: '7px 14px', borderRadius: 7, border: `1px solid ${C.border}`,
            background: C.elevated, color: C.text, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <IcPlus /> Add Rule
          </button>
        )}
      </div>

      {error && <div style={{ padding: '10px 14px', background: `${C.danger}15`, border: `1px solid ${C.danger}44`, borderRadius: 8, color: C.danger, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {editingRuleId && (
        <form onSubmit={handleSave} style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr auto', gap: 12, alignItems: 'end',
          padding: '16px', background: C.surface, border: `1px solid ${C.primary}55`, borderRadius: 10,
          marginBottom: 20, boxShadow: `0 0 20px ${C.primary}11`
        }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
            Type
            <select disabled={editingRuleId !== 'new'} value={form.ruleType} onChange={e => setForm({ ...form, ruleType: e.target.value as RuleFormState['ruleType'] })} style={{ padding: '9px 12px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13, outline: 'none' }}>
              {RULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
            Key <span style={{ textTransform: 'none', fontWeight: 400 }}>(e.g. high)</span>
            <input required disabled={editingRuleId !== 'new'} value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} style={{ padding: '9px 12px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13, outline: 'none' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
            Label <span style={{ textTransform: 'none', fontWeight: 400 }}>(e.g. High Complexity)</span>
            <input required value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} style={{ padding: '9px 12px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13, outline: 'none' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
            Multiplier
            <input required type="number" step="0.01" min="0.01" value={form.multiplier} onChange={e => setForm({ ...form, multiplier: e.target.value })} style={{ padding: '9px 12px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13, outline: 'none' }} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{ padding: '9px 14px', borderRadius: 7, border: 'none', background: C.primary, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditingRuleId(null)} disabled={saving} style={{ padding: '9px 14px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {rules === null ? (
        <div style={{ fontSize: 13, color: C.muted }}>Loading rules…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
          {grouped.map(({ type, items }) => (
            <div key={type}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: `${C.secondary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.secondary }}>
                  <IcSliders />
                </div>
                <h5 style={{ fontSize: 13, fontWeight: 600, color: C.text, textTransform: 'capitalize', margin: 0 }}>{type} Rules</h5>
              </div>
              
              {items.length === 0 ? (
                <div style={{ padding: '16px', background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 8, fontSize: 12, color: C.muted, textAlign: 'center' }}>
                  No {type} rules yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(rule => (
                    <div key={rule.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8
                    }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{rule.label}</span>
                        <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>({rule.key})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.warning }}>×{rule.multiplier}</span>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => startEdit(rule)} style={{ background: 'none', border: 'none', color: C.primary, fontSize: 12, cursor: 'pointer', padding: 0 }}>Edit</button>
                          <button onClick={() => handleDelete(rule)} style={{ background: 'none', border: 'none', color: C.danger, fontSize: 12, cursor: 'pointer', padding: 0 }}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Profiles Tab ────────────────────────────────────────────────────

function ProfilesTab() {
  const [profiles, setProfiles] = useState<PricingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setLoading(true); setError(null);
    api.get<PricingProfile[]>('/api/v1/pricing-profiles')
      .then(setProfiles).catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load pricing profiles.'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function startCreate() { setForm(EMPTY_PROFILE_FORM); setFormError(null); setEditingId('new'); }
  function startEdit(profile: PricingProfile) {
    setForm({
      name: profile.name, description: profile.description ?? '',
      baseHourlyRateDollars: fromCents(profile.baseHourlyRateCents),
      minimumPriceDollars: fromCents(profile.minimumPriceCents),
      currency: profile.currency,
    });
    setFormError(null); setEditingId(profile.id);
  }
  function cancelEdit() { setEditingId(null); setFormError(null); }

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setFormError(null); setSaving(true);
    const body = {
      name: form.name, description: form.description || undefined,
      baseHourlyRateCents: toCents(form.baseHourlyRateDollars),
      minimumPriceCents: toCents(form.minimumPriceDollars), currency: form.currency,
    };
    try {
      if (editingId === 'new') await api.post('/api/v1/pricing-profiles', body);
      else if (editingId) await api.patch(`/api/v1/pricing-profiles/${editingId}`, body);
      setEditingId(null); load();
    } catch (err) { setFormError(err instanceof ApiError ? err.message : 'Could not save this pricing profile.'); }
    finally { setSaving(false); }
  }

  async function toggleActive(profile: PricingProfile) {
    try { await api.patch(`/api/v1/pricing-profiles/${profile.id}`, { isActive: !profile.isActive }); load(); }
    catch {}
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: C.muted, margin: 0, maxWidth: 600 }}>
          Manage your base hourly rates, minimum project prices, and supported currencies used by the Estimation Wizard. Expand a profile to manage its complexity and urgency multipliers.
        </p>
        {editingId === null && (
          <button onClick={startCreate} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${C.primary}, #2280d0)`,
            color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: '0 4px 12px rgba(58,160,255,0.25)',
          }}>
            <IcPlus /> New Profile
          </button>
        )}
      </div>

      {loading && <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: 40 }}>Loading pricing profiles…</div>}
      {!loading && error && <div style={{ padding: '16px', background: `${C.danger}15`, border: `1px solid ${C.danger}44`, borderRadius: 10, color: C.danger, fontSize: 13, marginBottom: 20 }}>{error}</div>}

      {editingId && (
        <form onSubmit={handleSave} style={{
          background: C.surface, border: `1px solid ${C.primary}44`, borderRadius: 12, padding: '24px', marginBottom: 24,
          boxShadow: `0 0 40px ${C.primary}11`
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>
            {editingId === 'new' ? 'Create Pricing Profile' : 'Edit Pricing Profile'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
              Profile Name *
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ padding: '10px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: 'none' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
              Currency
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={{ padding: '10px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: 'none' }}>
                {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
              Base Hourly Rate *
              <input required type="number" step="0.01" min="0" value={form.baseHourlyRateDollars} onChange={e => setForm({ ...form, baseHourlyRateDollars: e.target.value })} style={{ padding: '10px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: 'none' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
              Minimum Price *
              <input required type="number" step="0.01" min="0" value={form.minimumPriceDollars} onChange={e => setForm({ ...form, minimumPriceDollars: e.target.value })} style={{ padding: '10px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: 'none' }} />
            </label>
            <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
              Description
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ padding: '10px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: 'none' }} />
            </label>
          </div>
          
          {formError && <div style={{ padding: '12px', background: `${C.danger}15`, border: `1px solid ${C.danger}44`, borderRadius: 8, color: C.danger, fontSize: 13, marginBottom: 16 }}>{formError}</div>}
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" disabled={saving} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${C.primary}, #2280d0)`, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
            <button type="button" onClick={cancelEdit} disabled={saving} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!loading && !error && profiles.length === 0 && !editingId && (
        <div style={{ textAlign: 'center', padding: 60, border: `1px dashed ${C.border}`, borderRadius: 14, color: C.muted }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>No profiles yet</p>
          <p style={{ fontSize: 13 }}>Create your first pricing profile to enable estimates.</p>
        </div>
      )}

      {!loading && !error && profiles.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 120px 120px 100px 60px', padding: '12px 20px', background: `${C.elevated}cc`, borderBottom: `1px solid ${C.border}` }}>
            {['Name', 'Currency', 'Hourly Rate', 'Minimum', 'Status', ''].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>

          {profiles.map((p, i) => (
            <div key={p.id}>
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 80px 120px 120px 100px 60px', alignItems: 'center',
                padding: '16px 20px', borderBottom: i < profiles.length - 1 || expandedId === p.id ? `1px solid ${C.border}` : 'none',
                background: expandedId === p.id ? `${C.primary}0a` : i % 2 === 0 ? 'transparent' : `${C.elevated}33`,
                transition: 'background 0.2s', cursor: 'pointer',
              }} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: expandedId === p.id ? C.primary : C.muted, display: 'flex' }}>
                    {expandedId === p.id ? <IcChevronDown /> : <IcChevronRight />}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{p.name}</span>
                </div>
                
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{p.currency}</span>
                <span style={{ fontSize: 13, color: C.text }}>{formatMoney(p.baseHourlyRateCents, p.currency)}/hr</span>
                <span style={{ fontSize: 13, color: C.text }}>{formatMoney(p.minimumPriceCents, p.currency)}</span>
                
                <button onClick={(e) => { e.stopPropagation(); toggleActive(p); }} style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4,
                  color: p.isActive ? C.success : C.muted,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.isActive ? C.success : C.muted }} />
                  {p.isActive ? 'Active' : 'Inactive'}
                </button>
                
                <button onClick={(e) => { e.stopPropagation(); startEdit(p); }} style={{ background: 'none', border: 'none', color: C.primary, fontSize: 12, fontWeight: 500, cursor: 'pointer', textAlign: 'right' }}>
                  Edit
                </button>
              </div>

              {expandedId === p.id && <RulesPanel profile={p} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Questions Tab ───────────────────────────────────────────────────

interface QuestionFormState { projectTypeId: string; prompt: string; answerType: 'complexity' | 'urgency'; options: EstimationQuestionOption[]; }
const EMPTY_QUESTION_FORM: QuestionFormState = { projectTypeId: '', prompt: '', answerType: 'complexity', options: [{ key: '', label: '' }] };

function QuestionsTab() {
  const [questions, setQuestions] = useState<EstimationQuestion[] | null>(null);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<QuestionFormState>(EMPTY_QUESTION_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    Promise.all([api.get<EstimationQuestion[]>('/api/v1/estimation-questions'), api.get<ProjectType[]>('/api/v1/project-types')])
      .then(([q, pt]) => { setQuestions(q); setProjectTypes(pt.filter(t => t.isActive)); })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load estimation questions.'));
  }
  useEffect(load, []);

  function startCreate() { setForm({ ...EMPTY_QUESTION_FORM, projectTypeId: projectTypes[0]?.id ?? '' }); setFormError(null); setEditingId('new'); }
  function startEdit(q: EstimationQuestion) {
    setForm({ projectTypeId: q.projectType.id, prompt: q.prompt, answerType: q.answerType, options: q.options });
    setFormError(null); setEditingId(q.id);
  }

  function updateOption(index: number, field: 'key' | 'label', value: string) {
    const options = [...form.options]; options[index] = { ...options[index], [field]: value };
    setForm({ ...form, options });
  }
  function addOption() { setForm({ ...form, options: [...form.options, { key: '', label: '' }] }); }
  function removeOption(index: number) { setForm({ ...form, options: form.options.filter((_, i) => i !== index) }); }

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setFormError(null); setSaving(true);
    try {
      if (editingId === 'new') {
        await api.post('/api/v1/estimation-questions', { projectTypeId: form.projectTypeId, prompt: form.prompt, answerType: form.answerType, options: form.options });
      } else if (editingId) {
        await api.patch(`/api/v1/estimation-questions/${editingId}`, { prompt: form.prompt, options: form.options });
      }
      setEditingId(null); load();
    } catch (err) { setFormError(err instanceof ApiError ? err.message : 'Could not save this question.'); }
    finally { setSaving(false); }
  }

  async function toggleActive(q: EstimationQuestion) { try { await api.patch(`/api/v1/estimation-questions/${q.id}`, { isActive: !q.isActive }); load(); } catch {} }
  async function handleDelete(q: EstimationQuestion) {
    if (!confirm('Delete this question?')) return;
    try { await api.delete(`/api/v1/estimation-questions/${q.id}`); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Could not delete this question.'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: C.muted, margin: 0, maxWidth: 600 }}>
          Define multiple-choice questions that the Estimation Wizard asks for specific project types. Ensure the option keys match the keys in your Pricing Profile rules.
        </p>
        {editingId === null && projectTypes.length > 0 && (
          <button onClick={startCreate} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${C.primary}, #2280d0)`,
            color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: '0 4px 12px rgba(58,160,255,0.25)',
          }}>
            <IcPlus /> New Question
          </button>
        )}
      </div>

      {error && <div style={{ padding: '16px', background: `${C.danger}15`, border: `1px solid ${C.danger}44`, borderRadius: 10, color: C.danger, fontSize: 13, marginBottom: 20 }}>{error}</div>}

      {editingId && (
        <form onSubmit={handleSave} style={{
          background: C.surface, border: `1px solid ${C.primary}44`, borderRadius: 12, padding: '24px', marginBottom: 24,
          boxShadow: `0 0 40px ${C.primary}11`
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>
            {editingId === 'new' ? 'Create Estimation Question' : 'Edit Estimation Question'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
              Project Type
              <select disabled={editingId !== 'new'} value={form.projectTypeId} onChange={e => setForm({ ...form, projectTypeId: e.target.value })} style={{ padding: '10px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: 'none' }}>
                {projectTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
              Answer Type
              <select disabled={editingId !== 'new'} value={form.answerType} onChange={e => setForm({ ...form, answerType: e.target.value as QuestionFormState['answerType'] })} style={{ padding: '10px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: 'none' }}>
                {RULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
              Prompt *
              <input required minLength={3} value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} placeholder="e.g. How complex is the design?" style={{ padding: '10px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: 'none' }} />
            </label>
          </div>

          <div style={{ background: `${C.elevated}66`, padding: '16px', borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 20 }}>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', margin: '0 0 12px' }}>Options</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {form.options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input required placeholder="Key (e.g. high)" value={opt.key} onChange={e => updateOption(i, 'key', e.target.value)} style={{ width: 140, padding: '8px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, outline: 'none' }} />
                  <input required placeholder="Label (e.g. High Complexity)" value={opt.label} onChange={e => updateOption(i, 'label', e.target.value)} style={{ flex: 1, padding: '8px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, outline: 'none' }} />
                  {form.options.length > 1 && (
                    <button type="button" onClick={() => removeOption(i)} style={{ background: 'none', border: 'none', color: C.danger, fontSize: 13, cursor: 'pointer', padding: '0 8px' }}>Remove</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addOption} style={{ marginTop: 12, background: 'none', border: 'none', color: C.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
              + Add Option
            </button>
          </div>

          {formError && <div style={{ padding: '12px', background: `${C.danger}15`, border: `1px solid ${C.danger}44`, borderRadius: 8, color: C.danger, fontSize: 13, marginBottom: 16 }}>{formError}</div>}

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" disabled={saving} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${C.primary}, #2280d0)`, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : 'Save Question'}
            </button>
            <button type="button" onClick={() => setEditingId(null)} disabled={saving} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {questions === null ? (
        <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: 40 }}>Loading questions…</div>
      ) : questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, border: `1px dashed ${C.border}`, borderRadius: 14, color: C.muted }}>
          <p style={{ fontSize: 13 }}>{projectTypes.length === 0 ? 'Create a project type in the Service Catalog first.' : 'No estimation questions created yet.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {questions.map(q => (
            <div key={q.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.secondary}15`, border: `1px solid ${C.secondary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.secondary }}>
                    <IcHelp />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.text, background: C.elevated, padding: '3px 8px', borderRadius: 6 }}>{q.projectType.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.secondary, textTransform: 'uppercase' }}>{q.answerType}</span>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0 }}>{q.prompt}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button onClick={() => toggleActive(q)} style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4,
                    color: q.isActive ? C.success : C.muted,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: q.isActive ? C.success : C.muted }} />
                    {q.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => startEdit(q)} style={{ background: 'none', border: 'none', color: C.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Edit</button>
                  <button onClick={() => handleDelete(q)} style={{ background: 'none', border: 'none', color: C.danger, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Delete</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 54 }}>
                {q.options.map(opt => (
                  <span key={opt.key} style={{ fontSize: 12, color: C.text, background: `${C.elevated}88`, border: `1px solid ${C.border}`, padding: '4px 10px', borderRadius: 20 }}>
                    {opt.label} <span style={{ color: C.muted }}>({opt.key})</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [tab, setTab] = useState<'profiles' | 'questions'>('profiles');

  return (
    <AppShell active="/pricing">
      <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 13, background: `${C.primary}18`, border: `1px solid ${C.primary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
            <IcDollar />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Pricing & Configuration</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Manage the profiles, complex rules, and wizard questions that calculate your estimates.</p>
          </div>
        </div>

        {/* Custom Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
          {[
            { id: 'profiles', label: 'Profiles & Rules', icon: <IcGrid /> },
            { id: 'questions', label: 'Estimation Questions', icon: <IcHelp /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as 'profiles' | 'questions')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
                background: tab === t.id ? `${C.primary}15` : 'transparent',
                border: `1px solid ${tab === t.id ? C.primary + '44' : 'transparent'}`,
                color: tab === t.id ? C.primary : C.muted,
                fontSize: 13, fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'profiles' ? <ProfilesTab /> : <QuestionsTab />}
      </div>
    </AppShell>
  );
}
