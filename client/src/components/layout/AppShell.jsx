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
 *  - mobile/tablet (< lg): sticky top bar with page title + fixed bottom navigation (max 5 items)
 *  - desktop (lg+): fixed left sidebar with navigation, content with max width
 *
 * nav: [{ to, label, shortLabel?, icon, end?, mobile?: false, mobileOnly?: true }]
 */
export function AppShell({ nav, contextLabel }) {
  const { user, logout } = useAuth();
  const [title, setTitle] = useState('');
  const mobileNav = nav.filter((item) => item.mobile !== false).slice(0, 5);
  const roleLabel = contextLabel ?? ROLE_LABELS[user?.role];

  return (
    <TitleContext.Provider value={{ setTitle }}>
      <div className="min-h-dvh bg-canvas">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
          <div className="flex items-center gap-3 px-5 pb-5 pt-6">
            <BrandMark />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{user?.tenant?.name ?? 'Mandrač Loyalty'}</p>
              <p className="truncate text-xs font-medium text-ink-muted">{roleLabel}</p>
            </div>
          </div>
          <nav aria-label="Glavna navigacija" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
            {nav
              .filter((item) => !item.mobileOnly)
              .map(({ to, label, icon: Icon, end, divider }) => (
                <div key={to}>
                  {divider && <div className="mx-3 my-3 border-t border-line" aria-hidden />}
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cx(
                        'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                        isActive ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-subtle hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                        {label}
                      </>
                    )}
                  </NavLink>
                </div>
              ))}
          </nav>
          <div className="border-t border-line p-3">
            <div className="flex items-center gap-3 rounded-md py-1.5 pl-2">
              <Avatar name={user?.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                <p className="truncate text-xs text-ink-muted">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-subtle hover:text-ink"
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
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-base font-semibold text-ink">{title}</h1>
              <p className="truncate text-xs text-ink-muted">
                {user?.tenant?.name ? `${user.tenant.name} · ` : ''}
                {roleLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-subtle hover:text-ink"
            aria-label="Odjava"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        <main className="min-w-0 pb-28 lg:pb-16 lg:pl-64">
          <div className="mx-auto w-full max-w-content px-4 py-5 sm:px-6 lg:px-10 lg:py-10">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav aria-label="Glavna navigacija" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden">
          <ul className="mx-auto flex max-w-lg">
            {mobileNav.map(({ to, label, shortLabel, icon: Icon, end }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cx(
                      'flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors',
                      isActive ? 'text-accent' : 'text-ink-muted hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cx(
                          'flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                          isActive && 'bg-accent-soft',
                        )}
                      >
                        <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                      </span>
                      <span className="max-w-full truncate px-1">{shortLabel ?? label}</span>
                    </>
                  )}
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
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-bold text-ink-muted ring-1 ring-inset ring-line',
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
