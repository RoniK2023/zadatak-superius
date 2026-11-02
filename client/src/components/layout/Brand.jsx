import { cx } from '../../lib/format.js';

/** Product mark: a simple monogram tile in the accent color. */
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
        <path d="M8 23V9l8 8 8-8v14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function BrandLockup({ className }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <BrandMark />
      <span className="text-base font-semibold tracking-tight text-ink">Mandrač Loyalty</span>
    </span>
  );
}
