import { Ban, Clock } from 'lucide-react';
import { Notice } from './ui/States.jsx';

const DAY_NAMES = ['', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub', 'ned'];

export const describeDays = (days = []) => {
  const sorted = [...days].sort();
  if (sorted.join() === '1,2,3,4,5') return 'radnim danom';
  if (sorted.join() === '1,2,3,4,5,6,7') return 'svaki dan';
  return sorted.map((d) => DAY_NAMES[d]).join(', ');
};

/** Banners the waiter must see before scanning: location outside program, happy hour. */
export function WaiterStatus({ context, mode = 'earn' }) {
  if (!context) return null;
  const { location, happyHour } = context;
  return (
    <div className="space-y-3">
      {!location.programEnabled && (
        <Notice tone="danger" icon={Ban} title={`Lokacija ${location.name} nije u programu`}>
          Na ovoj lokaciji gosti ne skupljaju i ne troše bodove.
        </Notice>
      )}
      {happyHour.active && (
        <Notice tone="warning" icon={Clock} title={`Happy hour je u tijeku (${happyHour.start}–${happyHour.end})`}>
          {mode === 'earn'
            ? 'Računi izdani u happy houru ne nose bodove.'
            : 'Nagrade se ne mogu iskoristiti dok traje happy hour.'}
        </Notice>
      )}
    </div>
  );
}
