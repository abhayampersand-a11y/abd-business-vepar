'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import clsx from 'clsx';
import { Modal, Button } from '@/components/ui';

export type ScanOutcome = { ok: boolean; message: string };

type Detect = (video: HTMLVideoElement) => Promise<string | null>;

/** The parts of the Shape Detection API we use; TypeScript's DOM lib lacks it. */
type NativeDetector = {
  new (options: { formats: string[] }): { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> };
  getSupportedFormats(): Promise<string[]>;
};

const WANTED_FORMATS = ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

/** How long a detected code is ignored, so one label held in view adds one unit. */
const REPEAT_COOLDOWN_MS = 2500;
const SCAN_INTERVAL_MS = 150;

/**
 * Uses the browser's own detector where there is one (Chrome on Android also
 * reads printed EAN/UPC barcodes), and falls back to decoding QR frames with
 * jsQR everywhere else — notably iPhone Safari.
 */
async function makeDetector(): Promise<Detect> {
  const Native = (globalThis as { BarcodeDetector?: NativeDetector }).BarcodeDetector;
  if (Native) {
    const supported = await Native.getSupportedFormats().catch(() => [] as string[]);
    const formats = WANTED_FORMATS.filter((f) => supported.includes(f));
    if (formats.length) {
      const detector = new Native({ formats });
      return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
    }
  }

  const { default: jsQR } = await import('jsqr');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    if (!ctx || !video.videoWidth) return null;
    const scale = Math.min(1, 640 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
  };
}

function cameraError(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError') return 'Camera permission was denied. Allow it in the browser settings and try again.';
  if (name === 'NotFoundError') return 'No camera was found on this device.';
  if (!window.isSecureContext) return 'The camera only works when the app is opened over https.';
  return err instanceof Error ? err.message : 'Could not start the camera.';
}

/**
 * Scans QR labels and barcodes with the device camera.
 *
 * `continuous` keeps the camera running after each hit (billing several items);
 * otherwise the first code found is handed over and the caller closes the modal.
 * Mounted conditionally, so the camera is released as soon as it closes.
 */
export function CameraScanModal({
  onClose,
  onScan,
  continuous = false,
  title = 'Scan QR code',
}: {
  onClose: () => void;
  onScan: (text: string) => ScanOutcome | void;
  continuous?: boolean;
  title?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);
  const [last, setLast] = useState<ScanOutcome | null>(null);

  const handleScan = useEffectEvent((text: string) => {
    const outcome = onScan(text);
    if (outcome) setLast(outcome);
  });

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const seen = new Map<string, number>();

    const run = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            window.isSecureContext
              ? 'This browser cannot open the camera.'
              : 'The camera only works when the app is opened over https.',
          );
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        const video = videoRef.current;
        if (stopped || !video) return;
        video.srcObject = stream;
        await video.play();
        const detect = await makeDetector();
        if (stopped) return;
        setStarting(false);

        const tick = async () => {
          if (stopped) return;
          const text = await detect(video).catch(() => null);
          if (stopped) return;
          const now = Date.now();
          if (text && now - (seen.get(text) ?? 0) > REPEAT_COOLDOWN_MS) {
            seen.set(text, now);
            navigator.vibrate?.(60);
            handleScan(text);
            if (!continuous) return;
          }
          timer = setTimeout(tick, SCAN_INTERVAL_MS);
        };
        tick();
      } catch (err) {
        if (!stopped) {
          setStarting(false);
          setError(cameraError(err));
        }
      }
    };
    run();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [continuous]);

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      width="sm"
      footer={
        <Button variant="secondary" onClick={onClose}>
          {continuous ? 'Done' : 'Cancel'}
        </Button>
      }
    >
      {error ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Camera size={28} className="text-ink-faint" />
          <p className="text-[13.5px] text-danger">{error}</p>
        </div>
      ) : (
        <>
          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            {/* Square guide the label should sit inside. */}
            <div className="pointer-events-none absolute inset-[15%] rounded-lg border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
            {starting && (
              <p className="absolute inset-x-0 bottom-3 text-center text-[12.5px] text-white">
                Starting camera…
              </p>
            )}
          </div>
          <p
            className={clsx(
              'mt-3 min-h-5 text-center text-[13px]',
              last ? (last.ok ? 'text-success' : 'text-danger') : 'text-ink-soft',
            )}
          >
            {last?.message ?? 'Hold the QR label inside the square.'}
          </p>
        </>
      )}
    </Modal>
  );
}
