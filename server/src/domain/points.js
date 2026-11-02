/**
 * Points calculation (business rule 2).
 *
 * The earning rule is snapshotted onto the receipt when it is issued, so a rule change
 * only affects new receipts (README V1). The same snapshot is stored on the EARN
 * transaction as `ruleSnapshot`.
 */

export function buildEarningRule(settings) {
  return {
    earningMode: settings.earningMode,
    pointsPerEuro: Number(settings.pointsPerEuro),
  };
}

/**
 * @param {{ totalCents: number, items: { quantity: number, pointsPerItem: number }[] }} receipt
 * @param {{ earningMode: 'AMOUNT' | 'ITEM', pointsPerEuro: number }} rule
 */
export function calculatePoints(receipt, rule) {
  if (rule.earningMode === 'AMOUNT') {
    const total = receipt.totalCents / 100;
    const raw = total * Number(rule.pointsPerEuro);
    // Round away float noise (e.g. 4.35 * 100 = 434.99999…) before flooring.
    return Math.max(0, Math.floor(Number(raw.toFixed(6))));
  }
  if (rule.earningMode === 'ITEM') {
    return (receipt.items ?? []).reduce(
      (sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.pointsPerItem ?? 0),
      0,
    );
  }
  throw new Error(`Unknown earning mode: ${rule.earningMode}`);
}

/** Total of a receipt from price-list lines (prices are never typed by the waiter). */
export function receiptTotalCents(items) {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
}
