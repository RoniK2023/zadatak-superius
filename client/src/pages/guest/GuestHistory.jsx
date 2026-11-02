import { Gift, History, Hourglass, Receipt } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/States.jsx';
import { cx, formatDateTime, formatMoney } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';

const TYPES = {
  EARN: { icon: Receipt, title: (t) => `Bodovi uz račun #${t.receipt?.number ?? ''}`, tone: 'text-success' },
  REDEEM: { icon: Gift, title: (t) => `Nagrada: ${t.reward ?? ''}`, tone: 'text-ink' },
  EXPIRE: { icon: Hourglass, title: () => 'Istek bodova', tone: 'text-ink-muted' },
};

export default function GuestHistory() {
  const { data, loading, error, reload } = useApi('/guest/history');

  return (
    <>
      <PageHeader title="Povijest" description="Zarađeni, iskorišteni i istekli bodovi." />
      <Card>
        {loading ? (
          <SkeletonList rows={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={History}
            title="Još nema aktivnosti"
            description="Pokažite svoj QR kod konobaru uz sljedeći račun i ovdje će se pojaviti prvi bodovi."
            action={<ButtonLink to="/gost">Prikaži QR kod</ButtonLink>}
          />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((t) => {
              const meta = TYPES[t.type];
              const Icon = meta.icon;
              return (
                <li key={t.id} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink-muted">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{meta.title(t)}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {formatDateTime(t.createdAt)}
                      {t.location && ` · ${t.location}`}
                      {t.receipt && ` · ${formatMoney(t.receipt.totalCents)}`}
                    </p>
                  </div>
                  <span className={cx('text-base font-semibold tabular', t.points > 0 ? meta.tone : 'text-ink')}>
                    {t.points > 0 ? `+${t.points}` : t.points}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
