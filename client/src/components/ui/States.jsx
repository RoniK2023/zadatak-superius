import { AlertTriangle, RotateCw } from 'lucide-react';
import { cx } from '../../lib/format.js';
import { Button } from './Button.jsx';

export function Skeleton({ className }) {
  return <div className={cx('animate-shimmer rounded-sm bg-subtle', className)} aria-hidden />;
}

/** Placeholder rows for lists / tables while loading. */
export function SkeletonList({ rows = 5, className }) {
  return (
    <div className={cx('divide-y divide-line border-t border-line', className)} role="status" aria-label="Učitavanje">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3.5 w-14" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cx('flex flex-col items-center px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-ink-muted">
          <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </div>
      )}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  return (
    <div className={cx('flex flex-col items-center px-6 py-12 text-center', className)} role="alert">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-ink">Podaci se nisu učitali</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{error?.message ?? 'Nešto je pošlo po zlu.'}</p>
      {onRetry && (
        <Button variant="secondary" icon={RotateCw} className="mt-5" onClick={() => onRetry()}>
          Pokušaj ponovno
        </Button>
      )}
    </div>
  );
}

/** Inline notice (neutral / accent / warning / danger / success). */
export function Notice({ tone = 'neutral', icon: Icon, title, children, className }) {
  const tones = {
    neutral: 'bg-subtle border-line text-ink',
    accent: 'bg-accent-soft border-accent-line text-accent',
    warning: 'bg-warning-soft border-warning-line text-warning',
    danger: 'bg-danger-soft border-danger-line text-danger',
    success: 'bg-success-soft border-success-line text-success',
  };
  return (
    <div className={cx('flex gap-3 rounded-md border px-4 py-3 text-sm', tones[tone], className)}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cx(title && 'mt-0.5', tone === 'neutral' ? 'text-ink-muted' : 'opacity-90')}>{children}</div>}
      </div>
    </div>
  );
}
