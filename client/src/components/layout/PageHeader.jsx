import { usePageTitle } from './AppShell.jsx';

/**
 * Page heading. The title is shown as h1 on desktop; on mobile the sticky top bar shows it,
 * so here only the description and actions remain visible.
 */
export function PageHeader({ title, description, actions, children }) {
  usePageTitle(title);
  return (
    <div className="mb-5 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="hidden text-3xl font-semibold text-ink lg:block">{title}</h1>
        {description && <p className="text-sm text-ink-muted lg:mt-1 lg:text-base">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
