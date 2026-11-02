import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { ROLE_LABELS, useAuth } from '../../context/AuthContext.jsx';
import { cx } from '../../lib/format.js';
import { BrandMark } from './Brand.jsx';

const TitleContext = createContext({ setTitle: () => {} });

/** Sets the page title shown in the mobile top bar and the browser tab. */
export function usePageTitle(title) {
  const { setTitle } = useContext(TitleContext);
  useEffect(() => {
    setTitle(title);
    document.title = title ? `${title} · Mandrač Loyalty` : 'Mandrač Loyalty';
  }, [title, setTitle]);
}

/**
 * Shared layout for every role:
 *  - mobile/tablet (< lg): sticky top bar with page title + fixed bottom navigation
 *  - desktop (lg+): fixed left sidebar with navigation, content with max width
 *
 * nav: [{ to, label, icon, end?, mobile?: boolean (default true) }]
 */
export function AppShell({ nav, contextLabel }) {
  const { user, logout } = useAuth();
  const [title, setTitle] = useState('');
  const mobileNav = nav.filter((item) => item.mobile !== false);

  return (
    <TitleContext.Provider value={{ setTitle }}>
      <div className="min-h-dvh bg-canvas">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
          <div className="flex h-16 items-center gap-3 border-b border-line px-5">
            <BrandMark />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user?.tenant?.name ?? 'Mandrač Loyalty'}</p>
              <p className="truncate text-xs text-ink-muted">{contextLabel ?? ROLE_LABELS[user?.role]}</p>
            </div>
          </div>
          <nav aria-label="Glavna navigacija" className="flex-1 space-y-1 overflow-y-auto p-3">
            {nav
              .filter((item) => !item.mobileOnly)
              .map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cx(
                      'flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                      isActive ? 'bg-accent-soft text-accent-ink' : 'text-ink-muted hover:bg-subtle hover:text-ink',
                    )
                  }
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  {label}
                </NavLink>
              ))}
          </nav>
          <div className="border-t border-line p-3">
            <div className="flex items-center gap-3 rounded-md px-3 py-2">
              <Avatar name={user?.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
                <p className="truncate text-xs text-ink-muted">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-subtle hover:text-ink"
                aria-label="Odjava"
                title="Odjava"
              >
                <LogOut className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-4 lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark small />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-ink">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {contextLabel && <span className="hidden text-xs text-ink-muted sm:inline">{contextLabel}</span>}
            <button
              type="button"
              onClick={logout}
              className="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-subtle hover:text-ink"
              aria-label="Odjava"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </header>

        <main className="min-w-0 pb-28 lg:pb-12 lg:pl-64">
          <div className="mx-auto w-full max-w-content px-4 py-5 sm:px-6 lg:px-10 lg:py-10">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav
          aria-label="Glavna navigacija"
          className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden"
        >
          <ul className="mx-auto flex max-w-lg">
            {mobileNav.map(({ to, label, shortLabel, icon: Icon, end }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cx(
                      'flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                      isActive ? 'text-accent' : 'text-ink-muted hover:text-ink',
                    )
                  }
                >
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                  <span className="max-w-full truncate px-1">{shortLabel ?? label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </TitleContext.Provider>
  );
}

export function Avatar({ name, className }) {
  const initials = (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return (
    <span
      className={cx(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-semibold text-ink-muted',
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
