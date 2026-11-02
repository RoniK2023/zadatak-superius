import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/format.js';
import { Spinner } from './Spinner.jsx';

const variants = {
  primary: 'bg-accent text-white hover:bg-accent-hover disabled:bg-line disabled:text-ink-faint',
  secondary: 'border border-line-strong bg-surface text-ink hover:border-ink-faint hover:bg-subtle disabled:text-ink-faint',
  ghost: 'text-ink-muted hover:bg-subtle hover:text-ink disabled:text-ink-faint',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-50',
  'danger-ghost': 'text-danger hover:bg-danger-soft disabled:opacity-50',
};

const sizes = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
  xl: 'h-14 px-6 text-base gap-2.5',
  icon: 'h-11 w-11',
};

const iconSizes = { sm: 'h-4 w-4', md: 'h-4 w-4', lg: 'h-5 w-5', xl: 'h-5 w-5', icon: 'h-5 w-5' };

export const buttonClasses = ({ variant = 'primary', size = 'md', block = false, className } = {}) =>
  cx(
    'inline-flex shrink-0 select-none items-center justify-center rounded-md font-semibold transition-colors',
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
  const iconClass = iconSizes[size];
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, block, className })}
      {...props}
    >
      {loading ? <Spinner className={iconClass} /> : Icon ? <Icon className={iconClass} strokeWidth={2} aria-hidden /> : null}
      {children}
    </button>
  );
});

export function ButtonLink({ to, variant = 'primary', size = 'md', block, icon: Icon, children, className, ...props }) {
  return (
    <Link to={to} className={buttonClasses({ variant, size, block, className })} {...props}>
      {Icon && <Icon className={iconSizes[size]} strokeWidth={2} aria-hidden />}
      {children}
    </Link>
  );
}
