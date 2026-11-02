import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ListFilter } from 'lucide-react';
import { Input, Segmented, Select } from '../../components/ui/Field.jsx';
import { cx, formatDay, zagrebToday } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';

const STORAGE_KEY = 'mandrac.owner.filters';

const PRESETS = [
  { value: '7', label: '7 dana' },
  { value: '30', label: '30 dana' },
  { value: '90', label: '90 dana' },
  { value: 'custom', label: 'Odabir' },
];

function presetRange(preset) {
  const days = Number(preset);
  return { from: zagrebToday(-(days - 1)), to: zagrebToday() };
}

function initial() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    if (saved?.preset) return saved.preset === 'custom' ? saved : { ...saved, ...presetRange(saved.preset) };
  } catch {
    /* ignore */
  }
  return { preset: '30', locationId: '', ...presetRange('30') };
}

/** Period + location filter shared by the owner screens (kept for the browser session). */
export function useOwnerFilters() {
  const [filters, setFilters] = useState(initial);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const update = useCallback((patch) => {
    setFilters((f) => {
      const next = { ...f, ...patch };
      if (patch.preset && patch.preset !== 'custom') Object.assign(next, presetRange(patch.preset));
      return next;
    });
  }, []);

  const query = { from: filters.from, to: filters.to, locationId: filters.locationId || undefined };
  return { filters, update, query };
}

/** Owner filter options (locations, waiters, guests). */
export function useFilterOptions() {
  return useApi('/owner/filters');
}

export function PeriodFilter({ filters, update, locations, children, activeExtra = 0 }) {
  const [open, setOpen] = useState(false);
  const invalid = filters.from && filters.to && filters.to < filters.from;
  const periodLabel = PRESETS.find((p) => p.value === filters.preset && p.value !== 'custom')?.label
    ?? `${formatDay(filters.from)} – ${formatDay(filters.to)}`;
  const locationLabel = locations?.find((l) => l.id === filters.locationId)?.name ?? 'Sve lokacije';

  return (
    <div className="mb-6 rounded-lg border border-line bg-surface shadow-sm">
      {/* Mobile: collapsed summary keeps the data above the fold */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left lg:hidden"
      >
        <ListFilter className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm text-ink">
          <span className="font-medium">{periodLabel}</span> · {locationLabel}
          {activeExtra > 0 && <span className="text-accent"> · +{activeExtra} filtra</span>}
        </span>
        <ChevronDown className={cx('h-5 w-5 text-ink-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      <div
        className={cx(
          'flex-col gap-4 border-t border-line p-4 lg:flex lg:flex-row lg:flex-wrap lg:items-end lg:border-t-0',
          open ? 'flex' : 'hidden',
        )}
      >
        <Segmented label="Razdoblje" value={filters.preset} onChange={(preset) => update({ preset })} options={PRESETS} />
        {filters.preset === 'custom' && (
          <div className="grid grid-cols-2 gap-3 lg:flex">
            <Input label="Od" type="date" value={filters.from} max={filters.to} onChange={(e) => update({ from: e.target.value })} />
            <Input
              label="Do"
              type="date"
              value={filters.to}
              min={filters.from}
              max={zagrebToday()}
              onChange={(e) => update({ to: e.target.value })}
              error={invalid ? 'Mora biti nakon datuma "od".' : undefined}
            />
          </div>
        )}
        <Select
          label="Lokacija"
          className="lg:w-48"
          value={filters.locationId}
          onChange={(e) => update({ locationId: e.target.value })}
        >
          <option value="">Sve lokacije</option>
          {(locations ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
              {l.programEnabled ? '' : ' (izvan programa)'}
            </option>
          ))}
        </Select>
        {children}
      </div>
    </div>
  );
}
