import { Gift } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { formatNumber, formatPoints, pointsLabel } from '../../lib/format.js';
import { RewardRow } from './GuestCard.jsx';
import { useGuest } from './useGuest.js';

export default function GuestRewards() {
  const { data, loading, error, reload } = useGuest();

  const earning =
    data?.earningRule.earningMode === 'ITEM'
      ? 'Bodove nose označeni artikli s cjenika.'
      : `${formatPoints(data?.earningRule.pointsPerEuro ?? 1)} za svaki potrošeni euro.`;

  return (
    <>
      <PageHeader title="Nagrade" description="Nagradu iskorištavate kod konobara uz svoj QR kod." />

      <Card className="mb-6 flex items-center justify-between gap-4 p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Vaše stanje</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-ink">{formatNumber(data?.balance ?? 0)}</span>
              <span className="text-base font-medium text-ink-muted">{pointsLabel(data?.balance ?? 0)}</span>
            </p>
          )}
        </div>
        {data && <p className="max-w-xs text-right text-sm text-ink-muted">{earning}</p>}
      </Card>

      <Card>
        <CardHeader title="Katalog nagrada" />
        {loading ? (
          <div className="space-y-6 border-t border-line p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data.rewards.length === 0 ? (
          <EmptyState icon={Gift} title="Nema aktivnih nagrada" description="Nagrade će se pojaviti čim ih vlasnik doda." />
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {data.rewards.map((r) => (
              <li key={r.id} className="flex gap-4 px-4 py-4 sm:px-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <Gift className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <RewardRow reward={r} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
