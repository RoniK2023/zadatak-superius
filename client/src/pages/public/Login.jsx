import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { Notice } from '../../components/ui/States.jsx';
import { HOME_BY_ROLE, useAuth } from '../../context/AuthContext.jsx';
import { PublicLayout } from './PublicLayout.jsx';
import { DEFAULT_TENANT } from './Landing.jsx';

const DEMO_ACCOUNTS = [
  { label: 'Vlasnik', email: 'owner@mandrac.hr' },
  { label: 'Konobar — Centar', email: 'konobar.centar@mandrac.hr' },
  { label: 'Konobar — Verudela', email: 'konobar.verudela@mandrac.hr' },
  { label: 'Gost', email: 'gost@example.com' },
];
const DEMO_PASSWORD = 'demo1234';

export default function Login() {
  const { user, status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Prijava · Mandrač Loyalty';
  }, []);

  if (status === 'authenticated' && user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  const validate = () => {
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Unesite ispravnu email adresu.';
    if (!form.password) next.password = 'Unesite lozinku.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const me = await login(form.email.trim(), form.password);
      const from = location.state?.from;
      const home = HOME_BY_ROLE[me?.role] ?? '/';
      navigate(from?.startsWith(home) ? from : home, { replace: true });
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
    }
  };

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  return (
    <PublicLayout>
      <div className="mx-auto grid max-w-content gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-16">
        <div className="mx-auto w-full max-w-md lg:mx-0">
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Prijava</h1>
          <p className="mt-2 text-sm text-ink-muted">Ista prijava za goste, konobare i vlasnike — nakon prijave otvara se vaše sučelje.</p>

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
            {submitError && <Notice tone="danger">{submitError}</Notice>}
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              autoFocus
            />
            <Input
              label="Lozinka"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
            />
            <Button type="submit" size="lg" block loading={submitting} icon={LogIn}>
              Prijavi se
            </Button>
          </form>

          <p className="mt-6 text-sm text-ink-muted">
            Nemate račun?{' '}
            <Link to={`/r/${DEFAULT_TENANT}`} className="font-medium text-accent underline-offset-4 hover:underline">
              Registrirajte se kao gost
            </Link>
          </p>
        </div>

        <aside className="self-start rounded-lg border border-line bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-ink">Demo računi</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Lozinka za sve račune: <code className="rounded-sm bg-subtle px-1.5 py-0.5 font-mono text-ink">{DEMO_PASSWORD}</code>
          </p>
          <ul className="mt-4 divide-y divide-line">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ email: a.email, password: DEMO_PASSWORD });
                    setErrors({});
                  }}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-sm py-3 text-left text-sm hover:text-accent"
                >
                  <span className="font-medium text-ink">{a.label}</span>
                  <span className="truncate text-ink-muted">{a.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </PublicLayout>
  );
}
