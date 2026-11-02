import { cx } from '../../lib/format.js';

const tones = {
  neutral: 'bg-subtle text-ink-muted border-line',
  accent: 'bg-accent-soft text-accent-ink border-accent-soft',
  success: 'bg-success-soft text-success border-success-soft',
  warning: 'bg-warning-soft text-warning border-warning-soft',
  danger: 'bg-danger-soft text-danger border-danger-soft',
};

export function Badge({ tone = 'neutral', icon: Icon, children, className }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
      {children}
    </span>
  );
}
