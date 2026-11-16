import { useState } from 'react';
import { useLocation } from 'react-router-dom';

export function useWorkspace() {
  const { pathname } = useLocation();
  const creator = pathname.startsWith('/creator') || pathname.startsWith('/organizer');
  return {
    creator,
    base: creator ? '/creator' : '/admin',
    apiBase: creator ? '/creator' : '/admin',
  };
}
export function usePeriod() {
  const [period, setPeriod] = useState('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const customValid = period !== 'custom' || Boolean(from && to && from <= to);
  const query =
    period === 'custom' && customValid
      ? {
          period,
          from: new Date(`${from}T00:00:00+07:00`).toISOString(),
          to: new Date(`${to}T23:59:59.999+07:00`).toISOString(),
        }
      : { period: period === 'custom' ? '30d' : period };
  const controls = (
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1.5 text-xs font-medium text-slate-700">
        Periode
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="today">Hari ini</option>
          <option value="7d">7 hari terakhir</option>
          <option value="30d">30 hari terakhir</option>
          <option value="90d">90 hari terakhir</option>
          <option value="custom">Rentang tanggal</option>
          <option value="all">Semua waktu</option>
        </select>
      </label>
      {period === 'custom' ? (
        <>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Dari
            <input
              className="h-11 rounded-lg border border-slate-300 px-3"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Sampai
            <input
              className="h-11 rounded-lg border border-slate-300 px-3"
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          {!customValid ? (
            <p className="text-xs text-slate-600">
              Lengkapi rentang tanggal untuk menampilkan laporan.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
  return { query, controls, enabled: customValid };
}
