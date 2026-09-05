'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { formatCents } from '@/lib/money';
import { FeatureItem, ProjectType, ServiceCategory, ServiceItem } from '@/lib/types';

// ─── Design Tokens ──────────────────────────────────────────────────
const C = {
  bg: 'var(--bg, #0a0e14)',
  surface: 'var(--surface, #10151d)',
  elevated: 'var(--surface-elevated, #161c26)',
  border: 'var(--border, #232b38)',
  primary: 'var(--primary, #3aa0ff)',
  secondary: 'var(--secondary, #8b7cf6)',
  success: 'var(--success, #34c78e)',
  warning: 'var(--warning, #e8b34d)',
  danger: 'var(--danger, #e5566a)',
  text: 'var(--text, #eef2f7)',
  muted: 'var(--text-muted, #8894a6)',
};

// ─── SVG Icon Library ────────────────────────────────────────────────
const Icon = {
  Globe: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
    </svg>
  ),
  Mobile: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  ),
  Cpu: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
    </svg>
  ),
  Megaphone: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M3 11l17-9v18L3 13H1v-2h2z" />
      <path d="M11.6 16.8a3 3 0 01-5.8-1.6" />
    </svg>
  ),
  Search: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  PenTool: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  ),
  Monitor: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  BarChart: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  Package: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Layers: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Grid: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Code: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Database: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Edit: () => (
    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Trash: () => (
    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ChevronUp: () => (
    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
  Folder: () => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  ),
  Catalog: () => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
  Zap: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Target: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Tool: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  Briefcase: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12" strokeWidth={3} strokeLinecap="round" />
      <path d="M2 12h20" />
    </svg>
  ),
  Activity: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

// category name → icon component
const CATEGORY_ICONS: Record<string, () => React.ReactElement> = {
  'Web Development': Icon.Globe,
  'Custom Web Development': Icon.Code,
  'Mobile App Development': Icon.Mobile,
  'AI & Automation': Icon.Cpu,
  'Digital Marketing': Icon.Megaphone,
  'SEO': Icon.Search,
  'UI/UX Design': Icon.PenTool,
  'Desktop Software': Icon.Monitor,
  'CRM Development': Icon.BarChart,
  'Web & Software Security': Icon.Shield,
};

const PT_ICON_LIST = [
  Icon.Briefcase, Icon.Globe, Icon.Mobile, Icon.Database,
  Icon.Layers, Icon.Grid, Icon.Shield, Icon.Target,
  Icon.Zap, Icon.Tool, Icon.Activity, Icon.Monitor,
];

function getCategoryIcon(name: string) {
  return CATEGORY_ICONS[name] ?? Icon.Folder;
}

// accent colors per category
const CATEGORY_COLORS: Record<string, string> = {
  'Web Development': '#3aa0ff',
  'Custom Web Development': '#8b7cf6',
  'Mobile App Development': '#34c78e',
  'AI & Automation': '#e8b34d',
  'Digital Marketing': '#e5566a',
  'SEO': '#3aa0ff',
  'UI/UX Design': '#8b7cf6',
  'Desktop Software': '#34c78e',
  'CRM Development': '#e8b34d',
  'Web & Software Security': '#e5566a',
};

const PT_COLORS = [C.primary, C.secondary, C.success, C.warning, C.danger, '#06b6d4', '#f97316', '#a855f7', '#10b981', '#ef4444'];

// ─── Shared UI Atoms ────────────────────────────────────────────────
function StatusPill({ active }: { active: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      padding: '3px 10px', borderRadius: 20,
      background: active ? `${C.success}22` : `${C.muted}18`,
      color: active ? C.success : C.muted,
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function ActionBtn({ label, danger, icon, onClick }: { label: string; danger?: boolean; icon?: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      background: danger ? `${C.danger}12` : `${C.primary}12`,
      border: `1px solid ${danger ? C.danger + '33' : C.primary + '33'}`,
      cursor: 'pointer', fontSize: 11, fontWeight: 600,
      color: danger ? C.danger : C.primary,
      padding: '4px 10px', borderRadius: 6,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      transition: 'all 0.15s',
    }}>
      {icon} {label}
    </button>
  );
}

function PrimaryBtn({ children, onClick, type = 'button', disabled }: {
  children: React.ReactNode; onClick?: () => void;
  type?: 'button' | 'submit'; disabled?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      padding: '9px 18px', borderRadius: 8,
      background: disabled ? C.elevated : `linear-gradient(135deg, ${C.primary}, #2280d0)`,
      color: disabled ? C.muted : '#fff',
      border: 'none', fontSize: 13, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: disabled ? 'none' : '0 4px 14px rgba(58,160,255,0.28)',
      display: 'inline-flex', alignItems: 'center', gap: 7,
      transition: 'all 0.2s ease',
    }}>
      {children}
    </button>
  );
}

function SecondaryBtn({ children, onClick, type = 'button', disabled }: {
  children: React.ReactNode; onClick?: () => void;
  type?: 'button' | 'submit'; disabled?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      padding: '9px 18px', borderRadius: 8,
      background: 'transparent', color: C.muted,
      border: `1px solid ${C.border}`,
      fontSize: 13, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 7,
      transition: 'all 0.15s ease',
    }}>
      {children}
    </button>
  );
}

function StyledInput({ id, value, onChange, placeholder, required, type = 'text', step, min }: {
  id?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string; step?: string; min?: string;
}) {
  return (
    <input id={id} required={required} type={type} step={step} min={min}
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{
        width: '100%', padding: '9px 12px',
        background: C.elevated, border: `1px solid ${C.border}`,
        borderRadius: 8, color: C.text, fontSize: 13,
        outline: 'none', boxSizing: 'border-box',
        fontFamily: 'inherit',
      }}
    />
  );
}

function FormCard({ children, onSubmit }: { children: React.ReactNode; onSubmit: (e: FormEvent) => void }) {
  return (
    <form onSubmit={onSubmit} style={{
      background: C.elevated, border: `1px solid ${C.primary}44`,
      borderRadius: 12, padding: 20, marginBottom: 20,
      boxShadow: `0 0 0 1px ${C.primary}18, 0 8px 32px rgba(0,0,0,0.2)`,
    }}>
      {children}
    </form>
  );
}

function IconBox({ icon, color }: { icon: React.ReactNode; color: string }) {
  return (
    <div style={{
      width: 42, height: 42, borderRadius: 11,
      background: `${color}18`,
      border: `1px solid ${color}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: color, flexShrink: 0,
    }}>
      {icon}
    </div>
  );
}

// ─── Services Tab ────────────────────────────────────────────────────
function ServicesTab() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [cats, svcs] = await Promise.all([
        api.get<ServiceCategory[]>('/api/v1/service-categories'),
        api.get<ServiceItem[]>('/api/v1/services'),
      ]);
      setCategories(cats);
      setServices(svcs);
    } catch { }
    finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleCreateCategory(e: FormEvent) {
    e.preventDefault();
    setFormError(null); setSaving(true);
    try {
      await api.post('/api/v1/service-categories', { name: newCategoryName });
      setNewCategoryName(''); setShowNewCategory(false);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not create the category.');
    } finally { setSaving(false); }
  }

  const totalServices = services.length;
  const activeServices = services.filter(s => s.isActive).length;

  return (
    <div>
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Categories', value: categories.length, color: C.primary, icon: <Icon.Folder /> },
          { label: 'Total Services', value: totalServices, color: C.secondary, icon: <Icon.Package /> },
          { label: 'Active Services', value: activeServices, color: C.success, icon: <Icon.Activity /> },
        ].map((stat, i) => (
          <div key={i} style={{
            background: C.elevated, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, ${stat.color}99, transparent)`,
              borderRadius: '12px 12px 0 0',
            }} />
            <IconBox icon={stat.icon} color={stat.color} />
            <div>
              <p style={{ fontSize: 11, color: C.muted, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                {stat.label}
              </p>
              <p style={{ fontSize: 28, fontWeight: 700, color: stat.color, margin: 0, lineHeight: 1 }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
          Categories and services used by the Estimation Wizard to build quotations.
        </p>
        <PrimaryBtn onClick={() => setShowNewCategory(v => !v)}>
          {showNewCategory ? 'Cancel' : <><Icon.Plus /> New Category</>}
        </PrimaryBtn>
      </div>

      {/* New Category Form */}
      {showNewCategory && (
        <FormCard onSubmit={handleCreateCategory}>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: C.primary }}><Icon.Folder /></span> New Service Category
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 500 }}>Category Name</label>
              <StyledInput id="cat-name" required value={newCategoryName} onChange={setNewCategoryName} placeholder="e.g. Cloud Infrastructure" />
            </div>
            <PrimaryBtn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Category'}</PrimaryBtn>
          </div>
          {formError && <p style={{ fontSize: 12, color: C.danger, marginTop: 8 }}>{formError}</p>}
        </FormCard>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 48, color: C.muted, fontSize: 13 }}>Loading catalog…</div>}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {categories.map((category) => {
            const categoryServices = services.filter(s => s.category?.id === category.id);
            const CatIcon = getCategoryIcon(category.name);
            const accentColor = CATEGORY_COLORS[category.name] ?? C.primary;
            return (
              <div key={category.id} style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 14, overflow: 'hidden',
              }}>
                {/* Category Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 22px',
                  background: `linear-gradient(90deg, ${accentColor}0a, transparent)`,
                  borderBottom: categoryServices.length > 0 ? `1px solid ${C.border}` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <IconBox icon={<CatIcon />} color={accentColor} />
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{category.name}</p>
                      {category.description && (
                        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{category.description}</p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{
                      fontSize: 12, color: C.muted,
                      background: C.elevated, padding: '3px 10px',
                      borderRadius: 6, border: `1px solid ${C.border}`,
                    }}>
                      {categoryServices.length} service{categoryServices.length !== 1 ? 's' : ''}
                    </span>
                    <StatusPill active={category.isActive} />
                  </div>
                </div>

                {/* Services Table */}
                {categoryServices.length === 0 ? (
                  <div style={{
                    padding: '28px 22px', display: 'flex', alignItems: 'center', gap: 12,
                    color: C.muted, fontSize: 13,
                  }}>
                    <div style={{ color: C.border }}><Icon.Package /></div>
                    No services in this category yet
                  </div>
                ) : (
                  <div>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                      padding: '10px 22px', borderBottom: `1px solid ${C.border}`,
                      background: `${C.elevated}66`,
                    }}>
                      {['Service', 'Unit', 'Base Cost', 'Status'].map(h => (
                        <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {h}
                        </span>
                      ))}
                    </div>
                    {categoryServices.map((svc, i) => (
                      <div key={svc.id} style={{
                        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                        padding: '14px 22px', alignItems: 'center',
                        borderBottom: i < categoryServices.length - 1 ? `1px solid ${C.border}` : 'none',
                        background: i % 2 === 0 ? 'transparent' : `${C.elevated}33`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                            background: svc.isActive ? C.success : C.muted,
                            boxShadow: svc.isActive ? `0 0 6px ${C.success}88` : 'none',
                          }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{svc.name}</span>
                        </div>
                        <span style={{
                          fontSize: 12, color: C.muted,
                          background: C.elevated, borderRadius: 5, padding: '2px 8px',
                          display: 'inline-block', width: 'fit-content',
                        }}>{svc.unit}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.success, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCents(svc.baseUnitCostCents)}
                        </span>
                        <StatusPill active={svc.isActive} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Features Panel ──────────────────────────────────────────────────
interface FeatureFormState { name: string; description: string; baselineHours: string; }
const EMPTY_FEATURE_FORM: FeatureFormState = { name: '', description: '', baselineHours: '0' };

function FeaturesPanel({ projectType }: { projectType: ProjectType }) {
  const [features, setFeatures] = useState<FeatureItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FeatureFormState>(EMPTY_FEATURE_FORM);
  const [editingFeatureId, setEditingFeatureId] = useState<string | 'new' | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<FeatureItem[]>('/api/v1/features')
      .then(all => setFeatures(all.filter(f => f.projectType.id === projectType.id)))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load features.'));
  }

  useEffect(load, [projectType.id]);

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (editingFeatureId === 'new') {
        await api.post('/api/v1/features', {
          projectTypeId: projectType.id, name: form.name,
          description: form.description || undefined,
          baselineHours: parseFloat(form.baselineHours) || 0,
        });
      } else if (editingFeatureId) {
        await api.patch(`/api/v1/features/${editingFeatureId}`, {
          name: form.name, description: form.description || undefined,
          baselineHours: parseFloat(form.baselineHours) || 0,
        });
      }
      setEditingFeatureId(null); load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this feature.');
    } finally { setSaving(false); }
  }

  async function toggleActive(feature: FeatureItem) {
    try { await api.patch(`/api/v1/features/${feature.id}`, { isActive: !feature.isActive }); load(); } catch { }
  }

  async function handleDelete(feature: FeatureItem) {
    try { await api.delete(`/api/v1/features/${feature.id}`); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Could not delete.'); }
  }

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, background: `${C.elevated}44`, padding: '18px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: C.secondary }}><Icon.Layers /></div>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Features
          </p>
          <span style={{ fontSize: 11, color: C.muted, background: C.elevated, padding: '1px 7px', borderRadius: 4, border: `1px solid ${C.border}` }}>
            building blocks for the Estimation Wizard
          </span>
        </div>
        {editingFeatureId === null && (
          <button type="button"
            onClick={() => { setForm(EMPTY_FEATURE_FORM); setError(null); setEditingFeatureId('new'); }}
            style={{
              padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: `${C.secondary}14`, border: `1px solid ${C.secondary}44`, color: C.secondary,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
            <Icon.Plus /> Add Feature
          </button>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: C.danger, marginBottom: 12, padding: '8px 12px', background: `${C.danger}12`, borderRadius: 7, border: `1px solid ${C.danger}33` }}>
          {error}
        </div>
      )}

      {editingFeatureId && (
        <form onSubmit={handleSave} style={{
          marginBottom: 16, padding: '16px 18px',
          background: C.elevated, border: `1px solid ${C.secondary}44`,
          borderRadius: 10, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
        }}>
          <div style={{ minWidth: 200, flex: '1 1 200px' }}>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Feature Name *</label>
            <StyledInput required placeholder="e.g. User Authentication" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          </div>
          <div style={{ minWidth: 200, flex: '2 1 200px' }}>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</label>
            <StyledInput placeholder="Brief description (optional)" value={form.description} onChange={v => setForm({ ...form, description: v })} />
          </div>
          <div style={{ minWidth: 130, flex: '0 1 130px' }}>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Baseline Hours *</label>
            <StyledInput required type="number" step="0.5" min="0" value={form.baselineHours} onChange={v => setForm({ ...form, baselineHours: v })} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <PrimaryBtn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryBtn>
            <SecondaryBtn type="button" onClick={() => setEditingFeatureId(null)}>Cancel</SecondaryBtn>
          </div>
        </form>
      )}

      {features === null ? (
        <p style={{ fontSize: 13, color: C.muted }}>Loading features…</p>
      ) : features.length === 0 ? (
        <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: 10, color: C.muted, fontSize: 13 }}>
          <div style={{ color: C.border }}><Icon.Layers /></div>
          No features yet for this project type.
        </div>
      ) : (
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.5fr 90px 110px auto',
            padding: '8px 14px', gap: 12,
            borderBottom: `1px solid ${C.border}`,
          }}>
            {['Feature', 'Description', 'Hours', 'Status', 'Actions'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>
          {features.map((feature, i) => (
            <div key={feature.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 90px 110px auto',
              padding: '12px 14px', gap: 12, alignItems: 'center',
              borderBottom: i < features.length - 1 ? `1px solid ${C.border}` : 'none',
              background: i % 2 === 0 ? 'transparent' : `${C.border}18`,
              borderRadius: i % 2 !== 0 ? 6 : 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{feature.name}</span>
              <span style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {feature.description || '—'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: C.warning }}><Icon.Clock /></span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.warning }}>{feature.baselineHours}h</span>
              </div>
              <StatusPill active={feature.isActive} />
              <div style={{ display: 'flex', gap: 6 }}>
                <ActionBtn label="Edit" icon={<Icon.Edit />} onClick={() => {
                  setForm({ name: feature.name, description: feature.description ?? '', baselineHours: feature.baselineHours });
                  setError(null); setEditingFeatureId(feature.id);
                }} />
                <ActionBtn label="Delete" danger icon={<Icon.Trash />} onClick={() => handleDelete(feature)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Project Types Tab ───────────────────────────────────────────────
interface ProjectTypeFormState { name: string; description: string; }
const EMPTY_PT_FORM: ProjectTypeFormState = { name: '', description: '' };

function ProjectTypesTab() {
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<ProjectTypeFormState>(EMPTY_PT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.get<ProjectType[]>('/api/v1/project-types')
      .then(setProjectTypes).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setFormError(null); setSaving(true);
    const body = { name: form.name, description: form.description || undefined };
    try {
      if (editingId === 'new') await api.post('/api/v1/project-types', body);
      else if (editingId) await api.patch(`/api/v1/project-types/${editingId}`, body);
      setEditingId(null); load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally { setSaving(false); }
  }

  async function toggleActive(pt: ProjectType) {
    try { await api.patch(`/api/v1/project-types/${pt.id}`, { isActive: !pt.isActive }); load(); } catch { }
  }

  async function handleDelete(pt: ProjectType) {
    try { await api.delete(`/api/v1/project-types/${pt.id}`); if (expandedId === pt.id) setExpandedId(null); load(); }
    catch (err) { setFormError(err instanceof ApiError ? err.message : 'Could not delete.'); }
  }

  const activeCount = projectTypes.filter(pt => pt.isActive).length;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Project Types', value: projectTypes.length, color: C.primary, icon: <Icon.Grid /> },
          { label: 'Active Types', value: activeCount, color: C.success, icon: <Icon.Activity /> },
          { label: 'Inactive Types', value: projectTypes.length - activeCount, color: C.muted, icon: <Icon.Layers /> },
        ].map((stat, i) => (
          <div key={i} style={{
            background: C.elevated, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, ${stat.color}99, transparent)`,
              borderRadius: '12px 12px 0 0',
            }} />
            <IconBox icon={stat.icon} color={stat.color} />
            <div>
              <p style={{ fontSize: 11, color: C.muted, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{stat.label}</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: stat.color, margin: 0, lineHeight: 1 }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
          Project types drive the Estimation Wizard's first step. Expand a type to manage its features.
        </p>
        {editingId === null && (
          <PrimaryBtn onClick={() => { setForm(EMPTY_PT_FORM); setFormError(null); setEditingId('new'); }}>
            <Icon.Plus /> New Project Type
          </PrimaryBtn>
        )}
      </div>

      {!loading && editingId && (
        <FormCard onSubmit={handleSave}>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: C.primary }}><Icon.Briefcase /></span>
            {editingId === 'new' ? 'New Project Type' : 'Edit Project Type'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name *</label>
              <StyledInput required value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Marketing Website" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</label>
              <StyledInput value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="What kind of projects does this cover?" />
            </div>
          </div>
          {formError && <p style={{ fontSize: 12, color: C.danger, marginBottom: 12 }}>{formError}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <PrimaryBtn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryBtn>
            <SecondaryBtn type="button" onClick={() => { setEditingId(null); setFormError(null); }}>Cancel</SecondaryBtn>
          </div>
        </FormCard>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 48, color: C.muted, fontSize: 13 }}>Loading project types…</div>}

      {!loading && projectTypes.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: C.muted, fontSize: 13, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
          No project types yet — create your first to start using the Estimation Wizard.
        </div>
      )}

      {!loading && projectTypes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projectTypes.map((pt, idx) => {
            const isExpanded = expandedId === pt.id;
            const PtIconComp = PT_ICON_LIST[idx % PT_ICON_LIST.length];
            const ptColor = PT_COLORS[idx % PT_COLORS.length];
            return (
              <div key={pt.id} style={{
                background: C.surface,
                border: `1px solid ${isExpanded ? ptColor + '55' : C.border}`,
                borderRadius: 12, overflow: 'hidden',
                boxShadow: isExpanded ? `0 0 0 1px ${ptColor}22, 0 4px 20px rgba(0,0,0,0.2)` : 'none',
                transition: 'all 0.2s ease',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  padding: '15px 20px', gap: 14,
                  background: isExpanded ? `${ptColor}08` : 'transparent',
                }}>
                  <button type="button"
                    onClick={() => setExpandedId(isExpanded ? null : pt.id)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <IconBox icon={<PtIconComp />} color={ptColor} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{pt.name}</p>
                      {pt.description && <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{pt.description}</p>}
                    </div>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <StatusPill active={pt.isActive} />
                    <ActionBtn label="Edit" icon={<Icon.Edit />} onClick={() => { setForm({ name: pt.name, description: pt.description ?? '' }); setFormError(null); setEditingId(pt.id); }} />
                    <ActionBtn label="Delete" danger icon={<Icon.Trash />} onClick={() => handleDelete(pt)} />
                    <button type="button"
                      onClick={() => setExpandedId(isExpanded ? null : pt.id)}
                      style={{
                        width: 30, height: 30, borderRadius: '50%', border: 'none',
                        background: isExpanded ? `${ptColor}22` : C.elevated,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isExpanded ? ptColor : C.muted,
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}>
                      {isExpanded ? <Icon.ChevronUp /> : <Icon.ChevronDown />}
                    </button>
                  </div>
                </div>

                {isExpanded && <FeaturesPanel projectType={pt} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const [tab, setTab] = useState<'services' | 'project-types'>('services');

  return (
    <AppShell active="/catalog">
      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>
        {/* Page header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 13,
            background: `${C.primary}18`, border: `1px solid ${C.primary}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.primary,
          }}>
            <Icon.Catalog />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Service Catalog</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              Manage services, categories, project types, and features used across the platform.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24,
          background: C.elevated, borderRadius: 10, padding: 4,
          width: 'fit-content', border: `1px solid ${C.border}`,
        }}>
          {([
            ['services', 'Services & Categories', <Icon.Package key="p" />],
            ['project-types', 'Project Types & Features', <Icon.Grid key="g" />],
          ] as const).map(([key, label, icon]) => (
            <button key={key} type="button" onClick={() => setTab(key)} style={{
              padding: '9px 20px', borderRadius: 7,
              background: tab === key ? C.primary : 'transparent',
              color: tab === key ? '#fff' : C.muted,
              border: 'none', fontSize: 13, fontWeight: tab === key ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: tab === key ? '0 2px 10px rgba(58,160,255,0.3)' : 'none',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {tab === 'services' ? <ServicesTab /> : <ProjectTypesTab />}
      </div>
    </AppShell>
  );
}
