import { Gift, MapPin, SlidersHorizontal, Tag } from 'lucide-react';

/** Owner management screens — in the desktop sidebar, and on mobile under "Više". */
export const OWNER_SECONDARY_NAV = [
  { to: '/vlasnik/postavke', label: 'Postavke programa', icon: SlidersHorizontal, description: 'Bodovanje, istek, happy hour, limiti' },
  { to: '/vlasnik/nagrade', label: 'Nagrade', icon: Gift, description: 'Katalog nagrada i nabavne cijene' },
  { to: '/vlasnik/cjenik', label: 'Cjenik', icon: Tag, description: 'Artikli, cijene i bodovi po artiklu' },
  { to: '/vlasnik/lokacije', label: 'Lokacije i osoblje', icon: MapPin, description: 'Lokacije u programu i konobari' },
];
