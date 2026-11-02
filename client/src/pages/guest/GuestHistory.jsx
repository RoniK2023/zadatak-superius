import { History } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/States.jsx';
import { formatMonth, monthKey } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';
import { HistoryItem } from './HistoryItem.jsx';

/** Guest history grouped by month: earned, redeemed and expired points with date and location. */
export default function GuestHistory() {
  const { data, loading, error, reload } = useApi('/guest/history');

  const groups = [];
  for (const item of data ?? []) {
    const key = monthKey(item.createdAt);
    if (groups.at(-1)?.key !== key) groups.push({ key, label: formatMonth(item.createdAt), items: [] });
    groups.at(-1).items.push(item);
  }

  return (
    <>
      <PageHeader title="Povijest" description="Zarađeni, iskorišteni i istekli bodovi." />
      {loading ? (
        <Card>
          <SkeletonList rows={6} className="border-t-0" />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={reload} />
        </Card>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            icon={History}
            title="Još nema aktivnosti"
            description="Pokažite svoj QR kod konobaru uz sljedeći račun i ovdje će se pojaviti prvi bodovi."
            action={<ButtonLink to="/gost">Prikaži QR kod</ButtonLink>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => {
            const earned = g.items.filter((i) => i.points > 0).reduce((s, i) => s + i.points, 0);
            return (
              <section key={g.key} aria-label={g.label}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="text-sm font-semibold text-ink">{g.label}</h2>
                  {earned > 0 && <p className="text-xs font-medium text-ink-muted">+{earned} zarađeno</p>}
                </div>
                <Card>
                  <ul className="divide-y divide-line">
                    {g.items.map((t) => (
                      <HistoryItem key={t.id} item={t} />
                    ))}
                  </ul>
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
