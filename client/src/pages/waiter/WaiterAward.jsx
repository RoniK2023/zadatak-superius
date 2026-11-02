import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ReceiptText, RotateCw, XCircle } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { QrScanner } from '../../components/QrScanner.jsx';
import { WaiterStatus } from '../../components/WaiterStatus.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button, ButtonLink } from '../../components/ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { api } from '../../lib/api.js';
import { cx, formatDay, formatMoney, formatPoints, formatTime, pointsLabel } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';

/** Award points: pick today's receipt → scan the guest's QR → result. */
export default function WaiterAward() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const context = useApi('/waiter/context');
  const receipts = useApi('/waiter/receipts', { status: 'open' });
  const [selectedId, setSelectedId] = useState(params.get('racun'));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { ok, ... }

  const selected = receipts.data?.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    // Drop a preselected receipt that is no longer open (e.g. already awarded).
    if (receipts.data && selectedId && !receipts.data.some((r) => r.id === selectedId) && !result) setSelectedId(null);
  }, [receipts.data, selectedId, result]);

  const choose = (id) => {
    setSelectedId(id);
    setResult(null);
    setParams(id ? { racun: id } : {}, { replace: true });
  };

  const award = useCallback(
    async (qrToken) => {
      if (!selected) return;
      setBusy(true);
      try {
        const data = await api('/waiter/award', { method: 'POST', body: { receiptId: selected.id, qrToken } });
        setResult({ ok: true, ...data });
        if (data.points > 0) toast.success(`+${formatPoints(data.points)} za ${data.guest.name}`, `Novo stanje: ${formatPoints(data.guest.balance)}`);
        else toast.info(`${data.guest.name}: račun ne nosi bodove`, 'Posjet je zabilježen.');
        if (data.expiredPoints > 0) toast.warning('Stari bodovi su istekli', `${formatPoints(data.expiredPoints)} je resetirano prije dodjele.`);
        receipts.reload({ silent: true });
      } catch (err) {
        setResult({ ok: false, code: err.code, message: err.message, guestName: err.fields?.guestName });
        toast.error('Bodovi nisu dodijeljeni', err.message);
        receipts.reload({ silent: true });
      } finally {
        setBusy(false);
      }
    },
    [selected, toast, receipts],
  );

  const reset = () => {
    setResult(null);
    choose(null);
  };

  return (
    <>
      <PageHeader title="Dodjela bodova" description="Odaberite današnji račun i skenirajte QR kod gosta. Bodovi se računaju automatski." />
      <div className="mb-5">
        <WaiterStatus context={context.data} mode="earn" />
      </div>

      {result ? (
        <AwardResult result={result} receipt={selected} onNext={reset} onRetry={() => setResult(null)} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <Card>
            <CardHeader title="1. Račun" description="Današnji računi bez dodijeljenih bodova." />
            {receipts.loading ? (
              <SkeletonList rows={3} />
            ) : receipts.error ? (
              <ErrorState error={receipts.error} onRetry={receipts.reload} />
            ) : receipts.data.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="Nema otvorenih računa"
                description="Svi današnji računi su bodovani. Izdajte novi račun na blagajni."
                action={<ButtonLink to="/konobar">Na blagajnu</ButtonLink>}
              />
            ) : (
              <ul className="space-y-2 p-3 sm:p-4" role="radiogroup" aria-label="Računi">
                {receipts.data.map((r) => {
                  const active = r.id === selectedId;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => choose(active ? null : r.id)}
                        className={cx(
                          'flex min-h-16 w-full items-center gap-4 rounded-md border px-4 py-3 text-left transition-colors',
                          active ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong hover:bg-canvas',
                        )}
                      >
                        <span
                          className={cx(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                            active ? 'border-accent' : 'border-line-strong',
                          )}
                          aria-hidden
                        >
                          {active && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold text-ink">
                            #{r.number} <span className="text-sm font-normal text-ink-muted">· {formatTime(r.paidAt)}</span>
                          </span>
                          <span className="block truncate text-xs text-ink-muted">
                            {r.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block text-base font-semibold tabular text-ink">{formatMoney(r.totalCents)}</span>
                          {r.isHappyHour ? (
                            <Badge tone="warning">Happy hour</Badge>
                          ) : (
                            <span className="text-xs text-ink-muted">{formatPoints(r.estimatedPoints)}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="2. Gost"
              description={selected ? `Račun #${selected.number} · ${formatMoney(selected.totalCents)}` : 'Najprije odaberite račun.'}
            />
            <CardBody>
              <QrScanner onCode={award} busy={busy} disabled={!selected} submitLabel="Dodijeli bodove" />
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}

function AwardResult({ result, receipt, onNext, onRetry }) {
  if (result.ok) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardBody className="flex flex-col items-center py-10 text-center sm:py-12">
          <CheckCircle2 className="h-12 w-12 text-success" strokeWidth={1.75} aria-hidden />
          <p className="mt-4 text-sm font-medium text-ink-muted">{result.guest.name}</p>
          <p className="mt-1 text-5xl font-semibold tabular text-ink">+{result.points}</p>
          <p className="mt-1 text-base text-ink-muted">{result.points === 0 ? 'Račun ne nosi bodove' : `${pointsLabel(result.points)} dodijeljeno`}</p>
          <dl className="mt-8 grid w-full grid-cols-2 gap-4 border-t border-line pt-6 text-left text-sm">
            <div>
              <dt className="text-ink-muted">Novo stanje</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular text-ink">{formatPoints(result.guest.balance)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Račun</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular text-ink">
                #{result.receipt.number} · {formatMoney(result.receipt.totalCents)}
              </dd>
            </div>
            {result.guest.expiresOn && (
              <div className="col-span-2">
                <dt className="text-ink-muted">Bodovi vrijede do</dt>
                <dd className="mt-0.5 text-ink">{formatDay(result.guest.expiresOn)}</dd>
              </div>
            )}
          </dl>
          <Button size="lg" block className="mt-8" onClick={onNext}>
            Sljedeći račun
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardBody className="flex flex-col items-center py-10 text-center sm:py-12">
        <XCircle className="h-12 w-12 text-danger" strokeWidth={1.75} aria-hidden />
        <h2 className="mt-4 text-xl font-semibold text-ink">Bodovi nisu dodijeljeni</h2>
        <p className="mt-2 max-w-sm text-base text-ink-muted">{result.message}</p>
        {receipt && <p className="mt-1 text-sm text-ink-muted">Račun #{receipt.number}</p>}
        <p className="mt-4 text-xs text-ink-faint">Pokušaj je zabilježen u logu aktivnosti.</p>
        <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row">
          {result.code === 'GUEST_NOT_FOUND' && receipt && (
            <Button variant="secondary" size="lg" icon={RotateCw} className="flex-1" onClick={onRetry}>
              Skeniraj ponovno
            </Button>
          )}
          <Button size="lg" icon={ArrowLeft} className="flex-1" onClick={onNext}>
            Natrag na račune
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
