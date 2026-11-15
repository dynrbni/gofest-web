import { Check, ChevronDown, Globe } from 'lucide-react';
import { useLanguage } from '@/lib/language';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageMenu({ variant = 'compact' }: { variant?: 'compact' | 'auth' }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium',
            variant === 'auth'
              ? 'rounded-full bg-slate-100 px-4 hover:bg-slate-200'
              : 'rounded-lg px-2 hover:bg-slate-50',
          )}
          aria-label={t('Pilih bahasa', 'Choose language')}
        >
          {variant === 'auth' ? (
            <span aria-hidden>{language === 'id' ? '🇮🇩' : '🇬🇧'}</span>
          ) : (
            <Globe className="size-4" aria-hidden />
          )}
          <span>{language.toUpperCase()}</span>
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-2">
        <DropdownMenuItem onSelect={() => setLanguage('id')} className="min-h-12 gap-3">
          <span aria-hidden>🇮🇩</span> Bahasa Indonesia{' '}
          {language === 'id' ? <Check className="ml-auto size-4" aria-hidden /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLanguage('en')} className="min-h-12 gap-3">
          <span aria-hidden>🇬🇧</span> English{' '}
          {language === 'en' ? <Check className="ml-auto size-4" aria-hidden /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
