import { CheckCircle2, Gift } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/States.jsx';
import { formatPoints } from '../../lib/format.js';
import { ProgressBar } from './GuestCard.jsx';
import { useGuest } from './useGuest.js';

export default function GuestRewards() {
  const { data, loading, error, reload } = useGuest();

  const earning =
    data?.earningRule.earningMode === 'ITEM'
      ? 'Bodove nose označeni artikli s cjenika.'
      : `${formatPoints(data?.earningRule.pointsPerEuro ?? 1)} za svaki potrošeni euro.`;

  return (
    <>
      <PageHeader title="Nagrade" description={data ? `Imate ${formatPoints(data.balance)}. ${earning}` : ' '} />
      <Card>
        <CardHeader title="Katalog nagrada" description="Nagradu iskorištavate kod konobara uz svoj QR kod." />
        {loading ? (
          <SkeletonList rows={3} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data.rewards.length === 0 ? (
          <EmptyState icon={Gift} title="Nema aktivnih nagrada" description="Nagrade će se pojaviti čim ih vlasnik doda." />
        ) : (
          <ul className="divide-y divide-line">
            {data.rewards.map((r) => (
              <li key={r.id} className="px-4 py-4 sm:px-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-subtle text-ink-muted">
                    <Gift className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{r.name}</p>
                    <p className="text-sm text-ink-muted">{formatPoints(r.pointsCost)}</p>
                  </div>
                  {r.missing === 0 ? (
                    <Badge tone="success" icon={CheckCircle2}>
                      Dostupno
                    </Badge>
                  ) : (
                    <span className="text-right text-sm text-ink-muted">
                      Nedostaje <span className="block font-semibold tabular text-ink">{formatPoints(r.missing)}</span>
                    </span>
                  )}
                </div>
                <ProgressBar value={r.progress} label={`Napredak do nagrade ${r.name}`} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
