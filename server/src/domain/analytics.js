/**
 * Owner analytics helpers — pure functions.
 */

/**
 * Estimated value of one point in cents: costPrice / pointsCost of the active reward
 * that is cheapest per point. Returns 0 when there is no active reward.
 */
export function pointValueCents(rewards) {
  const ratios = rewards
    .filter((r) => r.active && r.pointsCost > 0)
    .map((r) => r.costPriceCents / r.pointsCost);
  return ratios.length ? Math.min(...ratios) : 0;
}

/** Liability estimate: total outstanding balance × value per point (in cents). */
export function estimateLiability(totalPoints, rewards) {
  const perPoint = pointValueCents(rewards);
  return { points: totalPoints, perPointCents: perPoint, valueCents: Math.round(totalPoints * perPoint) };
}

/**
 * Top guests from EARN transactions joined with their receipt.
 * @param {{ guestProfileId: string, createdAt: Date, locationId: string, receipt: { totalCents: number } }[]} earns
 */
export function aggregateTopGuests(earns) {
  const map = new Map();
  for (const tx of earns) {
    const g = map.get(tx.guestProfileId) ?? {
      guestProfileId: tx.guestProfileId,
      spendingCents: 0,
      visits: 0,
      lastVisitAt: null,
      locationCounts: {},
    };
    g.spendingCents += tx.receipt?.totalCents ?? 0;
    g.visits += 1;
    if (!g.lastVisitAt || new Date(tx.createdAt) > new Date(g.lastVisitAt)) g.lastVisitAt = tx.createdAt;
    if (tx.locationId) g.locationCounts[tx.locationId] = (g.locationCounts[tx.locationId] ?? 0) + 1;
    map.set(tx.guestProfileId, g);
  }
  return [...map.values()]
    .map(({ locationCounts, ...g }) => {
      const top = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0];
      return { ...g, topLocationId: top?.[0] ?? null };
    })
    .sort((a, b) => b.spendingCents - a.spendingCents || b.visits - a.visits);
}
