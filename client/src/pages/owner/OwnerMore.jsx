import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { OWNER_SECONDARY_NAV } from './nav.js';

/** Mobile hub for owner management screens (the bottom bar holds max 4 items). */
export default function OwnerMore() {
  return (
    <>
      <PageHeader title="Više" description="Postavke programa, nagrade, cjenik, lokacije i osoblje." />
      <Card>
        <ul className="divide-y divide-line">
          {OWNER_SECONDARY_NAV.map(({ to, label, description, icon: Icon }) => (
            <li key={to}>
              <Link to={to} className="flex min-h-16 items-center gap-4 px-4 py-3 hover:bg-canvas sm:px-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-subtle text-ink-muted">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">{label}</span>
                  <span className="block truncate text-sm text-ink-muted">{description}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-ink-faint" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
