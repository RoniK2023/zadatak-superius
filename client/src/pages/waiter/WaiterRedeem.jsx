import { useCallback, useState } from 'react';
import { ArrowLeft, Gift, UserRound } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Avatar } from '../../components/layout/AppShell.jsx';
import { QrScanner } from '../../components/QrScanner.jsx';
import { ResultPanel, ResultStats } from '../../components/ResultPanel.jsx';
import { LoyaltyBlocked, loyaltyBlocked, useWaiterContext } from '../../components/WaiterStatus.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { EmptyState, Notice } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { api } from '../../lib/api.js';
import { formatDay, formatPoints, pointsLabel } from '../../lib/format.js';

const BLOCKED_LABELS = {
  HAPPY_HOUR: 'Happy hour',
  LOCATION_NOT_IN_PROGRAM: 'Lokacija nije u programu',
  REWARD_INACTIVE: 'Neaktivna',
};

/** Redeem a reward: scan QR → balance + available rewards → confirm → result. */
export default function WaiterRedeem() {
  const toast = useToast();
  const context = useWaiterContext();
  const [code, setCode] = useState(null);
  const [data, setData] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [outcome, setOutcome] = useState(null); // { ok, reward, message }

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
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  const redeem = async () => {
    const reward = confirm;
    setRedeeming(true);
    try {
      const result = await api('/waiter/redeem', { method: 'POST', body: { qrToken: code, rewardId: reward.id } });
      setData((d) => ({ ...d, ...result }));
      setOutcome({ ok: true, reward: result.reward });
    } catch (err) {
      setOutcome({ ok: false, reward, message: err.message });
      lookup(code);
    } finally {
      setConfirm(null);
      setRedeeming(false);
    }
  };

  const reset = () => {
    setCode(null);
    setData(null);
    setScanError(null);
    setOutcome(null);
  };

  if (outcome) {
    return (
      <>
        <PageHeader title="Iskoristi nagradu" description="Skenirajte QR kod gosta, provjerite stanje i potvrdite nagradu." />
        {outcome.ok ? (
          <ResultPanel
            tone="success"
            eyebrow={data.guest.name}
            headline={outcome.reward.name}
            message={`−${outcome.reward.pointsCost} ${pointsLabel(outcome.reward.pointsCost)} · nagrada iskorištena`}
            actions={
              <>
                <Button variant="secondary" size="xl" icon={ArrowLeft} className="sm:flex-1" onClick={() => setOutcome(null)}>
                  Isti gost
                </Button>
                <Button size="xl" icon={UserRound} className="sm:flex-1" onClick={reset}>
                  Sljedeći gost
                </Button>
              </>
            }
          >
            <ResultStats
              items={[
                { label: 'Novo stanje', value: formatPoints(data.guest.balance) },
                data.guest.expiresOn && { label: 'Vrijede do', value: formatDay(data.guest.expiresOn) },
              ]}
            />
          </ResultPanel>
        ) : (
          <ResultPanel
            tone="danger"
            headline="Nagrada nije iskorištena"
            message={outcome.message}
            footnote="Pokušaj je zabilježen u logu aktivnosti."
            actions={
              <Button size="xl" block icon={ArrowLeft} onClick={() => setOutcome(null)}>
                Natrag na nagrade
              </Button>
            }
          />
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Iskoristi nagradu" description="Skenirajte QR kod gosta, provjerite stanje i potvrdite nagradu." />
      {loyaltyBlocked(context.data) ? (
        <LoyaltyBlocked context={context.data} />
      ) : !data ? (
        <Card className="mx-auto max-w-xl">
          <CardHeader title="Gost" description="QR kod iz aplikacije ili s PDF kartice." />
          <CardBody className="space-y-4 pt-1 sm:pt-1">
            {scanError && (
              <Notice tone="danger" title="Gost nije pronađen">
                {scanError}
              </Notice>
            )}
            <QrScanner onCode={lookup} busy={busy} submitLabel="Pronađi gosta" />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr] lg:items-start">
          <Card>
            <CardBody className="flex flex-col items-center py-8 text-center">
              <Avatar name={data.guest.name} className="h-14 w-14 text-sm" />
              <p className="mt-3 text-lg font-semibold text-ink">{data.guest.name}</p>
              <p className="mt-5 text-hero font-bold text-ink">{data.guest.balance}</p>
              <p className="text-sm font-medium text-ink-muted">važećih bodova</p>
              {data.guest.expiresOn && <p className="mt-3 text-xs text-ink-muted">Vrijede do {formatDay(data.guest.expiresOn)}</p>}
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
              <ul className="divide-y divide-line border-t border-line">
                {data.rewards.map((r) => (
                  <li key={r.id} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                      <Gift className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-ink">{r.name}</p>
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
          <dl className="grid grid-cols-3 gap-3 rounded-md border border-line bg-canvas p-4 text-center">
            <div>
              <dt className="text-xs font-medium text-ink-muted">Sada</dt>
              <dd className="mt-0.5 text-lg font-bold">{data.guest.balance}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-ink-muted">Nagrada</dt>
              <dd className="mt-0.5 text-lg font-bold text-accent">−{confirm.pointsCost}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-ink-muted">Nakon</dt>
              <dd className="mt-0.5 text-lg font-bold">{data.guest.balance - confirm.pointsCost}</dd>
            </div>
          </dl>
        )}
      </ConfirmDialog>
    </>
  );
}
