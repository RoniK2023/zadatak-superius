import { cx } from '../../lib/format.js';

export function Card({ as: Tag = 'section', className, children, ...props }) {
  return (
    <Tag className={cx('rounded-lg border border-line bg-surface shadow-card', className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, actions, className }) {
  return (
    <div className={cx('flex items-start justify-between gap-4 px-4 pb-3 pt-4 sm:px-5 sm:pt-5', className)}>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="-my-1.5 flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cx('p-4 sm:p-5', className)}>{children}</div>;
}
