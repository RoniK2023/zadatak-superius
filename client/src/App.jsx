import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  Ellipsis, Gift, History, LayoutDashboard, MapPin, QrCode, ReceiptText, ScanLine, ScrollText,
  SlidersHorizontal, Store, Tag, Trophy,
} from 'lucide-react';
import { AppShell } from './components/layout/AppShell.jsx';
import { Spinner } from './components/ui/Spinner.jsx';
import { HOME_BY_ROLE, useAuth } from './context/AuthContext.jsx';

import Landing from './pages/public/Landing.jsx';
import Login from './pages/public/Login.jsx';
import Register from './pages/public/Register.jsx';
import NotFound from './pages/public/NotFound.jsx';

import GuestCard from './pages/guest/GuestCard.jsx';
import GuestRewards from './pages/guest/GuestRewards.jsx';
import GuestHistory from './pages/guest/GuestHistory.jsx';

import WaiterRegister from './pages/waiter/WaiterRegister.jsx';
import WaiterAward from './pages/waiter/WaiterAward.jsx';
import WaiterRedeem from './pages/waiter/WaiterRedeem.jsx';

import OwnerOverview from './pages/owner/OwnerOverview.jsx';
import OwnerTopGuests from './pages/owner/OwnerTopGuests.jsx';
import OwnerActivity from './pages/owner/OwnerActivity.jsx';
import OwnerSettings from './pages/owner/OwnerSettings.jsx';
import OwnerRewards from './pages/owner/OwnerRewards.jsx';
import OwnerProducts from './pages/owner/OwnerProducts.jsx';
import OwnerLocations from './pages/owner/OwnerLocations.jsx';
import OwnerMore from './pages/owner/OwnerMore.jsx';

import AdminTenants from './pages/AdminTenants.jsx';

const GUEST_NAV = [
  { to: '/gost', label: 'Moja kartica', shortLabel: 'Kartica', icon: QrCode, end: true },
  { to: '/gost/nagrade', label: 'Nagrade', icon: Gift },
  { to: '/gost/povijest', label: 'Povijest', icon: History },
];

const WAITER_NAV = [
  { to: '/konobar', label: 'Blagajna (simulacija)', shortLabel: 'Blagajna', icon: ReceiptText, end: true },
  { to: '/konobar/bodovi', label: 'Dodjela bodova', shortLabel: 'Bodovi', icon: ScanLine },
  { to: '/konobar/nagrade', label: 'Iskorištavanje nagrade', shortLabel: 'Nagrade', icon: Gift },
];

export const OWNER_SECONDARY_NAV = [
  { to: '/vlasnik/postavke', label: 'Postavke programa', icon: SlidersHorizontal, description: 'Bodovanje, istek, happy hour, limiti' },
  { to: '/vlasnik/nagrade', label: 'Nagrade', icon: Gift, description: 'Katalog nagrada i nabavne cijene' },
  { to: '/vlasnik/cjenik', label: 'Cjenik', icon: Tag, description: 'Artikli, cijene i bodovi po artiklu' },
  { to: '/vlasnik/lokacije', label: 'Lokacije i osoblje', icon: MapPin, description: 'Lokacije u programu i konobari' },
];

const OWNER_NAV = [
  { to: '/vlasnik', label: 'Pregled', icon: LayoutDashboard, end: true },
  { to: '/vlasnik/gosti', label: 'Najbolji gosti', shortLabel: 'Gosti', icon: Trophy },
  { to: '/vlasnik/aktivnost', label: 'Aktivnost', icon: ScrollText },
  ...OWNER_SECONDARY_NAV.map((item) => ({ ...item, mobile: false })),
  { to: '/vlasnik/vise', label: 'Više', icon: Ellipsis, mobileOnly: true },
];

const ADMIN_NAV = [{ to: '/admin', label: 'Firme', icon: Store, end: true }];

function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-ink-muted" role="status" aria-label="Učitavanje">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

/** Route guard: checks login and role. (The server enforces the same rules on every endpoint.) */
function RequireRole({ role, children }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/r/:tenantSlug" element={<Register />} />

      <Route
        path="/gost"
        element={
          <RequireRole role="GUEST">
            <AppShell nav={GUEST_NAV} contextLabel="Član programa" />
          </RequireRole>
        }
      >
        <Route index element={<GuestCard />} />
        <Route path="nagrade" element={<GuestRewards />} />
        <Route path="povijest" element={<GuestHistory />} />
      </Route>

      <Route
        path="/konobar"
        element={
          <RequireRole role="WAITER">
            <AppShell nav={WAITER_NAV} contextLabel={user?.location ? `Konobar · ${user.location.name}` : 'Konobar'} />
          </RequireRole>
        }
      >
        <Route index element={<WaiterRegister />} />
        <Route path="bodovi" element={<WaiterAward />} />
        <Route path="nagrade" element={<WaiterRedeem />} />
      </Route>

      <Route
        path="/vlasnik"
        element={
          <RequireRole role="OWNER">
            <AppShell nav={OWNER_NAV} contextLabel="Vlasnik" />
          </RequireRole>
        }
      >
        <Route index element={<OwnerOverview />} />
        <Route path="gosti" element={<OwnerTopGuests />} />
        <Route path="aktivnost" element={<OwnerActivity />} />
        <Route path="postavke" element={<OwnerSettings />} />
        <Route path="nagrade" element={<OwnerRewards />} />
        <Route path="cjenik" element={<OwnerProducts />} />
        <Route path="lokacije" element={<OwnerLocations />} />
        <Route path="vise" element={<OwnerMore />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireRole role="SUPERADMIN">
            <AppShell nav={ADMIN_NAV} contextLabel="Superius" />
          </RequireRole>
        }
      >
        <Route index element={<AdminTenants />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
