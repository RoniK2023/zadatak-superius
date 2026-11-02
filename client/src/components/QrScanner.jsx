import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Camera, CameraOff, Keyboard } from 'lucide-react';
import { Button } from './ui/Button.jsx';
import { Input } from './ui/Field.jsx';
import { Notice } from './ui/States.jsx';

/**
 * Guest QR input: camera scanning (html5-qrcode) with manual code entry as a fallback
 * (e.g. demo on a laptop without a camera).
 */
export function QrScanner({ onCode, busy = false, disabled = false, submitLabel = 'Potvrdi kod' }) {
  const regionId = `qr-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const scannerRef = useRef(null);
  const handledRef = useRef(false);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const [mode, setMode] = useState('idle'); // idle | starting | scanning
  const [cameraError, setCameraError] = useState(null);
  const [manual, setManual] = useState('');
  const [manualError, setManualError] = useState(null);

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop();
        scanner.clear();
      } catch {
        /* already stopped */
      }
    }
    setMode('idle');
  }, []);

  useEffect(() => {
    if (mode !== 'starting') return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const scanner = new Html5Qrcode(regionId, { verbose: false });
        scannerRef.current = scanner;
        handledRef.current = false;
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (w, h) => {
              const size = Math.floor(Math.min(w, h) * 0.7);
              return { width: size, height: size };
            },
          },
          (text) => {
            if (handledRef.current) return;
            handledRef.current = true;
            stop();
            onCodeRef.current(text.trim());
          },
          () => {},
        );
        if (!cancelled) setMode('scanning');
      } catch (err) {
        if (cancelled) return;
        scannerRef.current = null;
        setMode('idle');
        setCameraError(
          String(err?.name ?? err).includes('NotAllowed')
            ? 'Pristup kameri nije dopušten. Dopustite kameru u pregledniku ili upišite kod ručno.'
            : 'Kamera nije dostupna na ovom uređaju. Upišite kod gosta ručno.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, regionId, stop]);

  useEffect(() => () => void stop(), [stop]);

  const submitManual = (e) => {
    e.preventDefault();
    const code = manual.trim();
    if (code.replace(/[^0-9a-z]/gi, '').length < 4) {
      setManualError('Unesite kod s kartice gosta (npr. K7M2-QX9P-4TRA).');
      return;
    }
    setManualError(null);
    onCode(code);
  };

  const active = mode !== 'idle';

  return (
    <div className="space-y-5">
      <div>
        <div
          className={active ? 'relative overflow-hidden rounded-lg border border-line bg-black' : 'hidden'}
          aria-live="polite"
        >
          <div id={regionId} className="aspect-square w-full sm:aspect-video [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
          {mode === 'starting' && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-white">Pokrećem kameru…</p>
          )}
        </div>
        {active ? (
          <Button variant="secondary" size="xl" block icon={CameraOff} className="mt-3" onClick={stop}>
            Zaustavi kameru
          </Button>
        ) : (
          <Button
            size="xl"
            block
            icon={Camera}
            disabled={disabled || busy}
            onClick={() => {
              setCameraError(null);
              setMode('starting');
            }}
          >
            Skeniraj QR kod gosta
          </Button>
        )}
        {cameraError && (
          <Notice tone="warning" icon={CameraOff} className="mt-3">
            {cameraError}
          </Notice>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs font-medium text-ink-muted">
        <span className="h-px flex-1 bg-line" />
        ili upišite kod
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submitManual} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Input
          className="flex-1"
          aria-label="Kod gosta"
          placeholder="npr. K7M2-QX9P-4TRA"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          inputClassName="h-12 font-mono text-base uppercase tracking-wider placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
          value={manual}
          onChange={(e) => {
            setManual(e.target.value);
            setManualError(null);
          }}
          error={manualError}
          disabled={disabled}
        />
        <Button type="submit" variant="secondary" size="lg" icon={Keyboard} loading={busy} disabled={disabled} className="sm:w-auto">
          {submitLabel}
        </Button>
      </form>
    </div>
  );
}
