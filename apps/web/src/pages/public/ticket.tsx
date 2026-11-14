import { ArrowLeft, Clock3, MapPin, Printer, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
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
        <h1 className="mt-2 font-display text-4xl tracking-tightest">Tiket ini terlindungi token.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Buka tiket melalui tautan dari halaman pesanan atau email konfirmasi. Token juga bisa ditempel
          manual di bawah.
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
        <Link to="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-olive">
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
          className="inline-flex items-center gap-2 text-sm font-semibold text-olive hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke pesanan
        </Link>
        <Button type="button" variant="outline" onClick={() => window.print()} className="border-ink/25">
          <Printer className="h-4 w-4" aria-hidden />
          Cetak tiket
        </Button>
      </div>

      <article className="print-ticket mt-5 border border-ink bg-card">
        <header className="border-b border-ink p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">Gofest · Tiket digital</p>
              <h1 className="mt-2 font-display text-4xl leading-none tracking-tightest sm:text-5xl">
                {ticket.event.title}
              </h1>
            </div>
            <TicketStatusBadge status={ticket.status} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {formatEventWhen(ticket.event.startsAt, ticket.event.endsAt, ticket.event.timezone)}
          </p>
        </header>

        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_200px] sm:p-8">
          <div>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">Pemegang tiket</dt>
                <dd className="mt-1 text-lg font-bold">{ticket.holderName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">Jenis tiket</dt>
                <dd className="mt-1 font-semibold">{ticket.ticketType.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">Kode tiket</dt>
                <dd className="mt-1 font-bold tabular-nums tracking-[0.08em]">{ticket.ticketCode}</dd>
              </div>
              <div className="flex gap-3">
                {ticket.event.type === 'ONLINE' ? (
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-olive" aria-hidden />
                ) : (
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-olive" aria-hidden />
                )}
                <div>
                  <dt className="sr-only">Lokasi</dt>
                  <dd>
                    {ticket.event.type === 'ONLINE'
                      ? 'Acara online'
                      : `${ticket.event.venueName ?? 'Venue'}${ticket.event.address ? ` · ${ticket.event.address}` : ''}`}
                  </dd>
                  {ticket.event.city ? (
                    <dd className="text-xs text-muted-foreground">{ticket.event.city}</dd>
                  ) : null}
                </div>
              </div>
              {ticket.checkedInAt ? (
                <div className="flex gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-olive" aria-hidden />
                  <div>
                    <dt className="sr-only">Check-in</dt>
                    <dd>Check-in {formatDateTime(ticket.checkedInAt, ticket.event.timezone)}</dd>
                  </div>
                </div>
              ) : null}
            </dl>

            {ticket.event.onlineAccessUrl ? (
              <div className="mt-5 border-l-2 border-olive pl-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">Akses acara online</p>
                <a
                  href={ticket.event.onlineAccessUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all text-sm font-semibold underline underline-offset-4"
                >
                  {ticket.event.onlineAccessUrl}
                </a>
                {ticket.event.onlineAccessNote ? (
                  <p className="mt-1 text-xs text-muted-foreground">{ticket.event.onlineAccessNote}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="sm:border-l sm:border-dashed sm:border-warm-border sm:pl-6">
            {invalid ? (
              <div className="flex h-40 items-center justify-center border border-brick/30 bg-brick/5 p-4 text-center text-sm font-semibold text-brick">
                QR tidak berlaku karena tiket sudah {ticket.status === 'REFUNDED' ? 'di-refund' : 'dibatalkan'}.
              </div>
            ) : (
              <img
                src={ticket.qrUrl}
                alt={`QR tiket ${ticket.ticketCode}`}
                width={400}
                height={400}
                className="w-full max-w-[200px] border border-warm-border bg-white p-2"
              />
            )}
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
              Tunjukkan QR ini di pintu masuk. Setiap tiket hanya dapat dipindai sekali.
            </p>
          </div>
        </div>

        <footer className="border-t border-ink px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>
              Pesanan <span className="font-semibold tabular-nums">{ticket.orderCode}</span>
            </p>
            <p>
              Diterbitkan {formatDateTime(ticket.issuedAt, ticket.event.timezone)}
            </p>
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
              <Button type="button" variant="outline" className="border-ink/25" disabled={regenerating}>
                <RefreshCw className={regenerating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
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
        <p className="no-print mt-3 text-sm font-semibold text-brick" role="alert">
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