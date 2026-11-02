import { useEffect } from 'react';
import { Compass } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/States.jsx';
import { PublicLayout } from './PublicLayout.jsx';

export default function NotFound() {
  useEffect(() => {
    document.title = 'Stranica nije pronađena · Mandrač Loyalty';
  }, []);
  return (
    <PublicLayout>
      <EmptyState
        className="py-24"
        icon={Compass}
        title="Stranica nije pronađena"
        description="Poveznica je možda zastarjela ili pogrešno upisana."
        action={<ButtonLink to="/">Na početnu</ButtonLink>}
      />
    </PublicLayout>
  );
}
