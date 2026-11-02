import { cx } from '../../lib/format.js';
import { usePageTitle } from './AppShell.jsx';

/**
 * Page heading. The title is an h1 on desktop; on mobile the sticky top bar shows it, so here only
 * the description and actions remain. `actions` sit on the right on desktop (e.g. filters).
 */
export function PageHeader({ title, description, actions, children, className }) {
  usePageTitle(title);
  return (
    <div className={cx('mb-5 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between lg:gap-6', className)}>
      <div className="min-w-0">
        <h1 className="hidden text-xl font-semibold text-ink lg:block">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-ink-muted lg:mt-1">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
