import { useEffect, useRef } from 'react';
import { useToast } from '../../components/ui/Toast.jsx';
import { formatPoints } from '../../lib/format.js';
import { useApi } from '../../lib/useApi.js';

/** Loads the guest profile (lazy expiry runs on the server) and tells the guest if points expired. */
export function useGuest() {
  const result = useApi('/guest/me');
  const toast = useToast();
  const notified = useRef(false);

  useEffect(() => {
    if (result.data?.expiredPoints > 0 && !notified.current) {
      notified.current = true;
      toast.warning('Vaši bodovi su istekli', `${formatPoints(result.data.expiredPoints)} je resetirano na 0.`);
    }
  }, [result.data, toast]);

  return result;
}
