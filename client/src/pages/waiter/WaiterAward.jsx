import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, ReceiptText, RotateCw } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { QrScanner } from '../../components/QrScanner.jsx';
import { ResultPanel, ResultStats } from '../../components/ResultPanel.jsx';
import { LoyaltyBlocked, loyaltyBlocked, useWaiterContext } from '../../components/WaiterStatus.jsx';
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
  const context = useWaiterContext();
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
        if (data.expiredPoints > 0) toast.warning('Stari bodovi su istekli', `${formatPoints(data.expiredPoints)} je resetirano prije dodjele.`);
        receipts.reload({ silent: true });
      } catch (err) {
        setResult({ ok: false, code: err.code, message: err.message, receipt: selected });
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
      <PageHeader title="Dodaj bodove" description="Odaberite današnji račun i skenirajte QR kod gosta. Bodovi se računaju automatski iz računa." />
      {result ? (
        <AwardResult result={result} onNext={reset} onRetry={() => setResult(null)} />
      ) : loyaltyBlocked(context.data) ? (
        <LoyaltyBlocked context={context.data} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <Card>
            <CardHeader title={<StepTitle n={1}>Račun</StepTitle>} description="Današnji računi bez dodijeljenih bodova." />
            {receipts.loading ? (
              <SkeletonList rows={3} />
            ) : receipts.error ? (
              <ErrorState error={receipts.error} onRetry={receipts.reload} />
            ) : receipts.data.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="Nema otvorenih računa"
                description="Svi današnji računi su bodovani. Izdajte novi račun na blagajni."
                action={<ButtonLink to="/konobar/blagajna">Na blagajnu</ButtonLink>}
              />
            ) : (
              <ul className="space-y-2 px-4 pb-4 sm:px-5 sm:pb-5" role="radiogroup" aria-label="Računi">
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
                          active ? 'border-accent bg-accent-soft ring-1 ring-accent' : 'border-line hover:border-line-strong hover:bg-canvas',
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
                          <span className="block text-base font-bold text-ink">
                            #{r.number} <span className="text-sm font-medium text-ink-muted">· {formatTime(r.paidAt)}</span>
                          </span>
                          <span className="block truncate text-xs text-ink-muted">
                            {r.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block text-base font-bold text-ink">{formatMoney(r.totalCents)}</span>
                          {r.isHappyHour ? (
                            <Badge tone="warning">Happy hour</Badge>
                          ) : (
                            <span className="text-xs font-medium text-ink-muted">{formatPoints(r.estimatedPoints)}</span>
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
              title={<StepTitle n={2}>Gost</StepTitle>}
              description={selected ? `Račun #${selected.number} · ${formatMoney(selected.totalCents)}` : 'Najprije odaberite račun.'}
            />
            <CardBody className="pt-1 sm:pt-1">
              <QrScanner onCode={award} busy={busy} disabled={!selected} submitLabel="Dodaj bodove" />
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}

function StepTitle({ n, children }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">{n}</span>
      {children}
    </span>
  );
}

function AwardResult({ result, onNext, onRetry }) {
  if (result.ok) {
    const zero = result.points === 0;
    return (
      <ResultPanel
        tone="success"
        eyebrow={result.guest.name}
        headline={`+${result.points}`}
        headlineSuffix={pointsLabel(result.points)}
        message={zero ? 'Račun ne nosi bodove — posjet je zabilježen.' : 'Bodovi su dodijeljeni.'}
        actions={
          <Button size="xl" block icon={ArrowRight} onClick={onNext}>
            Sljedeći račun
          </Button>
        }
      >
        <ResultStats
          items={[
            { label: 'Novo stanje', value: formatPoints(result.guest.balance) },
            { label: 'Račun', value: `#${result.receipt.number} · ${formatMoney(result.receipt.totalCents)}` },
            result.guest.expiresOn && { label: 'Bodovi vrijede do', value: formatDay(result.guest.expiresOn), wide: true },
          ]}
        />
      </ResultPanel>
    );
  }

  return (
    <ResultPanel
      tone="danger"
      headline="Bodovi nisu dodijeljeni"
      message={result.message}
      footnote="Pokušaj je zabilježen u logu aktivnosti."
      actions={
        <>
          {result.code === 'GUEST_NOT_FOUND' && (
            <Button variant="secondary" size="xl" icon={RotateCw} className="sm:flex-1" onClick={onRetry}>
              Skeniraj ponovno
            </Button>
          )}
          <Button size="xl" className="sm:flex-1" onClick={onNext}>
            Natrag na račune
          </Button>
        </>
      }
    >
      {result.receipt && (
        <ResultStats items={[{ label: 'Račun', value: `#${result.receipt.number} · ${formatMoney(result.receipt.totalCents)}`, wide: true }]} />
      )}
    </ResultPanel>
  );
}
