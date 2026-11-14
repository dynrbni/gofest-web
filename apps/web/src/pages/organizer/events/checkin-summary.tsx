import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QrCode, CheckCircle2, AlertTriangle, Users, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { CheckInSummary } from '@/lib/models';
import { Progress } from '@/components/ui/progress';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';

export function EventCheckInSummaryPage() {
  const { id: eventId } = useParams<{ id: string }>();

  const summaryQuery = useQuery({
    queryKey: ['organizer-checkin-summary', eventId],
    queryFn: () => api<CheckInSummary>(`/organizer/events/${eventId}/check-in/summary`),
    enabled: Boolean(eventId),
    refetchInterval: 15_000, // Live poll every 15s during event
  });

  const summary = summaryQuery.data;

  if (summaryQuery.isLoading) {
    return <LoadingState rows={4} label="Memuat ringkasan check-in" />;
  }

  if (summaryQuery.isError || !summary) {
    return (
      <ErrorState
        error={summaryQuery.error ?? new Error('Gagal memuat ringkasan check-in')}
        onRetry={() => void summaryQuery.refetch()}
      />
    );
  }

  const { counts, issued, attendanceRate, recentScans, lastScanAt } = summary;
  const percent = Math.round(attendanceRate ?? 0);

  return (
    <div className="space-y-6">
      <div className="border-b border-warm-border pb-4">
        <h2 className="text-xl font-bold tracking-tight text-ink">Ringkasan Kehadiran & Check-In</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pantau validasi tiket di pintu masuk secara real-time (diperbarui otomatis setiap 15 detik)
        </p>
      </div>

      {/* Progress & Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-warm-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-olive">Tingkat Kehadiran</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{percent}%</p>
          <div className="mt-3">
            <Progress value={percent} className="h-2 bg-warm-muted" />
          </div>
        </div>

        <div className="rounded-md border border-warm-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-olive">Sudah Masuk / Hadir</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{counts.checkedIn}</p>
          <p className="mt-1 text-xs text-muted-foreground">Dari {issued} tiket diterbitkan</p>
        </div>

        <div className="rounded-md border border-warm-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-olive">Belum Check-In</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{counts.valid}</p>
          <p className="mt-1 text-xs text-muted-foreground">Tiket aktif belum dipindai</p>
        </div>

        <div className="rounded-md border border-warm-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-olive">Aktivitas Terakhir</p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {lastScanAt ? formatDateTime(lastScanAt) : 'Belum ada scan'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Waktu scan QR terbaru</p>
        </div>
      </div>

      {/* Recent Scans Log */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-ink">Aktivitas Scan Terbaru</h3>

        {recentScans.length === 0 ? (
          <EmptyState
            title="Belum ada aktivitas pemindaian tiket"
            description="Petugas pintu belum melakukan scan tiket QR untuk acara ini."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-warm-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-warm-border bg-warm-muted/40 font-semibold text-ink">
                <tr>
                  <th className="px-4 py-3">Hasil Pemindaian</th>
                  <th className="px-4 py-3">Pintu / Gate</th>
                  <th className="px-4 py-3 text-right">Waktu Scan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border text-ink">
                {recentScans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-warm-muted/20">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          scan.result === 'VALID'
                            ? 'bg-olive/15 text-olive'
                            : scan.result === 'ALREADY_USED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {scan.result}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{scan.gate ?? 'Pintu Utama'}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatDateTime(scan.scannedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
