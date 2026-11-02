import { useState } from 'react';
import { Gift, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { DataList } from '../../components/ui/DataList.jsx';
import { Input, Switch } from '../../components/ui/Field.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { api } from '../../lib/api.js';
import { centsToInput, formatMoney, formatNumber, formatPoints, parseMoneyInput } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';

const EMPTY = { name: '', pointsCost: '', costPrice: '', active: true };

export default function OwnerRewards() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/owner/rewards');
  const [editing, setEditing] = useState(null); // null | 'new' | reward
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const open = (reward) => {
    setEditing(reward ?? 'new');
    setForm(reward ? { name: reward.name, pointsCost: String(reward.pointsCost), costPrice: centsToInput(reward.costPriceCents), active: reward.active } : EMPTY);
    setErrors({});
  };
  const close = () => setEditing(null);
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const save = async (e) => {
    e.preventDefault();
    const next = {};
    const points = Number(form.pointsCost);
    const cost = parseMoneyInput(form.costPrice);
    if (!form.name.trim()) next.name = 'Unesite naziv.';
    if (!Number.isInteger(points) || points < 1) next.pointsCost = 'Unesite cijeli broj bodova (1 ili više).';
    if (Number.isNaN(cost)) next.costPrice = 'Unesite iznos, npr. 0,30.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    const body = { name: form.name.trim(), pointsCost: points, costPriceCents: cost, active: form.active };
    try {
      if (editing === 'new') await api('/owner/rewards', { method: 'POST', body });
      else await api(`/owner/rewards/${editing.id}`, { method: 'PUT', body });
      toast.success(editing === 'new' ? 'Nagrada dodana' : 'Nagrada spremljena', body.name);
      close();
      reload({ silent: true });
    } catch (err) {
      if (err.fields) setErrors({ ...err.fields, costPrice: err.fields.costPriceCents });
      toast.error('Nagrada nije spremljena', err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api(`/owner/rewards/${editing.id}`, { method: 'DELETE' });
      toast.success('Nagrada obrisana', editing.name);
      setConfirmDelete(false);
      close();
      reload({ silent: true });
    } catch (err) {
      toast.error('Nagrada nije obrisana', err.message);
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Nagrada',
      mobile: 'title',
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="font-medium text-ink">{r.name}</span>
          {!r.active && <Badge>Neaktivna</Badge>}
        </span>
      ),
    },
    { key: 'points', header: 'Bodovi', align: 'right', render: (r) => formatNumber(r.pointsCost) },
    { key: 'cost', header: 'Nabavna cijena', align: 'right', render: (r) => formatMoney(r.costPriceCents) },
    { key: 'perPoint', header: 'Trošak po bodu', align: 'right', render: (r) => formatMoney(r.costPriceCents / r.pointsCost) },
    { key: 'used', header: 'Iskorišteno', align: 'right', render: (r) => `${formatNumber(r.redeemedCount)}×` },
    {
      key: 'actions',
      header: <span className="sr-only">Akcije</span>,
      mobile: 'hide',
      align: 'right',
      render: (r) => (
        <Button variant="ghost" icon={Pencil} onClick={() => open(r)} aria-label={`Uredi ${r.name}`}>
          Uredi
        </Button>
      ),
    },
  ];

  const isEdit = editing && editing !== 'new';

  return (
    <>
      <PageHeader
        title="Nagrade"
        description="Katalog nagrada: koliko bodova vrijede i koliko vas koštaju po nabavnoj cijeni."
        actions={
          <Button icon={Plus} onClick={() => open(null)}>
            Nova nagrada
          </Button>
        }
      />
      <Card>
        {loading ? (
          <SkeletonList rows={3} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="Još nema nagrada"
            description="Dodajte prvu nagradu, npr. kava za 10 bodova po nabavnoj cijeni 0,30 €."
            action={
              <Button icon={Plus} onClick={() => open(null)}>
                Dodaj nagradu
              </Button>
            }
          />
        ) : (
          <DataList columns={columns} rows={data} onRowClick={(r) => open(r)} />
        )}
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={close}
        title={isEdit ? 'Uredi nagradu' : 'Nova nagrada'}
        footer={
          <>
            {isEdit && editing.redeemedCount === 0 && (
              <Button variant="ghost" icon={Trash2} className="text-danger sm:mr-auto" onClick={() => setConfirmDelete(true)}>
                Obriši
              </Button>
            )}
            <Button variant="secondary" onClick={close}>
              Odustani
            </Button>
            <Button type="submit" form="reward-form" loading={saving}>
              Spremi
            </Button>
          </>
        }
      >
        <form id="reward-form" onSubmit={save} noValidate className="space-y-4">
          <Input label="Naziv" value={form.name} onChange={set('name')} error={errors.name} data-autofocus placeholder="npr. Kava" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Bodovi" inputMode="numeric" value={form.pointsCost} onChange={set('pointsCost')} error={errors.pointsCost} />
            <Input
              label="Nabavna cijena"
              inputMode="decimal"
              suffix="€"
              value={form.costPrice}
              onChange={set('costPrice')}
              error={errors.costPrice}
              placeholder="0,30"
            />
          </div>
          {Number(form.pointsCost) > 0 && !Number.isNaN(parseMoneyInput(form.costPrice)) && (
            <p className="text-sm text-ink-muted">
              Trošak po bodu: {formatMoney(parseMoneyInput(form.costPrice) / Number(form.pointsCost))} · gost treba{' '}
              {formatPoints(Number(form.pointsCost))}.
            </p>
          )}
          <Switch
            label="Aktivna"
            description="Neaktivna nagrada se ne prikazuje gostima i ne može se iskoristiti."
            checked={form.active}
            onChange={(active) => setForm((f) => ({ ...f, active }))}
          />
          {isEdit && editing.redeemedCount > 0 && (
            <p className="text-xs text-ink-muted">Nagrada je iskorištena {editing.redeemedCount}× pa se ne može obrisati — možete je deaktivirati.</p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={deleting}
        tone="danger"
        title="Obrisati nagradu?"
        description={isEdit ? `„${editing.name}” bit će trajno uklonjena iz kataloga.` : ''}
        confirmLabel="Obriši"
      />
    </>
  );
}
