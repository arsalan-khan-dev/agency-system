'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { formatCents } from '@/lib/money';
import { Estimate, EstimationQuestion, FeatureItem, PricingProfile, ProjectType } from '@/lib/types';

const C = {
  surface: '#10151d', elevated: '#161c26', border: '#232b38',
  primary: '#3aa0ff', secondary: '#8b7cf6', success: '#34c78e',
  warning: '#e8b34d', danger: '#e5566a', text: '#eef2f7', muted: '#8894a6',
};

type Step = 'project-type' | 'features' | 'questions' | 'result';

// ─── Icons ──────────────────────────────────────────────────────────
const IcGrid = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IcLayers = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
);
const IcSliders = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
    <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
    <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
    <line x1="17" y1="16" x2="23" y2="16"/>
  </svg>
);
const IcStar = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IcArrowLeft = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const IcArrowRight = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IcCheck = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcZap = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IcClock = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcDollar = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
);
const IcEdit = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IcList = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

// ─── Step Progress Bar ────────────────────────────────────────────────
const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'project-type', label: 'Project Type', icon: <IcGrid /> },
  { id: 'features', label: 'Features', icon: <IcLayers /> },
  { id: 'questions', label: 'Complexity', icon: <IcSliders /> },
  { id: 'result', label: 'Result', icon: <IcStar /> },
];

function StepBar({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex(s => s.id === current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
      {STEPS.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: done ? C.success : active ? C.primary : C.elevated,
                border: `2px solid ${done ? C.success : active ? C.primary : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: done || active ? '#fff' : C.muted,
                boxShadow: active ? `0 0 16px ${C.primary}55` : 'none',
                transition: 'all 0.3s ease',
              }}>
                {done ? <IcCheck /> : s.icon}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? C.primary : done ? C.success : C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? C.success : C.border, margin: '0 8px', marginBottom: 22, transition: 'background 0.3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared Atoms ─────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px', marginBottom: 20 }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
      <div style={{ width: 38, height: 38, borderRadius: 9, background: `${C.primary}18`, border: `1px solid ${C.primary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{title}</p>
        {sub && <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{sub}</p>}
      </div>
    </div>
  );
}

function NavButtons({ onBack, onNext, nextLabel, nextDisabled, backLabel = 'Back' }: {
  onBack?: () => void; onNext?: () => void;
  nextLabel?: string; nextDisabled?: boolean; backLabel?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
      {onBack ? (
        <button onClick={onBack} style={{ padding: '10px 18px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <IcArrowLeft /> {backLabel}
        </button>
      ) : <div />}
      {onNext && (
        <button onClick={onNext} disabled={nextDisabled} style={{
          padding: '10px 22px', borderRadius: 8, border: 'none', cursor: nextDisabled ? 'not-allowed' : 'pointer',
          background: nextDisabled ? C.elevated : `linear-gradient(135deg, ${C.primary}, #2280d0)`,
          color: nextDisabled ? C.muted : '#fff', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: nextDisabled ? 'none' : '0 4px 14px rgba(58,160,255,0.28)',
          transition: 'all 0.2s ease',
        }}>
          {nextLabel ?? 'Next'} {!nextDisabled && <IcArrowRight />}
        </button>
      )}
    </div>
  );
}

export default function NewEstimatePage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('project-type');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [profiles, setProfiles] = useState<PricingProfile[]>([]);
  const [questions, setQuestions] = useState<EstimationQuestion[]>([]);

  const [title, setTitle] = useState('');
  const [selectedProjectTypeId, setSelectedProjectTypeId] = useState('');
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [complexityKey, setComplexityKey] = useState('');
  const [urgencyKey, setUrgencyKey] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustJustification, setAdjustJustification] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<ProjectType[]>('/api/v1/project-types'),
      api.get<PricingProfile[]>('/api/v1/pricing-profiles'),
    ])
      .then(([pts, profs]) => {
        setProjectTypes(pts.filter(p => p.isActive));
        setProfiles(profs.filter(p => p.isActive));
        if (profs.length > 0) setSelectedProfileId(profs[0].id);
      })
      .catch(err => setLoadError(err instanceof ApiError ? err.message : 'Could not load options.'))
      .finally(() => setLoadingOptions(false));
  }, []);

  async function selectProjectType(id: string) {
    setSelectedProjectTypeId(id); setSelectedFeatureIds([]); setLoadError(null);
    try {
      const [feats, qs] = await Promise.all([
        api.get<FeatureItem[]>('/api/v1/features'),
        api.get<EstimationQuestion[]>(`/api/v1/estimation-questions?projectTypeId=${id}`),
      ]);
      setFeatures(feats.filter(f => f.isActive && f.projectType.id === id));
      setQuestions(qs); setComplexityKey(''); setUrgencyKey(''); setStep('features');
    } catch (err) { setLoadError(err instanceof ApiError ? err.message : 'Could not load features.'); }
  }

  function toggleFeature(id: string) {
    setSelectedFeatureIds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }

  const complexityQuestion = useMemo(() => questions.find(q => q.answerType === 'complexity'), [questions]);
  const urgencyQuestion = useMemo(() => questions.find(q => q.answerType === 'urgency'), [questions]);

  async function handleCreateEstimate() {
    setSubmitError(null); setSubmitting(true);
    try {
      const created = await api.post<Estimate>('/api/v1/estimates', {
        title, projectTypeId: selectedProjectTypeId, pricingProfileId: selectedProfileId,
        featureIds: selectedFeatureIds, complexityKey, urgencyKey,
      });
      setEstimate(created); setStep('result');
    } catch (err) { setSubmitError(err instanceof ApiError ? err.message : 'Could not create the estimate.'); }
    finally { setSubmitting(false); }
  }

  async function handleAdjust() {
    if (!estimate) return;
    setAdjustError(null);
    const cents = Math.round(parseFloat(adjustAmount) * 100);
    if (Number.isNaN(cents) || cents < 0) { setAdjustError('Enter a valid dollar amount.'); return; }
    setAdjusting(true);
    try {
      const updated = await api.patch<Estimate>(`/api/v1/estimates/${estimate.id}/price`, {
        manualAdjustedPriceCents: cents, justification: adjustJustification,
      });
      setEstimate(updated); setAdjustAmount(''); setAdjustJustification('');
    } catch (err) { setAdjustError(err instanceof ApiError ? err.message : 'Could not adjust the price.'); }
    finally { setAdjusting(false); }
  }

  async function handleFinalize() {
    if (!estimate) return;
    setSubmitError(null);
    try {
      const updated = await api.patch<Estimate>(`/api/v1/estimates/${estimate.id}/finalize`);
      setEstimate(updated);
    } catch (err) { setSubmitError(err instanceof ApiError ? err.message : 'Could not finalize.'); }
  }

  const totalHours = features.filter(f => selectedFeatureIds.includes(f.id)).reduce((sum, f) => sum + parseFloat(f.baselineHours), 0);
  const selectedPT = projectTypes.find(pt => pt.id === selectedProjectTypeId);

  return (
    <AppShell active="/estimates">
      <div style={{ padding: '28px 40px', maxWidth: 820, margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>

        {/* Page Header */}
        <div style={{ marginBottom: 32 }}>
          <button onClick={() => router.push('/estimates')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, padding: 0 }}>
            <IcArrowLeft /> Back to Estimates
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>New Estimate</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            Follow the steps below to configure your project and get a recommended price.
          </p>
        </div>

        {/* Step progress */}
        <StepBar current={step} />

        {loadingOptions && (
          <div style={{ textAlign: 'center', padding: 60, color: C.muted, fontSize: 13 }}>Loading wizard options…</div>
        )}

        {!loadingOptions && loadError && (
          <div style={{ padding: '14px 18px', background: `${C.danger}12`, border: `1px solid ${C.danger}44`, borderRadius: 10, color: C.danger, fontSize: 13, marginBottom: 20 }}>
            {loadError}
          </div>
        )}

        {/* ─── Step 1: Project Type ───────────────────────────────────── */}
        {!loadingOptions && !loadError && step === 'project-type' && (
          <Card>
            <SectionTitle icon={<IcGrid />} title="Project Type" sub="Give your estimate a name, then choose the project type." />

            {/* Title Field */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Estimate Title *
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Acme Corp E-commerce Website"
                style={{ width: '100%', padding: '12px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            {/* Project Types */}
            <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Project Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {projectTypes.map((pt) => (
                <button
                  key={pt.id}
                  disabled={!title.trim()}
                  onClick={() => selectProjectType(pt.id)}
                  style={{
                    padding: '14px 18px', borderRadius: 10, textAlign: 'left',
                    border: `1px solid ${C.border}`, background: C.elevated,
                    color: C.text, cursor: title.trim() ? 'pointer' : 'not-allowed',
                    opacity: title.trim() ? 1 : 0.45,
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                  onMouseEnter={e => { if (title.trim()) { (e.currentTarget as HTMLElement).style.borderColor = C.primary; (e.currentTarget as HTMLElement).style.background = `${C.primary}0a`; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.background = C.elevated; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${C.primary}15`, border: `1px solid ${C.primary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, flexShrink: 0 }}>
                    <IcGrid />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>{pt.name}</p>
                    {pt.description && <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{pt.description}</p>}
                  </div>
                </button>
              ))}
            </div>
            {!title.trim() && (
              <p style={{ fontSize: 12, color: C.muted, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                ↑ Enter a title to enable project type selection.
              </p>
            )}
          </Card>
        )}

        {/* ─── Step 2: Features ─────────────────────────────────────── */}
        {step === 'features' && (
          <Card>
            <SectionTitle icon={<IcLayers />} title="Select Features" sub={`Choose the features included in this estimate for "${selectedPT?.name ?? ''}"`} />

            {features.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: C.muted, fontSize: 13, border: `1px dashed ${C.border}`, borderRadius: 10 }}>
                No features configured for this project type yet — add them in the Service Catalog.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {/* Select All bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>
                    {selectedFeatureIds.length} of {features.length} selected
                    {selectedFeatureIds.length > 0 && ` · ${totalHours}h total`}
                  </span>
                </div>

                {features.map(feature => {
                  const isSelected = selectedFeatureIds.includes(feature.id);
                  return (
                    <label
                      key={feature.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '13px 16px', borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${isSelected ? C.primary + '55' : C.border}`,
                        background: isSelected ? `${C.primary}0a` : C.elevated,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Custom checkbox */}
                        <div style={{
                          width: 20, height: 20, borderRadius: 5,
                          border: `2px solid ${isSelected ? C.primary : C.border}`,
                          background: isSelected ? C.primary : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.15s',
                        }}>
                          {isSelected && <IcCheck />}
                          <input type="checkbox" checked={isSelected} onChange={() => toggleFeature(feature.id)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: C.text, margin: '0 0 1px' }}>{feature.name}</p>
                          {feature.description && <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{feature.description}</p>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.warning, flexShrink: 0 }}>
                        <IcClock />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{feature.baselineHours}h</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {selectedFeatureIds.length > 0 && (
              <div style={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IcList />
                  <span style={{ fontSize: 13, color: C.muted }}>{selectedFeatureIds.length} features selected</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.warning }}>
                  <IcClock />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{totalHours}h total</span>
                </div>
              </div>
            )}

            <NavButtons
              onBack={() => setStep('project-type')}
              onNext={() => setStep('questions')}
              nextLabel={`Next · ${totalHours}h`}
              nextDisabled={selectedFeatureIds.length === 0}
            />
          </Card>
        )}

        {/* ─── Step 3: Questions ────────────────────────────────────── */}
        {step === 'questions' && (
          <Card>
            <SectionTitle icon={<IcSliders />} title="Complexity & Urgency" sub="Configure pricing parameters for the final price calculation." />

            {/* Pricing Profile */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pricing Profile
              </label>
              <select
                value={selectedProfileId}
                onChange={e => setSelectedProfileId(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {formatCents(p.baseHourlyRateCents)}/hr</option>
                ))}
              </select>
            </div>

            {/* Complexity Question */}
            {complexityQuestion && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {complexityQuestion.prompt}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {complexityQuestion.options.map(opt => {
                    const isSelected = complexityKey === opt.key;
                    return (
                      <label key={opt.key} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                        borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${isSelected ? C.secondary + '66' : C.border}`,
                        background: isSelected ? `${C.secondary}0e` : C.elevated,
                        transition: 'all 0.15s',
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          border: `2px solid ${isSelected ? C.secondary : C.border}`,
                          background: isSelected ? C.secondary : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.15s',
                        }}>
                          {isSelected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                          <input type="radio" name="complexity" checked={isSelected} onChange={() => setComplexityKey(opt.key)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? C.text : C.muted }}>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Urgency Question */}
            {urgencyQuestion && (
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {urgencyQuestion.prompt}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {urgencyQuestion.options.map(opt => {
                    const isSelected = urgencyKey === opt.key;
                    return (
                      <label key={opt.key} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                        borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${isSelected ? C.warning + '66' : C.border}`,
                        background: isSelected ? `${C.warning}0e` : C.elevated,
                        transition: 'all 0.15s',
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          border: `2px solid ${isSelected ? C.warning : C.border}`,
                          background: isSelected ? C.warning : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.15s',
                        }}>
                          {isSelected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                          <input type="radio" name="urgency" checked={isSelected} onChange={() => setUrgencyKey(opt.key)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? C.text : C.muted }}>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {submitError && (
              <div style={{ padding: '12px 14px', background: `${C.danger}12`, border: `1px solid ${C.danger}44`, borderRadius: 8, color: C.danger, fontSize: 13, marginTop: 12 }}>
                {submitError}
              </div>
            )}

            <NavButtons
              onBack={() => setStep('features')}
              onNext={handleCreateEstimate}
              nextLabel={submitting ? 'Calculating…' : 'Get Recommended Price'}
              nextDisabled={!complexityKey || !urgencyKey || !selectedProfileId || submitting}
            />
          </Card>
        )}

        {/* ─── Step 4: Result ───────────────────────────────────────── */}
        {step === 'result' && estimate && (
          <div>
            {/* Price Card */}
            <div style={{
              background: C.surface, border: `1px solid ${C.primary}44`,
              borderRadius: 16, padding: '40px 32px', textAlign: 'center', marginBottom: 20,
              boxShadow: `0 0 40px ${C.primary}18`,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${C.primary}, ${C.secondary}, ${C.success})`, borderRadius: '16px 16px 0 0' }} />

              <div style={{ width: 60, height: 60, borderRadius: '50%', background: `${C.success}18`, border: `2px solid ${C.success}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: C.success }}>
                <IcDollar />
              </div>

              <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Recommended Price</p>
              <p style={{ fontSize: 52, fontWeight: 800, color: C.success, margin: '0 0 4px', letterSpacing: '-2px', lineHeight: 1 }}>
                {formatCents(estimate.finalPriceCents)}
              </p>
              {estimate.manualAdjustedPriceCents !== null && (
                <p style={{ fontSize: 12, color: C.warning, margin: '6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <IcZap /> Manually adjusted from {formatCents(estimate.calculatedPriceCents)}
                </p>
              )}

              {/* Breakdown pills */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
                {[
                  { label: `${estimate.totalHoursSnapshot}h`, icon: <IcClock />, color: C.warning },
                  { label: estimate.pricingProfile.name, icon: <IcDollar />, color: C.primary },
                  { label: `Complexity ×${estimate.complexityMultiplierSnapshot}`, icon: <IcSliders />, color: C.secondary },
                  { label: `Urgency ×${estimate.urgencyMultiplierSnapshot}`, icon: <IcZap />, color: C.danger },
                ].map((pill, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, background: `${pill.color}15`, border: `1px solid ${pill.color}33`, color: pill.color, display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                    {pill.icon} {pill.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Manual Adjustment */}
            {estimate.status === 'draft' && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: `${C.warning}15`, border: `1px solid ${C.warning}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.warning }}>
                    <IcEdit />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>Manual Price Adjustment</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Price (USD)</label>
                    <input
                      value={adjustAmount}
                      onChange={e => setAdjustAmount(e.target.value)}
                      placeholder="e.g. 1150.00"
                      style={{ width: '100%', padding: '11px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Justification (min 10 chars)</label>
                    <textarea
                      value={adjustJustification}
                      onChange={e => setAdjustJustification(e.target.value)}
                      placeholder="Explain why this price was adjusted…"
                      rows={2}
                      style={{ width: '100%', padding: '11px 14px', background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </div>
                  {adjustError && <p style={{ fontSize: 12, color: C.danger, margin: 0 }}>{adjustError}</p>}
                  <button onClick={handleAdjust} disabled={adjusting} style={{
                    padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.warning}44`,
                    background: `${C.warning}12`, color: C.warning, fontSize: 13, fontWeight: 600,
                    cursor: adjusting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 7, width: 'fit-content',
                  }}>
                    <IcEdit /> {adjusting ? 'Applying…' : 'Apply Adjustment'}
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            {submitError && <p style={{ fontSize: 13, color: C.danger, marginBottom: 12 }}>{submitError}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => router.push('/estimates')} style={{ padding: '10px 18px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                <IcArrowLeft /> Back to Estimates
              </button>
              {estimate.status === 'draft' ? (
                <button onClick={handleFinalize} style={{
                  padding: '11px 24px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${C.success}, #1da870)`,
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 4px 14px rgba(52,199,142,0.3)',
                }}>
                  <IcCheck /> Finalize Estimate
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.success, fontSize: 13, fontWeight: 600 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${C.success}22`, border: `1px solid ${C.success}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IcCheck />
                  </div>
                  Estimate Finalized
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
