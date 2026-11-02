import { Gift, Hourglass, Plus, X } from 'lucide-react';
import { formatMoney } from '../../lib/format.js';

/** Visual language for activity rows — same icons as the guest history. */
export const TYPE_META = {
  EARN: { label: 'Dodjela', tone: 'success', icon: Plus, circle: 'bg-success-soft text-success ring-success-line' },
  REDEEM: { label: 'Nagrada', tone: 'accent', icon: Gift, circle: 'bg-accent-soft text-accent ring-accent-line' },
  EXPIRE: { label: 'Istek', tone: 'neutral', icon: Hourglass, circle: 'bg-subtle text-ink-muted ring-line' },
  REJECTED: { label: 'Odbijeno', tone: 'danger', icon: X, circle: 'bg-danger-soft text-danger ring-danger-line' },
};

/** One-line description of an activity row. */
export function describeActivity(item) {
  switch (item.type) {
    case 'EARN':
      return item.receipt ? `Račun #${item.receipt.number} · ${formatMoney(item.receipt.totalCents)}` : 'Račun';
    case 'REDEEM':
      return item.reward ?? 'Nagrada';
    case 'EXPIRE':
      return 'Bodovi resetirani na 0';
    case 'REJECTED':
      return item.reasonMessage ?? item.reason;
    default:
      return '';
  }
}
