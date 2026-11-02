import { Link } from 'react-router-dom';
import { BrandLockup } from '../../components/layout/Brand.jsx';

export function PublicLayout({ children, actions }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="rounded-md" aria-label="Mandrač Loyalty — početna">
            <BrandLockup />
          </Link>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto max-w-content px-4 py-6 text-xs text-ink-muted sm:px-6">
          Mandrač Loyalty · program vjernosti za kafiće i male obrtnike · Superius
        </div>
      </footer>
    </div>
  );
}
