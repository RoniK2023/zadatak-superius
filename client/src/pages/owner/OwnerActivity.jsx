import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ScrollText, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { DataList } from '../../components/ui/DataList.jsx';
import { Select, Switch } from '../../components/ui/Field.jsx';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { api } from '../../lib/api.js';
import { cx, formatShortDateTime } from '../../lib/format.js';
import { PeriodFilter, useFilterOptions, useOwnerFilters } from './filters.jsx';
import { TYPE_META, describeActivity } from './activityMeta.js';

const PAGE = 50;

export default function OwnerActivity() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { filters, update, query } = useOwnerFilters();
  const options = useFilterOptions();
  const [extra, setExtra] = useState({ waiterId: '', guestId: '', type: '' });
  const flagged = params.get('sumnjivo') === '1';
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const [nonce, setNonce] = useState(0);

  const fullQuery = { ...query, ...extra, flagged: flagged ? '1' : undefined, limit: PAGE };
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
  const labels = data?.flagLabels ?? {};

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
          <Badge tone={TYPE_META[i.type].tone}>{TYPE_META[i.type].label}</Badge>
          <span className="text-sm font-medium text-ink md:hidden">{i.guest?.name ?? 'Nepoznat gost'}</span>
        </span>
      ),
    },
    { key: 'guest', header: 'Gost', mobile: 'hide', className: 'whitespace-nowrap font-medium text-ink', render: (i) => i.guest?.name ?? 'Nepoznat kod' },
    { key: 'waiter', header: 'Konobar', className: 'whitespace-nowrap', render: (i) => i.waiter?.name ?? '—' },
    { key: 'location', header: 'Lokacija', render: (i) => i.location ?? '—' },
    {
      key: 'detail',
      header: 'Detalji',
      className: 'max-w-xs',
      render: (i) => (
        <span className="block">
          <span className={cx('block truncate', i.type === 'REJECTED' && 'text-danger')} title={describeActivity(i)}>
            {describeActivity(i)}
          </span>
          {i.flags.length > 0 && (
            <span className="mt-1 flex flex-wrap gap-1">
              {i.flags.map((f) => (
                <Badge key={f} tone="danger" icon={ShieldAlert} className="whitespace-normal">
                  {labels[f] ?? f}
                </Badge>
              ))}
            </span>
          )}
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
        activeExtra={[extra.waiterId, extra.guestId, extra.type, flagged].filter(Boolean).length}
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
        <div className="lg:pb-2.5">
          <Switch
            label="Samo sumnjivo"
            checked={flagged}
            onChange={(on) => setParams(on ? { sumnjivo: '1' } : {}, { replace: true })}
          />
        </div>
      </PeriodFilter>

      {data?.suspicious?.length > 0 && (
        <Card className="mb-6 border-danger-soft">
          <CardHeader
            title="Sumnjive aktivnosti"
            description={`Pragovi: gost bodovan više od ${data.thresholds.dailyScanLimitPerGuest}× dnevno · isti konobar istom gostu više od ${data.thresholds.waiterGuestPerDay}× dnevno · ${data.thresholds.rejectedPerDay}+ odbijena pokušaja dnevno.`}
          />
          <ul className="divide-y divide-line">
            {data.suspicious.map((p) => (
              <li key={`${p.waiter.id}-${p.guest.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <ShieldAlert className="h-5 w-5 shrink-0 text-danger" aria-hidden />
                <p className="min-w-0 flex-1 text-sm text-ink">
                  <span className="font-semibold">{p.waiter.name}</span> → <span className="font-semibold">{p.guest.name}</span>
                  <span className="text-ink-muted">
                    {' '}
                    · {p.earns} označenih dodjela{p.rejected ? ` · ${p.rejected} odbijenih pokušaja` : ''}
                  </span>
                </p>
                <Button
                  variant="secondary"
                  onClick={() => setExtra((x) => ({ ...x, waiterId: p.waiter.id, guestId: p.guest.id, type: '' }))}
                >
                  Prikaži
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

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
            title={flagged ? 'Nema sumnjivih aktivnosti' : 'Nema aktivnosti'}
            description="Za odabrane filtre nema zapisa. Promijenite razdoblje ili filtre."
            action={
              (extra.waiterId || extra.guestId || extra.type || flagged) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setExtra({ waiterId: '', guestId: '', type: '' });
                    setParams({}, { replace: true });
                  }}
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
              rowClassName={(i) => (i.flags.length ? 'bg-danger-soft/40' : undefined)}
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
    <span className={cx('text-sm font-semibold tabular', item.points > 0 ? 'text-success' : 'text-ink')}>
      {item.points > 0 ? `+${item.points}` : item.points}
    </span>
  );
}
