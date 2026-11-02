import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Gift, QrCode, Receipt, UserPlus } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/States.jsx';
import { HOME_BY_ROLE, useAuth } from '../../context/AuthContext.jsx';
import { useApi } from '../../lib/useApi.js';
import { formatPoints } from '../../lib/format.js';
import { PublicLayout } from './PublicLayout.jsx';

export const DEFAULT_TENANT = import.meta.env.VITE_DEFAULT_TENANT ?? 'mandrac';

const steps = [
  { icon: UserPlus, title: 'Registrirajte se', text: 'Skenirajte QR kod na šanku i otvorite račun emailom. Bez instalacije aplikacije.' },
  { icon: Receipt, title: 'Skupljajte bodove', text: 'Uz svaki račun pokažite svoj QR kod konobaru. Bodovi se računaju automatski.' },
  { icon: Gift, title: 'Iskoristite nagradu', text: 'Kad skupite dovoljno bodova, konobar vam uz isti QR kod daje nagradu.' },
];

export default function Landing() {
  const { user, status } = useAuth();
  const { data: tenant, loading } = useApi(`/public/tenants/${DEFAULT_TENANT}`);

  useEffect(() => {
    document.title = 'Mandrač Loyalty';
  }, []);

  if (status === 'authenticated' && user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  const earning =
    tenant?.settings?.earningMode === 'ITEM'
      ? 'Bodove nose označeni artikli s cjenika.'
      : `${formatPoints(tenant?.settings?.pointsPerEuro ?? 1)} za svaki potrošeni euro.`;

  return (
    <PublicLayout actions={<ButtonLink to="/login" variant="secondary">Prijava</ButtonLink>}>
      <section className="mx-auto grid max-w-content gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Program vjernosti</p>
          {loading ? (
            <Skeleton className="mt-3 h-10 w-3/4" />
          ) : (
            <h1 className="mt-3 text-2xl font-semibold text-ink">{tenant?.name ?? 'Mandrač Loyalty'}</h1>
          )}
          <p className="mt-3 max-w-lg text-base text-ink-muted">
            Skupljajte bodove uz svaki račun i zamijenite ih za kavu ili piće na nama. {tenant ? earning : ''}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to={`/r/${DEFAULT_TENANT}`} size="lg" icon={QrCode}>
              Registracija
            </ButtonLink>
            <ButtonLink to="/login" size="lg" variant="secondary">
              Već imam račun
            </ButtonLink>
          </div>

          <ol className="mt-12 space-y-6">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    <span className="text-ink-muted">{i + 1}. </span>
                    {title}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="self-start overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <div className="bg-accent px-6 py-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/75">Nagrade</p>
            <p className="mt-1 text-lg font-semibold">Bodove mijenjate za piće na nama</p>
          </div>
          <ul className="divide-y divide-line px-6">
            {loading &&
              [0, 1, 2].map((i) => (
                <li key={i} className="flex justify-between py-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </li>
              ))}
            {tenant?.rewards?.map((r) => (
              <li key={r.name} className="flex items-center justify-between py-4 text-sm">
                <span className="font-semibold text-ink">{r.name}</span>
                <span className="font-medium text-ink-muted">{formatPoints(r.pointsCost)}</span>
              </li>
            ))}
          </ul>
          {tenant?.locations?.length > 0 && (
            <p className="border-t border-line bg-canvas px-6 py-4 text-xs text-ink-muted">
              Bodovi vrijede na svim lokacijama: <span className="font-semibold text-ink">{tenant.locations.map((l) => l.name).join(', ')}</span>
            </p>
          )}
        </aside>
      </section>
    </PublicLayout>
  );
}
