'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { Client } from '@/lib/types';

const C = {
  surface: 'var(--surface, #10151d)', elevated: 'var(--surface-elevated, #161c26)', border: 'var(--border, #232b38)',
  primary: 'var(--primary, #3aa0ff)', secondary: 'var(--secondary, #8b7cf6)', success: 'var(--success, #34c78e)',
  warning: 'var(--warning, #e8b34d)', danger: 'var(--danger, #e5566a)', text: 'var(--text, #eef2f7)', muted: 'var(--text-muted, #8894a6)',
};

// ─── Icons ───────────────────────────────────────────────────────────
const IcUsers = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IcPlus = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IcMail = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const IcUser = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IcCheck = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IcAlert = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api
      .get<Client[]>('/api/v1/clients')
      .then(setClients)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load clients.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await api.post('/api/v1/clients', {
        name,
        contactEmail: contactEmail || undefined,
        contactName: contactName || undefined,
      });
      setName('');
      setContactEmail('');
      setContactName('');
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not create the client.');
    } finally {
      setSaving(false);
    }
  }

  const activeCount = clients.filter(c => c.isActive).length;
  const inactiveCount = clients.length - activeCount;

  return (
    <AppShell active="/clients">
      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 48, height: 48, borderRadius: 13, background: `${C.secondary}18`, border: `1px solid ${C.secondary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.secondary }}>
              <IcUsers />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Clients</h1>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Manage the clients you can attach to quotations and estimates.</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{
            padding: '10px 20px', borderRadius: 9, border: showForm ? `1px solid ${C.border}` : 'none', cursor: 'pointer',
            background: showForm ? 'transparent' : `linear-gradient(135deg, ${C.primary}, #2280d0)`,
            color: showForm ? C.muted : '#fff', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: showForm ? 'none' : '0 4px 14px rgba(58,160,255,0.3)',
            transition: 'all 0.2s',
          }}>
            {showForm ? 'Cancel' : <><IcPlus /> New Client</>}
          </button>
        </div>

        {/* Stat Cards */}
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Clients', value: clients.length, color: C.primary, icon: <IcUsers /> },
              { label: 'Active', value: activeCount, color: C.success, icon: <IcCheck /> },
              { label: 'Inactive', value: inactiveCount, color: C.muted, icon: <IcAlert /> },
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

        {/* New Client Form */}
        {showForm && (
          <div style={{
            background: C.surface, border: `1px solid ${C.primary}44`, borderRadius: 14,
            padding: '28px', marginBottom: 24, boxShadow: `0 0 40px ${C.primary}11`,
            animation: 'fadeInDown 0.3s ease-out'
          }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Add New Client</h2>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Enter the client's business details and contact person.</p>
            </div>
            
            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Client Name / Company *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  style={{ width: '100%', padding: '12px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Contact Person
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 12, left: 14, color: C.muted }}><IcUser /></div>
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    style={{ width: '100%', padding: '12px 14px 12px 36px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Contact Email
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 12, left: 14, color: C.muted }}><IcMail /></div>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="e.g. jane@acme.com"
                    style={{ width: '100%', padding: '12px 14px 12px 36px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {formError && (
                <div style={{ gridColumn: '1 / -1', padding: '12px 14px', background: `${C.danger}12`, border: `1px solid ${C.danger}44`, borderRadius: 8, color: C.danger, fontSize: 13 }}>
                  {formError}
                </div>
              )}
              
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="submit" disabled={saving} style={{
                  padding: '11px 24px', borderRadius: 9, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                  background: saving ? C.elevated : `linear-gradient(135deg, ${C.primary}, #2280d0)`,
                  color: saving ? C.muted : '#fff', fontSize: 13, fontWeight: 600,
                  boxShadow: saving ? 'none' : '0 4px 14px rgba(58,160,255,0.3)',
                }}>
                  {saving ? 'Saving Client…' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading / Error States */}
        {loading && <div style={{ textAlign: 'center', padding: 60, color: C.muted, fontSize: 13 }}>Loading clients…</div>}
        {!loading && error && (
          <div style={{ padding: '16px 20px', background: `${C.danger}12`, border: `1px solid ${C.danger}44`, borderRadius: 10, color: C.danger, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && clients.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: 64, border: `1px dashed ${C.border}`, borderRadius: 14, color: C.muted }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `${C.secondary}12`, border: `1px solid ${C.secondary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: C.secondary }}>
              <IcUsers />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>No clients yet</p>
            <p style={{ fontSize: 13, margin: '0 0 20px' }}>Add a client to start generating quotations.</p>
            <button onClick={() => setShowForm(true)} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${C.primary}, #2280d0)`, color: '#fff', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 12px rgba(58,160,255,0.25)' }}>
              <IcPlus /> Add First Client
            </button>
          </div>
        )}

        {/* Clients Table */}
        {!loading && !error && clients.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 120px', padding: '12px 22px', background: `${C.elevated}cc`, borderBottom: `1px solid ${C.border}` }}>
              {['Client Name', 'Contact Info', 'Status'].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>

            {clients.map((c, i) => (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 120px',
                padding: '16px 22px', alignItems: 'center',
                borderBottom: i < clients.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? 'transparent' : `${C.elevated}33`,
                transition: 'background 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: c.isActive ? `${C.secondary}18` : `${C.muted}18`, border: `1px solid ${c.isActive ? C.secondary + '44' : C.muted + '44'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.isActive ? C.secondary : C.muted, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{c.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{c.name}</span>
                </div>

                <div>
                  {(c.contactName || c.contactEmail) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {c.contactName && (
                        <span style={{ fontSize: 13, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <IcUser /> {c.contactName}
                        </span>
                      )}
                      {c.contactEmail && (
                        <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <IcMail /> {c.contactEmail}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>No contact info</span>
                  )}
                </div>

                <div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: c.isActive ? `${C.success}20` : `${C.muted}20`,
                    color: c.isActive ? C.success : C.muted,
                    border: `1px solid ${c.isActive ? C.success + '44' : C.muted + '44'}`,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                    {c.isActive ? 'Active' : 'Inactive'}
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
