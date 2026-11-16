import { usePeriod, useWorkspace } from '@/pages/workspace/workspace-hooks';
import { useState, type FormEvent } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, apiPage, errorMessage } from '@/lib/api';
import { formatIDR, formatDateTime } from '@/lib/format';
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
        title={creator ? 'Pendapatan & saldo' : 'Financial Overview'}
        description={
          creator
            ? 'Hasil penjualan tiket dan alokasi dana dari event Anda. Angka ini tidak menghitung biaya penyelenggaraan event.'
            : 'Penjualan tiket merupakan dana organizer. Pendapatan GOFEST berasal dari service fee.'
        }
        action={
          <Button variant="outline" asChild>
            <Link to={`${base}/event-reports`}>Laporan per event</Link>
          </Button>
        }
      />
      {period.controls}
      <QueryState query={query}>
        {data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Metric
                label="Gross Ticket Sales"
                value={formatIDR(data.grossTicketSales)}
                hint="Harga tiket setelah diskon, sebelum refund"
              />
              <Metric
                label="Service Fee Revenue"
                value={formatIDR(data.serviceFeeRevenue)}
                hint={
                  creator ? 'Biaya layanan transaksi GOFEST' : 'Hak GOFEST sebelum pengembalian fee'
                }
              />
              <Metric
                label="Total Refunds"
                value={formatIDR(data.totalRefunds)}
                hint="Refund yang telah dicatat; simulasi internal pada development"
              />
              {creator ? (
                <Metric
                  label="Organizer proceeds"
                  value={formatIDR(data.organizerProceeds)}
                  hint="Penjualan tiket dikurangi refund harga tiket; bukan laba bersih EO"
                />
              ) : (
                <>
                  <Metric
                    label="Payment Gateway Costs"
                    value={
                      data.paymentGatewayCosts === null
                        ? 'Belum dikonfigurasi'
                        : formatIDR(data.paymentGatewayCosts)
                    }
                    hint="Biaya provider yang ditanggung GOFEST"
                  />
                  <Metric
                    label="Net Fee Income"
                    value={formatIDR(data.netFeeIncome)}
                    hint={
                      data.netFeeIncomeProvisional
                        ? 'Sementara; biaya gateway belum tersedia. Sebelum pajak dan biaya operasional.'
                        : 'Fee dikurangi refund fee dan biaya gateway; sebelum biaya operasional dan pajak'
                    }
                  />
                  <Metric
                    label="Outstanding Organizer Funds"
                    value={formatIDR(data.outstandingOrganizerFunds)}
                    hint="Kewajiban saldo saat ini, di luar filter periode"
                  />
                </>
              )}
            </div>
            {creator ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Available balance" value={formatIDR(data.availableBalance)} />
                <Metric
                  label="Reserved balance"
                  value={formatIDR(data.reservedBalance)}
                  hint="Reservasi withdrawal dan refund yang disetujui"
                />
                <Metric label="Pending balance" value={formatIDR(data.pendingBalance)} />
                <Metric
                  label="Total withdrawn"
                  value={formatIDR(data.totalWithdrawn)}
                  hint="Transfer yang benar-benar selesai"
                />
              </div>
            ) : null}
            <FinancialLedgerTable from={data.range.from} to={data.range.to} />
          </>
        ) : null}
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

export function EventReportsPage() {
  const { apiBase, base } = useWorkspace();
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
          description="Kontribusi penjualan, alokasi service fee, dan kewajiban kepada organizer. Bukan laba bersih EO."
          action={
            <Button asChild variant="outline">
              <Link to={`${base}/event-reports`}>Semua laporan</Link>
            </Button>
          }
        />
        <QueryState query={detail}>
          {report ? (
            <>
              <p className="text-sm text-slate-600">
                Organizer: {report.organizer.organizationName}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ['Tiket terjual', report.totalTicketsSold.toLocaleString('id-ID')],
                  ['Gross Ticket Sales', formatIDR(report.grossTicketSales)],
                  ['Diskon', formatIDR(report.discountAmount)],
                  ['Service Fee Revenue', formatIDR(report.serviceFeeRevenue)],
                  ['Refund Amount', formatIDR(report.refundAmount)],
                  ['Organizer Proceeds', formatIDR(report.organizerProceeds)],
                  ['Paid Out Amount', formatIDR(report.paidOutAmount)],
                  ['Outstanding Balance', formatIDR(report.outstandingBalance)],
                ].map(([label, value]) => (
                  <Metric key={label} label={String(label)} value={value} />
                ))}
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Paid Out hanya mencatat transfer yang selesai. Permintaan payout yang disetujui
                masih merupakan reservasi dan belum mengurangi outstanding balance.
              </p>
            </>
          ) : null}
        </QueryState>
      </div>
    );
  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title="Laporan keuangan event"
        description="Penjualan tiket, kontribusi fee GOFEST, dan dana organizer per event. Angka akumulasi sepanjang waktu."
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
            'Organizer',
            'Tiket',
            'Gross Ticket Sales',
            'Diskon',
            'Service Fee',
            'Refund',
            'Organizer Proceeds',
            'Paid Out',
            'Outstanding',
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
              <td>{report.organizer.organizationName}</td>
              <td>{report.totalTicketsSold}</td>
              <td>{formatIDR(report.grossTicketSales)}</td>
              <td>{formatIDR(report.discountAmount)}</td>
              <td>{formatIDR(report.serviceFeeRevenue)}</td>
              <td>{formatIDR(report.refundAmount)}</td>
              <td>{formatIDR(report.organizerProceeds)}</td>
              <td>{formatIDR(report.paidOutAmount)}</td>
              <td>{formatIDR(report.outstandingBalance)}</td>
            </tr>
          ))}
        </DataTable>
        <Pagination meta={query.data?.meta} onPageChange={setPage} />
      </QueryState>
    </div>
  );
}

function FinancialLedgerTable({ from, to }: { from?: string; to?: string }) {
  const { apiBase } = useWorkspace();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['ledger', apiBase, page, search, from, to],
    queryFn: () =>
      apiPage<LedgerEntry>(`${apiBase}/ledger`, { query: { page, q: search, from, to } }),
  });
  return (
    <Panel
      title="Financial ledger"
      description="Setiap baris mencatat satu pergerakan dana dengan akun debit dan kredit yang seimbang."
    >
      <label className="mb-4 grid max-w-sm gap-2 text-sm font-medium">
        Cari referensi / deskripsi
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
          caption="Financial ledger"
          headers={['Waktu', 'Jenis transaksi', 'Debit', 'Kredit', 'Nominal', 'Referensi']}
        >
          {query.data?.data.map((entry) => (
            <tr key={entry.id}>
              <td>{formatDateTime(entry.createdAt)}</td>
              <td title={entry.description}>{entry.transactionType.replaceAll('_', ' ')}</td>
              <td>{entry.debit}</td>
              <td>{entry.credit}</td>
              <td className="tabular-nums">{formatIDR(entry.amount)}</td>
              <td className="max-w-56 truncate" title={entry.referenceId}>
                {entry.referenceId}
              </td>
            </tr>
          ))}
        </DataTable>
        <Pagination meta={query.data?.meta} onPageChange={setPage} className="mt-4" />
      </QueryState>
    </Panel>
  );
}
