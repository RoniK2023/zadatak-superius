import { Gift, Hourglass, Plus } from 'lucide-react';
import { cx, formatDateTime, formatMoney } from '../../lib/format.js';

const TYPES = {
  EARN: {
    icon: Plus,
    circle: 'bg-success-soft text-success ring-success-line',
    title: (t) => (t.receipt ? `Bodovi uz račun #${t.receipt.number}` : 'Bodovi uz račun'),
  },
  REDEEM: { icon: Gift, circle: 'bg-accent-soft text-accent ring-accent-line', title: (t) => t.reward ?? 'Nagrada' },
  EXPIRE: { icon: Hourglass, circle: 'bg-subtle text-ink-muted ring-line', title: () => 'Bodovi istekli' },
};

/** One row of the guest's history: icon by type, what happened, where, and the points. */
export function HistoryItem({ item }) {
  const meta = TYPES[item.type];
  const Icon = meta.icon;
  const positive = item.points > 0;
  return (
    <li className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-inset', meta.circle)}>
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{meta.title(item)}</p>
        <p className="truncate text-xs text-ink-muted">
          {formatDateTime(item.createdAt)}
          {item.location && ` · ${item.location}`}
          {item.receipt && ` · ${formatMoney(item.receipt.totalCents)}`}
        </p>
      </div>
      <span className={cx('text-base font-bold', positive ? 'text-success' : 'text-ink-muted')}>
        {positive ? `+${item.points}` : item.points === 0 ? '0' : `−${Math.abs(item.points)}`}
      </span>
    </li>
  );
}
