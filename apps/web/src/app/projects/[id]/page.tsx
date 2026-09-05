'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { api, ApiError } from '@/lib/api';
import { formatCents } from '@/lib/money';
import {
  ChangeRequest,
  ChangeRequestStatus,
  ProfitabilitySummary,
  Project,
  ProjectStatus,
} from '@/lib/types';

// ─── tone maps ────────────────────────────────────────────────────────────────

const PROJECT_STATUS_TONE: Record<ProjectStatus, 'success' | 'warning' | 'danger' | 'muted'> = {
  active: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

const CR_STATUS_TONE: Record<ChangeRequestStatus, 'success' | 'warning' | 'danger' | 'muted'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDelta(hoursDelta: string, priceDeltaCents: number): string {
  const h = parseFloat(hoursDelta);
  const prefix = priceDeltaCents >= 0 ? '+' : '';
  const hours = h !== 0 ? `${h > 0 ? '+' : ''}${h}h` : null;
  const price = `${prefix}${formatCents(priceDeltaCents)}`;
  return [hours, price].filter(Boolean).join(' / ');
}

/** Label shown when a CR is approved but the resulting quotation hasn't been
 *  accepted by the client yet — communicates that the project budget won't
 *  update until the client clicks Accept on the new version. */
function approvedLabel(cr: ChangeRequest): string {
  const q = cr.resultingQuotation;
  if (!q) return 'Approved';
  if (q.status === 'accepted') return 'Approved — applied';
  const version = `v${q.version}`;
  if (q.status === 'draft') return `Approved — client acceptance pending on ${version}`;
  if (q.status === 'sent')  return `Approved — awaiting client on ${version}`;
  return `Approved (${version} ${q.status})`;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function CrStatusBadge({ cr }: { cr: ChangeRequest }) {
  if (cr.status === 'approved') {
    const q = cr.resultingQuotation;
    const tone =
      q?.status === 'accepted' ? 'success' :
      q?.status === 'rejected' || q?.status === 'expired' ? 'danger' :
      'warning';
    return <StatusBadge label={approvedLabel(cr)} tone={tone} />;
  }
  return (
    <StatusBadge
      label={cr.status.charAt(0).toUpperCase() + cr.status.slice(1)}
      tone={CR_STATUS_TONE[cr.status]}
    />
  );
}

// ─── page component ───────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();

  // ── project + profitability ────────────────────────────────────────────────
  const [project, setProject] = useState<Project | null>(null);
  const [profitability, setProfitability] = useState<ProfitabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── actuals / expenses ─────────────────────────────────────────────────────
  const [hoursDesc, setHoursDesc] = useState('');
  const [hoursAmount, setHoursAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [logError, setLogError] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);

  // ── change requests ────────────────────────────────────────────────────────
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [crLoading, setCrLoading] = useState(true);
  const [crError, setCrError] = useState<string | null>(null);

  // new-CR form
  const [showCrForm, setShowCrForm] = useState(false);
  const [crTitle, setCrTitle] = useState('');
  const [crDescription, setCrDescription] = useState('');
  const [crHoursDelta, setCrHoursDelta] = useState('');
  const [crPriceDelta, setCrPriceDelta] = useState('');
  const [crSubmitting, setCrSubmitting] = useState(false);
  const [crFormError, setCrFormError] = useState<string | null>(null);

  // approve / reject inline action
  const [crActionId, setCrActionId] = useState<string | null>(null);
  const [crActionError, setCrActionError] = useState<string | null>(null);

  // ── data fetching ──────────────────────────────────────────────────────────

  function loadProject() {
    setLoading(true);
    Promise.all([
      api.get<Project>(`/api/v1/projects/${params.id}`),
      api.get<ProfitabilitySummary>(`/api/v1/projects/${params.id}/profitability`),
    ])
      .then(([proj, profit]) => {
        setProject(proj);
        setProfitability(profit);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this project.'))
      .finally(() => setLoading(false));
  }

  function loadChangeRequests() {
    setCrLoading(true);
    api
      .get<ChangeRequest[]>(`/api/v1/change-requests?projectId=${params.id}`)
      .then(setChangeRequests)
      .catch((err) =>
        setCrError(err instanceof ApiError ? err.message : 'Could not load change requests.')
      )
      .finally(() => setCrLoading(false));
  }

  useEffect(() => {
    loadProject();
    loadChangeRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // ── actuals / expenses handlers ────────────────────────────────────────────

  async function handleLogHours(e: FormEvent) {
    e.preventDefault();
    setLogError(null);
    const hours = parseFloat(hoursAmount);
    if (!hoursDesc.trim() || Number.isNaN(hours) || hours <= 0) {
      setLogError('Enter a description and a positive number of hours.');
      return;
    }
    setLogging(true);
    try {
      await api.post(`/api/v1/projects/${params.id}/actuals`, {
        description: hoursDesc,
        hoursLogged: hours,
      });
      setHoursDesc('');
      setHoursAmount('');
      loadProject();
    } catch (err) {
      setLogError(err instanceof ApiError ? err.message : 'Could not log hours.');
    } finally {
      setLogging(false);
    }
  }

  async function handleLogExpense(e: FormEvent) {
    e.preventDefault();
    setLogError(null);
    const cents = Math.round(parseFloat(expenseAmount) * 100);
    if (!expenseDesc.trim() || Number.isNaN(cents) || cents <= 0) {
      setLogError('Enter a description and a positive dollar amount.');
      return;
    }
    setLogging(true);
    try {
      await api.post(`/api/v1/projects/${params.id}/expenses`, {
        description: expenseDesc,
        amountCents: cents,
      });
      setExpenseDesc('');
      setExpenseAmount('');
      loadProject();
    } catch (err) {
      setLogError(err instanceof ApiError ? err.message : 'Could not log the expense.');
    } finally {
      setLogging(false);
    }
  }

  // ── change request handlers ────────────────────────────────────────────────

  async function handleCreateCr(e: FormEvent) {
    e.preventDefault();
    setCrFormError(null);

    const hours = parseFloat(crHoursDelta);
    const priceDollars = parseFloat(crPriceDelta);
    if (!crTitle.trim()) {
      setCrFormError('Title is required.');
      return;
    }
    if (!crDescription.trim()) {
      setCrFormError('Description is required.');
      return;
    }
    if (Number.isNaN(hours)) {
      setCrFormError('Hours delta must be a number (use negative for scope reductions).');
      return;
    }
    if (Number.isNaN(priceDollars)) {
      setCrFormError('Price delta must be a number (use negative for scope reductions).');
      return;
    }

    setCrSubmitting(true);
    try {
      await api.post('/api/v1/change-requests', {
        projectId: params.id,
        title: crTitle.trim(),
        description: crDescription.trim(),
        hoursDelta: hours,
        priceDeltaCents: Math.round(priceDollars * 100),
      });
      setCrTitle('');
      setCrDescription('');
      setCrHoursDelta('');
      setCrPriceDelta('');
      setShowCrForm(false);
      loadChangeRequests();
    } catch (err) {
      setCrFormError(err instanceof ApiError ? err.message : 'Could not file change request.');
    } finally {
      setCrSubmitting(false);
    }
  }

  async function handleCrDecision(crId: string, action: 'approve' | 'reject') {
    setCrActionError(null);
    setCrActionId(crId);
    try {
      await api.patch(`/api/v1/change-requests/${crId}/${action}`);
      // Reload both — an approval creates a new quotation which may shift
      // the project's linked quotation version on next client accept.
      loadChangeRequests();
      loadProject();
    } catch (err) {
      setCrActionError(err instanceof ApiError ? err.message : `Could not ${action} the change request.`);
    } finally {
      setCrActionId(null);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <AppShell active="/projects">
      <div className="mx-auto max-w-2xl px-8 py-8">
        {loading && <LoadingState label="Loading project…" />}
        {!loading && error && <ErrorState message={error} />}

        {!loading && project && profitability && (
          <div className="flex flex-col gap-6">
            {/* ── header ── */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-text">{project.title}</h1>
                <p className="mt-1 text-sm text-text-muted">{project.client.name}</p>
              </div>
              <StatusBadge
                label={project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                tone={PROJECT_STATUS_TONE[project.status]}
              />
            </div>

            {/* ── profitability card ── */}
            <div className="rounded-lg border border-border bg-surface p-6">
              <p className="text-xs uppercase tracking-wide text-text-muted">Profitability</p>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-muted">Budget</p>
                  <p className="font-medium text-text">{formatCents(profitability.budgetCents)}</p>
                </div>
                <div>
                  <p className="text-text-muted">Actual hours</p>
                  <p className="font-medium text-text">{profitability.actualHours}h</p>
                </div>
                <div>
                  <p className="text-text-muted">Labor cost</p>
                  <p className="font-medium text-text">{formatCents(profitability.laborCostCents)}</p>
                </div>
                <div>
                  <p className="text-text-muted">Expenses</p>
                  <p className="font-medium text-text">{formatCents(profitability.expensesCents)}</p>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-text-muted">
                  {profitability.isOverBudget ? 'Over budget by' : 'Profit'}
                </p>
                <p
                  className={`text-2xl font-semibold ${
                    profitability.isOverBudget ? 'text-danger' : 'text-success'
                  }`}
                >
                  {formatCents(Math.abs(profitability.profitCents))}
                </p>
              </div>
            </div>

            {/* ── log hours + log expense ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <form onSubmit={handleLogHours} className="rounded-lg border border-border bg-surface p-4">
                <p className="mb-3 text-sm font-medium text-text">Log hours</p>
                <div className="flex flex-col gap-2">
                  <input
                    value={hoursDesc}
                    onChange={(e) => setHoursDesc(e.target.value)}
                    placeholder="What did you work on?"
                    className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus-visible:border-primary"
                  />
                  <input
                    value={hoursAmount}
                    onChange={(e) => setHoursAmount(e.target.value)}
                    placeholder="Hours (e.g. 2.5)"
                    className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus-visible:border-primary"
                  />
                  <Button type="submit" variant="secondary" disabled={logging}>
                    {logging ? 'Saving…' : 'Log hours'}
                  </Button>
                </div>
              </form>

              <form
                onSubmit={handleLogExpense}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <p className="mb-3 text-sm font-medium text-text">Log expense</p>
                <div className="flex flex-col gap-2">
                  <input
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    placeholder="What was purchased?"
                    className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus-visible:border-primary"
                  />
                  <input
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="Amount (e.g. 50.00)"
                    className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus-visible:border-primary"
                  />
                  <Button type="submit" variant="secondary" disabled={logging}>
                    {logging ? 'Saving…' : 'Log expense'}
                  </Button>
                </div>
              </form>
            </div>

            {logError && <p className="text-sm text-danger">{logError}</p>}

            {/* ── activity ── */}
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="mb-3 text-sm font-medium text-text">Activity</p>
              <div className="flex flex-col gap-2 text-sm">
                {project.actuals.map((a) => (
                  <div key={a.id} className="flex justify-between text-text-muted">
                    <span>{a.description}</span>
                    <span>{a.hoursLogged}h</span>
                  </div>
                ))}
                {project.expenses.map((ex) => (
                  <div key={ex.id} className="flex justify-between text-text-muted">
                    <span>{ex.description}</span>
                    <span>{formatCents(ex.amountCents)}</span>
                  </div>
                ))}
                {project.actuals.length === 0 && project.expenses.length === 0 && (
                  <p className="text-text-muted">No activity logged yet.</p>
                )}
              </div>
            </div>

            {/* ══════════════════════════════════════════════
                CHANGE REQUESTS SECTION
                ══════════════════════════════════════════════ */}
            <div className="rounded-lg border border-border bg-surface">
              {/* section header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text">Change Requests</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Scope changes filed after project start. Approving creates a new quotation
                    version — budget updates only once the client accepts it.
                  </p>
                </div>
                {project.status === 'active' && (
                  <Button
                    variant="secondary"
                    className="ml-4 shrink-0 text-xs"
                    onClick={() => {
                      setShowCrForm((v) => !v);
                      setCrFormError(null);
                    }}
                  >
                    {showCrForm ? 'Cancel' : '+ File CR'}
                  </Button>
                )}
              </div>

              {/* new CR form */}
              {showCrForm && (
                <form onSubmit={handleCreateCr} className="border-b border-border bg-surface-elevated p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    New change request
                  </p>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-text-muted" htmlFor="cr-title">
                        Title
                      </label>
                      <input
                        id="cr-title"
                        value={crTitle}
                        onChange={(e) => setCrTitle(e.target.value)}
                        placeholder="e.g. Add mobile nav redesign"
                        maxLength={200}
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:border-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-text-muted" htmlFor="cr-description">
                        Description
                      </label>
                      <textarea
                        id="cr-description"
                        value={crDescription}
                        onChange={(e) => setCrDescription(e.target.value)}
                        placeholder="Describe the scope change and why it's needed…"
                        rows={3}
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:border-primary resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-text-muted" htmlFor="cr-hours">
                          Hours delta
                        </label>
                        <input
                          id="cr-hours"
                          value={crHoursDelta}
                          onChange={(e) => setCrHoursDelta(e.target.value)}
                          placeholder="e.g. 8 or -4"
                          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:border-primary"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-text-muted" htmlFor="cr-price">
                          Price delta ($)
                        </label>
                        <input
                          id="cr-price"
                          value={crPriceDelta}
                          onChange={(e) => setCrPriceDelta(e.target.value)}
                          placeholder="e.g. 1200 or -400"
                          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:border-primary"
                        />
                      </div>
                    </div>
                    {crFormError && <p className="text-xs text-danger">{crFormError}</p>}
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => {
                          setShowCrForm(false);
                          setCrFormError(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" className="text-xs" disabled={crSubmitting}>
                        {crSubmitting ? 'Filing…' : 'File change request'}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* CR list */}
              <div className="divide-y divide-border">
                {crLoading && (
                  <div className="px-4 py-6">
                    <LoadingState label="Loading change requests…" />
                  </div>
                )}
                {!crLoading && crError && (
                  <div className="px-4 py-4">
                    <p className="text-sm text-danger">{crError}</p>
                  </div>
                )}
                {!crLoading && !crError && changeRequests.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-text-muted">No change requests yet.</p>
                  </div>
                )}
                {!crLoading &&
                  changeRequests.map((cr) => (
                    <div key={cr.id} className="px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-text">{cr.title}</p>
                          <p className="mt-0.5 text-xs text-text-muted">{cr.description}</p>
                          <p className="mt-1 text-xs font-mono text-secondary">
                            {formatDelta(cr.hoursDelta, cr.priceDeltaCents)}
                          </p>
                          {/* context line for approved CRs */}
                          {cr.status === 'approved' &&
                            cr.resultingQuotation &&
                            cr.resultingQuotation.status !== 'accepted' && (
                              <p className="mt-1 text-xs text-text-muted">
                                New quotation{' '}
                                <span className="text-primary">
                                  v{cr.resultingQuotation.version}
                                </span>{' '}
                                is{' '}
                                <span className="capitalize">
                                  {cr.resultingQuotation.status}
                                </span>
                                . Project budget will update once the client accepts it.
                              </p>
                            )}
                          {cr.status === 'approved' &&
                            cr.resultingQuotation?.status === 'accepted' && (
                              <p className="mt-1 text-xs text-success">
                                Applied — project budget reflects this change.
                              </p>
                            )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <CrStatusBadge cr={cr} />
                          {/* approve / reject only for pending CRs on active projects */}
                          {cr.status === 'pending' && project.status === 'active' && (
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                className="text-xs py-1 px-2"
                                disabled={crActionId === cr.id}
                                onClick={() => handleCrDecision(cr.id, 'approve')}
                              >
                                {crActionId === cr.id ? '…' : 'Approve'}
                              </Button>
                              <Button
                                variant="danger"
                                className="text-xs py-1 px-2"
                                disabled={crActionId === cr.id}
                                onClick={() => handleCrDecision(cr.id, 'reject')}
                              >
                                {crActionId === cr.id ? '…' : 'Reject'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                        {cr.requestedBy && <span>Filed by {cr.requestedBy.fullName}</span>}
                        <span>{new Date(cr.createdAt).toLocaleDateString()}</span>
                        {cr.resolvedBy && (
                          <span>
                            {cr.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
                            {cr.resolvedBy.fullName}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* approve/reject error */}
              {crActionError && (
                <div className="border-t border-border px-4 py-3">
                  <p className="text-xs text-danger">{crActionError}</p>
                </div>
              )}
            </div>
            {/* end change requests section */}
          </div>
        )}
      </div>
    </AppShell>
  );
}
