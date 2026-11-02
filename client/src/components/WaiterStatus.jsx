import { useEffect } from 'react';
import { Ban, Clock, ReceiptText } from 'lucide-react';
import { useApi } from '../lib/useApi.js';
import { ButtonLink } from './ui/Button.jsx';
import { Notice } from './ui/States.jsx';

const DAY_NAMES = ['', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub', 'ned'];

export const describeDays = (days = []) => {
  const sorted = [...days].sort();
  if (sorted.join() === '1,2,3,4,5') return 'radnim danom';
  if (sorted.join() === '1,2,3,4,5,6,7') return 'svaki dan';
  return sorted.map((d) => DAY_NAMES[d]).join(', ');
};

/**
 * Waiter context (location, happy hour). Re-checked every 30 s so a screen left open
 * switches to the blocked state when happy hour starts (the server enforces it anyway).
 */
export function useWaiterContext() {
  const context = useApi('/waiter/context');
  const { reload } = context;
  useEffect(() => {
    const id = setInterval(() => reload({ silent: true }), 30_000);
    return () => clearInterval(id);
  }, [reload]);
  return context;
}

/** True when points and rewards are blocked right now (happy hour or location outside the program). */
export const loyaltyBlocked = (context) => Boolean(context && (context.happyHour.active || !context.location.programEnabled));

/** Banners shown on screens that stay usable (home, register): location outside program, happy hour. */
export function WaiterStatus({ context, className }) {
  if (!loyaltyBlocked(context)) return null;
  const { location, happyHour } = context;
  return (
    <div className={className ?? 'mb-5 space-y-3'}>
      {!location.programEnabled && (
        <Notice tone="danger" icon={Ban} title={`Lokacija ${location.name} nije u programu`}>
          Na ovoj lokaciji gosti ne skupljaju i ne troše bodove.
        </Notice>
      )}
      {happyHour.active && (
        <Notice tone="warning" icon={Clock} title={`Happy hour do ${happyHour.end}`}>
          Dok traje happy hour nema dodjele bodova ni iskorištavanja nagrada. Blagajna radi normalno.
        </Notice>
      )}
    </div>
  );
}

/**
 * Replaces the award / redeem screens while points and rewards are blocked,
 * so the waiter cannot start a scan that would only be rejected.
 */
export function LoyaltyBlocked({ context }) {
  const { location, happyHour } = context;
  const isHappyHour = happyHour.active;
  return (
    <section
      role="status"
      className="mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-warning-line bg-warning-soft shadow-card"
    >
      <div className="flex flex-col items-center px-6 pb-8 pt-10 text-center sm:px-10">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-warning text-white">
          {isHappyHour ? <Clock className="h-9 w-9" strokeWidth={2.25} aria-hidden /> : <Ban className="h-9 w-9" strokeWidth={2.25} aria-hidden />}
        </span>
        <p className="mt-5 text-xl font-bold text-warning">
          {isHappyHour ? `Happy hour do ${happyHour.end}` : `Lokacija ${location.name} nije u programu`}
        </p>
        <p className="mt-3 max-w-md text-lg font-medium text-ink">
          {isHappyHour
            ? 'Bodovi se ne dodjeljuju i nagrade se ne mogu iskoristiti dok traje happy hour.'
            : 'Na ovoj lokaciji gosti ne skupljaju i ne troše bodove.'}
        </p>
        {isHappyHour && (
          <p className="mt-2 text-sm text-ink-muted">
            Računi izdani u happy houru ne nose bodove ni nakon što happy hour završi.
          </p>
        )}
      </div>
      <div className="border-t border-line bg-surface px-6 pb-6 pt-5 sm:px-10">
        <ButtonLink to="/konobar/blagajna" size="xl" block icon={ReceiptText}>
          Na blagajnu
        </ButtonLink>
      </div>
    </section>
  );
}
