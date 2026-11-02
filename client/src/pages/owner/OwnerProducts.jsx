import { useMemo, useState } from 'react';
import { Info, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { DataList } from '../../components/ui/DataList.jsx';
import { Input, Switch } from '../../components/ui/Field.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx';
import { EmptyState, ErrorState, Notice, SkeletonList } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { api } from '../../lib/api.js';
import { centsToInput, formatMoney, parseMoneyInput, pointsLabel } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';

const EMPTY = { name: '', category: '', price: '', pointsPerItem: '0', active: true };

export default function OwnerProducts() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/owner/products');
  const settings = useApi('/owner/settings');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const categories = useMemo(() => [...new Set((data ?? []).map((p) => p.category))], [data]);
  const itemMode = settings.data?.earningMode === 'ITEM';

  const open = (p) => {
    setEditing(p ?? 'new');
    setForm(
      p
        ? { name: p.name, category: p.category, price: centsToInput(p.priceCents), pointsPerItem: String(p.pointsPerItem), active: p.active }
        : { ...EMPTY, category: categories[0] ?? '' },
    );
    setErrors({});
  };
  const close = () => setEditing(null);
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const save = async (e) => {
    e.preventDefault();
    const price = parseMoneyInput(form.price);
    const points = Number(form.pointsPerItem);
    const next = {};
    if (!form.name.trim()) next.name = 'Unesite naziv.';
    if (!form.category.trim()) next.category = 'Unesite kategoriju.';
    if (Number.isNaN(price) || price <= 0) next.price = 'Unesite cijenu, npr. 1,60.';
    if (!Number.isInteger(points) || points < 0) next.pointsPerItem = 'Unesite 0 ili više.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    const body = { name: form.name.trim(), category: form.category.trim(), priceCents: price, pointsPerItem: points, active: form.active };
    try {
      if (editing === 'new') await api('/owner/products', { method: 'POST', body });
      else await api(`/owner/products/${editing.id}`, { method: 'PUT', body });
      toast.success(editing === 'new' ? 'Artikl dodan' : 'Artikl spremljen', `${body.name} · ${formatMoney(price)}`);
      close();
      reload({ silent: true });
    } catch (err) {
      if (err.fields) setErrors({ ...err.fields, price: err.fields.priceCents });
      toast.error('Artikl nije spremljen', err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api(`/owner/products/${editing.id}`, { method: 'DELETE' });
      toast.success('Artikl obrisan', editing.name);
      setConfirmDelete(false);
      close();
      reload({ silent: true });
    } catch (err) {
      toast.error('Artikl nije obrisan', err.message);
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Artikl',
      mobile: 'title',
      render: (p) => (
        <span className="block">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-ink">{p.name}</span>
            {!p.active && <Badge>Neaktivan</Badge>}
          </span>
          <span className="block text-xs font-normal text-ink-muted md:hidden">{p.category}</span>
        </span>
      ),
    },
    { key: 'category', header: 'Kategorija', mobile: 'hide', className: 'text-ink-muted', render: (p) => p.category },
    { key: 'price', header: 'Cijena', align: 'right', mobile: 'hide', render: (p) => formatMoney(p.priceCents) },
    {
      key: 'points',
      header: 'Bodova po artiklu',
      mobile: 'hide',
      align: 'right',
      render: (p) => (p.pointsPerItem > 0 ? p.pointsPerItem : <span className="text-ink-muted">0</span>),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Akcije</span>,
      mobile: 'hide',
      align: 'right',
      render: (p) => (
        <Button variant="ghost" icon={Pencil} onClick={() => open(p)} aria-label={`Uredi ${p.name}`}>
          Uredi
        </Button>
      ),
    },
  ];

  const isEdit = editing && editing !== 'new';

  return (
    <>
      <PageHeader
        title="Cjenik"
        description="Artikli i cijene za blagajnu. Konobar ne može mijenjati cijene — izdani računi zadržavaju cijenu iz trenutka izdavanja."
        actions={
          <Button icon={Plus} onClick={() => open(null)}>
            Novi artikl
          </Button>
        }
      />
      {settings.data && (
        <Notice tone={itemMode ? 'accent' : 'neutral'} icon={Info} className="mb-6">
          {itemMode
            ? 'Bodovanje je po artiklu: gost dobiva bodove samo za artikle s brojem bodova većim od 0.'
            : 'Bodovanje je po iznosu računa. Bodovi po artiklu koriste se tek kad u postavkama odaberete bodovanje po artiklu.'}
        </Notice>
      )}
      <Card>
        {loading ? (
          <SkeletonList rows={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Cjenik je prazan"
            description="Dodajte artikle koje konobari mogu staviti na račun."
            action={
              <Button icon={Plus} onClick={() => open(null)}>
                Dodaj artikl
              </Button>
            }
          />
        ) : (
          <DataList
            columns={columns}
            rows={data}
            onRowClick={(p) => open(p)}
            mobileAside={(p) => (
              <span className="block">
                <span className="block text-sm font-semibold text-ink">{formatMoney(p.priceCents)}</span>
                <span className="block text-xs font-normal text-ink-muted">
                  {p.pointsPerItem} {pointsLabel(p.pointsPerItem)}
                </span>
              </span>
            )}
          />
        )}
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={close}
        title={isEdit ? 'Uredi artikl' : 'Novi artikl'}
        footer={
          <>
            {isEdit && (
              <Button variant="ghost" icon={Trash2} className="text-danger sm:mr-auto" onClick={() => setConfirmDelete(true)}>
                Obriši
              </Button>
            )}
            <Button variant="secondary" onClick={close}>
              Odustani
            </Button>
            <Button type="submit" form="product-form" loading={saving}>
              Spremi
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={save} noValidate className="space-y-4">
          <Input label="Naziv" value={form.name} onChange={set('name')} error={errors.name} data-autofocus placeholder="npr. Espresso" />
          <Input label="Kategorija" list="product-categories" value={form.category} onChange={set('category')} error={errors.category} />
          <datalist id="product-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cijena" inputMode="decimal" suffix="€" value={form.price} onChange={set('price')} error={errors.price} placeholder="1,60" />
            <Input
              label="Bodova po artiklu"
              inputMode="numeric"
              value={form.pointsPerItem}
              onChange={set('pointsPerItem')}
              error={errors.pointsPerItem}
              hint="0 = ne nosi bodove"
            />
          </div>
          <Switch
            label="Aktivan"
            description="Neaktivni artikli se ne prikazuju na blagajni."
            checked={form.active}
            onChange={(active) => setForm((f) => ({ ...f, active }))}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={deleting}
        tone="danger"
        title="Obrisati artikl?"
        description="Artikl koji je već na izdanim računima ne može se obrisati — tada ga deaktivirajte."
        confirmLabel="Obriši"
      />
    </>
  );
}
