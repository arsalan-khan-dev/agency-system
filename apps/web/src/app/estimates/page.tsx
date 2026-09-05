'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { formatCents } from '@/lib/money';
import { Client, Estimate, Quotation } from '@/lib/types';

const C = {
  surface: 'var(--surface, #10151d)', elevated: 'var(--surface-elevated, #161c26)', border: 'var(--border, #232b38)',
  primary: 'var(--primary, #3aa0ff)', secondary: 'var(--secondary, #8b7cf6)', success: 'var(--success, #34c78e)',
  warning: 'var(--warning, #e8b34d)', danger: 'var(--danger, #e5566a)', text: 'var(--text, #eef2f7)', muted: 'var(--text-muted, #8894a6)',
};

// ─── Icons ───────────────────────────────────────────────────────────
const IcEstimate = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IcPlus = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcClock = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcUser = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IcCheck = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcDoc = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);
const IcZap = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IcArrow = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

export default function EstimatesPage() {
  const router = useRouter();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingForId, setGeneratingForId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    Promise.all([api.get<Estimate[]>('/api/v1/estimates'), api.get<Client[]>('/api/v1/clients')])
      .then(([ests, cls]) => { setEstimates(ests); setClients(cls.filter(c => c.isActive)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate(estimateId: string) {
    if (!selectedClientId) { setGenerateError('Choose a client first.'); return; }
    setGenerateError(null); setGenerating(true);
    try {
      const quotation = await api.post<Quotation>('/api/v1/quotations/generate', { estimateId, clientId: selectedClientId });
      router.push(`/quotations/${quotation.id}`);
    } catch (err) {
      setGenerateError(err instanceof ApiError ? err.message : 'Could not generate the quotation.');
    } finally { setGenerating(false); }
  }

  const finalizedCount = estimates.filter(e => e.status === 'finalized').length;
  const draftCount = estimates.filter(e => e.status === 'draft').length;

  return (
    <AppShell active="/estimates">
      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 48, height: 48, borderRadius: 13, background: `${C.primary}18`, border: `1px solid ${C.primary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
              <IcEstimate />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Estimates</h1>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Draft and finalized estimates produced by the Estimation Wizard.</p>
            </div>
          </div>
          <Link href="/estimates/new" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '10px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${C.primary}, #2280d0)`,
              color: '#fff', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(58,160,255,0.3)',
            }}>
              <IcPlus /> New Estimate
            </button>
          </Link>
        </div>

        {/* Stat Cards */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Estimates', value: estimates.length, color: C.primary, icon: <IcDoc /> },
              { label: 'Finalized', value: finalizedCount, color: C.success, icon: <IcCheck /> },
              { label: 'Drafts', value: draftCount, color: C.warning, icon: <IcClock /> },
            ].map((stat, i) => (
              <div key={i} style={{
                background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${stat.color}99, transparent)`, borderRadius: '12px 12px 0 0' }} />
                <div style={{ width: 42, height: 42, borderRadius: 10, background: `${stat.color}18`, border: `1px solid ${stat.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>
                  {stat.icon}
                </div>
                <div>
                  <p style={{ fontSize: 11, color: C.muted, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{stat.label}</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: stat.color, margin: 0, lineHeight: 1 }}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: 60, color: C.muted, fontSize: 13 }}>Loading estimates…</div>}

        {!loading && estimates.length === 0 && (
          <div style={{ textAlign: 'center', padding: 64, border: `1px dashed ${C.border}`, borderRadius: 14, color: C.muted }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `${C.primary}12`, border: `1px solid ${C.primary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: C.primary }}>
              <IcEstimate />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>No estimates yet</p>
            <p style={{ fontSize: 13, margin: '0 0 20px' }}>Start a new estimate to price out your first project.</p>
            <Link href="/estimates/new" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${C.primary}, #2280d0)`, color: '#fff', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 12px rgba(58,160,255,0.25)' }}>
                <IcPlus /> Create First Estimate
              </button>
            </Link>
          </div>
        )}

        {!loading && estimates.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {/* Table Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 100px 140px 110px 200px', padding: '12px 22px', background: `${C.elevated}cc`, borderBottom: `1px solid ${C.border}` }}>
              {['Title', 'Project Type', 'Hours', 'Final Price', 'Status', 'Quotation'].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {estimates.map((est, i) => (
              <div key={est.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1.4fr 100px 140px 110px 200px',
                padding: '16px 22px', alignItems: 'center',
                borderBottom: i < estimates.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? 'transparent' : `${C.elevated}33`,
                transition: 'background 0.15s',
              }}>
                {/* Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: est.status === 'finalized' ? `${C.success}18` : `${C.warning}18`, border: `1px solid ${est.status === 'finalized' ? C.success + '44' : C.warning + '44'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: est.status === 'finalized' ? C.success : C.warning, flexShrink: 0 }}>
                    <IcDoc />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{est.title}</span>
                </div>

                {/* Project Type */}
                <span style={{ fontSize: 12, color: C.muted, background: C.elevated, borderRadius: 6, padding: '3px 10px', display: 'inline-block', width: 'fit-content', border: `1px solid ${C.border}` }}>
                  {est.projectType.name}
                </span>

                {/* Hours */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.muted }}>
                  <IcClock />
                  <span style={{ fontSize: 13 }}>{est.totalHoursSnapshot}h</span>
                </div>

                {/* Price */}
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.success }}>{formatCents(est.finalPriceCents)}</span>
                  {est.manualAdjustedPriceCents !== null && (
                    <span style={{ fontSize: 10, color: C.warning, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <IcZap /> adjusted
                    </span>
                  )}
                </div>

                {/* Status */}
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: est.status === 'finalized' ? `${C.success}20` : `${C.warning}20`,
                  color: est.status === 'finalized' ? C.success : C.warning,
                  border: `1px solid ${est.status === 'finalized' ? C.success + '44' : C.warning + '44'}`,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                  {est.status === 'finalized' ? 'Finalized' : 'Draft'}
                </span>

                {/* Quotation Column */}
                <div>
                  {est.status !== 'finalized' ? (
                    <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <IcClock /> Finalize first
                    </span>
                  ) : generatingForId === est.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <select
                        value={selectedClientId}
                        onChange={e => setSelectedClientId(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, outline: 'none' }}
                      >
                        <option value="">Select client…</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {generateError && <p style={{ fontSize: 11, color: C.danger, margin: 0 }}>{generateError}</p>}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setGeneratingForId(null); setGenerateError(null); }} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                          Cancel
                        </button>
                        <button disabled={generating} onClick={() => handleGenerate(est.id)} style={{
                          flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
                          background: generating ? C.elevated : `linear-gradient(135deg, ${C.primary}, #2280d0)`,
                          color: generating ? C.muted : '#fff', fontSize: 11, fontWeight: 600,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        }}>
                          {generating ? 'Generating…' : <><IcArrow /> Generate</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setGeneratingForId(est.id); setSelectedClientId(''); setGenerateError(null); }}
                      style={{
                        padding: '7px 14px', borderRadius: 7, border: `1px solid ${C.primary}44`,
                        background: `${C.primary}12`, color: C.primary,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        transition: 'all 0.15s',
                      }}
                    >
                      <IcZap /> Generate Quotation
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
