'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { Quotation, QuotationStatus } from '@/lib/types';

const C = {
  surface: 'var(--surface, #10151d)', elevated: 'var(--surface-elevated, #161c26)', border: 'var(--border, #232b38)',
  primary: 'var(--primary, #3aa0ff)', secondary: 'var(--secondary, #8b7cf6)', success: 'var(--success, #34c78e)',
  warning: 'var(--warning, #e8b34d)', danger: 'var(--danger, #e5566a)', text: 'var(--text, #eef2f7)', muted: 'var(--text-muted, #8894a6)',
};

// ─── Icons ───────────────────────────────────────────────────────────
const IcFileText = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const IcCalendar = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IcBell = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);
const IcCheck = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IcSend = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const STATUS_CONFIG: Record<QuotationStatus, { color: string, label: string }> = {
  draft: { color: C.muted, label: 'Draft' },
  sent: { color: C.warning, label: 'Sent' },
  accepted: { color: C.success, label: 'Accepted' },
  rejected: { color: C.danger, label: 'Rejected' },
  expired: { color: C.muted, label: 'Expired' },
};

const RECURRING_LABEL: Record<Quotation['recurringInterval'], string> = {
  none: '',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

function DueForBillingPanel() {
  const [due, setDue] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Quotation[]>('/api/v1/quotations/due-for-billing')
      .then(setDue)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load billing reminders.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSendReminder(id: string) {
    setReminderError(null);
    setBusyId(id);
    try {
      const updated = await api.post<Quotation>(`/api/v1/quotations/${id}/send-billing-reminder`);
      setDue((prev) => prev.map((q) => (q.id === id ? updated : q)));
    } catch (err) {
      setReminderError(err instanceof ApiError ? err.message : 'Could not send the reminder.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading || due.length === 0) return null; 

  return (
    <div style={{
      background: `${C.warning}11`, border: `1px solid ${C.warning}44`, borderRadius: 14,
      padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: C.warning }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: `${C.warning}22`, border: `1px solid ${C.warning}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.warning }}>
            <IcBell />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>Due for Billing</h2>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Recurring quotations whose next billing date has arrived.</p>
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: `${C.warning}22`, color: C.warning }}>
          {due.length} Due
        </span>
      </div>

      {reminderError && (
        <div style={{ padding: '10px 14px', background: `${C.danger}15`, border: `1px solid ${C.danger}44`, borderRadius: 8, color: C.danger, fontSize: 13, marginBottom: 16 }}>
          {reminderError}
        </div>
      )}

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 100px 120px 120px 130px', padding: '10px 16px', background: `${C.elevated}cc`, borderBottom: `1px solid ${C.border}` }}>
          {['Client', 'Title', 'Amount', 'Due Date', 'Status', 'Action'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>
        {due.map((q, i) => (
          <div key={q.id} style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 100px 120px 120px 130px', padding: '12px 16px', alignItems: 'center', borderBottom: i < due.length - 1 ? `1px solid ${C.border}` : 'none', background: i % 2 === 0 ? 'transparent' : `${C.elevated}33` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{q.clientNameSnapshot}</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Link href={`/quotations/${q.id}`} style={{ fontSize: 13, color: C.primary, textDecoration: 'none', fontWeight: 500 }}>{q.titleSnapshot}</Link>
              <span style={{ fontSize: 11, color: C.muted }}>{RECURRING_LABEL[q.recurringInterval]}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{formatMoney(q.priceCentsSnapshot, q.currency)}</span>
            <span style={{ fontSize: 13, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}><IcCalendar /> {q.nextBillingDate ? new Date(q.nextBillingDate).toLocaleDateString() : '—'}</span>
            <span style={{ fontSize: 12, color: q.lastReminderSentAt ? C.success : C.warning }}>
              {q.lastReminderSentAt ? `Sent ${new Date(q.lastReminderSentAt).toLocaleDateString()}` : 'Not sent'}
            </span>
            <div style={{ textAlign: 'right' }}>
              <button disabled={busyId === q.id || !!q.lastReminderSentAt} onClick={() => handleSendReminder(q.id)} style={{
                padding: '6px 12px', borderRadius: 6, border: q.lastReminderSentAt ? `1px solid ${C.success}44` : `1px solid ${C.warning}44`,
                background: q.lastReminderSentAt ? `${C.success}11` : `${C.warning}15`,
                color: q.lastReminderSentAt ? C.success : C.warning, fontSize: 11, fontWeight: 600,
                cursor: (busyId === q.id || !!q.lastReminderSentAt) ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                {q.lastReminderSentAt ? <><IcCheck /> Reminded</> : <><IcSend /> Remind</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Quotation[]>('/api/v1/quotations')
      .then(setQuotations)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load quotations.'))
      .finally(() => setLoading(false));
  }, []);

  const totalValueCents = quotations.filter(q => q.status === 'accepted').reduce((sum, q) => sum + q.priceCentsSnapshot, 0);
  const acceptedCount = quotations.filter(q => q.status === 'accepted').length;
  const pendingCount = quotations.filter(q => q.status === 'sent').length;

  return (
    <AppShell active="/quotations">
      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 48, height: 48, borderRadius: 13, background: `${C.primary}18`, border: `1px solid ${C.primary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
              <IcFileText />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Quotations</h1>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>View and manage formal quotations generated from estimates.</p>
            </div>
          </div>
          <Link href="/estimates" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '10px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${C.primary}, #2280d0)`,
              color: '#fff', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(58,160,255,0.3)',
            }}>
              Generate New
            </button>
          </Link>
        </div>

        {/* Dynamic Billing Panel */}
        <DueForBillingPanel />

        {/* Stat Cards */}
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Accepted Value', value: formatMoney(totalValueCents, 'USD'), color: C.success, icon: <IcCheck /> },
              { label: 'Pending Sent', value: pendingCount, color: C.warning, icon: <IcSend /> },
              { label: 'Total Accepted', value: acceptedCount, color: C.primary, icon: <IcFileText /> },
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
                  <p style={{ fontSize: 24, fontWeight: 700, color: stat.color, margin: 0, lineHeight: 1 }}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading / Error States */}
        {loading && <div style={{ textAlign: 'center', padding: 60, color: C.muted, fontSize: 13 }}>Loading quotations…</div>}
        {!loading && error && (
          <div style={{ padding: '16px 20px', background: `${C.danger}12`, border: `1px solid ${C.danger}44`, borderRadius: 10, color: C.danger, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && quotations.length === 0 && (
          <div style={{ textAlign: 'center', padding: 64, border: `1px dashed ${C.border}`, borderRadius: 14, color: C.muted }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `${C.primary}12`, border: `1px solid ${C.primary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: C.primary }}>
              <IcFileText />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>No quotations yet</p>
            <p style={{ fontSize: 13, margin: '0 0 20px' }}>Finalize an estimate to generate your first quotation.</p>
            <Link href="/estimates" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${C.primary}, #2280d0)`, color: '#fff', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 12px rgba(58,160,255,0.25)' }}>
                Go to Estimates
              </button>
            </Link>
          </div>
        )}

        {/* Quotations Table */}
        {!loading && !error && quotations.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 100px 150px 120px', padding: '12px 22px', background: `${C.elevated}cc`, borderBottom: `1px solid ${C.border}` }}>
              {['Title', 'Client', 'Version', 'Price', 'Status'].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>

            {quotations.map((q, i) => (
              <div key={q.id} style={{
                display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 100px 150px 120px',
                padding: '16px 22px', alignItems: 'center',
                borderBottom: i < quotations.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? 'transparent' : `${C.elevated}33`,
                transition: 'background 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${STATUS_CONFIG[q.status].color}18`, border: `1px solid ${STATUS_CONFIG[q.status].color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: STATUS_CONFIG[q.status].color, flexShrink: 0 }}>
                    <IcFileText />
                  </div>
                  <Link href={`/quotations/${q.id}`} style={{ fontSize: 14, fontWeight: 600, color: C.text, textDecoration: 'none' }}>
                    {q.titleSnapshot}
                  </Link>
                </div>

                <span style={{ fontSize: 13, color: C.muted }}>{q.clientNameSnapshot}</span>
                
                <span style={{ fontSize: 12, color: C.muted, background: C.elevated, borderRadius: 6, padding: '3px 10px', display: 'inline-block', width: 'fit-content', border: `1px solid ${C.border}` }}>
                  v{q.version}
                </span>

                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                  {formatMoney(q.priceCentsSnapshot, q.currency)}
                </span>

                <div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: `${STATUS_CONFIG[q.status].color}20`,
                    color: STATUS_CONFIG[q.status].color,
                    border: `1px solid ${STATUS_CONFIG[q.status].color}44`,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                    {STATUS_CONFIG[q.status].label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </AppShell>
  );
}
