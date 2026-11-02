import { useCallback, useState } from 'react';
import { Gift, UserRound } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { QrScanner } from '../../components/QrScanner.jsx';
import { WaiterStatus } from '../../components/WaiterStatus.jsx';
import { Avatar } from '../../components/layout/AppShell.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { EmptyState, Notice } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { api } from '../../lib/api.js';
import { formatDay, formatPoints } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';

const BLOCKED_LABELS = {
  HAPPY_HOUR: 'Happy hour',
  LOCATION_NOT_IN_PROGRAM: 'Lokacija nije u programu',
  REWARD_INACTIVE: 'Neaktivna',
};

/** Redeem a reward: scan QR → balance + available rewards → confirm. */
export default function WaiterRedeem() {
  const toast = useToast();
  const context = useApi('/waiter/context');
  const [code, setCode] = useState(null);
  const [data, setData] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [redeeming, setRedeeming] = useState(false);

  const lookup = useCallback(
    async (qrToken) => {
      setBusy(true);
      setScanError(null);
      try {
        const result = await api('/waiter/guests/lookup', { method: 'POST', body: { qrToken } });
        setCode(qrToken);
        setData(result);
        if (result.expiredPoints > 0) {
          toast.warning('Bodovi su istekli', `${result.guest.name}: ${formatPoints(result.expiredPoints)} resetirano na 0.`);
        }
      } catch (err) {
        setScanError(err.message);
        toast.error('Gost nije pronađen', err.message);
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  const redeem = async () => {
    setRedeeming(true);
    try {
      const result = await api('/waiter/redeem', { method: 'POST', body: { qrToken: code, rewardId: confirm.id } });
      setData((d) => ({ ...d, ...result }));
      toast.success(`Nagrada iskorištena: ${result.reward.name}`, `${result.guest.name} · novo stanje ${formatPoints(result.guest.balance)}`);
      setConfirm(null);
    } catch (err) {
      toast.error('Nagrada nije iskorištena', err.message);
      setConfirm(null);
      lookup(code);
    } finally {
      setRedeeming(false);
    }
  };

  const reset = () => {
    setCode(null);
    setData(null);
    setScanError(null);
  };

  return (
    <>
      <PageHeader title="Iskorištavanje nagrade" description="Skenirajte QR kod gosta, provjerite stanje i potvrdite nagradu." />
      <div className="mb-5">
        <WaiterStatus context={context.data} mode="redeem" />
      </div>

      {!data ? (
        <Card className="mx-auto max-w-xl">
          <CardHeader title="Gost" description="Skenirajte QR kod iz aplikacije ili s PDF kartice." />
          <CardBody className="space-y-4">
            {scanError && <Notice tone="danger">{scanError}</Notice>}
            <QrScanner onCode={lookup} busy={busy} submitLabel="Pronađi gosta" />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr] lg:items-start">
          <Card>
            <CardBody className="flex flex-col items-center text-center">
              <Avatar name={data.guest.name} className="h-14 w-14 text-base" />
              <p className="mt-3 text-lg font-semibold text-ink">{data.guest.name}</p>
              <p className="mt-4 text-5xl font-semibold tabular text-ink">{data.guest.balance}</p>
              <p className="text-sm text-ink-muted">važećih bodova</p>
              {data.guest.expiresOn && (
                <p className="mt-3 text-xs text-ink-muted">Vrijede do {formatDay(data.guest.expiresOn)}</p>
              )}
              <Button variant="secondary" size="lg" block icon={UserRound} className="mt-6" onClick={reset}>
                Drugi gost
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Nagrade" description="Nagrada se može iskoristiti samo uz dovoljno važećih bodova." />
            {data.rewards.length === 0 ? (
              <EmptyState icon={Gift} title="Nema aktivnih nagrada" description="Vlasnik još nije definirao nagrade." />
            ) : (
              <ul className="divide-y divide-line">
                {data.rewards.map((r) => (
                  <li key={r.id} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-subtle text-ink-muted">
                      <Gift className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{r.name}</p>
                      <p className="text-sm text-ink-muted">{formatPoints(r.pointsCost)}</p>
                    </div>
                    {r.canRedeem ? (
                      <Button size="lg" onClick={() => setConfirm(r)}>
                        Iskoristi
                      </Button>
                    ) : r.blockedReason === 'INSUFFICIENT_POINTS' ? (
                      <Badge>Nedostaje {formatPoints(r.missing)}</Badge>
                    ) : (
                      <Badge tone="warning">{BLOCKED_LABELS[r.blockedReason] ?? 'Nije dostupno'}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={redeem}
        loading={redeeming}
        title={`Iskoristiti nagradu „${confirm?.name}”?`}
        description="Ova radnja se ne može poništiti."
        confirmLabel={`Iskoristi · −${confirm?.pointsCost ?? 0}`}
      >
        {confirm && data && (
          <dl className="grid grid-cols-3 gap-3 rounded-md bg-canvas p-4 text-center text-sm">
            <div>
              <dt className="text-ink-muted">Sada</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">{data.guest.balance}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Nagrada</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular text-accent">−{confirm.pointsCost}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Nakon</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">{data.guest.balance - confirm.pointsCost}</dd>
            </div>
          </dl>
        )}
      </ConfirmDialog>
    </>
  );
}
