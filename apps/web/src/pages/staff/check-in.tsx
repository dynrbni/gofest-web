import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QrScanner from 'qr-scanner';
import { ArrowLeft, Camera, CheckCircle2, XCircle, Volume2, VolumeX, Keyboard } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime, formatEventWhen } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import type { ScanResult, CheckInSummary } from '@/lib/models';
import { ErrorState, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Audio feedback using Web Audio API
function playSound(type: 'success' | 'error') {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => {
      void ctx.close();
    };

    if (type === 'success') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15); // E3
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {
    // Ignore audio autoplay restrictions
  }
}

export function StaffCheckInScannerPage() {
  const { id: eventId } = useParams<{ id: string }>();
  useDocumentTitle('Scanner Pintu');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const scanningRef = useRef(false);

  const [gate, setGate] = useState('Pintu Utama');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [sessionCount, setSessionCount] = useState(0);

  // Fetch summary to verify event access & show live numbers
  const summaryQuery = useQuery({
    queryKey: ['staff-checkin-summary', eventId],
    queryFn: () => api<CheckInSummary>(`/check-in/events/${eventId}/summary`),
    enabled: Boolean(eventId),
  });

  const event = summaryQuery.data?.event;
  const refetchSummary = summaryQuery.refetch;

  // Process ticket scan via backend
  const submitScan = useCallback(
    async (payload: { token?: string; ticketCode?: string }) => {
      if (scanningRef.current) return;
      scanningRef.current = true;
      setScanning(true);
      setCameraError(null);

      try {
        const data = await api<ScanResult>('/check-in/scan', {
          method: 'POST',
          body: {
            eventId,
            gate: gate.trim() || undefined,
            idempotencyKey: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            ...payload,
          },
        });

        setLastResult(data);
        if (data.accepted) {
          if (soundEnabled) playSound('success');
          setSessionCount((prev) => prev + 1);
          void refetchSummary();
        } else {
          if (soundEnabled) playSound('error');
        }
      } catch (err) {
        if (soundEnabled) playSound('error');
        setLastResult({
          result: 'INVALID',
          accepted: false,
          message: errorMessage(err),
          scannedAt: new Date().toISOString(),
          replayed: false,
          ticket: null,
        });
      } finally {
        scanningRef.current = false;
        setScanning(false);
      }
    },
    [eventId, gate, soundEnabled, refetchSummary],
  );

  // Handle QR code read from camera
  const onQrDecoded = useCallback(
    (result: QrScanner.ScanResult) => {
      const raw = result.data.trim();
      if (!raw) return;

      // The QR data can be a full URL (/ticket/:code?token=xxx) or raw token string
      try {
        if (raw.includes('token=')) {
          const url = new URL(raw, window.location.origin);
          const token = url.searchParams.get('token');
          if (token) {
            void submitScan({ token });
            return;
          }
        }
      } catch {
        // not a url
      }

      // Default to token payload
      void submitScan({ token: raw });
    },
    [submitScan],
  );

  const decodedCallback = useRef(onQrDecoded);
  useEffect(() => {
    decodedCallback.current = onQrDecoded;
  }, [onQrDecoded]);

  // Keep the camera alive when gate, sound, or request state changes.
  useEffect(() => {
    let active = true;

    if (cameraActive && videoRef.current) {
      const scanner = new QrScanner(videoRef.current, (result) => decodedCallback.current(result), {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
      });
      scannerRef.current = scanner;

      scanner
        .start()
        .then(() => {
          if (!active) scanner.stop();
        })
        .catch((err) => {
          setCameraError(
            err instanceof Error
              ? err.message
              : 'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.',
          );
          setCameraActive(false);
        });
    }

    return () => {
      active = false;
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [cameraActive]);

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    void submitScan({ ticketCode: manualCode.trim().toUpperCase() });
    setManualCode('');
  }

  if (summaryQuery.isLoading) {
    return (
      <main className="container max-w-2xl py-12">
        <LoadingState rows={4} label="Menyiapkan sistem scanner" />
      </main>
    );
  }

  if (summaryQuery.isError || !event) {
    return (
      <main className="container max-w-2xl py-12">
        <ErrorState
          error={summaryQuery.error ?? new Error('Acara tidak ditemukan atau akses terbatas')}
          onRetry={() => void summaryQuery.refetch()}
        />
      </main>
    );
  }

  return (
    <main className="container max-w-3xl py-6 sm:py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-warm-border pb-4 sm:flex-row sm:items-center">
        <div>
          <Link
            to="/staff/events"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Kembali ke daftar tugas
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {event.title}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatEventWhen(event.startsAt, event.endsAt, event.timezone)} ·{' '}
            {event.venueName ?? event.city}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled((val) => !val)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-warm-border px-3 text-xs font-semibold hover:bg-warm-muted"
            title={soundEnabled ? 'Matikan suara feedback' : 'Aktifkan suara feedback'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-4 w-4 text-olive" aria-hidden />
                Suara Aktif
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-muted-foreground" aria-hidden />
                Bisu
              </>
            )}
          </button>

          <div className="rounded-md bg-warm-muted px-3 py-1.5 text-xs font-semibold text-ink tabular-nums">
            Sesi ini: <strong>{sessionCount}</strong> scan
          </div>
        </div>
      </div>

      {/* Gate setting */}
      <div className="flex items-center gap-3 rounded-md border border-warm-border bg-card p-3.5 text-xs">
        <span className="font-semibold text-ink">Lokasi Pintu:</span>
        <input
          value={gate}
          onChange={(e) => setGate(e.target.value)}
          placeholder="Nama pintu (misal: Gate 1, VIP)"
          className="h-8 max-w-[200px] rounded border border-ink/20 px-2.5 outline-none focus:border-ink"
        />
        <span className="text-muted-foreground">Tercatat pada riwayat check-in</span>
      </div>

      {/* Result Presentation Banner */}
      {lastResult ? (
        <div
          role="alert"
          className={`rounded-md border p-6 transition-all ${
            lastResult.accepted
              ? 'border-olive bg-olive/10 text-ink'
              : lastResult.result === 'ALREADY_USED'
                ? 'border-amber-400 bg-amber-50 text-amber-950'
                : 'border-red-400 bg-red-50 text-red-950'
          }`}
        >
          <div className="flex items-start gap-4">
            {lastResult.accepted ? (
              <CheckCircle2 className="h-8 w-8 text-olive shrink-0" aria-hidden />
            ) : (
              <XCircle className="h-8 w-8 text-brick shrink-0" aria-hidden />
            )}

            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider ${
                    lastResult.accepted
                      ? 'bg-olive text-paper'
                      : lastResult.result === 'ALREADY_USED'
                        ? 'bg-amber-600 text-paper'
                        : 'bg-brick text-paper'
                  }`}
                >
                  {lastResult.result === 'VALID'
                    ? 'VALID — BERHASIL MASUK'
                    : lastResult.result === 'ALREADY_USED'
                      ? 'TIKET SUDAH DIGUNAKAN'
                      : lastResult.result}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(lastResult.scannedAt)}
                </span>
              </div>

              <p className="mt-1 text-sm font-semibold">{lastResult.message}</p>

              {lastResult.ticket ? (
                <div className="mt-3 rounded border border-ink/10 bg-paper/80 p-3 text-xs space-y-1 text-ink">
                  <p>
                    Pemegang:{' '}
                    <strong className="text-sm font-bold">{lastResult.ticket.holderName}</strong>
                  </p>
                  <p>
                    Jenis Tiket: <strong>{lastResult.ticket.ticketTypeName}</strong>
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    Kode: {lastResult.ticket.ticketCode} · Order: {lastResult.ticket.orderCode}
                  </p>
                  {lastResult.ticket.checkedInAt ? (
                    <p className="text-amber-800 font-semibold pt-1">
                      Waktu check-in pertama: {formatDateTime(lastResult.ticket.checkedInAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Camera Scanner Viewport */}
      <div className="space-y-4">
        <div className="overflow-hidden rounded-md border border-warm-border bg-ink">
          {cameraActive ? (
            <div className="relative aspect-video w-full bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" />
              {scanning ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-paper font-semibold text-sm">
                  Memvalidasi tiket...
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-paper">
              <Camera className="h-10 w-10 text-warm-muted/60" aria-hidden />
              <h2 className="mt-3 text-lg font-bold text-white">Kamera Belum Aktif</h2>
              <p className="mt-1 max-w-sm text-xs text-warm-muted/80">
                Tekan tombol di bawah untuk meminta izin kamera browser dan mulai memindai QR tiket
                pengunjung.
              </p>
              {cameraError ? (
                <p className="mt-3 max-w-sm text-xs font-semibold text-brick bg-paper px-3 py-1.5 rounded">
                  {cameraError}
                </p>
              ) : null}
              <Button
                onClick={() => setCameraActive(true)}
                className="mt-5 bg-brick text-paper hover:bg-brick/90"
              >
                Aktifkan Kamera Scanner
              </Button>
            </div>
          )}
        </div>

        {cameraActive ? (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Arahkan kamera ke QR Code pada ponsel pengunjung
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCameraActive(false)}
              className="text-xs"
            >
              Matikan Kamera
            </Button>
          </div>
        ) : null}
      </div>

      {/* Manual Input Fallback */}
      <div className="rounded-md border border-warm-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <Keyboard className="h-4 w-4" aria-hidden />
          Fallback: Masukkan Kode Tiket Manual
        </div>
        <p className="text-xs text-muted-foreground">
          Gunakan bila kamera ponsel pengunjung pecah, tidak terbaca, atau scan gagal
        </p>

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <Input
            aria-label="Kode tiket untuk check-in manual"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="Contoh: TIK-89AB12"
            className="font-mono text-sm uppercase"
          />
          <Button type="submit" disabled={scanning || !manualCode.trim()}>
            {scanning ? 'Validasi...' : 'Check-In'}
          </Button>
        </form>
      </div>
    </main>
  );
}
