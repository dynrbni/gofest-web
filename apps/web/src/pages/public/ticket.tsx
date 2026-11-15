import { ArrowLeft, Clock3, MapPin, Printer, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { BrandLogo } from '@/components/common/brand-logo';
import { TicketStatusBadge } from '@/components/common/status-badge';
import { ErrorState, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatDateTime, formatEventWhen } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import type { TicketPageRecord } from '@/lib/models';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function TicketPage() {
  const { ticketCode } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [tokenInput, setTokenInput] = useState('');
  const [actionError, setActionError] = useState<unknown>(null);
  useDocumentTitle(ticketCode ? `Tiket ${ticketCode}` : 'Tiket');

  const ticketQuery = useQuery({
    queryKey: ['ticket', ticketCode, token],
    queryFn: () =>
      api<{ ticket: TicketPageRecord }>(`/tickets/${encodeURIComponent(ticketCode!)}`, {
        orderToken: token || undefined,
      }),
    enabled: Boolean(ticketCode),
    retry: false,
  });

  const ticket = ticketQuery.data?.ticket;
  const accessDenied = ticketQuery.error instanceof ApiError && ticketQuery.error.status === 401;
  const [regenerating, setRegenerating] = useState(false);

  async function regenerate() {
    if (!ticket) return;
    setActionError(null);
    setRegenerating(true);
    try {
      await api(
        `/orders/${encodeURIComponent(ticket.orderCode)}/tickets/${encodeURIComponent(ticket.id)}/qr/regenerate`,
        { method: 'POST', orderToken: token || undefined },
      );
      toast.success('QR baru dibuat. QR lama tidak berlaku.');
      await ticketQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ['order-status', ticket.orderCode] });
    } catch (error) {
      setActionError(error);
    } finally {
      setRegenerating(false);
    }
  }

  if (ticketQuery.isLoading) {
    return (
      <main className="container max-w-3xl py-10">
        <LoadingState rows={3} label="Memuat tiket" />
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main className="container max-w-lg py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">Akses tiket</p>
        <h1 className="mt-2 font-display text-4xl tracking-tightest">
          Tiket ini terlindungi token.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Buka tiket melalui tautan dari halaman pesanan atau email konfirmasi. Token juga bisa
          ditempel manual di bawah.
        </p>
        <form
          className="mt-6 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!tokenInput.trim()) return;
            setToken(tokenInput.trim());
          }}
        >
          <label htmlFor="ticket-token" className="block text-sm font-semibold">
            Token akses order
          </label>
          <Input
            id="ticket-token"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Tempel token akses"
            className="h-11 border-ink/25 bg-card"
          />
          <Button type="submit" className="h-10 bg-ink px-4 text-paper">
            Buka tiket
          </Button>
        </form>
      </main>
    );
  }

  if (ticketQuery.isError || !ticket) {
    return (
      <main className="container max-w-3xl py-14">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-olive"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke jelajah acara
        </Link>
        <ErrorState
          className="mt-6"
          error={ticketQuery.error}
          onRetry={() => void ticketQuery.refetch()}
          title="Tiket tidak dapat dibuka"
        />
      </main>
    );
  }

  const invalid = ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED';

  return (
    <main className="container max-w-3xl py-8 sm:py-12">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/order/${ticket.orderCode}${token ? `?token=${encodeURIComponent(token)}` : ''}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke pesanan
        </Link>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.print()}
          className="rounded-xl border-slate-200 font-bold text-xs"
        >
          <Printer className="h-4 w-4 mr-1.5" aria-hidden />
          Cetak E-Tiket
        </Button>
      </div>

      <article className="print-ticket mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl">
        <header className="border-b border-slate-100 bg-slate-50/50 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <BrandLogo className="mb-3 h-8 sm:h-8" />
              <p className="text-xs font-semibold text-blue-600">Tiket digital</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {ticket.event.title}
              </h1>
            </div>
            <TicketStatusBadge status={ticket.status} />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            {formatEventWhen(ticket.event.startsAt, ticket.event.endsAt, ticket.event.timezone)}
          </p>
        </header>

        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_220px] sm:p-8">
          <div>
            <dl className="space-y-4 text-xs">
              <div>
                <dt className="font-bold uppercase tracking-wider text-slate-400">
                  Pemegang Tiket
                </dt>
                <dd className="mt-0.5 text-base font-extrabold text-slate-900">
                  {ticket.holderName}
                </dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wider text-slate-400">
                  Kategori Tiket
                </dt>
                <dd className="mt-0.5 font-bold text-slate-800">{ticket.ticketType.name}</dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wider text-slate-400">
                  Kode Tiket (Barcode Ref)
                </dt>
                <dd className="mt-0.5 font-mono text-base font-black text-blue-600 tabular-nums tracking-wider">
                  {ticket.ticketCode}
                </dd>
              </div>
              <div className="flex gap-2.5">
                {ticket.event.type === 'ONLINE' ? (
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                ) : (
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                )}
                <div>
                  <dt className="sr-only">Lokasi</dt>
                  <dd className="font-semibold text-slate-800">
                    {ticket.event.type === 'ONLINE'
                      ? 'Acara Online (Virtual)'
                      : `${ticket.event.venueName ?? 'Venue'}${ticket.event.address ? ` · ${ticket.event.address}` : ''}`}
                  </dd>
                  {ticket.event.city ? (
                    <dd className="text-slate-500">{ticket.event.city}</dd>
                  ) : null}
                </div>
              </div>
              {ticket.checkedInAt ? (
                <div className="flex gap-2.5">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <div>
                    <dt className="sr-only">Check-in</dt>
                    <dd className="font-bold text-emerald-700">
                      Check-in berhasil: {formatDateTime(ticket.checkedInAt, ticket.event.timezone)}
                    </dd>
                  </div>
                </div>
              ) : null}
            </dl>

            {ticket.event.onlineAccessUrl ? (
              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Tautan Streaming Online
                </p>
                <a
                  href={ticket.event.onlineAccessUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all text-xs font-bold text-blue-600 underline underline-offset-4"
                >
                  {ticket.event.onlineAccessUrl}
                </a>
                {ticket.event.onlineAccessNote ? (
                  <p className="mt-1 text-[11px] text-slate-500">{ticket.event.onlineAccessNote}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-center justify-center sm:border-l sm:border-dashed sm:border-slate-200 sm:pl-6">
            {invalid ? (
              <div className="flex h-44 w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-xs font-bold text-rose-700">
                QR tidak berlaku karena tiket sudah{' '}
                {ticket.status === 'REFUNDED' ? 'di-refund' : 'dibatalkan'}.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                <img
                  src={ticket.qrUrl}
                  alt={`QR tiket ${ticket.ticketCode}`}
                  width={400}
                  height={400}
                  className="w-full max-w-[170px]"
                />
              </div>
            )}
            <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">
              Tunjukkan QR barcode ini di gate masuk kepada petugas scanner.
            </p>
          </div>
        </div>

        <footer className="border-t border-slate-100 bg-slate-50/50 px-6 py-3.5 sm:px-8 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>
              Nomor Pesanan:{' '}
              <span className="font-mono font-bold text-slate-800 tabular-nums">
                {ticket.orderCode}
              </span>
            </p>
            <p>Diterbitkan: {formatDateTime(ticket.issuedAt, ticket.event.timezone)}</p>
          </div>
        </footer>
      </article>

      {!invalid && ticket.status === 'VALID' ? (
        <div className="no-print mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Bila QR sudah tersebar, buat ulang agar token lama tidak dapat dipakai. Tiket yang sudah
            check-in tidak dapat diperbarui.
          </p>
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-slate-200 text-xs font-bold"
                disabled={regenerating}
              >
                <RefreshCw
                  className={regenerating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
                  aria-hidden
                />
                Buat ulang QR
              </Button>
            }
            title="Buat ulang QR tiket?"
            description="QR lama langsung tidak berlaku. Kamu perlu menunjukkan QR baru saat check-in."
            confirmLabel="Buat ulang QR"
            onConfirm={() => void regenerate()}
          />
        </div>
      ) : null}

      {actionError ? (
        <p className="no-print mt-3 text-sm font-semibold text-rose-600" role="alert">
          {errorMessage(actionError)}
        </p>
      ) : null}

      <p className="no-print mt-6 text-[11px] leading-relaxed text-muted-foreground">
        Simpan tautan halaman ini atau cetak tiket. Tautan memuat token akses pribadi, jadi jangan
        dibagikan ke orang lain.
      </p>
    </main>
  );
}
