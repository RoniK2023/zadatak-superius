import { Store } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { DataList } from '../components/ui/DataList.jsx';
import { EmptyState, ErrorState, SkeletonList } from '../components/ui/States.jsx';
import { formatDate, formatNumber } from '../lib/format.js';
import { useApi } from '../lib/useApi.js';

export default function AdminTenants() {
  const { data, loading, error, reload } = useApi('/admin/tenants');
  const columns = [
    {
      key: 'name',
      header: 'Firma',
      mobile: 'title',
      render: (t) => (
        <span>
          <span className="block font-medium text-ink">{t.name}</span>
          <span className="block text-xs font-normal text-ink-muted">/r/{t.slug}</span>
        </span>
      ),
    },
    { key: 'owner', header: 'Vlasnik', render: (t) => t.owners.map((o) => o.email).join(', ') || '—' },
    { key: 'locations', header: 'Lokacije', align: 'right', render: (t) => formatNumber(t.locations) },
    { key: 'members', header: 'Članovi', align: 'right', render: (t) => formatNumber(t.members) },
    { key: 'tx', header: 'Transakcije', align: 'right', render: (t) => formatNumber(t.transactions) },
    { key: 'created', header: 'Od', render: (t) => formatDate(t.createdAt) },
  ];
  return (
    <>
      <PageHeader title="Firme" description="Firme u programu. U MVP-u se nove firme dodaju kroz seed." />
      <Card>
        {loading ? (
          <SkeletonList rows={2} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <EmptyState icon={Store} title="Još nema firmi" />
        ) : (
          <DataList columns={columns} rows={data} />
        )}
      </Card>
    </>
  );
}
