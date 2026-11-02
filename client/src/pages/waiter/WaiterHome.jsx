import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Gift, ReceiptText, ScanLine } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { WaiterStatus, loyaltyBlocked, useWaiterContext } from '../../components/WaiterStatus.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Skeleton } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { cx, formatMoney } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';

const greeting = () => {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zagreb', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  if (h < 12) return 'Dobro jutro';
  if (h < 18) return 'Dobar dan';
  return 'Dobra večer';
};

/** Waiter home — three big, high-contrast actions for a busy shift. */
export default function WaiterHome() {
  const { user } = useAuth();
  const context = useWaiterContext();
  const blocked = loyaltyBlocked(context.data);
  const blockedNote = context.data?.happyHour.active ? `Happy hour do ${context.data.happyHour.end}` : 'Lokacija nije u programu';
  const receipts = useApi('/waiter/receipts');

  const list = receipts.data ?? [];
  const open = list.filter((r) => !r.awarded && !r.isHappyHour).length;
  const awarded = list.filter((r) => r.awarded).length;
  const turnover = list.reduce((s, r) => s + r.totalCents, 0);
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <>
      <PageHeader
        title="Početna"
        description={`${greeting()}, ${firstName}. Lokacija: ${user?.location?.name ?? '—'}.`}
      />
      <WaiterStatus context={context.data} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <ActionTile
          to="/konobar/bodovi"
          icon={ScanLine}
          title="Dodaj bodove"
          text="Odaberi račun i skeniraj QR gosta"
          meta={receipts.loading ? null : open ? `${open} ${open === 1 ? 'račun čeka' : 'računa čeka'} bodove` : 'Svi računi su bodovani'}
          primary
          disabled={blocked && blockedNote}
        />
        <ActionTile to="/konobar/blagajna" icon={ReceiptText} title="Blagajna" text="Izdaj račun iz cjenika (simulacija POS-a)" />
        <ActionTile
          to="/konobar/nagrade"
          icon={Gift}
          title="Iskoristi nagradu"
          text="Skeniraj QR i potvrdi nagradu"
          disabled={blocked && blockedNote}
        />
      </div>

      <Card className="mt-6">
        <dl className="grid grid-cols-3 divide-x divide-line">
          {[
            ['Računa danas', list.length],
            ['Bodovano', awarded],
            ['Promet', formatMoney(turnover)],
          ].map(([label, value]) => (
            <div key={label} className="px-4 py-4 sm:px-6 sm:py-5">
              <dt className="text-xs font-medium text-ink-muted">{label}</dt>
              <dd className="mt-1 text-lg font-semibold text-ink sm:text-xl">
                {receipts.loading ? <Skeleton className="h-7 w-16" /> : value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}

function ActionTile({ to, icon: Icon, title, text, meta, primary = false, disabled = false }) {
  const content = (
    <>
      <span
        className={cx(
          'flex h-14 w-14 shrink-0 items-center justify-center rounded-lg',
          disabled ? 'bg-subtle text-ink-faint' : primary ? 'bg-white/15 text-white' : 'bg-accent-soft text-accent',
        )}
      >
        <Icon className="h-7 w-7" strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 sm:flex-none">
        <span className="flex items-center gap-2 text-lg font-bold sm:text-xl">
          {title}
          {!disabled && <ArrowRight className="h-5 w-5 opacity-60 transition-transform group-hover:translate-x-0.5" aria-hidden />}
        </span>
        <span className={cx('mt-1 block text-sm', primary && !disabled ? 'text-white/80' : 'text-ink-muted')}>{text}</span>
        {disabled ? (
          <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-warning">
            <Clock className="h-4 w-4" aria-hidden />
            {disabled}
          </span>
        ) : (
          meta && <span className={cx('mt-2 block text-sm font-semibold', primary ? 'text-white' : 'text-accent')}>{meta}</span>
        )}
      </span>
    </>
  );
  const base =
    'flex min-h-28 items-center gap-4 rounded-xl border p-5 sm:min-h-48 sm:flex-col sm:items-start sm:justify-between sm:p-6';

  if (disabled) {
    return (
      <div aria-disabled="true" className={cx(base, 'cursor-not-allowed border-line bg-subtle text-ink-muted')}>
        {content}
      </div>
    );
  }
  return (
    <Link
      to={to}
      className={cx(
        base,
        'group transition-colors',
        primary ? 'border-accent bg-accent text-white hover:bg-accent-hover' : 'border-line-strong bg-surface text-ink shadow-card hover:border-accent',
      )}
    >
      {content}
    </Link>
  );
}
