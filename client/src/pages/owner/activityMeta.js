import { Gift, Hourglass, Receipt, ShieldAlert } from 'lucide-react';
import { formatMoney } from '../../lib/format.js';

export const TYPE_META = {
  EARN: { label: 'Dodjela', tone: 'success', icon: Receipt },
  REDEEM: { label: 'Nagrada', tone: 'accent', icon: Gift },
  EXPIRE: { label: 'Istek', tone: 'neutral', icon: Hourglass },
  REJECTED: { label: 'Odbijeno', tone: 'danger', icon: ShieldAlert },
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
      return `${item.action === 'REDEEM' ? 'Nagrada' : 'Bodovi'}: ${item.reasonMessage ?? item.reason}`;
    default:
      return '';
  }
}
