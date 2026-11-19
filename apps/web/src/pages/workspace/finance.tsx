import { usePeriod, useWorkspace } from '@/pages/workspace/workspace-hooks';
import { useState, type FormEvent } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, apiPage, errorMessage } from '@/lib/api';
import { formatIDR, formatDateTime, fromDateTimeInput } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, InlineError } from '@/components/common/states';
import { Pagination } from '@/components/common/pagination';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  WorkspaceHeading,
  Metric,
  Panel,
  DataTable,
  Status,
  QueryState,
} from './workspace-components';
import type {
  FinancialData,
  BankAccount,
  Payout,
  EventReport,
  LedgerEntry,
} from './workspace-models';

type FinanceLine = { label: string; amount: number | null };

function FinanceBreakdown({ lines }: { lines: FinanceLine[] }) {
  return (
    <dl className="divide-y divide-slate-200">
      {lines.map(({ label, amount }) => (
        <div
          key={label}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
        >
          <dt className="text-sm text-slate-700">{label}</dt>
          <dd className="break-all text-sm font-semibold tabular-nums text-slate-900">
            {amount === null ? 'Belum tersedia' : formatIDR(amount)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function FinanceOverviewPage() {
  const { apiBase, creator, base } = useWorkspace();
  const period = usePeriod();
  const query = useQuery({
    queryKey: ['finance', apiBase, period.query],
    queryFn: () => api<FinancialData>(`${apiBase}/financial-overview`, { query: period.query }),
    enabled: period.enabled,
  });
  const data = query.data;

  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title={creator ? 'Ringkasan pendapatan' : 'Financial Overview'}
        description={
          creator
            ? 'Lihat hasil penjualan tiket dan saldo yang dapat dicairkan.'
            : 'Penjualan tiket merupakan dana organizer. Pendapatan GOFEST berasal dari biaya layanan.'
        }
      />
      {period.controls}
      <QueryState query={query}>
        {data && (
          <>
            <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-2">
              <section className="min-w-0 border-b border-slate-200 p-5 sm:p-6 lg:border-b-0 lg:border-r">
                <h2 className="font-semibold text-slate-900">
                  {creator ? 'Pendapatan tiket setelah refund' : 'Pendapatan bersih biaya layanan'}
                </h2>
                <p className="mt-2 break-all text-3xl font-semibold tabular-nums tracking-tight text-slate-950">
                  {formatIDR(creator ? data.organizerProceeds : data.netFeeIncome)}
                </p>
                <p className="mb-3 mt-2 text-sm text-slate-600">
                  {creator
                    ? 'Untuk periode terpilih, sebelum biaya penyelenggaraan.'
                    : data.netFeeIncomeProvisional
                      ? 'Perkiraan untuk periode terpilih. Biaya payment gateway belum tersedia.'
                      : 'Untuk periode terpilih, sebelum pajak dan biaya operasional.'}
                </p>
                <FinanceBreakdown
                  lines={[
                    { label: 'Penjualan tiket setelah diskon', amount: data.grossTicketSales },
                    { label: 'Biaya layanan GOFEST', amount: data.serviceFeeRevenue },
                    { label: 'Refund tiket dan biaya layanan', amount: data.totalRefunds },
                    ...(!creator
                      ? [{ label: 'Biaya payment gateway', amount: data.paymentGatewayCosts }]
                      : []),
                  ]}
                />
              </section>
              <section className="min-w-0 bg-slate-50 p-5 sm:p-6">
                <h2 className="font-semibold text-slate-900">
                  {creator ? 'Saldo tersedia' : 'Dana organizer'}
                </h2>
                <p className="mt-2 break-all text-3xl font-semibold tabular-nums tracking-tight text-slate-950">
                  {formatIDR(creator ? data.availableBalance : data.outstandingOrganizerFunds)}
                </p>
                <p className="mb-3 mt-2 text-sm text-slate-600">
                  Saldo saat ini, di luar filter periode.
                </p>
                {creator && (
                  <FinanceBreakdown
                    lines={[
                      { label: 'Saldo dicadangkan', amount: data.reservedBalance },
                      { label: 'Saldo tertunda', amount: data.pendingBalance },
                      { label: 'Total sudah dicairkan', amount: data.totalWithdrawn },
                    ]}
                  />
                )}
                <Button variant="outline" className="mt-3" asChild>
                  <Link to={`${base}/payouts`}>
                    {creator ? 'Lihat pencairan' : 'Kelola payout'}
                  </Link>
                </Button>
              </section>
            </div>
            {creator && <EventRevenuePreview />}
          </>
        )}
      </QueryState>
    </div>
  );
}

export function BankAccountsPage() {
  const { apiBase } = useWorkspace();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['banks', apiBase],
    queryFn: () => api<{ accounts: BankAccount[] }>(`${apiBase}/bank-accounts`),
  });
  const [bankName, setBankName] = useState('');
  const [accountHolder, setHolder] = useState('');
  const [accountNumber, setNumber] = useState('');
  const save = useMutation({
    mutationFn: () =>
      api(`${apiBase}/bank-accounts`, {
        method: 'POST',
        body: { bankName, accountHolder, accountNumber },
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['banks'] });
      setBankName('');
      setHolder('');
      setNumber('');
      toast.success('Rekening disimpan');
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`${apiBase}/bank-accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Rekening dinonaktifkan');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title="Rekening bank"
        description="Simpan rekening tujuan withdrawal atas nama penyelenggara. Nomor rekening ditampilkan dengan masking."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,.65fr)]">
        <Panel title="Rekening tersimpan">
          <QueryState query={query} empty={query.data?.accounts.length === 0}>
            <ul className="space-y-4">
              {query.data?.accounts.map((bank) => (
                <li key={bank.id} className="rounded-lg border border-slate-200 p-4">
                  <p className="font-medium">{bank.bankName}</p>
                  <p className="mt-2 text-sm">{bank.accountHolder}</p>
                  <p className="mt-1 text-sm tabular-nums text-slate-600">{bank.accountNumber}</p>
                  <ConfirmDialog
                    title="Nonaktifkan rekening?"
                    description="Permintaan withdrawal yang sudah dibuat tetap menyimpan snapshot rekening ini."
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        disabled={remove.isPending}
                      >
                        Nonaktifkan
                      </Button>
                    }
                    onConfirm={() => remove.mutate(bank.id)}
                  />
                </li>
              ))}
            </ul>
          </QueryState>
        </Panel>
        <Panel title="Tambah rekening">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <Field label="Nama bank" htmlFor="bank-name" required>
              <Input
                id="bank-name"
                value={bankName}
                minLength={2}
                maxLength={100}
                required
                onChange={(event) => setBankName(event.target.value)}
              />
            </Field>
            <Field label="Nama pemilik rekening" htmlFor="bank-holder" required>
              <Input
                id="bank-holder"
                value={accountHolder}
                minLength={2}
                maxLength={150}
                required
                onChange={(event) => setHolder(event.target.value)}
              />
            </Field>
            <Field
              label="Nomor rekening"
              htmlFor="bank-number"
              required
              hint="6–30 digit angka, tanpa spasi."
            >
              <Input
                id="bank-number"
                value={accountNumber}
                inputMode="numeric"
                pattern="[0-9]{6,30}"
                maxLength={30}
                autoComplete="off"
                required
                onChange={(event) => setNumber(event.target.value)}
              />
            </Field>
            <InlineError error={save.error} />
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Menyimpan…' : 'Simpan rekening'}
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}

export function PayoutsPage() {
  const { apiBase, creator, base } = useWorkspace();
  const history = useLocation().pathname.includes('history');
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [selected, setSelected] = useState<Payout | null>(null);
  const [review, setReview] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [note, setNote] = useState('');
  const list = useQuery({
    queryKey: ['payouts', apiBase, page, status, search],
    queryFn: () => apiPage<Payout>(`${apiBase}/payouts`, { query: { page, status, q: search } }),
  });
  const wallet = useQuery({
    queryKey: ['finance', apiBase, 'all'],
    queryFn: () =>
      api<FinancialData>(`${apiBase}/financial-overview`, { query: { period: 'all' } }),
    enabled: creator,
  });
  const banks = useQuery({
    queryKey: ['banks', apiBase],
    queryFn: () => api<{ accounts: BankAccount[] }>(`${apiBase}/bank-accounts`),
    enabled: creator,
  });
  const detail = useQuery({
    queryKey: ['payout-detail', apiBase, selected?.id],
    queryFn: () => api<{ payout: Payout }>(`${apiBase}/payouts/${selected!.id}`),
    enabled: Boolean(selected),
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['payouts'] });
    void client.invalidateQueries({ queryKey: ['finance'] });
    void client.invalidateQueries({ queryKey: ['workspace-analytics'] });
    void client.invalidateQueries({ queryKey: ['payout-detail'] });
  };
  const request = useMutation({
    mutationFn: () =>
      api(`${apiBase}/payouts`, {
        method: 'POST',
        body: { amount: Number(amount), bankAccountId: bankId, idempotencyKey: key },
      }),
    onSuccess: () => {
      refresh();
      setAmount('');
      setKey(crypto.randomUUID());
      toast.success('Withdrawal diajukan. Dana direservasi untuk ditinjau admin.');
    },
  });
  const decision = useMutation({
    mutationFn: () =>
      api(`${apiBase}/payouts/${selected!.id}/review`, {
        method: 'PATCH',
        body: { status: review, note },
      }),
    onSuccess: () => {
      refresh();
      setReview(null);
      setNote('');
      toast.success('Keputusan tersimpan. Tidak ada transfer dana.');
    },
  });
  const current = detail.data?.payout ?? selected;
  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title={history ? 'Riwayat payout' : creator ? 'Payouts & saldo' : 'Payout Management'}
        description="Workflow withdrawal internal. Persetujuan admin menunggu integrasi payout provider; dana belum ditransfer."
      />
      {creator ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              label="Saldo tersedia"
              value={
                wallet.isLoading
                  ? 'Memuat…'
                  : wallet.data
                    ? formatIDR(wallet.data.availableBalance)
                    : 'Tidak tersedia'
              }
            />
            <Metric
              label="Saldo direservasi"
              value={wallet.data ? formatIDR(wallet.data.reservedBalance) : '—'}
            />
            <Metric
              label="Total ditarik"
              value={wallet.data ? formatIDR(wallet.data.totalWithdrawn) : '—'}
            />
          </div>
          {wallet.isError ? <InlineError error={wallet.error} /> : null}
          {!history ? (
            <Panel
              title="Ajukan withdrawal"
              description="Dana langsung direservasi setelah permintaan berhasil dibuat."
            >
              <form
                className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  request.mutate();
                }}
              >
                <Field label="Rekening tujuan" htmlFor="payout-bank" required>
                  <select
                    id="payout-bank"
                    required
                    value={bankId}
                    onChange={(event) => {
                      setBankId(event.target.value);
                      setKey(crypto.randomUUID());
                    }}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                  >
                    <option value="">Pilih rekening</option>
                    {banks.data?.accounts.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName} · {bank.accountNumber}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Nominal (Rp)" htmlFor="payout-amount" required>
                  <Input
                    id="payout-amount"
                    required
                    type="number"
                    min={1}
                    step={1}
                    max={wallet.data?.availableBalance ?? 0}
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setKey(crypto.randomUUID());
                    }}
                  />
                </Field>
                <Button
                  type="submit"
                  disabled={request.isPending || !banks.data?.accounts.length || !wallet.data}
                >
                  {request.isPending ? 'Mengajukan…' : 'Ajukan withdrawal'}
                </Button>
                <div className="sm:col-span-3">
                  <InlineError error={request.error ?? banks.error} />
                  {!banks.isLoading && banks.data?.accounts.length === 0 ? (
                    <Link
                      className="text-sm font-medium text-blue-700"
                      to={`${base}/bank-accounts`}
                    >
                      Tambahkan rekening bank terlebih dahulu
                    </Link>
                  ) : null}
                </div>
              </form>
            </Panel>
          ) : null}
        </>
      ) : null}
      <Panel title="Daftar withdrawal">
        <div className="mb-5 flex flex-wrap gap-3">
          <label className="grid gap-1.5 text-xs font-medium">
            Cari withdrawal
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="ID atau nama organizer"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium">
            Status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">Semua status</option>
              {['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED'].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
        </div>
        <QueryState query={list} empty={list.data?.data.length === 0}>
          <DataTable
            caption="Daftar withdrawal"
            headers={[
              'Withdrawal ID',
              'Organizer',
              'Nominal',
              'Rekening tujuan',
              'Tanggal',
              'Status',
              'Ditinjau oleh',
              'Aksi',
            ]}
          >
            {list.data?.data.map((payout) => (
              <tr key={payout.id}>
                <td className="max-w-40 truncate" title={payout.id}>
                  {payout.id}
                </td>
                <td>{payout.organizer.organizationName}</td>
                <td>{formatIDR(payout.amount)}</td>
                <td>
                  {payout.bankSnapshot.bankName}
                  <span className="mt-1 block text-xs text-slate-600">
                    {payout.bankSnapshot.accountHolder} · {payout.bankSnapshot.accountNumber}
                  </span>
                </td>
                <td>{formatDateTime(payout.createdAt)}</td>
                <td>
                  <Status value={payout.status} />
                </td>
                <td>{payout.reviewedBy?.name ?? '—'}</td>
                <td>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelected(payout);
                      setReview(null);
                      setNote('');
                    }}
                  >
                    Detail
                  </Button>
                </td>
              </tr>
            ))}
          </DataTable>
          <Pagination meta={list.data?.meta} onPageChange={setPage} className="mt-4" />
        </QueryState>
      </Panel>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setReview(null);
            decision.reset();
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Detail withdrawal</DialogTitle>
            <DialogDescription>Tinjau permintaan dan reservasi saldo organizer.</DialogDescription>
          </DialogHeader>
          {current ? (
            <div className="space-y-4">
              <p className="break-all text-xs text-slate-600">{current.id}</p>
              <p className="text-2xl font-semibold tabular-nums">{formatIDR(current.amount)}</p>
              <Status value={current.status} />
              <p className="text-sm">{current.organizer.organizationName}</p>
              <p className="text-sm">
                {current.bankSnapshot.bankName} · {current.bankSnapshot.accountHolder}
                <br />
                {current.bankSnapshot.accountNumber}
              </p>
              {current.wallet ? (
                <p className="text-sm text-slate-600">
                  Saldo tersedia: {formatIDR(current.wallet.available)}
                  <br />
                  Saldo direservasi: {formatIDR(current.wallet.reserved)}
                </p>
              ) : null}
              <p className="rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-900">
                {current.providerMessage}
              </p>
              {current.note ? <p className="text-sm">Catatan: {current.note}</p> : null}
              {current.reviewedBy ? (
                <p className="text-xs text-slate-600">
                  Ditinjau {current.reviewedBy.name} · {formatDateTime(current.reviewedAt!)}
                </p>
              ) : null}
              {current.transactions?.map((transaction) => (
                <p key={transaction.id} className="text-xs text-slate-600">
                  {formatDateTime(transaction.createdAt)} · {transaction.status}
                </p>
              ))}
              {!creator && current.status === 'PENDING' ? (
                <>
                  {review ? (
                    <form
                      className="space-y-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        decision.mutate();
                      }}
                    >
                      <Field
                        label={review === 'APPROVED' ? 'Catatan persetujuan' : 'Alasan penolakan'}
                        htmlFor="payout-note"
                        required
                      >
                        <Textarea
                          id="payout-note"
                          minLength={5}
                          maxLength={1000}
                          required
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                        />
                      </Field>
                      <InlineError error={decision.error} />
                      <Button type="submit" disabled={decision.isPending}>
                        {decision.isPending
                          ? 'Menyimpan…'
                          : review === 'APPROVED'
                            ? 'Konfirmasi persetujuan internal'
                            : 'Konfirmasi penolakan'}
                      </Button>
                    </form>
                  ) : (
                    <div className="flex gap-3">
                      <Button onClick={() => setReview('APPROVED')}>Setujui</Button>
                      <Button variant="outline" onClick={() => setReview('REJECTED')}>
                        Tolak
                      </Button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventRevenuePreview() {
  const { apiBase, base } = useWorkspace();
  const query = useQuery({
    queryKey: ['event-reports-preview', apiBase],
    queryFn: () =>
      apiPage<EventReport>(`${apiBase}/event-reports`, { query: { limit: 4, withSales: 'true' } }),
  });
  const reports = query.data?.data ?? [];

  return (
    <Panel
      title="Pendapatan per event"
      description="Hasil penjualan tiket setelah refund tiket, sepanjang waktu."
      action={
        <Link
          className="text-sm font-medium text-primary hover:underline"
          to={`${base}/event-reports`}
        >
          Lihat semua laporan
        </Link>
      }
    >
      <QueryState query={query}>
        {reports.length ? (
          <ul className="divide-y divide-slate-200">
            {reports.map((report) => (
              <li
                key={report.id}
                className="flex flex-wrap justify-between gap-x-5 gap-y-1 py-3 first:pt-0 last:pb-0"
              >
                <Link
                  to={`${base}/event-reports/${report.id}`}
                  className="min-w-0 break-words text-sm font-medium text-primary hover:underline"
                >
                  {report.title}
                </Link>
                <span className="text-sm font-semibold tabular-nums">
                  {formatIDR(report.organizerProceeds)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">
            Pendapatan tiket akan muncul setelah ada penjualan berbayar.
          </p>
        )}
      </QueryState>
    </Panel>
  );
}

export function EventReportsPage() {
  const { apiBase, base, creator } = useWorkspace();
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['event-reports', apiBase, page, search],
    queryFn: () => apiPage<EventReport>(`${apiBase}/event-reports`, { query: { page, q: search } }),
    enabled: !id,
  });
  const detail = useQuery({
    queryKey: ['event-report', apiBase, id],
    queryFn: () => api<{ report: EventReport }>(`${apiBase}/event-reports/${id}`),
    enabled: Boolean(id),
  });
  const report = detail.data?.report;
  if (id)
    return (
      <div className="space-y-6">
        <WorkspaceHeading
          title={report?.title ?? 'Laporan keuangan event'}
          description="Rekap penjualan, refund, dan pencairan event sepanjang waktu."
          action={
            <Button asChild variant="outline">
              <Link to={`${base}/event-reports`}>Semua laporan</Link>
            </Button>
          }
        />
        <QueryState query={detail}>
          {report ? (
            <div className="grid items-start gap-4 xl:grid-cols-2">
              <Panel
                title="Penjualan tiket"
                description={
                  creator
                    ? 'Pendapatan sebelum biaya penyelenggaraan event.'
                    : report.organizer.organizationName
                }
              >
                <p className="text-sm text-slate-600">Pendapatan setelah refund tiket</p>
                <p className="mb-3 mt-1 break-all text-3xl font-semibold tabular-nums">
                  {formatIDR(report.organizerProceeds)}
                </p>
                <FinanceBreakdown
                  lines={[
                    { label: 'Penjualan setelah diskon', amount: report.grossTicketSales },
                    { label: 'Diskon tiket', amount: report.discountAmount },
                    { label: 'Biaya layanan GOFEST', amount: report.serviceFeeRevenue },
                    { label: 'Refund tiket dan biaya layanan', amount: report.refundAmount },
                  ]}
                />
              </Panel>
              <Panel title="Tiket & pencairan">
                <p className="mb-3 text-sm text-slate-600">
                  <strong className="font-semibold text-slate-950">
                    {report.totalTicketsSold.toLocaleString('id-ID')}
                  </strong>{' '}
                  tiket terjual
                </p>
                <FinanceBreakdown
                  lines={[
                    { label: 'Dana sudah dicairkan', amount: report.paidOutAmount },
                    { label: 'Dana belum dicairkan', amount: report.outstandingBalance },
                  ]}
                />
              </Panel>
            </div>
          ) : null}
        </QueryState>
      </div>
    );
  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title={creator ? 'Laporan pendapatan per event' : 'Laporan keuangan event'}
        description="Rekap penjualan dan pendapatan setelah refund tiket sepanjang waktu."
      />
      <label className="grid max-w-sm gap-2 text-sm font-medium">
        Cari event
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </label>
      <QueryState query={query} empty={query.data?.data.length === 0}>
        <DataTable
          caption="Laporan keuangan per event"
          headers={[
            'Event',
            ...(!creator ? ['Organizer'] : []),
            'Tiket',
            'Penjualan tiket',
            ...(!creator ? ['Diskon', 'Biaya layanan'] : []),
            'Total refund',
            'Pendapatan organizer',
            ...(!creator ? ['Sudah dicairkan', 'Belum dicairkan'] : []),
          ]}
        >
          {query.data?.data.map((report) => (
            <tr key={report.id}>
              <td>
                <Link
                  className="font-medium text-blue-700"
                  to={`${base}/event-reports/${report.id}`}
                >
                  {report.title}
                </Link>
              </td>
              {!creator && <td>{report.organizer.organizationName}</td>}
              <td>{report.totalTicketsSold}</td>
              <td>{formatIDR(report.grossTicketSales)}</td>
              {!creator && (
                <>
                  <td>{formatIDR(report.discountAmount)}</td>
                  <td>{formatIDR(report.serviceFeeRevenue)}</td>
                </>
              )}
              <td>{formatIDR(report.refundAmount)}</td>
              <td className="font-semibold tabular-nums">{formatIDR(report.organizerProceeds)}</td>
              {!creator && (
                <>
                  <td>{formatIDR(report.paidOutAmount)}</td>
                  <td>{formatIDR(report.outstandingBalance)}</td>
                </>
              )}
            </tr>
          ))}
        </DataTable>
        <Pagination meta={query.data?.meta} onPageChange={setPage} />
      </QueryState>
    </div>
  );
}

export function FinancialLedgerPage() {
  const { apiBase } = useWorkspace();
  useDocumentTitle('Financial Ledger');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const validRange = !from || !to || from <= to;
  const query = useQuery({
    queryKey: ['ledger', apiBase, page, search, from, to],
    queryFn: () =>
      apiPage<LedgerEntry>(`${apiBase}/ledger`, {
        query: {
          page,
          q: search.trim(),
          from: from ? fromDateTimeInput(`${from}T00:00:00`) : undefined,
          to: to ? fromDateTimeInput(`${to}T23:59:59.999`) : undefined,
        },
      }),
    enabled: validRange,
  });

  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title="Financial Ledger"
        description="Riwayat pergerakan dana, akun debit dan kredit, serta referensi transaksi."
      />
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label="Cari referensi atau deskripsi" htmlFor="ledger-search">
          <Input
            id="ledger-search"
            type="search"
            value={search}
            maxLength={120}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Dari tanggal" htmlFor="ledger-from">
          <Input
            id="ledger-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Sampai tanggal" htmlFor="ledger-to">
          <Input
            id="ledger-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
          />
        </Field>
      </div>
      {validRange ? (
        <QueryState query={query} empty={query.data?.data.length === 0}>
          <DataTable
            caption="Financial Ledger"
            headers={['Waktu', 'Jenis transaksi', 'Debit', 'Kredit', 'Nominal', 'Referensi']}
          >
            {query.data?.data.map((entry) => (
              <tr key={entry.id}>
                <td>{formatDateTime(entry.createdAt)}</td>
                <td title={entry.description}>{entry.transactionType.replaceAll('_', ' ')}</td>
                <td>{entry.debit}</td>
                <td>{entry.credit}</td>
                <td className="font-medium tabular-nums">{formatIDR(entry.amount)}</td>
                <td className="max-w-56 truncate" title={entry.referenceId}>
                  {entry.referenceId}
                </td>
              </tr>
            ))}
          </DataTable>
          <Pagination meta={query.data?.meta} onPageChange={setPage} className="mt-4" />
        </QueryState>
      ) : (
        <p role="status" className="text-sm text-rose-700">
          Tanggal akhir harus sama dengan atau setelah tanggal awal.
        </p>
      )}
    </div>
  );
}
