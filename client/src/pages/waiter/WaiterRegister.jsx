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
import { WaiterStatus, loyaltyBlocked, useWaiterContext } from '../../components/WaiterStatus.jsx';
import { api } from '../../lib/api.js';
import { cx, formatMoney, formatPoints, formatTime } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';

/** POS simulation: the waiter picks items from the price list and issues a receipt. */
export default function WaiterRegister() {
  const toast = useToast();
  const navigate = useNavigate();
  const context = useWaiterContext();
  const blocked = loyaltyBlocked(context.data);
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
        description="Cijene dolaze iz cjenika i ne mogu se mijenjati. U produkciji račun dolazi iz Superius POS-a."
        actions={<Badge tone="accent">Simulacija POS-a</Badge>}
      />
      <WaiterStatus context={context.data} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <Card>
          <CardHeader title="Cjenik" description="Dodirnite artikl za dodavanje na račun." />
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-4 sm:px-5" role="tablist" aria-label="Kategorije">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={category === c}
                onClick={() => setCategory(c)}
                className={cx(
                  'h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors sm:h-9',
                  category === c ? 'bg-accent text-white' : 'bg-subtle text-ink-muted hover:text-ink',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          {products.loading ? (
            <div className="grid grid-cols-2 gap-3 border-t border-line p-4 sm:grid-cols-3 sm:p-5">
              {Array.from({ length: 9 }, (_, i) => (
                <Skeleton key={i} className="h-24 rounded-md" />
              ))}
            </div>
          ) : products.error ? (
            <ErrorState error={products.error} onRetry={products.reload} />
          ) : visible.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Cjenik je prazan" description="Vlasnik još nije dodao artikle u cjenik." />
          ) : (
            <ul className="grid grid-cols-2 gap-3 border-t border-line p-4 sm:grid-cols-3 sm:p-5">
              {visible.map((p) => {
                const qty = cart[p.id];
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => change(p.id, 1)}
                      className={cx(
                        'relative flex h-full min-h-24 w-full flex-col justify-between rounded-md border p-3.5 text-left transition-colors',
                        qty ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong hover:bg-canvas',
                      )}
                    >
                      <span className="pr-7 text-sm font-semibold leading-snug text-ink">{p.name}</span>
                      <span className="mt-3 text-sm text-ink-muted">{formatMoney(p.priceCents)}</span>
                      {qty && (
                        <span className="absolute right-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-white">
                          {qty}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:sticky lg:top-10">
          <CardHeader title="Račun" description={itemCount ? `${itemCount} kom.` : 'Još nema artikala'} />
          {lines.length === 0 ? (
            <div className="border-t border-line px-5 py-8 text-center text-sm text-ink-muted">Dodajte artikle iz cjenika.</div>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center gap-2 py-1.5 pl-4 pr-2 sm:pl-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{l.name}</p>
                    <p className="text-xs text-ink-muted">
                      {l.quantity} × {formatMoney(l.priceCents)}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" aria-label={`Smanji ${l.name}`} onClick={() => change(l.id, -1)}>
                      {l.quantity === 1 ? <Trash2 className="h-4 w-4" aria-hidden /> : <Minus className="h-4 w-4" aria-hidden />}
                    </Button>
                    <span className="w-6 text-center text-sm font-bold">{l.quantity}</span>
                    <Button variant="ghost" size="icon" aria-label={`Povećaj ${l.name}`} onClick={() => change(l.id, 1)}>
                      <Plus className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="hidden border-t border-line p-5 lg:block">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-sm font-medium text-ink-muted">Ukupno</span>
              <span className="text-xl font-bold text-ink">{formatMoney(totalCents)}</span>
            </div>
            <Button size="xl" block disabled={!lines.length} loading={issuing} onClick={issue} icon={ReceiptText}>
              Izdaj račun
            </Button>
          </div>
        </Card>
      </div>

      <TodayReceipts receipts={receipts} blocked={blocked} onAward={(id) => navigate(`/konobar/bodovi?racun=${id}`)} />

      {/* Mobile: total + primary action within thumb reach, above the bottom navigation */}
      {lines.length > 0 && <div className="h-20 lg:hidden" aria-hidden />}
      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-line bg-surface px-4 py-3 shadow-modal lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-4">
            <div className="min-w-0">
              <p className="text-xs text-ink-muted">{itemCount} kom.</p>
              <p className="text-lg font-bold text-ink">{formatMoney(totalCents)}</p>
            </div>
            <Button size="xl" className="flex-1" loading={issuing} onClick={issue} icon={ReceiptText}>
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
            {!issued?.isHappyHour && !blocked && (
              <Button
                size="lg"
                icon={ScanLine}
                data-autofocus
                className="sm:h-11 sm:text-sm"
                onClick={() => navigate(`/konobar/bodovi?racun=${issued.id}`)}
              >
                Dodaj bodove gostu
              </Button>
            )}
          </>
        }
      >
        {issued?.isHappyHour ? (
          <Notice tone="warning">Račun je izdan u happy houru i ne nosi bodove.</Notice>
        ) : blocked ? (
          <Notice tone="warning">Bodovi se trenutno ne mogu dodijeliti.</Notice>
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

const PREVIEW = 6;

function TodayReceipts({ receipts, onAward, blocked }) {
  const [showAll, setShowAll] = useState(false);
  const list = receipts.data ?? [];
  const visible = showAll ? list : list.slice(0, PREVIEW);
  return (
    <Card className="mt-6">
      <CardHeader title="Današnji računi" description="Izdani danas na ovoj lokaciji." />
      {receipts.loading ? (
        <SkeletonList rows={3} />
      ) : receipts.error ? (
        <ErrorState error={receipts.error} onRetry={receipts.reload} />
      ) : receipts.data.length === 0 ? (
        <EmptyState icon={ReceiptText} title="Danas još nema računa" description="Izdani računi pojavit će se ovdje." />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {visible.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  #{r.number} <span className="font-normal text-ink-muted">· {formatTime(r.paidAt)}</span>
                </p>
                <p className="truncate text-xs text-ink-muted">{r.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
              </div>
              <span className="text-sm font-semibold text-ink">{formatMoney(r.totalCents)}</span>
              <span className="flex w-full justify-end sm:w-40">
                {r.awarded ? (
                  <Badge tone="success">
                    {r.awarded.guestName.split(' ')[0]} · +{r.awarded.points}
                  </Badge>
                ) : r.isHappyHour ? (
                  <Badge tone="warning">Happy hour</Badge>
                ) : blocked ? (
                  <Badge>Čeka bodove</Badge>
                ) : (
                  <Button variant="secondary" size="sm" icon={ScanLine} onClick={() => onAward(r.id)}>
                    Dodaj bodove
                  </Button>
                )}
              </span>
            </li>
          ))}
          {list.length > PREVIEW && (
            <li className="p-3 text-center">
              <Button variant="ghost" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Prikaži manje' : `Prikaži sve (${list.length})`}
              </Button>
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
