import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { cx } from '../lib/format.js';
import { Skeleton } from './ui/States.jsx';

/** Crisp SVG QR code — pure black on white for maximum contrast at the bar. */
export function QrCode({ value, label, className }) {
  const [svg, setSvg] = useState(null);

  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#FFFFFF' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(null));
    return () => {
      alive = false;
    };
  }, [value]);

  if (!svg) return <Skeleton className={cx('aspect-square w-full', className)} />;
  return (
    <div
      role="img"
      aria-label={label}
      className={cx('aspect-square w-full bg-white [&>svg]:h-full [&>svg]:w-full', className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
