import { EVENT_CITIES } from '@gofest/shared';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/language';

export function CityDestinations() {
  const { t } = useLanguage();
  return (
    <div
      className="city-destinations"
      role="region"
      aria-label={t('Pilihan kota', 'City selection')}
      tabIndex={0}
    >
      {EVENT_CITIES.map((city) => (
        <Link to={`/events/city/${city.slug}`} key={city.slug} className="city-destination group">
          <span className="city-name">
            {t('Kota', 'Explore')}
            <br />
            {city.name}
          </span>
          <ArrowUpRight className="relative z-10 mt-3 size-7 text-blue-600" aria-hidden />
          <span
            className="city-landmark"
            style={{ backgroundPosition: city.landmarkPosition }}
            aria-hidden
          />
        </Link>
      ))}
    </div>
  );
}
