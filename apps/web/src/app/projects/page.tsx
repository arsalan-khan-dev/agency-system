'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { formatCents } from '@/lib/money';
import { Project, ProjectStatus } from '@/lib/types';

const C = {
  surface: 'var(--surface, #10151d)', elevated: 'var(--surface-elevated, #161c26)', border: 'var(--border, #232b38)',
  primary: 'var(--primary, #3aa0ff)', secondary: 'var(--secondary, #8b7cf6)', success: 'var(--success, #34c78e)',
  warning: 'var(--warning, #e8b34d)', danger: 'var(--danger, #e5566a)', text: 'var(--text, #eef2f7)', muted: 'var(--text-muted, #8894a6)',
};

// ─── Icons ───────────────────────────────────────────────────────────
const IcBriefcase = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
  </svg>
);
const IcCheckCircle = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const IcPlayCircle = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" />
  </svg>
);
const IcXCircle = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const STATUS_CONFIG: Record<ProjectStatus, { color: string, label: string, icon: React.ReactNode }> = {
  active: { color: C.warning, label: 'Active', icon: <IcPlayCircle /> },
  completed: { color: C.success, label: 'Completed', icon: <IcCheckCircle /> },
  cancelled: { color: C.danger, label: 'Cancelled', icon: <IcXCircle /> },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Project[]>('/api/v1/projects')
      .then(setProjects)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load projects.'))
      .finally(() => setLoading(false));
  }, []);

  const totalValueCents = projects.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + p.budgetCentsSnapshot, 0);
  const activeCount = projects.filter(p => p.status === 'active').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;

  return (
    <AppShell active="/projects">
      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 48, height: 48, borderRadius: 13, background: `${C.secondary}18`, border: `1px solid ${C.secondary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.secondary }}>
              <IcBriefcase />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Projects</h1>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>View and manage active projects converted from accepted quotations.</p>
            </div>
          </div>
          <Link href="/quotations" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '10px 20px', borderRadius: 9, border: `1px solid ${C.border}`, cursor: 'pointer',
              background: 'transparent', color: C.text, fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s'
            }}>
              View Quotations
            </button>
          </Link>
        </div>

        {/* Stat Cards */}
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Active Projects', value: activeCount, color: C.warning, icon: <IcPlayCircle /> },
              { label: 'Completed', value: completedCount, color: C.success, icon: <IcCheckCircle /> },
              { label: 'Total Value (Active + Comp)', value: formatCents(totalValueCents), color: C.secondary, icon: <IcBriefcase /> },
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
        {loading && <div style={{ textAlign: 'center', padding: 60, color: C.muted, fontSize: 13 }}>Loading projects…</div>}
        {!loading && error && (
          <div style={{ padding: '16px 20px', background: `${C.danger}12`, border: `1px solid ${C.danger}44`, borderRadius: 10, color: C.danger, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && projects.length === 0 && (
          <div style={{ textAlign: 'center', padding: 64, border: `1px dashed ${C.border}`, borderRadius: 14, color: C.muted }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `${C.secondary}12`, border: `1px solid ${C.secondary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: C.secondary }}>
              <IcBriefcase />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>No projects yet</p>
            <p style={{ fontSize: 13, margin: '0 0 20px' }}>Accept a quotation to automatically convert it into a project.</p>
            <Link href="/quotations" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${C.primary}, #2280d0)`, color: '#fff', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 12px rgba(58,160,255,0.25)' }}>
                Go to Quotations
              </button>
            </Link>
          </div>
        )}

        {/* Projects Table */}
        {!loading && !error && projects.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 150px 140px', padding: '12px 22px', background: `${C.elevated}cc`, borderBottom: `1px solid ${C.border}` }}>
              {['Project Title', 'Client', 'Budget', 'Status'].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>

            {projects.map((p, i) => {
              const conf = STATUS_CONFIG[p.status];
              return (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.5fr 150px 140px',
                  padding: '16px 22px', alignItems: 'center',
                  borderBottom: i < projects.length - 1 ? `1px solid ${C.border}` : 'none',
                  background: i % 2 === 0 ? 'transparent' : `${C.elevated}33`,
                  transition: 'background 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${conf.color}18`, border: `1px solid ${conf.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: conf.color, flexShrink: 0 }}>
                      <IcBriefcase />
                    </div>
                    <Link href={`/projects/${p.id}`} style={{ fontSize: 14, fontWeight: 600, color: C.text, textDecoration: 'none' }}>
                      {p.title}
                    </Link>
                  </div>

                  <span style={{ fontSize: 13, color: C.muted }}>{p.client.name}</span>
                  
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                    {formatCents(p.budgetCentsSnapshot)}
                  </span>

                  <div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: `${conf.color}15`,
                      color: conf.color,
                      border: `1px solid ${conf.color}33`,
                    }}>
                      {conf.icon}
                      {conf.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </AppShell>
  );
}
