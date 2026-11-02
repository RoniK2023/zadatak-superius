import { cx } from '../../lib/format.js';

/** Product mark: two calm waves on the sea-blue accent tile. */
export function BrandMark({ small = false, className }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-md bg-accent text-white',
        small ? 'h-8 w-8' : 'h-9 w-9',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className={small ? 'h-5 w-5' : 'h-6 w-6'} fill="none">
        <path
          d="M6 20.5c3.3-2.8 6.7-2.8 10 0s6.7 2.8 10 0M6 13.5c3.3-2.8 6.7-2.8 10 0s6.7 2.8 10 0"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function BrandLockup({ className }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <BrandMark />
      <span className="text-base font-bold tracking-tight text-ink">
        Mandrač <span className="font-medium text-ink-muted">Loyalty</span>
      </span>
    </span>
  );
}
