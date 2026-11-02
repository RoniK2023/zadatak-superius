import { forwardRef, useId } from 'react';
import { cx } from '../../lib/format.js';

const control =
  'block w-full rounded-md border bg-surface px-3 text-base text-ink placeholder:text-ink-faint transition-colors ' +
  'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft focus-visible:ring-offset-0 ' +
  'disabled:bg-subtle disabled:text-ink-muted sm:text-sm';

function FieldShell({ id, label, hint, error, children, className, optional }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {optional && <span className="ml-1 font-normal text-ink-muted">(neobavezno)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export const Input = forwardRef(function Input({ label, hint, error, className, inputClassName, optional, suffix, ...props }, ref) {
  const autoId = useId();
  const id = props.id ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className} optional={optional}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={cx(control, 'h-11', error ? 'border-danger' : 'border-line-strong', suffix && 'pr-12', inputClassName)}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">{suffix}</span>
        )}
      </div>
    </FieldShell>
  );
});

export const Select = forwardRef(function Select({ label, hint, error, className, children, ...props }, ref) {
  const autoId = useId();
  const id = props.id ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <select
        ref={ref}
        id={id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cx(control, 'h-11 appearance-none bg-no-repeat pr-9', error ? 'border-danger' : 'border-line-strong')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%235F574D' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")",
          backgroundPosition: 'right 0.75rem center',
        }}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
});

export function Switch({ checked, onChange, label, description, disabled, id: idProp }) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-transparent transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-accent' : 'bg-line-strong',
        )}
      >
        <span
          className={cx(
            'inline-block h-6 w-6 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}

/** Segmented control — radio group rendered as buttons. */
export function Segmented({ value, onChange, options, label, className }) {
  return (
    <div className={className}>
      {label && <p className="mb-1.5 text-sm font-medium text-ink">{label}</p>}
      <div role="radiogroup" aria-label={label} className="inline-flex w-full rounded-md border border-line-strong bg-subtle p-1 sm:w-auto">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cx(
              'flex-1 whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium transition-colors sm:flex-none',
              value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
