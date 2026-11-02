import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/format.js';
import { Spinner } from './Spinner.jsx';

const variants = {
  primary: 'bg-accent text-white hover:bg-accent-hover shadow-sm disabled:bg-line-strong disabled:text-ink-muted disabled:shadow-none',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-subtle disabled:text-ink-faint',
  ghost: 'text-ink-muted hover:bg-subtle hover:text-ink disabled:text-ink-faint',
  danger: 'bg-danger text-white hover:opacity-90 shadow-sm disabled:opacity-50',
};

const sizes = {
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-14 px-6 text-base gap-2.5',
  icon: 'h-11 w-11',
};

export const buttonClasses = ({ variant = 'primary', size = 'md', block = false, className } = {}) =>
  cx(
    'inline-flex shrink-0 select-none items-center justify-center rounded-md font-medium transition-colors',
    'disabled:cursor-not-allowed',
    variants[variant],
    sizes[size],
    block && 'w-full',
    className,
  );

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', block, loading = false, icon: Icon, children, className, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, block, className })}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : Icon ? <Icon className="h-4 w-4" strokeWidth={2} aria-hidden /> : null}
      {children}
    </button>
  );
});

export function ButtonLink({ to, variant = 'primary', size = 'md', block, icon: Icon, children, className, ...props }) {
  return (
    <Link to={to} className={buttonClasses({ variant, size, block, className })} {...props}>
      {Icon && <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />}
      {children}
    </Link>
  );
}
