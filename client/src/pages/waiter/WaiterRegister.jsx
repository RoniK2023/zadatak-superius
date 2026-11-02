import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, ReceiptText, ScanLine, ShoppingBag, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { EmptyState, ErrorState, Notice, Skeleton, SkeletonList } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { WaiterStatus } from '../../components/WaiterStatus.jsx';
import { api } from '../../lib/api.js';
import { cx, formatMoney, formatPoints, formatTime } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';

/** POS simulation: the waiter picks items from the price list and issues a receipt. */
export default function WaiterRegister() {
  const toast = useToast();
  const navigate = useNavigate();
  const context = useApi('/waiter/context');
  const products = useApi('/waiter/products');
  const receipts = useApi('/waiter/receipts');
  const [cart, setCart] = useState({}); // productId -> quantity
  const [category, setCategory] = useState('Sve');
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState(null);

  const categories = useMemo(() => ['Sve', ...new Set((products.data ?? []).map((p) => p.category))], [products.data]);
  const visible = (products.data ?? []).filter((p) => category === 'Sve' || p.category === category);
  const lines = (products.data ?? []).filter((p) => cart[p.id]).map((p) => ({ ...p, quantity: cart[p.id] }));
  const totalCents = lines.reduce((s, l) => s + l.quantity * l.priceCents, 0);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  const change = (id, delta) =>
    setCart((c) => {
      const q = Math.max(0, Math.min(50, (c[id] ?? 0) + delta));
      const next = { ...c, [id]: q };
      if (!q) delete next[id];
      return next;
    });

  const issue = async () => {
    setIssuing(true);
    try {
      const receipt = await api('/waiter/receipts', {
        method: 'POST',
        body: { items: lines.map((l) => ({ productId: l.id, quantity: l.quantity })) },
      });
      setCart({});
      setIssued(receipt);
      receipts.reload({ silent: true });
      toast.success(`Račun #${receipt.number} izdan`, formatMoney(receipt.totalCents));
    } catch (err) {
      toast.error('Račun nije izdan', err.message);
    } finally {
      setIssuing(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Blagajna"
        description="Simulacija blagajne — u produkciji račun dolazi iz Superius POS-a. Cijene su iz cjenika i ne mogu se mijenjati."
      />
      <div className="mb-5 space-y-3">
        <WaiterStatus context={context.data} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <Card>
          <CardHeader title="Cjenik" description="Dodirnite artikl za dodavanje na račun." />
          <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-line px-4 py-3 sm:px-5" role="tablist" aria-label="Kategorije">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={category === c}
                onClick={() => setCategory(c)}
                className={cx(
                  'h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors',
                  category === c ? 'border-ink bg-ink text-white' : 'border-line-strong bg-surface text-ink-muted hover:text-ink',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          {products.loading ? (
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5">
              {Array.from({ length: 9 }, (_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : products.error ? (
            <ErrorState error={products.error} onRetry={products.reload} />
          ) : visible.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Cjenik je prazan" description="Vlasnik još nije dodao artikle u cjenik." />
          ) : (
            <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5">
              {visible.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => change(p.id, 1)}
                    className={cx(
                      'relative flex h-full min-h-24 w-full flex-col justify-between rounded-md border p-3 text-left transition-colors',
                      cart[p.id] ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong hover:bg-canvas',
                    )}
                  >
                    <span className="pr-6 text-sm font-medium leading-snug text-ink">{p.name}</span>
                    <span className="mt-2 text-sm tabular text-ink-muted">{formatMoney(p.priceCents)}</span>
                    {cart[p.id] && (
                      <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-white">
                        {cart[p.id]}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:sticky lg:top-10">
          <CardHeader title="Račun" description={itemCount ? `${itemCount} kom.` : 'Prazan'} />
          {lines.length === 0 ? (
            <EmptyState icon={ReceiptText} title="Nema artikala" description="Dodajte artikle iz cjenika." className="py-8" />
          ) : (
            <ul className="divide-y divide-line">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-2 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{l.name}</p>
                    <p className="text-xs tabular text-ink-muted">
                      {l.quantity} × {formatMoney(l.priceCents)}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" aria-label={`Smanji ${l.name}`} onClick={() => change(l.id, -1)}>
                      {l.quantity === 1 ? <Trash2 className="h-4 w-4" aria-hidden /> : <Minus className="h-4 w-4" aria-hidden />}
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold tabular">{l.quantity}</span>
                    <Button variant="ghost" size="icon" aria-label={`Povećaj ${l.name}`} onClick={() => change(l.id, 1)}>
                      <Plus className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="hidden border-t border-line p-4 sm:p-5 lg:block">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-sm text-ink-muted">Ukupno</span>
              <span className="text-2xl font-semibold tabular text-ink">{formatMoney(totalCents)}</span>
            </div>
            <Button size="lg" block disabled={!lines.length} loading={issuing} onClick={issue} icon={ReceiptText}>
              Izdaj račun
            </Button>
          </div>
        </Card>
      </div>

      <TodayReceipts receipts={receipts} onAward={(id) => navigate(`/konobar/bodovi?racun=${id}`)} />

      {/* Mobile: total + primary action within thumb reach, above the bottom navigation */}
      {lines.length > 0 && <div className="h-20 lg:hidden" aria-hidden />}
      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-line bg-surface px-4 py-3 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-4">
            <div className="min-w-0">
              <p className="text-xs text-ink-muted">{itemCount} kom.</p>
              <p className="text-lg font-semibold tabular text-ink">{formatMoney(totalCents)}</p>
            </div>
            <Button size="lg" className="flex-1" loading={issuing} onClick={issue} icon={ReceiptText}>
              Izdaj račun
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(issued)}
        onClose={() => setIssued(null)}
        title={issued ? `Račun #${issued.number} izdan` : ''}
        description={issued ? `${formatTime(issued.paidAt)} · ${formatMoney(issued.totalCents)}` : ''}
        footer={
          <>
            <Button variant="secondary" size="lg" onClick={() => setIssued(null)} className="sm:h-11 sm:text-sm">
              Novi račun
            </Button>
            <Button
              size="lg"
              icon={ScanLine}
              data-autofocus
              className="sm:h-11 sm:text-sm"
              onClick={() => navigate(`/konobar/bodovi?racun=${issued.id}`)}
            >
              Dodijeli bodove gostu
            </Button>
          </>
        }
      >
        {issued?.isHappyHour ? (
          <Notice tone="warning">Račun je izdan u happy houru i ne nosi bodove.</Notice>
        ) : (
          <p className="text-sm text-ink-muted">
            Ako je gost član programa, skenirajte njegov QR kod. Ovaj račun nosi{' '}
            <span className="font-semibold text-ink">{formatPoints(issued?.estimatedPoints ?? 0)}</span>.
          </p>
        )}
      </Modal>
    </>
  );
}

function TodayReceipts({ receipts, onAward }) {
  return (
    <Card className="mt-6">
      <CardHeader title="Današnji računi" description="Računi izdani danas na ovoj lokaciji." />
      {receipts.loading ? (
        <SkeletonList rows={3} />
      ) : receipts.error ? (
        <ErrorState error={receipts.error} onRetry={receipts.reload} />
      ) : receipts.data.length === 0 ? (
        <EmptyState icon={ReceiptText} title="Danas još nema računa" description="Izdani računi pojavit će se ovdje." />
      ) : (
        <ul className="divide-y divide-line">
          {receipts.data.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">
                  #{r.number} <span className="font-normal text-ink-muted">· {formatTime(r.paidAt)}</span>
                </p>
                <p className="truncate text-xs text-ink-muted">{r.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
              </div>
              <span className="text-sm font-semibold tabular text-ink">{formatMoney(r.totalCents)}</span>
              {r.awarded ? (
                <Badge tone="success">
                  {r.awarded.guestName} · +{r.awarded.points}
                </Badge>
              ) : r.isHappyHour ? (
                <Badge tone="warning">Happy hour</Badge>
              ) : (
                <Button variant="secondary" onClick={() => onAward(r.id)}>
                  Dodijeli bodove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
