import { Trophy } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Avatar } from '../../components/layout/AppShell.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { DataList } from '../../components/ui/DataList.jsx';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/States.jsx';
import { formatDate, formatMoney, formatNumber } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';
import { PeriodFilter, useFilterOptions, useOwnerFilters } from './filters.jsx';

export default function OwnerTopGuests() {
  const { filters, update, query } = useOwnerFilters();
  const options = useFilterOptions();
  const { data, loading, error, reload } = useApi('/owner/top-guests', query);

  const columns = [
    { key: 'rank', header: '#', mobile: 'hide', className: 'w-10 text-ink-muted tabular', render: (g) => g.rank },
    {
      key: 'name',
      header: 'Gost',
      mobile: 'title',
      render: (g) => (
        <span className="flex items-center gap-3">
          <Avatar name={g.name} className="hidden md:inline-flex" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">
              <span className="mr-1 text-ink-muted md:hidden">{g.rank}.</span>
              {g.name}
            </span>
            <span className="block truncate text-xs font-normal text-ink-muted">{g.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'spending', header: 'Potrošnja', align: 'right', mobile: 'hide', render: (g) => formatMoney(g.spendingCents) },
    { key: 'visits', header: 'Posjeta', align: 'right', render: (g) => formatNumber(g.visits) },
    { key: 'last', header: 'Zadnji posjet', render: (g) => formatDate(g.lastVisitAt) },
    { key: 'location', header: 'Najčešća lokacija', render: (g) => g.topLocation ?? '—' },
    { key: 'balance', header: 'Bodovi', align: 'right', render: (g) => formatNumber(g.balance) },
  ];

  return (
    <>
      <PageHeader
        title="Najbolji gosti"
        description="Članovi sortirani po potrošnji u odabranom razdoblju."
        actions={<PeriodFilter inline filters={filters} update={update} locations={options.data?.locations} />}
      />
      <Card>
        {loading ? (
          <SkeletonList rows={8} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data.guests.length === 0 ? (
          <EmptyState icon={Trophy} title="Nema posjeta u razdoblju" description="Proširite razdoblje ili odaberite drugu lokaciju." />
        ) : (
          <DataList
            columns={columns}
            rows={data.guests}
            rowKey={(g) => g.guestProfileId}
            mobileAside={(g) => <span className="text-sm font-semibold tabular text-ink">{formatMoney(g.spendingCents)}</span>}
          />
        )}
      </Card>
    </>
  );
}
