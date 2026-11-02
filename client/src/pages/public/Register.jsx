import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Store } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { EmptyState, ErrorState, Notice, Skeleton } from '../../components/ui/States.jsx';
import { HOME_BY_ROLE, useAuth } from '../../context/AuthContext.jsx';
import { useApi } from '../../lib/useApi.js';
import { formatPoints } from '../../lib/format.js';
import { PublicLayout } from './PublicLayout.jsx';

/** Guest registration — the URL behind the QR code at the bar. */
export default function Register() {
  const { tenantSlug } = useParams();
  const { user, status, register } = useAuth();
  const navigate = useNavigate();
  const { data: tenant, loading, error, reload } = useApi(`/public/tenants/${tenantSlug}`);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Registracija · Mandrač Loyalty';
  }, []);

  // While submitting, the success handler navigates (with the welcome state) itself.
  if (status === 'authenticated' && user && !submitting) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Unesite ime (barem 2 znaka).';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Unesite ispravnu email adresu.';
    if (form.password.length < 8) next.password = 'Lozinka mora imati barem 8 znakova.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await register({ tenantSlug, name: form.name.trim(), email: form.email.trim(), password: form.password });
      navigate('/gost', { replace: true, state: { welcome: true } });
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      setSubmitError(err.message);
      setSubmitting(false);
    }
  };

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  let body;
  if (loading) {
    body = (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  } else if (error?.status === 404) {
    body = (
      <EmptyState
        icon={Store}
        title="Program nije pronađen"
        description="Provjerite poveznicu ili ponovno skenirajte QR kod na šanku."
        action={<Link className="font-medium text-accent hover:underline" to="/">Na početnu</Link>}
      />
    );
  } else if (error) {
    body = <ErrorState error={error} onRetry={reload} />;
  } else {
    body = (
      <>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Postanite član</p>
        <h1 className="mt-1 text-xl font-semibold text-ink sm:text-2xl">{tenant.name}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Registracija traje pola minute. Odmah nakon nje dobivate svoj QR kod za skupljanje bodova
          {tenant.locations?.length ? ` na lokacijama: ${tenant.locations.map((l) => l.name).join(', ')}.` : '.'}
        </p>
        {tenant.rewards?.length > 0 && (
          <p className="mt-3 text-sm text-ink-muted">
            Prva nagrada: <span className="font-medium text-ink">{tenant.rewards[0].name}</span> za{' '}
            {formatPoints(tenant.rewards[0].pointsCost)}.
          </p>
        )}

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          {submitError && <Notice tone="danger">{submitError}</Notice>}
          <Input label="Ime" autoComplete="given-name" value={form.name} onChange={set('name')} error={errors.name} />
          <Input
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
          />
          <Input
            label="Lozinka"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            hint="Barem 8 znakova."
          />
          <div className="pt-2">
            <Button type="submit" size="lg" block loading={submitting}>
              Registriraj se i preuzmi QR kod
            </Button>
          </div>
        </form>
        <p className="mt-6 text-sm text-ink-muted">
          Već imate račun?{' '}
          <Link to="/login" className="font-semibold text-accent underline-offset-4 hover:underline">
            Prijavite se
          </Link>
        </p>
      </>
    );
  }

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
        <div className="rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8">{body}</div>
      </div>
    </PublicLayout>
  );
}
