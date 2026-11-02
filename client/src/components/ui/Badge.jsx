import { cx } from '../../lib/format.js';

const tones = {
  neutral: 'bg-subtle text-ink-muted ring-line',
  accent: 'bg-accent-soft text-accent ring-accent-line',
  success: 'bg-success-soft text-success ring-success-line',
  warning: 'bg-warning-soft text-warning ring-warning-line',
  danger: 'bg-danger-soft text-danger ring-danger-line',
};

export function Badge({ tone = 'neutral', icon: Icon, children, className, title }) {
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />}
      {children}
    </span>
  );
}
