import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarClock, ChevronRight, Clock, Download, Sun } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { QrCode } from '../../components/QrCode.jsx';
import { describeDays } from '../../components/WaiterStatus.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import { ErrorState, Notice, Skeleton } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { api } from '../../lib/api.js';
import { formatDay, formatPoints, pointsLabel } from '../../lib/format.js';
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

  const nextReward = data?.rewards.find((r) => r.missing > 0);
  const available = data?.rewards.filter((r) => r.missing === 0) ?? [];

  return (
    <>
      <PageHeader title="Moja kartica" description={data ? data.tenant.name : ' '} />

      {location.state?.welcome && (
        <Notice tone="success" title="Dobro došli u program!" className="mb-5">
          Pokažite ovaj QR kod konobaru uz svaki račun i skupljajte bodove.
        </Notice>
      )}
      {data?.happyHour.active && (
        <Notice tone="warning" icon={Clock} title="Happy hour je u tijeku" className="mb-5">
          Do {data.happyHour.end} računi ne nose bodove i nagrade se ne mogu iskoristiti.
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start">
        {/* QR — large, centered, black on white */}
        <Card className="bg-white">
          <CardBody className="flex flex-col items-center py-6 sm:py-8">
            <div className="w-full max-w-xs">
              {loading ? <Skeleton className="aspect-square w-full" /> : <QrCode value={data.qrToken} label="Vaš QR kod za skupljanje bodova" />}
            </div>
            {loading ? (
              <Skeleton className="mt-5 h-6 w-48" />
            ) : (
              <>
                <p className="mt-5 font-mono text-xl font-semibold tracking-widest text-ink">{data.qrToken}</p>
                <p className="mt-1 text-sm text-ink-muted">{data.name}</p>
              </>
            )}
            <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-muted">
              <Sun className="h-3.5 w-3.5" aria-hidden />
              Pojačajte svjetlinu zaslona za brže skeniranje.
            </p>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <p className="text-sm font-medium text-ink-muted">Stanje bodova</p>
              {loading ? (
                <Skeleton className="mt-2 h-12 w-32" />
              ) : (
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-5xl font-semibold tabular text-ink">{data.balance}</span>
                  <span className="text-lg text-ink-muted">{pointsLabel(data.balance)}</span>
                </p>
              )}
              {!loading && (
                <div className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-sm">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                  <div>
                    {data.expiresOn ? (
                      <p className="text-ink">
                        Bodovi vrijede do <span className="font-semibold">{formatDay(data.expiresOn)}</span>
                      </p>
                    ) : (
                      <p className="text-ink">Trenutno nemate bodova koji ističu.</p>
                    )}
                    {data.expiryRule && <p className="mt-0.5 text-ink-muted">{data.expiryRule}</p>}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {!loading && (
            <Card>
              <CardBody>
                {available.length > 0 ? (
                  <>
                    <p className="text-sm font-medium text-success">Možete iskoristiti</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{available.map((r) => r.name).join(', ')}</p>
                    <p className="mt-1 text-sm text-ink-muted">Recite konobaru koju nagradu želite i pokažite QR kod.</p>
                  </>
                ) : nextReward ? (
                  <>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-ink-muted">Sljedeća nagrada</p>
                      <p className="text-sm tabular text-ink-muted">
                        {data.balance} / {nextReward.pointsCost}
                      </p>
                    </div>
                    <p className="mt-1 text-lg font-semibold text-ink">{nextReward.name}</p>
                    <ProgressBar value={nextReward.progress} label={`Napredak do nagrade ${nextReward.name}`} />
                    <p className="mt-2 text-sm text-ink-muted">Nedostaje još {formatPoints(nextReward.missing)}.</p>
                  </>
                ) : (
                  <p className="text-sm text-ink-muted">Trenutno nema aktivnih nagrada.</p>
                )}
                <Link
                  to="/gost/nagrade"
                  className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent hover:underline"
                >
                  Sve nagrade <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-ink">Kartica za spremanje</p>
                <p className="text-sm text-ink-muted">PDF s vašim QR kodom — konobar ga skenira kao i ovaj zaslon.</p>
              </div>
              <Button variant="secondary" icon={Download} loading={downloading} onClick={download} disabled={loading}>
                Preuzmi PDF
              </Button>
            </CardBody>
          </Card>

          {!loading && data.happyHour.enabled && !data.happyHour.active && (
            <p className="text-xs text-ink-muted">
              Happy hour: {describeDays(data.happyHour.days)} {data.happyHour.start}–{data.happyHour.end} — tada nema bodova ni nagrada.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export function ProgressBar({ value, label }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className="mt-3 h-2 w-full overflow-hidden rounded-full bg-subtle"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
