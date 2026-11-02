import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import { Input, Segmented, Select, Switch } from '../../components/ui/Field.jsx';
import { ErrorState, Notice, Skeleton } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { api } from '../../lib/api.js';
import { cx } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';

const MONTHS = ['siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj', 'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac'];
const DAYS = [
  [1, 'Pon'], [2, 'Uto'], [3, 'Sri'], [4, 'Čet'], [5, 'Pet'], [6, 'Sub'], [7, 'Ned'],
];

const FIELDS = [
  'earningMode', 'pointsPerEuro', 'expiryMode', 'expiryDay', 'expiryMonth', 'expiryPeriodMonths', 'expiryInactivityMonths',
  'programStartAt', 'happyHourEnabled', 'happyHourStart', 'happyHourEnd', 'happyHourDays',
];

const toForm = (s) => Object.fromEntries(FIELDS.map((k) => [k, s[k] ?? '']));

export default function OwnerSettings() {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi('/owner/settings');
  const locations = useApi('/owner/locations');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(toForm(data));
  }, [data]);

  const dirty = useMemo(() => form && data && JSON.stringify(form) !== JSON.stringify(toForm(data)), [form, data]);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const onInput = (key) => (e) => set(key)(e.target.value);

  const validate = () => {
    const e = {};
    const num = (v) => (v === '' || v === null ? NaN : Number(String(v).replace(',', '.')));
    if (form.earningMode === 'AMOUNT' && !(num(form.pointsPerEuro) >= 0.01)) e.pointsPerEuro = 'Unesite broj veći od 0.';
    if (form.expiryMode === 'INACTIVITY' && !(Number.isInteger(num(form.expiryInactivityMonths)) && num(form.expiryInactivityMonths) >= 1))
      e.expiryInactivityMonths = 'Unesite cijeli broj mjeseci (1 ili više).';
    if (form.expiryMode === 'PERIOD' && !(Number.isInteger(num(form.expiryPeriodMonths)) && num(form.expiryPeriodMonths) >= 1))
      e.expiryPeriodMonths = 'Unesite cijeli broj mjeseci (1 ili više).';
    if (form.expiryMode === 'FIXED_DATE') {
      if (!(num(form.expiryDay) >= 1 && num(form.expiryDay) <= 31)) e.expiryDay = 'Dan 1–31.';
      if (!form.expiryMonth) e.expiryMonth = 'Odaberite mjesec.';
    }
    if (form.happyHourEnabled) {
      if (!form.happyHourDays.length) e.happyHourDays = 'Odaberite barem jedan dan.';
      if (form.happyHourStart === form.happyHourEnd) e.happyHourEnd = 'Kraj mora biti različit od početka.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Provjerite označena polja');
      return;
    }
    setSaving(true);
    const intOrNull = (v) => (v === '' || v === null ? null : Number(v));
    try {
      const result = await api('/owner/settings', {
        method: 'PUT',
        body: {
          ...form,
          pointsPerEuro: Number(String(form.pointsPerEuro).replace(',', '.')),
          expiryDay: intOrNull(form.expiryDay),
          expiryMonth: intOrNull(form.expiryMonth),
          expiryPeriodMonths: intOrNull(form.expiryPeriodMonths),
          expiryInactivityMonths: intOrNull(form.expiryInactivityMonths),
        },
      });
      setData(result.settings);
      toast.success(
        'Postavke spremljene',
        [
          result.earningChanged && 'Novo pravilo bodovanja vrijedi za nove račune.',
          result.expiryChanged && 'Novi rok isteka računa se od danas — nitko ne gubi bodove odmah.',
        ]
          .filter(Boolean)
          .join(' ') || undefined,
      );
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      toast.error('Postavke nisu spremljene', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <>
        <PageHeader title="Postavke programa" />
        <Card>
          <ErrorState error={error} onRetry={reload} />
        </Card>
      </>
    );
  }

  if (loading || !form) {
    return (
      <>
        <PageHeader title="Postavke programa" description="Pravila bodovanja, istek bodova i happy hour." />
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardBody className="space-y-4 border-t border-line">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-11 w-full max-w-md" />
                <Skeleton className="h-11 w-full max-w-xs" />
              </CardBody>
            </Card>
          ))}
        </div>
      </>
    );
  }

  const programLocations = locations.data?.filter((l) => l.programEnabled).map((l) => l.name) ?? [];

  return (
    <form onSubmit={save} noValidate className="max-w-3xl">
      <PageHeader
        title="Postavke programa"
        description="Pravila bodovanja, istek bodova i happy hour."
        actions={
          <Button type="submit" icon={Save} loading={saving} disabled={!dirty} className="hidden lg:inline-flex">
            Spremi promjene
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Bodovanje" description="Kako gost zarađuje bodove uz račun." />
          <CardBody className="space-y-5 border-t border-line">
            <Segmented
              value={form.earningMode}
              onChange={set('earningMode')}
              options={[
                { value: 'AMOUNT', label: 'Po iznosu računa' },
                { value: 'ITEM', label: 'Po artiklu' },
              ]}
            />
            {form.earningMode === 'AMOUNT' ? (
              <Input
                label="Bodova po potrošenom euru"
                className="max-w-xs"
                inputMode="decimal"
                value={String(form.pointsPerEuro).replace('.', ',')}
                onChange={onInput('pointsPerEuro')}
                error={errors.pointsPerEuro}
                hint="Bodovi = iznos računa × ovaj broj, zaokruženo na niže."
              />
            ) : (
              <p className="text-sm text-ink-muted">
                Bodove nose samo artikli kojima u{' '}
                <Link to="/vlasnik/cjenik" className="font-medium text-accent hover:underline">
                  cjeniku
                </Link>{' '}
                postavite broj bodova (npr. kava = 1 bod). Ostali artikli ne nose bodove.
              </p>
            )}
            <Notice tone="neutral" icon={Info}>
              Promjena vrijedi samo za nove račune — već izdani računi boduju se po pravilu iz trenutka izdavanja.
            </Notice>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Istek bodova" description="Kad istek nastupi, gostu se svi bodovi resetiraju na nulu." />
          <CardBody className="space-y-5 border-t border-line">
            <Segmented
              value={form.expiryMode}
              onChange={set('expiryMode')}
              options={[
                { value: 'INACTIVITY', label: 'Neaktivnost' },
                { value: 'FIXED_DATE', label: 'Fiksni datum' },
                { value: 'PERIOD', label: 'Razdoblje' },
              ]}
            />
            {form.expiryMode === 'INACTIVITY' && (
              <Input
                label="Mjeseci bez posjeta"
                className="max-w-xs"
                inputMode="numeric"
                suffix="mj."
                value={form.expiryInactivityMonths ?? ''}
                onChange={onInput('expiryInactivityMonths')}
                error={errors.expiryInactivityMonths}
                hint="Svaki posjet s bodovima ponovno pokreće odbrojavanje."
              />
            )}
            {form.expiryMode === 'FIXED_DATE' && (
              <div className="grid max-w-md grid-cols-2 gap-3">
                <Input
                  label="Dan"
                  inputMode="numeric"
                  value={form.expiryDay ?? ''}
                  onChange={onInput('expiryDay')}
                  error={errors.expiryDay}
                />
                <Select label="Mjesec" value={form.expiryMonth ?? ''} onChange={onInput('expiryMonth')} error={errors.expiryMonth}>
                  <option value="">Odaberite</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </Select>
                <p className="col-span-2 text-sm text-ink-muted">Bodovi vrijede do kraja tog dana, svake godine.</p>
              </div>
            )}
            {form.expiryMode === 'PERIOD' && (
              <div className="grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Svakih"
                  inputMode="numeric"
                  suffix="mj."
                  value={form.expiryPeriodMonths ?? ''}
                  onChange={onInput('expiryPeriodMonths')}
                  error={errors.expiryPeriodMonths}
                />
                <Input
                  label="Početak programa"
                  type="date"
                  value={form.programStartAt}
                  onChange={onInput('programStartAt')}
                  error={errors.programStartAt}
                />
                <p className="text-sm text-ink-muted sm:col-span-2">Reset za sve goste svakih N mjeseci od početka programa.</p>
              </div>
            )}
            <Notice tone="neutral" icon={Info}>
              Promjena isteka ne briše postojeće bodove odmah — novi rok računa se od trenutka spremanja.
            </Notice>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Happy hour" description="U happy houru nema bodova ni nagrada (nema popusta na popust)." />
          <CardBody className="space-y-5 border-t border-line">
            <Switch label="Happy hour uključen" checked={form.happyHourEnabled} onChange={set('happyHourEnabled')} />
            <fieldset disabled={!form.happyHourEnabled} className={cx('space-y-5', !form.happyHourEnabled && 'opacity-60')}>
              <div className="grid max-w-md grid-cols-2 gap-3">
                <Input label="Od" type="time" value={form.happyHourStart} onChange={onInput('happyHourStart')} error={errors.happyHourStart} />
                <Input label="Do" type="time" value={form.happyHourEnd} onChange={onInput('happyHourEnd')} error={errors.happyHourEnd} />
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium text-ink" id="hh-days">
                  Dani
                </p>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="hh-days">
                  {DAYS.map(([d, label]) => {
                    const on = form.happyHourDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          set('happyHourDays')(on ? form.happyHourDays.filter((x) => x !== d) : [...form.happyHourDays, d].sort())
                        }
                        className={cx(
                          'h-11 w-12 rounded-md border text-sm font-medium transition-colors',
                          on ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong bg-surface text-ink-muted hover:text-ink',
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {errors.happyHourDays && <p className="mt-1.5 text-sm text-danger">{errors.happyHourDays}</p>}
              </div>
            </fieldset>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Lokacije u programu" />
          <CardBody className="flex flex-col gap-3 border-t border-line sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink">
              {locations.loading ? 'Učitavanje…' : programLocations.length ? programLocations.join(', ') : 'Nijedna lokacija nije u programu.'}
            </p>
            <Link to="/vlasnik/lokacije" className="inline-flex min-h-11 items-center text-sm font-medium text-accent hover:underline">
              Uredi lokacije
            </Link>
          </CardBody>
        </Card>
      </div>

      {/* Save action within thumb reach on mobile */}
      <div className="h-20 lg:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-line bg-surface px-4 py-3 lg:hidden">
        <Button type="submit" size="lg" block icon={Save} loading={saving} disabled={!dirty}>
          {dirty ? 'Spremi promjene' : 'Nema promjena'}
        </Button>
      </div>
    </form>
  );
}
