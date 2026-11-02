import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarClock, ChevronRight, Clock, Download, History, Sun } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { QrCode } from '../../components/QrCode.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { EmptyState, ErrorState, Notice, Skeleton, SkeletonList } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { api } from '../../lib/api.js';
import { cx, formatDay, formatNumber, pointsLabel } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';
import { HistoryItem } from './HistoryItem.jsx';
import { useGuest } from './useGuest.js';

export async function downloadCard(toast) {
  try {
    const res = await api('/guest/card.pdf', { raw: true });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kartica-vjernosti.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('Kartica preuzeta', 'QR s PDF-a vrijedi jednako kao QR u aplikaciji.');
  } catch (err) {
    toast.error('Preuzimanje nije uspjelo', err.message);
  }
}

export default function GuestCard() {
  const { data, loading, error, reload } = useGuest();
  const history = useApi('/guest/history');
  const location = useLocation();
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    await downloadCard(toast);
    setDownloading(false);
  };

  if (error) {
    return (
      <>
        <PageHeader title="Moja kartica" />
        <Card>
          <ErrorState error={error} onRetry={reload} />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Moja kartica" description="Pokažite QR kod konobaru uz svaki račun." />

      {location.state?.welcome && (
        <Notice tone="success" title="Dobro došli u program!" className="mb-5">
          Ovo je vaša kartica. Pokažite QR kod konobaru uz svaki račun i skupljajte bodove.
        </Notice>
      )}
      {data?.happyHour.active && (
        <Notice tone="warning" icon={Clock} title={`Happy hour do ${data.happyHour.end}`} className="mb-5">
          Računi ne nose bodove i nagrade se ne mogu iskoristiti.
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,24rem)_1fr] lg:items-start">
        <LoyaltyCard data={data} loading={loading} />

        <div className="space-y-6">
          <RewardProgress data={data} loading={loading} />

          <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-sm font-semibold text-ink">Kartica za spremanje</p>
              <p className="mt-0.5 text-sm text-ink-muted">PDF s vašim QR kodom — konobar ga skenira kao i ovaj zaslon.</p>
            </div>
            <Button variant="secondary" icon={Download} loading={downloading} onClick={download} disabled={loading}>
              Preuzmi PDF
            </Button>
          </Card>

          <Card>
            <CardHeader
              title="Nedavno"
              actions={
                <Link to="/gost/povijest" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent hover:underline">
                  Sva povijest <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              }
            />
            {history.loading ? (
              <SkeletonList rows={3} />
            ) : history.error ? (
              <ErrorState error={history.error} onRetry={history.reload} />
            ) : history.data.length === 0 ? (
              <EmptyState icon={History} title="Još nema aktivnosti" description="Prvi bodovi pojavit će se ovdje nakon posjeta." className="py-8" />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {history.data.slice(0, 4).map((t) => (
                  <HistoryItem key={t.id} item={t} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

/** The card itself: business name, QR large on white, code in monospace, balance as hero. */
function LoyaltyCard({ data, loading }) {
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white shadow-card" aria-label="Kartica vjernosti">
      <header className="flex items-center gap-3 bg-accent px-5 py-4 text-white sm:px-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/15" aria-hidden>
          <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none">
            <path
              d="M6 20.5c3.3-2.8 6.7-2.8 10 0s6.7 2.8 10 0M6 13.5c3.3-2.8 6.7-2.8 10 0s6.7 2.8 10 0"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div className="min-w-0">
          {loading ? (
            <Skeleton className="h-5 w-40 bg-white/20" />
          ) : (
            <p className="truncate text-base font-bold">{data.tenant.name}</p>
          )}
          <p className="text-xs font-medium text-white/75">Kartica vjernosti</p>
        </div>
      </header>

      <div className="flex flex-col items-center px-6 pb-6 pt-7">
        <div className="w-64 max-w-full">
          {loading ? <Skeleton className="aspect-square w-full" /> : <QrCode value={data.qrToken} label="Vaš QR kod za skupljanje bodova" />}
        </div>
        {loading ? (
          <Skeleton className="mt-5 h-6 w-48" />
        ) : (
          <>
            <p className="mt-5 font-mono text-lg font-semibold tracking-widest text-ink">{data.qrToken}</p>
            <p className="mt-0.5 text-sm text-ink-muted">{data.name}</p>
          </>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
          <Sun className="h-3.5 w-3.5" aria-hidden />
          Pojačajte svjetlinu zaslona za brže skeniranje.
        </p>
      </div>

      {/* Perforation — the card's "tear line" between the scan area and the balance */}
      <div className="relative" aria-hidden>
        <div className="mx-6 border-t-2 border-dashed border-line" />
        <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full border border-line bg-canvas" />
        <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full border border-line bg-canvas" />
      </div>

      <div className="px-6 pb-7 pt-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Stanje bodova</p>
        {loading ? (
          <Skeleton className="mx-auto mt-2 h-12 w-28" />
        ) : (
          <p className="mt-1 flex items-baseline justify-center gap-2">
            <span className="text-hero font-bold text-ink">{formatNumber(data.balance)}</span>
            <span className="text-lg font-medium text-ink-muted">{pointsLabel(data.balance)}</span>
          </p>
        )}
      </div>
    </article>
  );
}

function RewardProgress({ data, loading }) {
  return (
    <Card>
      <CardHeader
        title="Do nagrade"
        actions={
          <Link to="/gost/nagrade" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent hover:underline">
            Sve nagrade <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />
      <div className="space-y-5 px-4 pb-5 sm:px-5">
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))
        ) : data.rewards.length === 0 ? (
          <p className="text-sm text-ink-muted">Trenutno nema aktivnih nagrada.</p>
        ) : (
          data.rewards.map((r) => <RewardRow key={r.id} reward={r} />)
        )}
      </div>
      {!loading && (
        <div className="flex items-start gap-2.5 rounded-b-lg border-t border-line bg-canvas px-4 py-3.5 text-xs text-ink-muted sm:px-5">
          <CalendarClock className="mt-px h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p>
              {data.expiresOn ? (
                <>
                  Bodovi vrijede do <span className="font-semibold text-ink">{formatDay(data.expiresOn)}</span>
                </>
              ) : (
                'Nemate bodova koji ističu.'
              )}
            </p>
            {data.expiryRule && <p className="mt-0.5">{data.expiryRule}</p>}
          </div>
        </div>
      )}
    </Card>
  );
}

export function RewardRow({ reward }) {
  const ready = reward.missing === 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{reward.name}</p>
        {ready ? (
          <Badge tone="success">Možete iskoristiti</Badge>
        ) : (
          <p className="text-sm text-ink-muted">
            Još <span className="font-semibold text-ink">{reward.missing}</span> {pointsLabel(reward.missing)}
          </p>
        )}
      </div>
      <ProgressBar value={reward.progress} label={`Napredak do nagrade ${reward.name}`} complete={ready} />
      <p className="mt-1 text-xs text-ink-muted">
        {Math.min(reward.pointsCost, reward.pointsCost - reward.missing)} / {reward.pointsCost} {pointsLabel(reward.pointsCost)}
      </p>
    </div>
  );
}

export function ProgressBar({ value, label, complete = false }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className="mt-2 h-2 w-full overflow-hidden rounded-full bg-subtle"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className={cx('h-full rounded-full transition-all', complete ? 'bg-success' : 'bg-accent')} style={{ width: `${pct}%` }} />
    </div>
  );
}
