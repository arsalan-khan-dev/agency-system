'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { formatCents } from '@/lib/money';
import {
  Client,
  ConversionFunnelPoint,
  EstimatedVsActualHoursPoint,
  ProfitabilityComparisonPoint,
  Quotation,
  RevenueByProjectTypePoint,
} from '@/lib/types';

// ─── Design tokens ────────────────────────────────────────────────
const COLORS = {
  primary: 'var(--primary, #3aa0ff)',
  secondary: 'var(--secondary, #8b7cf6)',
  success: 'var(--success, #34c78e)',
  warning: 'var(--warning, #e8b34d)',
  danger: 'var(--danger, #e5566a)',
  muted: 'var(--text-muted, #8894a6)',
  surface: 'var(--surface, #10151d)',
  surfaceElevated: 'var(--surface-elevated, #161c26)',
  border: 'var(--border, #232b38)',
  text: 'var(--text, #eef2f7)',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#8894a6',
  sent: '#e8b34d',
  accepted: '#34c78e',
  rejected: '#e5566a',
  expired: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
};

// ─── Sub-components ────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  trend,
  icon,
  accent = COLORS.primary,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: { value: string; positive: boolean };
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Accent glow top-left */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${accent}88, transparent)`,
          borderRadius: '12px 12px 0 0',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 12, color: COLORS.muted, fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </p>
          <p style={{ fontSize: 26, fontWeight: 700, color: COLORS.text, lineHeight: 1.1 }}>{value}</p>
          {sub && (
            <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{sub}</p>
          )}
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: `${accent}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
          }}
        >
          {icon}
        </div>
      </div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: trend.positive ? COLORS.success : COLORS.danger,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {trend.positive ? '▲' : '▼'} {trend.value}
          </span>
          <span style={{ fontSize: 12, color: COLORS.muted }}>since last month</span>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: '20px 24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        border: `1px dashed ${COLORS.border}`,
        color: COLORS.muted,
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

const tooltipStyle = {
  background: COLORS.surfaceElevated,
  border: `1px solid ${COLORS.border}`,
  color: COLORS.text,
  borderRadius: 8,
  fontSize: 12,
};

// ─── Icons ─────────────────────────────────────────────────────────
const IconQuote = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const IconRevenue = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

const IconProjects = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
  </svg>
);

const IconClients = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

// ─── Custom Donut Label ─────────────────────────────────────────────
const CustomDonutLabel = ({ total }: { total: number }) => (
  <>
    <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fill={COLORS.text} fontSize={28} fontWeight={700}>
      {total}
    </text>
    <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fill={COLORS.muted} fontSize={11}>
      Total
    </text>
  </>
);

// ─── Page ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [funnel, setFunnel] = useState<ConversionFunnelPoint[] | null>(null);
  const [revenue, setRevenue] = useState<RevenueByProjectTypePoint[] | null>(null);
  const [hours, setHours] = useState<EstimatedVsActualHoursPoint[] | null>(null);
  const [profitability, setProfitability] = useState<ProfitabilityComparisonPoint[] | null>(null);
  const [quotations, setQuotations] = useState<Quotation[] | null>(null);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ConversionFunnelPoint[]>('/api/v1/reports/conversion-funnel'),
      api.get<RevenueByProjectTypePoint[]>('/api/v1/reports/revenue-by-project-type'),
      api.get<EstimatedVsActualHoursPoint[]>('/api/v1/reports/estimated-vs-actual-hours'),
      api.get<ProfitabilityComparisonPoint[]>('/api/v1/reports/profitability-comparison'),
      api.get<Quotation[]>('/api/v1/quotations'),
      api.get<Client[]>('/api/v1/clients'),
    ])
      .then(([f, r, h, p, q, c]) => {
        setFunnel(f);
        setRevenue(r);
        setHours(h);
        setProfitability(p);
        setQuotations(q);
        setClients(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Derived stats ────────────────────────────────────────────────
  const totalQuotations = (quotations ?? []).length;
  const acceptedQuotations = (quotations ?? []).filter((q) => q.status === 'accepted');
  const totalRevenue = acceptedQuotations.reduce((sum, q) => sum + q.priceCentsSnapshot, 0);
  const sentQuotations = (quotations ?? []).filter((q) => q.status === 'sent').length;
  const totalClients = (clients ?? []).length;

  // ── Funnel donut data ────────────────────────────────────────────
  const funnelDonutData = (funnel ?? []).map((f) => ({
    name: STATUS_LABELS[f.status] ?? f.status,
    value: f.count,
    status: f.status,
    color: STATUS_COLORS[f.status] ?? COLORS.primary,
  }));
  const funnelTotal = funnelDonutData.reduce((s, d) => s + d.value, 0);

  // ── Revenue area chart – generate smooth curve from real data ────
  const revenueAreaData = (revenue ?? []).map((r, i) => ({
    name: r.projectTypeName,
    revenue: r.totalRevenueCents / 100,
    count: r.acceptedQuotationCount,
  }));

  // ── Profitability bar data ────────────────────────────────────────
  const profitabilityData = (profitability ?? []).map((p) => ({
    name: p.projectTitle.length > 14 ? p.projectTitle.slice(0, 14) + '…' : p.projectTitle,
    budget: p.budgetCents / 100,
    actual: p.totalActualCostCents / 100,
    isOverBudget: p.isOverBudget,
  }));

  // ── Hours comparison bar ─────────────────────────────────────────
  const hoursData = (hours ?? []).map((h) => ({
    name: h.projectTitle.length > 14 ? h.projectTitle.slice(0, 14) + '…' : h.projectTitle,
    Estimated: h.estimatedHours,
    Actual: h.actualHours,
  }));

  // ── Top clients from accepted quotations ─────────────────────────
  const clientRevMap: Record<string, { name: string; orders: number; revenue: number }> = {};
  (quotations ?? [])
    .filter((q) => q.status === 'accepted')
    .forEach((q) => {
      const key = q.client?.id ?? q.clientNameSnapshot;
      const name = q.clientNameSnapshot;
      if (!clientRevMap[key]) clientRevMap[key] = { name, orders: 0, revenue: 0 };
      clientRevMap[key].orders++;
      clientRevMap[key].revenue += q.priceCentsSnapshot;
    });
  const topClients = Object.values(clientRevMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  if (loading) {
    return (
      <AppShell active="/dashboard">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: COLORS.muted, fontSize: 14 }}>
          Loading dashboard…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="/dashboard">
      <div
        style={{
          padding: '28px 32px',
          maxWidth: 1300,
          margin: '0 auto',
          fontFamily: 'Inter, -apple-system, sans-serif',
        }}
      >
        {/* ── Header ── */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0 }}>Dashboard</h1>
            <p style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>
              Overview of your agency's performance
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              color: COLORS.muted,
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            All Time
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 24 }}>
          <StatCard
            label="Total Quotations"
            value={String(totalQuotations)}
            sub={`${sentQuotations} currently sent`}
            icon={<IconQuote />}
            accent={COLORS.primary}
          />
          <StatCard
            label="Total Revenue"
            value={formatCents(totalRevenue)}
            sub={`${acceptedQuotations.length} accepted quotations`}
            icon={<IconRevenue />}
            accent={COLORS.success}
          />
          <StatCard
            label="Active Projects"
            value={String(hoursData.length)}
            sub="Projects being tracked"
            icon={<IconProjects />}
            accent={COLORS.secondary}
          />
          <StatCard
            label="Total Clients"
            value={String(totalClients)}
            sub="Registered in system"
            icon={<IconClients />}
            accent={COLORS.warning}
          />
        </div>

        {/* ── Revenue Area Chart + Donut ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 18, marginBottom: 24 }}>
          {/* Revenue Area Chart */}
          <SectionCard title="Revenue by Project Type">
            {revenueAreaData.length === 0 ? (
              <EmptyState message="No accepted quotations yet — accept a quotation to see revenue data." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueAreaData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke={COLORS.border}
                    tick={{ fill: COLORS.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={COLORS.border}
                    tick={{ fill: COLORS.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS.primary}
                    strokeWidth={2.5}
                    fill="url(#revenueGrad)"
                    dot={{ fill: COLORS.primary, strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: COLORS.primary }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {/* Donut — Quotation Status */}
          <SectionCard title="Quotation Status">
            {funnelDonutData.length === 0 ? (
              <EmptyState message="No quotations yet." />
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie
                        data={funnelDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {funnelDonutData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                        <CustomDonutLabel total={funnelTotal} />
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value, name) => [value, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {funnelDonutData.map((d) => (
                    <div key={d.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                        <span style={{ fontSize: 12, color: COLORS.muted }}>{d.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>
        </div>

        {/* ── Bottom Row: Hours + Profitability + Top Clients ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
          {/* Estimated vs Actual Hours */}
          <SectionCard title="Estimated vs Actual Hours">
            {hoursData.length === 0 ? (
              <EmptyState message="No projects yet." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hoursData} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke={COLORS.border}
                    tick={{ fill: COLORS.muted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={COLORS.border}
                    tick={{ fill: COLORS.muted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: COLORS.muted }} />
                  <Bar dataKey="Estimated" fill={COLORS.secondary} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Actual" fill={COLORS.primary} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {/* Profitability */}
          <SectionCard title="Profitability: Budget vs Actual">
            {profitabilityData.length === 0 ? (
              <EmptyState message="No projects yet." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={profitabilityData} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke={COLORS.border}
                    tick={{ fill: COLORS.muted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={COLORS.border}
                    tick={{ fill: COLORS.muted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: COLORS.muted }} />
                  <Bar dataKey="budget" name="Budget" fill={COLORS.muted} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" radius={[3, 3, 0, 0]}>
                    {profitabilityData.map((entry, index) => (
                      <Cell key={index} fill={entry.isOverBudget ? COLORS.danger : COLORS.success} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {/* Top Clients */}
          <SectionCard
            title="Top Clients"
            action={
              <a
                href="/clients"
                style={{ fontSize: 12, color: COLORS.primary, textDecoration: 'none', fontWeight: 500 }}
              >
                View all →
              </a>
            }
          >
            {topClients.length === 0 ? (
              <EmptyState message="No accepted quotations yet." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: 12,
                    padding: '0 0 10px 0',
                    borderBottom: `1px solid ${COLORS.border}`,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, textTransform: 'uppercase' }}>Name</span>
                  <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>Orders</span>
                  <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Revenue</span>
                </div>
                {topClients.map((client, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: i < topClients.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          background: `${COLORS.primary}22`,
                          color: COLORS.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: COLORS.muted,
                        textAlign: 'center',
                        background: `${COLORS.border}80`,
                        borderRadius: 4,
                        padding: '2px 8px',
                      }}
                    >
                      {client.orders}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.success, textAlign: 'right' }}>
                      {formatCents(client.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
