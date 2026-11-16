import type { FormEvent, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useLanguage } from '@/lib/language';

export function AccountFilters({
  searchLabel,
  children,
}: {
  searchLabel: string;
  children?: ReactNode;
}) {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const dateFrom = String(data.get('dateFrom') ?? '');
    const dateTo = String(data.get('dateTo') ?? '');
    const end = form.elements.namedItem('dateTo') as HTMLInputElement;
    end.setCustomValidity(
      dateFrom && dateTo && dateFrom > dateTo
        ? t('Tanggal akhir harus setelah tanggal awal', 'End date must follow start date')
        : '',
    );
    if (!form.reportValidity()) return;
    const next = new URLSearchParams();
    if (params.has('period')) next.set('period', params.get('period')!);
    for (const [key, value] of data) if (String(value).trim()) next.set(key, String(value).trim());
    setParams(next);
  }
  return (
    <form
      className="account-filters"
      onSubmit={apply}
      key={params.toString()}
      aria-label={t('Filter hasil', 'Filter results')}
      onInput={(event) => {
        const end = event.currentTarget.elements.namedItem('dateTo');
        if (end instanceof HTMLInputElement) end.setCustomValidity('');
      }}
    >
      <label>
        {searchLabel}
        <input
          name="q"
          type="search"
          maxLength={140}
          defaultValue={params.get('q') ?? ''}
          placeholder={t('Ketik pencarian…', 'Search…')}
        />
      </label>
      {children}
      <label>
        {t('Dari tanggal', 'From date')}
        <input type="date" name="dateFrom" defaultValue={params.get('dateFrom') ?? ''} />
      </label>
      <label>
        {t('Sampai tanggal', 'To date')}
        <input
          type="date"
          name="dateTo"
          defaultValue={params.get('dateTo') ?? ''}
          onInput={(event) => event.currentTarget.setCustomValidity('')}
        />
      </label>
      <div className="account-filter-actions">
        <button className="account-primary" type="submit">
          <Search size={16} aria-hidden />
          {t('Terapkan', 'Apply')}
        </button>
        <button
          className="account-secondary"
          type="button"
          onClick={() => setParams(params.has('period') ? { period: params.get('period')! } : {})}
        >
          {t('Reset', 'Reset')}
        </button>
      </div>
    </form>
  );
}
