import { Link } from 'react-router-dom';
import { ChevronRight, ScrollText, ShieldAlert, Trophy } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Avatar } from '../../components/layout/AppShell.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { EmptyState, ErrorState, Skeleton, SkeletonList } from '../../components/ui/States.jsx';
import { cx, formatDate, formatMoney, formatNumber, formatShortDateTime, pointsLabel } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';
import { PeriodFilter, useFilterOptions, useOwnerFilters } from './filters.jsx';
import { TYPE_META, describeActivity } from './activityMeta.js';

/** Croatian plural for "sumnjiva dodjela": 1 sumnjiva, 2–4 sumnjive, 5+ sumnjivih. */
const suspiciousLabel = (n) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'sumnjiva';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'sumnjive';
  return 'sumnjivih';
};

const percent = (x) => new Intl.NumberFormat('hr-HR', { style: 'percent', maximumFractionDigits: 1 }).format(x);

export default function OwnerOverview() {
  const { filters, update, query } = useOwnerFilters();
  const options = useFilterOptions();
  const { data, loading, error, reload } = useApi('/owner/overview', query);
  const k = data?.kpis;

  return (
    <>
      <PageHeader
        title="Pregled"
        description="Isplativost programa u odabranom razdoblju."
        actions={<PeriodFilter inline filters={filters} update={update} locations={options.data?.locations} />}
      />

      {error ? (
        <Card>
          <ErrorState error={error} onRetry={reload} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Kpi
              loading={loading}
              label="Potrošnja članova"
              value={k && formatMoney(k.spendingCents)}
              context={k && `${formatNumber(k.visits)} posjeta · prosječni račun ${formatMoney(k.averageReceiptCents)}`}
            />
            <Kpi
              loading={loading}
              label="Trošak nagrada"
              value={k && formatMoney(k.costCents)}
              context={k && `${formatNumber(k.redeemedCount)} nagrada · ${percent(k.costShare)} potrošnje članova`}
            />
            <Kpi
              loading={loading}
              label="Obveza (procjena)"
              value={k && formatMoney(k.liability.valueCents)}
              context={
                k &&
                `${formatNumber(k.liability.points)} ${pointsLabel(k.liability.points)} kod ${k.liability.guestsWithPoints} gostiju · ${formatMoney(k.liability.perPointCents)}/bod`
              }
              title="Trenutno stanje svih važećih bodova (ne ovisi o filtru), procijenjeno po nabavnoj cijeni najjeftinije aktivne nagrade po bodu."
            />
            <Kpi
              loading={loading}
              label="Aktivni članovi"
              value={k && formatNumber(k.activeMembers)}
              valueSuffix={k && `/ ${formatNumber(k.totalMembers)}`}
              context={k && `s posjetom u razdoblju · ${formatNumber(k.pointsEarned)} bodova zarađeno`}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
            <Card>
              <CardHeader
                title="Top gosti"
                description="Po potrošnji u razdoblju"
                actions={<MoreLink to="/vlasnik/gosti">Svi gosti</MoreLink>}
              />
              {loading ? (
                <SkeletonList rows={5} />
              ) : data.topGuests.length === 0 ? (
                <EmptyState icon={Trophy} title="Nema posjeta u razdoblju" description="Proširite razdoblje ili odaberite drugu lokaciju." />
              ) : (
                <ol className="divide-y divide-line border-t border-line">
                  {data.topGuests.map((g, i) => (
                    <li key={g.guestProfileId} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas sm:px-5">
                      <span className="w-4 text-xs font-semibold text-ink-faint">{i + 1}</span>
                      <Avatar name={g.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{g.name}</p>
                        <p className="truncate text-xs text-ink-muted">
                          {g.visits} posjeta · zadnji {formatDate(g.lastVisitAt)} · {g.topLocation ?? '—'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-ink">{formatMoney(g.spendingCents)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Nedavna aktivnost"
                description="Dodjele, nagrade i istekli bodovi"
                actions={
                  <>
                    {k?.flaggedTransactions > 0 && (
                      <Link to="/vlasnik/aktivnost?sumnjivo=1" className="rounded-sm" title="Prikaži sumnjive aktivnosti">
                        <Badge tone="warning" icon={ShieldAlert}>
                          {k.flaggedTransactions} {suspiciousLabel(k.flaggedTransactions)}
                        </Badge>
                      </Link>
                    )}
                    <MoreLink to="/vlasnik/aktivnost">Sve</MoreLink>
                  </>
                }
              />
              {loading ? (
                <SkeletonList rows={5} />
              ) : data.recent.length === 0 ? (
                <EmptyState icon={ScrollText} title="Nema aktivnosti u razdoblju" />
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {data.recent.map((t) => (
                    <ActivityRow key={t.id} item={t} />
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function MoreLink({ to, children }) {
  return (
    <Link to={to} className="inline-flex min-h-11 items-center gap-0.5 text-sm font-semibold text-accent hover:underline">
      {children} <ChevronRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}

function ActivityRow({ item }) {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas sm:px-5">
      <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset', meta.circle)}>
        <Icon className="h-4 w-4" strokeWidth={2.25} aria-label={meta.label} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{item.guest}</p>
        <p className="truncate text-xs text-ink-muted">
          {formatShortDateTime(item.createdAt)} · {describeActivity(item)}
          {item.location && ` · ${item.location}`}
        </p>
      </div>
      <span className={cx('text-sm font-semibold', item.points > 0 ? 'text-success' : 'text-ink-muted')}>
        {item.points > 0 ? `+${item.points}` : `−${Math.abs(item.points)}`}
      </span>
    </li>
  );
}

function Kpi({ label, value, valueSuffix, context, loading, title }) {
  return (
    <Card className="p-4 sm:p-5" title={title}>
      <p className="text-xs font-medium text-ink-muted sm:text-sm">{label}</p>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-9 w-32" />
          <Skeleton className="mt-3 h-3 w-full" />
        </>
      ) : (
        <>
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-ink sm:text-2xl">{value}</span>
            {valueSuffix && <span className="text-sm font-medium text-ink-muted sm:text-base">{valueSuffix}</span>}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{context}</p>
        </>
      )}
    </Card>
  );
}
