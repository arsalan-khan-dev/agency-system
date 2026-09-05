'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { PublicQuotationView } from '@/lib/types';

const STATUS_TONE: Record<PublicQuotationView['status'], 'success' | 'warning' | 'danger' | 'muted'> = {
  draft: 'muted',
  sent: 'warning',
  accepted: 'success',
  rejected: 'danger',
  expired: 'muted',
};

const RECURRING_LABEL: Record<PublicQuotationView['recurringInterval'], string> = {
  none: '',
  monthly: 'Billed monthly',
  quarterly: 'Billed quarterly',
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-8">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold tracking-wide text-text">
            AGENCY<span className="text-primary">SYSTEM</span>
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function PublicQuotePage() {
  const params = useParams<{ token: string }>();

  const [quotation, setQuotation] = useState<PublicQuotationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);

  useEffect(() => {
    api
      .get<PublicQuotationView>(`/api/v1/public/quotations/${params.token}`)
      .then(setQuotation)
      .catch((err) =>
        setLoadError(
          err instanceof ApiError
            ? err.message
            : 'Something went wrong loading this quotation. Please try the link again.',
        ),
      )
      .finally(() => setLoading(false));
  }, [params.token]);

  async function respond(action: 'accept' | 'reject') {
    setActionError(null);
    setBusy(true);
    try {
      const updated = await api.post<PublicQuotationView>(`/api/v1/public/quotations/${params.token}/${action}`);
      setQuotation(updated);
      setConfirmingReject(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-center text-sm text-text-muted">Loading your quotation…</p>
      </Shell>
    );
  }

  if (loadError || !quotation) {
    return (
      <Shell>
        <div className="text-center">
          <p className="text-base font-medium text-text">This link isn&apos;t available</p>
          <p className="mt-2 text-sm text-text-muted">
            {loadError ?? 'This quotation link is invalid or has expired.'}
          </p>
          <p className="mt-4 text-sm text-text-muted">
            If you believe this is a mistake, please reach out to whoever sent you this link and ask them to
            resend it.
          </p>
        </div>
      </Shell>
    );
  }

  const priceDisplay = formatMoney(quotation.priceCents, quotation.currency);
  const alreadyResponded = quotation.status !== 'sent';

  return (
    <Shell>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-text-muted">Prepared for {quotation.clientName}</p>
          <h1 className="mt-0.5 text-lg font-semibold text-text">{quotation.title}</h1>
        </div>
        <StatusBadge label={quotation.status} tone={STATUS_TONE[quotation.status]} />
      </div>

      <div className="rounded-md border border-border bg-surface-elevated p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-text-muted">Total</p>
          <p className="text-2xl font-semibold text-text">{priceDisplay}</p>
        </div>
        {quotation.recurringInterval !== 'none' && (
          <p className="mt-1 text-right text-xs text-text-muted">{RECURRING_LABEL[quotation.recurringInterval]}</p>
        )}

        {quotation.items.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3">
            {quotation.items.map((item, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-text">{item.description}</span>
                <span className="text-text-muted">{item.hours}h</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {actionError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {actionError}
        </p>
      )}

      {alreadyResponded ? (
        <p className="mt-6 text-center text-sm text-text-muted">
          {quotation.status === 'accepted' && 'You already accepted this quotation. Thank you!'}
          {quotation.status === 'rejected' && 'You already declined this quotation.'}
          {quotation.status === 'expired' && 'This quotation has expired.'}
          {quotation.status === 'draft' && 'This quotation is still being prepared.'}
        </p>
      ) : confirmingReject ? (
        <div className="mt-6 flex flex-col gap-3 text-center">
          <p className="text-sm text-text">Are you sure you want to decline this quotation?</p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setConfirmingReject(false)} disabled={busy}>
              Go back
            </Button>
            <Button variant="danger" onClick={() => respond('reject')} disabled={busy}>
              {busy ? 'Declining…' : 'Yes, decline'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => setConfirmingReject(true)} disabled={busy}>
            Decline
          </Button>
          <Button onClick={() => respond('accept')} disabled={busy}>
            {busy ? 'Accepting…' : 'Accept quotation'}
          </Button>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-text-muted">No account needed — this link is unique to you.</p>
    </Shell>
  );
}
