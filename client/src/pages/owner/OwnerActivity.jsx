import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { DataList } from '../../components/ui/DataList.jsx';
import { Select } from '../../components/ui/Field.jsx';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { api } from '../../lib/api.js';
import { cx, formatShortDateTime } from '../../lib/format.js';
import { PeriodFilter, useFilterOptions, useOwnerFilters } from './filters.jsx';
import { TYPE_META, describeActivity } from './activityMeta.js';

const PAGE = 50;

export default function OwnerActivity() {
  const toast = useToast();
  const { filters, update, query } = useOwnerFilters();
  const options = useFilterOptions();
  const [extra, setExtra] = useState({ waiterId: '', guestId: '', type: '' });
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const [nonce, setNonce] = useState(0);

  const fullQuery = { ...query, ...extra, limit: PAGE };
  const key = JSON.stringify(fullQuery);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api('/owner/activity', { query: JSON.parse(key) })
      .then((data) => alive && setState({ loading: false, error: null, data }))
      .catch((error) => alive && setState({ loading: false, error, data: null }));
    return () => {
      alive = false;
    };
  }, [key, nonce]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await api('/owner/activity', { query: { ...JSON.parse(key), offset: state.data.items.length } });
      setState((s) => ({ ...s, data: { ...s.data, items: [...s.data.items, ...next.items] } }));
    } catch (err) {
      toast.error('Učitavanje nije uspjelo', err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const retry = () => setNonce((n) => n + 1);
  const { data, loading, error } = state;

  const columns = [
    {
      key: 'time',
      header: 'Vrijeme',
      mobile: 'hide',
      className: 'whitespace-nowrap text-ink-muted tabular',
      render: (i) => formatShortDateTime(i.createdAt),
    },
    {
      key: 'type',
      header: 'Vrsta',
      mobile: 'title',
      render: (i) => (
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone={TYPE_META[i.type].tone} className="w-20 justify-center">
            {TYPE_META[i.type].label}
          </Badge>
          <span className="text-sm font-semibold text-ink md:hidden">{i.guest?.name ?? 'Nepoznat gost'}</span>
        </span>
      ),
    },
    { key: 'guest', header: 'Gost', mobile: 'hide', className: 'whitespace-nowrap font-semibold text-ink', render: (i) => i.guest?.name ?? 'Nepoznat kod' },
    {
      key: 'waiter',
      header: 'Konobar · lokacija',
      className: 'whitespace-nowrap',
      render: (i) => (
        <span className="block leading-tight">
          <span className="block text-ink">{i.waiter?.name ?? '—'}</span>
          <span className="block text-xs text-ink-muted">{i.location ?? '—'}</span>
        </span>
      ),
    },
    {
      key: 'detail',
      header: 'Detalji',
      className: 'w-full max-w-0',
      render: (i) => (
        <span className="block">
          <span className={cx('block truncate', i.type === 'REJECTED' ? 'text-danger' : 'text-ink')} title={describeActivity(i)}>
            {describeActivity(i)}
          </span>
        </span>
      ),
    },
    {
      key: 'points',
      header: 'Bodovi',
      align: 'right',
      mobile: 'hide',
      render: (i) => <PointsCell item={i} />,
    },
  ];

  return (
    <>
      <PageHeader title="Aktivnost" description="Sve dodjele, nagrade, istekli bodovi i odbijeni pokušaji — tko je kome dodijelio bodove." />
      <PeriodFilter
        filters={filters}
        update={update}
        locations={options.data?.locations}
        activeExtra={[extra.waiterId, extra.guestId, extra.type].filter(Boolean).length}
      >
        <Select label="Konobar" className="lg:w-44" value={extra.waiterId} onChange={(e) => setExtra((x) => ({ ...x, waiterId: e.target.value }))}>
          <option value="">Svi konobari</option>
          {options.data?.waiters.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
        <Select label="Gost" className="lg:w-48" value={extra.guestId} onChange={(e) => setExtra((x) => ({ ...x, guestId: e.target.value }))}>
          <option value="">Svi gosti</option>
          {options.data?.guests.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <Select label="Vrsta" className="lg:w-40" value={extra.type} onChange={(e) => setExtra((x) => ({ ...x, type: e.target.value }))}>
          <option value="">Sve vrste</option>
          <option value="EARN">Dodjele</option>
          <option value="REDEEM">Nagrade</option>
          <option value="EXPIRE">Istek</option>
          <option value="REJECTED">Odbijeni pokušaji</option>
        </Select>
      </PeriodFilter>

      <Card>
        <CardHeader
          title="Log"
          description={data ? `${data.total} zapisa${data.truncated ? ' (prikazano najnovijih — suzite filter)' : ''}` : ' '}
        />
        {loading ? (
          <SkeletonList rows={8} />
        ) : error ? (
          <ErrorState error={error} onRetry={retry} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Nema aktivnosti"
            description="Za odabrane filtre nema zapisa. Promijenite razdoblje ili filtre."
            action={
              (extra.waiterId || extra.guestId || extra.type) && (
                <Button
                  variant="secondary"
                  onClick={() => setExtra({ waiterId: '', guestId: '', type: '' })}
                >
                  Očisti filtre
                </Button>
              )
            }
          />
        ) : (
          <>
            <DataList
              columns={columns}
              rows={data.items}
              rowKey={(i) => `${i.kind}-${i.id}`}
              mobileAside={(i) => (
                <span className="block">
                  <PointsCell item={i} />
                  <span className="block text-xs font-normal text-ink-muted">{formatShortDateTime(i.createdAt)}</span>
                </span>
              )}
            />
            {data.items.length < data.total && (
              <div className="border-t border-line p-4 text-center">
                <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
                  Učitaj još ({data.total - data.items.length})
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}

function PointsCell({ item }) {
  if (item.type === 'REJECTED') return <span className="text-sm text-ink-muted">—</span>;
  return (
    <span className={cx('text-sm font-semibold', item.points > 0 ? 'text-success' : 'text-ink-muted')}>
      {item.points > 0 ? `+${item.points}` : `−${Math.abs(item.points)}`}
    </span>
  );
}
