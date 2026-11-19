import { useState } from 'react';
import { OrganizerAvatar } from '@/components/common/event-presentation';
import { LoadingImage } from '@/components/common/loading-image';
import { assetUrl } from '@/lib/assets';
import { useLanguage } from '@/lib/language';
import type { OrganizerProfile } from '@/lib/models';
import { cn } from '@/lib/utils';

export function OrganizerProfileHeader({
  organizer,
  preview = false,
}: {
  organizer: OrganizerProfile;
  preview?: boolean;
}) {
  const { t, language } = useLanguage();
  const banner = assetUrl(organizer.bannerKey ?? organizer.fallbackBannerKey);
  const [failedBanner, setFailedBanner] = useState<string | null>(null);
  const Heading = preview ? 'h3' : 'h1';
  return (
    <header>
      <div
        className={cn(
          'creator-cover relative aspect-[3/1] w-full overflow-hidden bg-blue-100',
          preview ? 'rounded-lg' : 'max-h-80 min-h-32 rounded-2xl',
        )}
      >
        {banner && banner !== failedBanner ? (
          <LoadingImage
            src={banner}
            alt=""
            width={1600}
            height={460}
            loading="eager"
            onError={() => setFailedBanner(banner)}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className={cn('flex items-start', preview ? 'mt-4 gap-3' : 'mt-6 gap-5 sm:gap-8')}>
        <OrganizerAvatar
          name={organizer.organizationName}
          logoKey={organizer.logoKey}
          className={
            preview
              ? 'size-14 bg-white text-xl'
              : 'size-20 bg-white text-3xl sm:size-32 sm:text-4xl'
          }
        />
        <div className="min-w-0 flex-1">
          <Heading
            className={cn(
              'break-words font-semibold leading-tight tracking-tight',
              preview ? 'text-xl' : 'text-2xl sm:text-3xl',
            )}
          >
            {organizer.organizationName}
          </Heading>
          {organizer.status === 'ACTIVE' && (
            <p className="mt-2 text-xs font-medium text-blue-800">Organizer terverifikasi</p>
          )}
          {organizer.description ? (
            <p className="mt-4 max-w-2xl break-words whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {organizer.description}
            </p>
          ) : null}
          {organizer.location ? (
            <p className="mt-3 break-words text-sm text-slate-600">{organizer.location}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm text-blue-800">
            {organizer.contactEmail ? (
              <a
                href={`mailto:${organizer.contactEmail}`}
                className="min-w-0 break-words underline underline-offset-4"
              >
                {organizer.contactEmail}
              </a>
            ) : null}
            {organizer.contactPhone ? (
              <a
                href={`tel:${organizer.contactPhone}`}
                className="min-w-0 break-words underline underline-offset-4"
              >
                {organizer.contactPhone}
              </a>
            ) : null}
            {(
              [
                ['Website', organizer.websiteUrl],
                ['Instagram', organizer.instagramUrl],
                ['TikTok', organizer.tiktokUrl],
              ] as const
            ).map(([label, url]) =>
              url && /^https?:\/\//i.test(url) ? (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 break-words underline underline-offset-4"
                >
                  {label}
                </a>
              ) : null,
            )}
          </div>
          <dl
            className={cn(
              'mt-5 flex flex-wrap gap-y-4 text-sm',
              preview ? 'gap-x-5' : 'gap-x-8 sm:mt-6',
            )}
          >
            <div>
              <dt className="text-slate-600">{t('Total Event', 'Total Events')}</dt>
              <dd className="mt-2 text-xl font-medium tabular-nums sm:text-2xl">
                {organizer.eventCounts?.total ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">{t('Bergabung pada', 'Joined')}</dt>
              <dd className="mt-2 text-base font-medium sm:text-xl">
                {new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'id-ID', {
                  month: 'long',
                  year: 'numeric',
                }).format(new Date(organizer.createdAt))}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </header>
  );
}
