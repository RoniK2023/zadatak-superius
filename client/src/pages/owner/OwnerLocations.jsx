import { useState } from 'react';
import { MapPin, Pencil, Plus, Users } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Avatar } from '../../components/layout/AppShell.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { Input, Select, Switch } from '../../components/ui/Field.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';

export default function OwnerLocations() {
  const locations = useApi('/owner/locations');
  const waiters = useApi('/owner/waiters');
  return (
    <>
      <PageHeader title="Lokacije i osoblje" description="Na kojim lokacijama program vrijedi i koji konobari rade gdje." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
        <LocationsCard locations={locations} onChanged={() => waiters.reload({ silent: true })} />
        <WaitersCard waiters={waiters} locations={locations.data ?? []} onChanged={() => locations.reload({ silent: true })} />
      </div>
    </>
  );
}

function LocationsCard({ locations, onChanged }) {
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', programEnabled: true });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);

  const open = (l) => {
    setEditing(l ?? 'new');
    setForm(l ? { name: l.name, address: l.address ?? '', programEnabled: l.programEnabled } : { name: '', address: '', programEnabled: true });
    setErrors({});
  };

  const persist = async (location, body) => {
    if (location === 'new') return api('/owner/locations', { method: 'POST', body });
    return api(`/owner/locations/${location.id}`, { method: 'PUT', body });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: 'Unesite naziv lokacije.' });
      return;
    }
    setSaving(true);
    try {
      await persist(editing, { name: form.name.trim(), address: form.address.trim() || null, programEnabled: form.programEnabled });
      toast.success(editing === 'new' ? 'Lokacija dodana' : 'Lokacija spremljena', form.name.trim());
      setEditing(null);
      locations.reload({ silent: true });
      onChanged();
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      else if (err.code === 'NAME_TAKEN') setErrors({ name: err.message });
      toast.error('Lokacija nije spremljena', err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (l, programEnabled) => {
    setToggling(l.id);
    try {
      await persist(l, { name: l.name, address: l.address, programEnabled });
      toast.success(
        programEnabled ? `${l.name} je u programu` : `${l.name} je izvan programa`,
        programEnabled ? 'Gosti ovdje skupljaju i troše bodove.' : 'Gosti ovdje ne skupljaju i ne troše bodove.',
      );
      locations.reload({ silent: true });
    } catch (err) {
      toast.error('Promjena nije spremljena', err.message);
    } finally {
      setToggling(null);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Lokacije"
        description="Gost ima jedan račun za sve lokacije u programu."
        actions={
          <Button variant="secondary" icon={Plus} onClick={() => open(null)}>
            Dodaj
          </Button>
        }
      />
      {locations.loading ? (
        <SkeletonList rows={2} />
      ) : locations.error ? (
        <ErrorState error={locations.error} onRetry={locations.reload} />
      ) : locations.data.length === 0 ? (
        <EmptyState icon={MapPin} title="Nema lokacija" description="Dodajte prvu lokaciju." />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {locations.data.map((l) => (
            <li key={l.id} className="flex items-center gap-4 px-4 py-4 sm:px-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-subtle text-ink-muted">
                <MapPin className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  {l.name}
                  <Badge tone={l.programEnabled ? 'success' : 'neutral'}>{l.programEnabled ? 'U programu' : 'Izvan programa'}</Badge>
                </p>
                <p className="mt-0.5 truncate text-sm text-ink-muted">
                  {l.address ? `${l.address} · ` : ''}
                  {l.waiterCount} {l.waiterCount === 1 ? 'konobar' : 'konobara'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Switch
                  hideLabel
                  label={`Program vjernosti na lokaciji ${l.name}`}
                  checked={l.programEnabled}
                  disabled={toggling === l.id}
                  onChange={(on) => toggle(l, on)}
                />
                <Button variant="ghost" size="icon" onClick={() => open(l)} aria-label={`Uredi ${l.name}`}>
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing && editing !== 'new' ? 'Uredi lokaciju' : 'Nova lokacija'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Odustani
            </Button>
            <Button type="submit" form="location-form" loading={saving}>
              Spremi
            </Button>
          </>
        }
      >
        <form id="location-form" onSubmit={save} noValidate className="space-y-4">
          <Input
            label="Naziv"
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setErrors({});
            }}
            error={errors.name}
            data-autofocus
          />
          <Input label="Adresa" optional value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          <Switch
            label="Uključena u program"
            description="Ako nije, gosti na ovoj lokaciji ne skupljaju i ne troše bodove."
            checked={form.programEnabled}
            onChange={(programEnabled) => setForm((f) => ({ ...f, programEnabled }))}
          />
        </form>
      </Modal>
    </Card>
  );
}

const EMPTY_WAITER = { name: '', email: '', password: '', locationId: '', active: true };

function WaitersCard({ waiters, locations, onChanged }) {
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_WAITER);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isNew = editing === 'new';
  const open = (w) => {
    setEditing(w ?? 'new');
    setForm(w ? { name: w.name, email: w.email, password: '', locationId: w.locationId ?? '', active: w.active } : { ...EMPTY_WAITER, locationId: locations[0]?.id ?? '' });
    setErrors({});
  };
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const save = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Unesite ime.';
    if (isNew && !/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Unesite ispravnu email adresu.';
    if ((isNew || form.password) && form.password.length < 8) next.password = 'Lozinka mora imati barem 8 znakova.';
    if (!form.locationId) next.locationId = 'Odaberite lokaciju.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      if (isNew) {
        await api('/owner/waiters', {
          method: 'POST',
          body: { name: form.name.trim(), email: form.email.trim(), password: form.password, locationId: form.locationId, active: form.active },
        });
      } else {
        await api(`/owner/waiters/${editing.id}`, {
          method: 'PUT',
          body: { name: form.name.trim(), password: form.password, locationId: form.locationId, active: form.active },
        });
      }
      toast.success(isNew ? 'Konobar dodan' : 'Konobar spremljen', isNew ? `Prijava: ${form.email.trim()}` : form.name.trim());
      setEditing(null);
      waiters.reload({ silent: true });
      onChanged();
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      else if (err.code === 'EMAIL_TAKEN') setErrors({ email: err.message });
      toast.error('Konobar nije spremljen', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Konobari"
        description="Konobar boduje samo današnje račune svoje lokacije."
        actions={
          <Button variant="secondary" icon={Plus} onClick={() => open(null)} disabled={!locations.length}>
            Dodaj
          </Button>
        }
      />
      {waiters.loading ? (
        <SkeletonList rows={2} />
      ) : waiters.error ? (
        <ErrorState error={waiters.error} onRetry={waiters.reload} />
      ) : waiters.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Još nema konobara"
          description="Dodajte konobara s emailom i lozinkom za prijavu."
          action={
            <Button icon={Plus} onClick={() => open(null)} disabled={!locations.length}>
              Dodaj konobara
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {waiters.data.map((w) => (
            <li key={w.id}>
              <button type="button" onClick={() => open(w)} className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-canvas sm:px-5">
                <Avatar name={w.name} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">{w.name}</span>
                  <span className="block truncate text-sm text-ink-muted">{w.email}</span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <Badge>{w.location?.name ?? '—'}</Badge>
                  {!w.active && <Badge tone="warning">Neaktivan</Badge>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={isNew ? 'Novi konobar' : 'Uredi konobara'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Odustani
            </Button>
            <Button type="submit" form="waiter-form" loading={saving}>
              Spremi
            </Button>
          </>
        }
      >
        <form id="waiter-form" onSubmit={save} noValidate className="space-y-4">
          <Input label="Ime i prezime" value={form.name} onChange={set('name')} error={errors.name} data-autofocus />
          <Input
            label="Email za prijavu"
            type="email"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            disabled={!isNew}
            hint={isNew ? undefined : 'Email se ne može mijenjati.'}
          />
          <Input
            label={isNew ? 'Lozinka' : 'Nova lozinka'}
            type="password"
            autoComplete="new-password"
            optional={!isNew}
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            hint={isNew ? 'Barem 8 znakova.' : 'Ostavite prazno da lozinka ostane ista.'}
          />
          <Select label="Lokacija" value={form.locationId} onChange={set('locationId')} error={errors.locationId}>
            <option value="">Odaberite lokaciju</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          <Switch
            label="Aktivan"
            description="Neaktivan konobar se ne može prijaviti."
            checked={form.active}
            onChange={(active) => setForm((f) => ({ ...f, active }))}
          />
        </form>
      </Modal>
    </Card>
  );
}
