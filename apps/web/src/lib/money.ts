export function formatCents(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

// Phase 2 task 4 — full multi-currency. Use this wherever the amount has
// its own currency attached (quotations, pricing profiles); formatCents
// above stays USD-only for call sites that predate multi-currency and
// haven't been updated to pass a currency through yet.
export function formatMoney(cents: number, currency: string) {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency || 'USD' });
}
