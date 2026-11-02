import { Link } from 'react-router-dom';
import { ChevronRight, Info, ShieldAlert, Trophy, ScrollText } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Avatar } from '../../components/layout/AppShell.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { EmptyState, ErrorState, Notice, Skeleton, SkeletonList } from '../../components/ui/States.jsx';
import { cx, formatDate, formatMoney, formatNumber, formatPoints, formatShortDateTime } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';
import { PeriodFilter, useFilterOptions, useOwnerFilters } from './filters.jsx';
import { TYPE_META, describeActivity } from './activityMeta.js';

const percent = (x) => new Intl.NumberFormat('hr-HR', { style: 'percent', maximumFractionDigits: 1 }).format(x);

export default function OwnerOverview() {
  const { filters, update, query } = useOwnerFilters();
  const options = useFilterOptions();
  const { data, loading, error, reload } = useApi('/owner/overview', query);
  const k = data?.kpis;

  return (
    <>
      <PageHeader title="Pregled" description="Isplati li se program: što članovi troše, koliko koštaju nagrade i koliko bodova duguješ." />
      <PeriodFilter filters={filters} update={update} locations={options.data?.locations} />

      {error ? (
        <Card>
          <ErrorState error={error} onRetry={reload} />
        </Card>
      ) : (
        <>
          {k?.flaggedTransactions > 0 && (
            <Link
              to="/vlasnik/aktivnost?sumnjivo=1"
              className="mb-6 flex items-center gap-3 rounded-md border border-danger-soft bg-danger-soft px-4 py-3 text-sm text-danger hover:border-danger"
            >
              <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
              <span className="flex-1">
                <span className="font-semibold">{k.flaggedTransactions} sumnjivih dodjela bodova</span> u odabranom razdoblju
                {k.rejectedAttempts > 0 && ` · ${k.rejectedAttempts} odbijenih pokušaja`}
              </span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              loading={loading}
              label="Potrošnja članova"
              value={k && formatMoney(k.spendingCents)}
              detail={k && `${formatNumber(k.visits)} posjeta · prosječni račun ${formatMoney(k.averageReceiptCents)}`}
            />
            <Kpi
              loading={loading}
              label="Trošak nagrada"
              value={k && formatMoney(k.costCents)}
              detail={k && `${formatNumber(k.redeemedCount)} iskorištenih · ${percent(k.costShare)} potrošnje članova`}
            />
            <Kpi
              loading={loading}
              label="Obveza"
              badge="procjena"
              value={k && formatMoney(k.liability.valueCents)}
              detail={
                k &&
                `${formatPoints(k.liability.points)} kod ${k.liability.guestsWithPoints} gostiju · ${formatMoney(k.liability.perPointCents)} po bodu`
              }
            />
            <Kpi
              loading={loading}
              label="Aktivni članovi"
              value={k && `${formatNumber(k.activeMembers)} / ${formatNumber(k.totalMembers)}`}
              detail={k && `s barem jednim posjetom u razdoblju · ${formatPoints(k.pointsEarned)} zarađeno`}
            />
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-muted">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            Obveza je trenutno stanje svih važećih bodova (ne ovisi o filtru), procijenjeno po nabavnoj cijeni najjeftinije
            aktivne nagrade po bodu. Trošak se računa po nabavnoj cijeni u trenutku iskorištavanja.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader
                title="Najbolji gosti"
                description="Po potrošnji u razdoblju"
                actions={
                  <Link to="/vlasnik/gosti" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent hover:underline">
                    Svi <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                }
              />
              {loading ? (
                <SkeletonList rows={5} />
              ) : data.topGuests.length === 0 ? (
                <EmptyState icon={Trophy} title="Nema posjeta u razdoblju" description="Proširite razdoblje ili odaberite drugu lokaciju." />
              ) : (
                <ol className="divide-y divide-line">
                  {data.topGuests.map((g, i) => (
                    <li key={g.guestProfileId} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <span className="w-5 text-sm font-medium tabular text-ink-muted">{i + 1}.</span>
                      <Avatar name={g.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{g.name}</p>
                        <p className="truncate text-xs text-ink-muted">
                          {g.visits} posjeta · zadnji {formatDate(g.lastVisitAt)} · {g.topLocation ?? '—'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular text-ink">{formatMoney(g.spendingCents)}</span>
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
                  <Link to="/vlasnik/aktivnost" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent hover:underline">
                    Sve <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                }
              />
              {loading ? (
                <SkeletonList rows={5} />
              ) : data.recent.length === 0 ? (
                <EmptyState icon={ScrollText} title="Nema aktivnosti u razdoblju" />
              ) : (
                <ul className="divide-y divide-line">
                  {data.recent.map((t) => {
                    const meta = TYPE_META[t.type];
                    return (
                      <li key={t.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                        <Badge tone={meta.tone} className="w-20 justify-center">
                          {meta.label}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{t.guest}</p>
                          <p className="truncate text-xs text-ink-muted">
                            {formatShortDateTime(t.createdAt)} · {describeActivity(t)}
                            {t.location && ` · ${t.location}`}
                          </p>
                        </div>
                        <span className={cx('text-sm font-semibold tabular', t.points > 0 ? 'text-success' : 'text-ink')}>
                          {t.points > 0 ? `+${t.points}` : t.points}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
      {!loading && !error && k && k.visits === 0 && (
        <Notice tone="neutral" className="mt-6">
          U odabranom razdoblju nema posjeta članova.
        </Notice>
      )}
    </>
  );
}

function Kpi({ label, value, detail, badge, loading }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        {badge && <Badge>{badge}</Badge>}
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-8 w-32" />
          <Skeleton className="mt-3 h-3 w-full" />
        </>
      ) : (
        <>
          <p className="mt-2 text-3xl font-semibold tabular text-ink">{value}</p>
          <p className="mt-2 text-xs text-ink-muted">{detail}</p>
        </>
      )}
    </Card>
  );
}
