'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { formatCents } from '@/lib/money';
import {
  AccuracyByProjectTypeSummary,
  AccuracyTrendPoint,
  FeatureItem,
  ProjectType,
  SimilarEstimateMatch,
} from '@/lib/types';

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

const tooltipStyle = {
  background: C.elevated,
  border: `1px solid ${C.border}`,
  color: C.text,
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
};

// ─── Helper ──────────────────────────────────────────────────────────
function pct(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
}

function overlapColor(score: number) {
  if (score >= 0.75) return C.success;
  if (score >= 0.4) return C.warning;
  return C.danger;
}

// ─── Shared card ─────────────────────────────────────────────────────
function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '24px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{title}</p>
        {badge}
      </div>
      {subtitle && (
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{subtitle}</p>
      )}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div
      style={{
        height: 220,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        border: `1px dashed ${C.border}`,
        borderRadius: 8,
        color: C.muted,
        fontSize: 13,
      }}
    >
      <svg width="32" height="32" fill="none" stroke={C.border} strokeWidth={1.5} viewBox="0 0 24 24">
        <path d="M3 3v18h18" /><path d="M18 9l-5 5-4-4-3 3" />
      </svg>
      {message}
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    finalized: { bg: `${C.success}22`, color: C.success },
    draft: { bg: `${C.muted}22`, color: C.muted },
    sent: { bg: `${C.warning}22`, color: C.warning },
    accepted: { bg: `${C.success}22`, color: C.success },
    rejected: { bg: `${C.danger}22`, color: C.danger },
  };
  const s = map[status] ?? { bg: `${C.muted}22`, color: C.muted };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 20,
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function IntelligencePage() {
  // Accuracy data
  const [trend, setTrend] = useState<AccuracyTrendPoint[] | null>(null);
  const [byType, setByType] = useState<AccuracyByProjectTypeSummary[] | null>(null);
  const [loadingAccuracy, setLoadingAccuracy] = useState(true);

  // Similarity search
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [selectedProjectTypeId, setSelectedProjectTypeId] = useState('');
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [matches, setMatches] = useState<SimilarEstimateMatch[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<AccuracyTrendPoint[]>('/api/v1/intelligence/accuracy-trend'),
      api.get<AccuracyByProjectTypeSummary[]>('/api/v1/intelligence/accuracy-by-project-type'),
    ])
      .then(([t, b]) => { setTrend(t); setByType(b); })
      .catch(() => {})
      .finally(() => setLoadingAccuracy(false));

    Promise.all([
      api.get<ProjectType[]>('/api/v1/project-types'),
      api.get<FeatureItem[]>('/api/v1/features'),
    ])
      .then(([pts, feats]) => {
        setProjectTypes(pts.filter((p) => p.isActive));
        setFeatures(feats.filter((f) => f.isActive));
      })
      .catch(() => {})
      .finally(() => setLoadingOptions(false));
  }, []);

  const featuresForSelectedType = useMemo(
    () => features.filter((f) => f.projectType.id === selectedProjectTypeId),
    [features, selectedProjectTypeId],
  );

  function selectProjectType(id: string) {
    setSelectedProjectTypeId(id);
    setSelectedFeatureIds([]);
    setMatches(null);
    setSearchError(null);
  }

  function toggleFeature(id: string) {
    setSelectedFeatureIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }

  async function runSimilaritySearch() {
    setSearchError(null);
    setSearching(true);
    try {
      const query = new URLSearchParams({
        projectTypeId: selectedProjectTypeId,
        featureIds: selectedFeatureIds.join(','),
      });
      const results = await api.get<SimilarEstimateMatch[]>(
        `/api/v1/intelligence/similar-estimates?${query}`,
      );
      setMatches(results);
    } catch (err) {
      setSearchError(err instanceof ApiError ? err.message : 'Search failed.');
    } finally {
      setSearching(false);
    }
  }

  const trendData = (trend ?? [])
    .slice()
    .reverse()
    .map((t) => ({
      name: t.projectTitle.length > 12 ? t.projectTitle.slice(0, 12) + '…' : t.projectTitle,
      'Hours %': Math.round(t.hoursVariancePct * 1000) / 10,
      'Cost %': Math.round(t.costVariancePct * 1000) / 10,
    }));

  const byTypeData = (byType ?? []).map((b) => ({
    name: b.projectTypeName.length > 12 ? b.projectTypeName.slice(0, 12) + '…' : b.projectTypeName,
    'Avg Hours %': Math.round(b.avgHoursVariancePct * 1000) / 10,
    n: b.snapshotCount,
  }));

  // Summary stats
  const avgHoursVariance =
    byType && byType.length > 0
      ? byType.reduce((s, b) => s + b.avgHoursVariancePct, 0) / byType.length
      : null;

  return (
    <AppShell active="/intelligence">
      <div
        style={{
          padding: '28px 32px',
          maxWidth: 1200,
          margin: '0 auto',
          fontFamily: 'Inter, -apple-system, sans-serif',
        }}
      >
        {/* ── Page Header ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: `${C.secondary}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.secondary,
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Intelligence</h1>
          </div>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, maxWidth: 600 }}>
            Estimation accuracy analytics from completed projects, plus structured similarity matching — powered by real data, not machine learning.
          </p>
        </div>

        {/* ── KPI Row ── */}
        {!loadingAccuracy && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {[
              {
                label: 'Projects Tracked',
                value: trend?.length ?? 0,
                unit: '',
                icon: (
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                  </svg>
                ),
                color: C.primary,
                sub: 'completed projects analyzed',
              },
              {
                label: 'Project Types',
                value: byType?.length ?? 0,
                unit: '',
                icon: (
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
                  </svg>
                ),
                color: C.secondary,
                sub: 'with accuracy data',
              },
              {
                label: 'Avg. Hours Variance',
                value: avgHoursVariance !== null ? `${avgHoursVariance > 0 ? '+' : ''}${(avgHoursVariance * 100).toFixed(1)}%` : '—',
                unit: '',
                icon: (
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                ),
                color: avgHoursVariance !== null && avgHoursVariance > 0 ? C.danger : C.success,
                sub: avgHoursVariance !== null && avgHoursVariance > 0 ? 'tending to overrun' : 'tending to underrun',
              },
            ].map((kpi, i) => (
              <div
                key={i}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${kpi.color}88, transparent)`,
                    borderRadius: '12px 12px 0 0',
                  }}
                />
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: `${kpi.color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: kpi.color,
                    flexShrink: 0,
                  }}
                >
                  {kpi.icon}
                </div>
                <div>
                  <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {kpi.label}
                  </p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{kpi.value}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{kpi.sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Accuracy Charts ── */}
        {loadingAccuracy ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted, fontSize: 13 }}>
            Loading accuracy data…
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Trend Chart */}
            <Card>
              <CardHeader
                title="Estimation Accuracy Over Time"
                subtitle="Positive = ran over estimate · Negative = came in under"
                badge={
                  <span style={{ fontSize: 11, color: C.muted, background: C.elevated, padding: '2px 8px', borderRadius: 4 }}>
                    per project
                  </span>
                }
              />
              {trendData.length === 0 ? (
                <EmptyChart message="No completed projects yet — mark a project complete to see data." />
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={trendData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <ReferenceLine y={0} stroke={C.muted} strokeWidth={1} />
                    <XAxis
                      dataKey="name"
                      stroke={C.border}
                      tick={{ fill: C.muted, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke={C.border}
                      tick={{ fill: C.muted, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [`${value}%`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
                    <Bar dataKey="Hours %" name="Hours variance" radius={[3, 3, 0, 0]}>
                      {trendData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry['Hours %'] > 0 ? C.danger : C.success}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* By Type Chart */}
            <Card>
              <CardHeader
                title="Avg. Accuracy by Project Type"
                subtitle="Average hours variance % across completed projects per type"
                badge={
                  <span style={{ fontSize: 11, color: C.muted, background: C.elevated, padding: '2px 8px', borderRadius: 4 }}>
                    aggregated
                  </span>
                }
              />
              {byTypeData.length === 0 ? (
                <EmptyChart message="No completed projects yet." />
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={byTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <ReferenceLine y={0} stroke={C.muted} strokeWidth={1} />
                    <XAxis
                      dataKey="name"
                      stroke={C.border}
                      tick={{ fill: C.muted, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke={C.border}
                      tick={{ fill: C.muted, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name, props) => [
                        `${value}% (n=${(props.payload as { n: number }).n})`,
                        'Avg. hours variance',
                      ]}
                    />
                    <Bar dataKey="Avg Hours %" name="Avg hours variance" radius={[3, 3, 0, 0]}>
                      {byTypeData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry['Avg Hours %'] > 0 ? C.danger : C.success}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        )}

        {/* ── Similarity Search ── */}
        <Card>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 24,
              paddingBottom: 20,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9,
                  background: `${C.primary}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: C.primary,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 4px' }}>
                  Find Similar Past Estimates
                </p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                  Structured match by project type and shared features — ranked by overlap score, not machine learning.
                </p>
              </div>
            </div>
          </div>

          {/* Options */}
          {loadingOptions ? (
            <div style={{ textAlign: 'center', padding: 32, color: C.muted, fontSize: 13 }}>Loading options…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {/* Step 1: Project Type */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: selectedProjectTypeId ? C.primary : C.elevated,
                      border: `1px solid ${selectedProjectTypeId ? C.primary : C.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: selectedProjectTypeId ? '#fff' : C.muted,
                      flexShrink: 0,
                    }}
                  >
                    1
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Select Project Type
                  </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {projectTypes.map((pt) => {
                    const isSelected = selectedProjectTypeId === pt.id;
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => selectProjectType(pt.id)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 7,
                          border: `1px solid ${isSelected ? C.primary : C.border}`,
                          background: isSelected ? `${C.primary}18` : 'transparent',
                          color: isSelected ? C.primary : C.muted,
                          fontSize: 13,
                          fontWeight: isSelected ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          outline: 'none',
                        }}
                      >
                        {pt.name}
                      </button>
                    );
                  })}
                  {projectTypes.length === 0 && (
                    <p style={{ fontSize: 13, color: C.muted }}>No project types configured.</p>
                  )}
                </div>
              </div>

              {/* Step 2: Features */}
              {selectedProjectTypeId && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: selectedFeatureIds.length > 0 ? C.primary : C.elevated,
                        border: `1px solid ${selectedFeatureIds.length > 0 ? C.primary : C.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        color: selectedFeatureIds.length > 0 ? '#fff' : C.muted,
                        flexShrink: 0,
                      }}
                    >
                      2
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Select Features
                      {selectedFeatureIds.length > 0 && (
                        <span
                          style={{
                            marginLeft: 8,
                            background: `${C.primary}22`,
                            color: C.primary,
                            borderRadius: 10,
                            padding: '1px 7px',
                            fontSize: 11,
                          }}
                        >
                          {selectedFeatureIds.length} selected
                        </span>
                      )}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {featuresForSelectedType.map((f) => {
                      const isSelected = selectedFeatureIds.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleFeature(f.id)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 7,
                            border: `1px solid ${isSelected ? C.secondary : C.border}`,
                            background: isSelected ? `${C.secondary}18` : 'transparent',
                            color: isSelected ? C.secondary : C.muted,
                            fontSize: 13,
                            fontWeight: isSelected ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            outline: 'none',
                          }}
                        >
                          {isSelected && (
                            <span style={{ marginRight: 5, fontSize: 11 }}>✓</span>
                          )}
                          {f.name}
                        </button>
                      );
                    })}
                    {featuresForSelectedType.length === 0 && (
                      <p style={{ fontSize: 13, color: C.muted }}>No features for this project type.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Search Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  onClick={runSimilaritySearch}
                  disabled={!selectedProjectTypeId || selectedFeatureIds.length === 0 || searching}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 8,
                    border: 'none',
                    background:
                      !selectedProjectTypeId || selectedFeatureIds.length === 0 || searching
                        ? C.elevated
                        : `linear-gradient(135deg, ${C.primary}, #2280d0)`,
                    color:
                      !selectedProjectTypeId || selectedFeatureIds.length === 0 || searching
                        ? C.muted
                        : '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor:
                      !selectedProjectTypeId || selectedFeatureIds.length === 0 || searching
                        ? 'not-allowed'
                        : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow:
                      !selectedProjectTypeId || selectedFeatureIds.length === 0 || searching
                        ? 'none'
                        : '0 4px 14px rgba(58,160,255,0.3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {searching ? (
                    <>
                      <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: `2px solid ${C.muted}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                      Searching…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      Find Similar Estimates
                    </>
                  )}
                </button>
                {selectedFeatureIds.length === 0 && selectedProjectTypeId && (
                  <p style={{ fontSize: 12, color: C.muted }}>Select at least one feature to search.</p>
                )}
              </div>

              {/* Error */}
              {searchError && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: `${C.danger}18`,
                    border: `1px solid ${C.danger}44`,
                    borderRadius: 8,
                    color: C.danger,
                    fontSize: 13,
                  }}
                >
                  {searchError}
                </div>
              )}

              {/* Results */}
              {matches !== null && (
                <div style={{ marginTop: 4 }}>
                  {matches.length === 0 ? (
                    <div
                      style={{
                        padding: '32px 24px',
                        textAlign: 'center',
                        border: `1px dashed ${C.border}`,
                        borderRadius: 10,
                        color: C.muted,
                        fontSize: 13,
                      }}
                    >
                      <svg width="32" height="32" fill="none" stroke={C.border} strokeWidth={1.5} viewBox="0 0 24 24" style={{ margin: '0 auto 10px', display: 'block' }}>
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
                      </svg>
                      No overlapping estimates found for this combination.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>
                          {matches.length} match{matches.length !== 1 ? 'es' : ''} found
                        </p>
                        <span style={{ fontSize: 11, color: C.muted }}>ranked by overlap score</span>
                      </div>
                      <div
                        style={{
                          border: `1px solid ${C.border}`,
                          borderRadius: 10,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Table Header */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 100px 110px 120px 80px 110px 90px',
                            background: C.elevated,
                            padding: '10px 16px',
                            borderBottom: `1px solid ${C.border}`,
                          }}
                        >
                          {['Estimate', 'Overlap', 'Shared Features', 'Complexity / Urgency', 'Hours', 'Final Price', 'Status'].map((h) => (
                            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {h}
                            </span>
                          ))}
                        </div>

                        {/* Table Rows */}
                        {matches.map((m, i) => (
                          <div
                            key={m.estimateId}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 100px 110px 120px 80px 110px 90px',
                              padding: '14px 16px',
                              borderBottom: i < matches.length - 1 ? `1px solid ${C.border}` : 'none',
                              alignItems: 'center',
                              background: i % 2 === 0 ? 'transparent' : `${C.elevated}55`,
                              transition: 'background 0.15s',
                            }}
                          >
                            {/* Title */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 7,
                                  background: `${C.primary}18`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: C.primary,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {i + 1}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{m.title}</span>
                            </div>

                            {/* Overlap Score */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div
                                style={{
                                  height: 4,
                                  width: 40,
                                  background: C.border,
                                  borderRadius: 4,
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${m.overlapScore * 100}%`,
                                    background: overlapColor(m.overlapScore),
                                    borderRadius: 4,
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: overlapColor(m.overlapScore),
                                }}
                              >
                                {(m.overlapScore * 100).toFixed(0)}%
                              </span>
                            </div>

                            {/* Shared Features */}
                            <span style={{ fontSize: 12, color: C.muted }}>
                              {m.matchingFeatureCount} / {m.totalFeatureCount}
                            </span>

                            {/* Complexity / Urgency */}
                            <div style={{ display: 'flex', gap: 5 }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  background: `${C.secondary}22`,
                                  color: C.secondary,
                                  fontWeight: 500,
                                }}
                              >
                                {m.complexityKey}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  background: `${C.warning}22`,
                                  color: C.warning,
                                  fontWeight: 500,
                                }}
                              >
                                {m.urgencyKey}
                              </span>
                            </div>

                            {/* Hours */}
                            <span style={{ fontSize: 13, color: C.muted }}>{m.totalHoursSnapshot}h</span>

                            {/* Price */}
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.success }}>
                              {formatCents(m.finalPriceCents)}
                            </span>

                            {/* Status */}
                            <StatusPill status={m.status} />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
