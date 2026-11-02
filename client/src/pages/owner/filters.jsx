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

function DateRange({ filters, update, compact = false }) {
  const invalid = filters.from && filters.to && filters.to < filters.from;
  return (
    <div className={cx('grid grid-cols-2 gap-3', compact && 'lg:flex lg:gap-2')}>
      <Input
        label="Od"
        type="date"
        value={filters.from}
        max={filters.to}
        onChange={(e) => update({ from: e.target.value })}
        inputClassName={compact ? 'lg:h-9' : undefined}
      />
      <Input
        label="Do"
        type="date"
        value={filters.to}
        min={filters.from}
        max={zagrebToday()}
        onChange={(e) => update({ to: e.target.value })}
        error={invalid ? 'Mora biti nakon datuma "od".' : undefined}
        inputClassName={compact ? 'lg:h-9' : undefined}
      />
    </div>
  );
}

function LocationSelect({ filters, update, locations, className, size, hideLabel }) {
  return (
    <Select label="Lokacija" className={className} size={size} hideLabel={hideLabel} value={filters.locationId} onChange={(e) => update({ locationId: e.target.value })}>
      <option value="">Sve lokacije</option>
      {(locations ?? []).map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
          {l.programEnabled ? '' : ' (izvan programa)'}
        </option>
      ))}
    </Select>
  );
}

/**
 * Period + location filters.
 *  - `inline` (default for dashboards): compact controls meant for the page header's right side on desktop.
 *  - otherwise: a toolbar card that also hosts extra filters (children).
 * On mobile both collapse into one summary row so data stays above the fold.
 */
export function PeriodFilter({ filters, update, locations, children, activeExtra = 0, inline = false }) {
  const [open, setOpen] = useState(false);
  const periodLabel =
    PRESETS.find((p) => p.value === filters.preset && p.value !== 'custom')?.label ?? `${formatDay(filters.from)} – ${formatDay(filters.to)}`;
  const locationLabel = locations?.find((l) => l.id === filters.locationId)?.name ?? 'Sve lokacije';

  const mobile = (
    <div className={cx('rounded-lg border border-line bg-surface shadow-card lg:hidden', inline ? 'w-full' : 'mb-6')}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left"
      >
        <ListFilter className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm text-ink">
          <span className="font-semibold">{periodLabel}</span> · {locationLabel}
          {activeExtra > 0 && <span className="font-semibold text-accent"> · +{activeExtra} filtra</span>}
        </span>
        <ChevronDown className={cx('h-5 w-5 text-ink-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-line p-4">
          <Segmented label="Razdoblje" value={filters.preset} onChange={(preset) => update({ preset })} options={PRESETS} />
          {filters.preset === 'custom' && <DateRange filters={filters} update={update} />}
          <LocationSelect filters={filters} update={update} locations={locations} />
          {children}
        </div>
      )}
    </div>
  );

  if (inline) {
    return (
      <>
        {mobile}
        <div className="hidden items-end gap-2 lg:flex">
          {filters.preset === 'custom' && <DateRange filters={filters} update={update} compact />}
          <Segmented label="Razdoblje" hideLabel size="sm" value={filters.preset} onChange={(preset) => update({ preset })} options={PRESETS} />
          <div className="w-44">
            <LocationSelect filters={filters} update={update} locations={locations} size="sm" hideLabel />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {mobile}
      <div className="mb-6 hidden flex-wrap items-end gap-4 rounded-lg border border-line bg-surface p-4 shadow-card lg:flex">
        <Segmented label="Razdoblje" value={filters.preset} onChange={(preset) => update({ preset })} options={PRESETS} />
        {filters.preset === 'custom' && <DateRange filters={filters} update={update} compact />}
        <LocationSelect filters={filters} update={update} locations={locations} className="w-44" />
        {children}
      </div>
    </>
  );
}
