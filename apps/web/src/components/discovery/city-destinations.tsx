import { findEventCity } from '@gofest/shared';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { assetUrl } from '@/lib/assets';
import { useCmsSite } from '@/lib/cms';
import { useLanguage } from '@/lib/language';
import type { CityDocument } from '@/pages/cms/cms-models';
import { CITY_ACCENTS, FALLBACK_CITIES } from './city-presentation';

export function CityCard({ city, preview = false }: { city: CityDocument; preview?: boolean }) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState<string | null>(null);
  const image = assetUrl(city.imageKey);
  const builtIn = findEventCity(city.builtInIllustration);
  const showImage = image && image !== failed;
  const content = (
    <>
      <span className="city-name">
        {t('Kota', 'Explore')}
        <br />
        <span className="line-clamp-2 break-words">{city.name || t('Nama kota', 'City name')}</span>
      </span>
      <ArrowUpRight className="relative z-10 mt-3 size-7 text-blue-600" aria-hidden />
      {showImage ? (
        <img
          src={image}
          alt=""
          width={600}
          height={600}
          loading="lazy"
          onError={() => setFailed(image)}
          className="city-custom-illustration"
        />
      ) : builtIn && !city.imageKey ? (
        <span
          className="city-landmark"
          style={{ backgroundPosition: builtIn.landmarkPosition }}
          aria-hidden
        />
      ) : (
        <MapPin className="city-location-placeholder" aria-hidden />
      )}
    </>
  );
  const style = {
    '--city-accent':
      CITY_ACCENTS.find((accent) => accent.value === city.accent)?.color ?? '#a9c1ff',
  } as CSSProperties;
  return preview ? (
    <div className="city-destination" style={style}>
      {content}
    </div>
  ) : (
    <Link
      to={`/events?city=${encodeURIComponent(city.slug)}`}
      className="city-destination group"
      style={style}
    >
      {content}
    </Link>
  );
}

export function CityDestinations({
  limit,
  cities,
}: { limit?: number; cities?: CityDocument[] } = {}) {
  const { t } = useLanguage();
  const query = useCmsSite();
  const configured = cities ?? query.data?.cities;
  const items = (configured?.length ? configured : FALLBACK_CITIES)
    .filter((city) => city.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, limit);
  if (!items.length) return null;
  return (
    <div
      className="city-destinations"
      role="region"
      aria-label={t('Pilihan kota', 'City selection')}
      tabIndex={0}
    >
      {items.map((city) => (
        <CityCard key={city.slug} city={city} />
      ))}
    </div>
  );
}
