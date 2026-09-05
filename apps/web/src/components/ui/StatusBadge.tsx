type Tone = 'success' | 'warning' | 'danger' | 'muted';

const toneClasses: Record<Tone, string> = {
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  muted: 'bg-text-muted/10 text-text-muted border-border',
};

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
