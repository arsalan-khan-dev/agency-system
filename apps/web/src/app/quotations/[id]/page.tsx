'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { api, ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { Project, Quotation, QuotationStatus } from '@/lib/types';

const STATUS_TONE: Record<QuotationStatus, 'success' | 'warning' | 'danger' | 'muted'> = {
  draft: 'muted',
  sent: 'warning',
  accepted: 'success',
  rejected: 'danger',
  expired: 'muted',
};

const RECURRING_LABEL: Record<Quotation['recurringInterval'], string> = {
  none: '',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

export default function QuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  function load() {
    api
      .get<Quotation>(`/api/v1/quotations/${params.id}`)
      .then(setQuotation)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this quotation.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [params.id]);

  async function runAction(path: string) {
    setActionError(null);
    setBusy(true);
    try {
      const updated = await api.patch<Quotation>(`/api/v1/quotations/${params.id}/${path}`);
      setQuotation(updated);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevise() {
    setActionError(null);
    setBusy(true);
    try {
      const revised = await api.post<Quotation>(`/api/v1/quotations/${params.id}/revise`);
      router.push(`/quotations/${revised.id}`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not create a new version.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConvertToProject() {
    setActionError(null);
    setBusy(true);
    try {
      const project = await api.post<Project>('/api/v1/projects/from-quotation', {
        quotationId: params.id,
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not create the project.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateNextInstance() {
    setActionError(null);
    setBusy(true);
    try {
      const instance = await api.post<Quotation>(`/api/v1/quotations/${params.id}/generate-next-instance`);
      router.push(`/quotations/${instance.id}`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not generate the next billing instance.');
    } finally {
      setBusy(false);
    }
  }

  async function copyAcceptanceLink() {
    if (!quotation?.acceptanceToken) return;
    const url = `${window.location.origin}/quote/${quotation.acceptanceToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. non-HTTPS context); the link
      // is still visible in the UI for manual copying either way.
    }
  }

  return (
    <AppShell active="/quotations">
      <div className="mx-auto max-w-2xl px-8 py-8">
        {loading && <LoadingState label="Loading quotation…" />}
        {!loading && error && <ErrorState message={error} />}

        {!loading && quotation && (
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-text">{quotation.titleSnapshot}</h1>
                <StatusBadge
                  label={quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                  tone={STATUS_TONE[quotation.status]}
                />
              </div>
              <p className="mt-1 text-sm text-text-muted">
                For {quotation.clientNameSnapshot} · Version {quotation.version}
                {quotation.recurringInterval !== 'none' && (
                  <> · {RECURRING_LABEL[quotation.recurringInterval]} recurring</>
                )}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 text-right font-medium">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="py-2 text-text">{item.description}</td>
                      <td className="py-2 text-right text-text-muted">{item.hours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex justify-end border-t border-border pt-4">
                <p className="text-lg font-semibold text-primary">
                  {formatMoney(quotation.priceCentsSnapshot, quotation.currency)}
                </p>
              </div>
            </div>

            {quotation.status === 'sent' && quotation.acceptanceToken && (
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm font-medium text-text">Client acceptance link</p>
                <p className="mt-1 text-xs text-text-muted">
                  Email delivery is log-only in this environment (see Notifications) — copy this link to share
                  with the client directly. No login required on their end.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs text-text-muted">
                    /quote/{quotation.acceptanceToken}
                  </code>
                  <Button variant="secondary" onClick={copyAcceptanceLink}>
                    {linkCopied ? 'Copied!' : 'Copy link'}
                  </Button>
                </div>
                {quotation.acceptanceTokenExpiresAt && (
                  <p className="mt-2 text-xs text-text-muted">
                    Expires {new Date(quotation.acceptanceTokenExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {quotation.status === 'accepted' && quotation.recurringInterval !== 'none' && (
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm font-medium text-text">
                  {RECURRING_LABEL[quotation.recurringInterval]} recurring quotation
                </p>
                {quotation.nextBillingDate ? (
                  <p className="mt-1 text-sm text-text-muted">
                    Next billing instance due {new Date(quotation.nextBillingDate).toLocaleDateString()}. There is
                    no automatic billing job — generate the next instance manually when it&apos;s due.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-text-muted">
                    The next billing instance has already been generated from this quotation.
                  </p>
                )}
                {quotation.nextBillingDate && (
                  <Button className="mt-3" disabled={busy} onClick={handleGenerateNextInstance}>
                    Generate next billing instance
                  </Button>
                )}
              </div>
            )}

            {actionError && <p className="text-sm text-danger">{actionError}</p>}

            <div className="flex flex-wrap gap-3">
              <a href={`/api/v1/quotations/${quotation.id}/pdf`} target="_blank" rel="noreferrer">
                <Button variant="secondary">Download PDF</Button>
              </a>

              {quotation.status === 'draft' && (
                <Button disabled={busy} onClick={() => runAction('send')}>
                  Send to client
                </Button>
              )}

              {quotation.status === 'sent' && (
                <>
                  <Button disabled={busy} onClick={() => runAction('accept')}>
                    Mark accepted
                  </Button>
                  <Button variant="secondary" disabled={busy} onClick={() => runAction('reject')}>
                    Mark rejected
                  </Button>
                </>
              )}

              {quotation.status === 'accepted' && (
                <Button disabled={busy} onClick={handleConvertToProject}>
                  Convert to project
                </Button>
              )}

              {(quotation.status === 'sent' ||
                quotation.status === 'rejected' ||
                quotation.status === 'expired') && (
                <Button variant="secondary" disabled={busy} onClick={handleRevise}>
                  Create new version
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
