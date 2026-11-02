import { CheckCircle2, XCircle } from 'lucide-react';
import { cx } from '../lib/format.js';

/**
 * Full-width outcome screen for the waiter — readable from a distance during a busy shift.
 * tone="success": large green state with the headline number; tone="danger": red with the reason.
 */
export function ResultPanel({ tone = 'success', eyebrow, headline, headlineSuffix, message, children, actions, footnote }) {
  const ok = tone === 'success';
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <section
      role={ok ? 'status' : 'alert'}
      className={cx(
        'mx-auto w-full max-w-xl overflow-hidden rounded-xl border shadow-card',
        ok ? 'border-success-line bg-success-soft' : 'border-danger-line bg-danger-soft',
      )}
    >
      <div className="flex flex-col items-center px-6 pb-8 pt-10 text-center sm:px-10">
        <span
          className={cx(
            'flex h-16 w-16 items-center justify-center rounded-full',
            ok ? 'bg-success text-white' : 'bg-danger text-white',
          )}
        >
          <Icon className="h-9 w-9" strokeWidth={2.25} aria-hidden />
        </span>
        {eyebrow && <p className="mt-5 text-base font-semibold text-ink">{eyebrow}</p>}
        {headline !== undefined && (
          <p className={cx('mt-2 font-bold', ok ? 'text-mega text-success' : 'text-xl text-danger')}>
            {headline}
            {headlineSuffix && <span className="ml-2 text-xl font-semibold">{headlineSuffix}</span>}
          </p>
        )}
        {message && <p className={cx('mt-3 max-w-md text-lg font-medium', ok ? 'text-ink' : 'text-ink')}>{message}</p>}
      </div>
      {children && <div className="border-t border-line bg-surface px-6 py-5 sm:px-10">{children}</div>}
      {(actions || footnote) && (
        <div className="border-t border-line bg-surface px-6 pb-6 pt-5 sm:px-10">
          {actions && <div className="flex flex-col gap-2 sm:flex-row">{actions}</div>}
          {footnote && <p className="mt-3 text-center text-xs text-ink-muted">{footnote}</p>}
        </div>
      )}
    </section>
  );
}

/** Two-up stat row used inside result panels. */
export function ResultStats({ items }) {
  return (
    <dl className="grid grid-cols-2 gap-4">
      {items.filter(Boolean).map(({ label, value, wide }) => (
        <div key={label} className={wide ? 'col-span-2' : undefined}>
          <dt className="text-xs font-medium text-ink-muted">{label}</dt>
          <dd className="mt-0.5 text-lg font-semibold text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
