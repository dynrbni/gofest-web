import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BrandLogo } from './brand-logo';
import { assetUrl } from '@/lib/assets';
import { useCmsSite } from '@/lib/cms';
import { applyDefaultLanguage } from '@/lib/language';

export function SiteLogo({ footer = false }: { footer?: boolean }) {
  const { data } = useCmsSite();
  const key = (footer ? data?.settings.footerLogoKey : '') || data?.settings.logoKey;
  return (
    <Link
      to="/"
      className="brand-logo"
      aria-label={`${data?.settings.websiteName ?? 'Gofest'}, ke beranda`}
    >
      {key ? (
        <img
          src={assetUrl(key)!}
          alt={data?.settings.websiteName ?? 'Gofest'}
          width={220}
          height={70}
          className="h-9 w-auto max-w-[180px] object-contain sm:h-11"
        />
      ) : (
        <BrandLogo />
      )}
    </Link>
  );
}
export function PublishedSiteMetadata() {
  const { data } = useCmsSite();
  const { pathname } = useLocation();
  useEffect(() => {
    if (!data) return;
    const settings = data.settings;
    const cleanup: Array<() => void> = [];
    const previousName = document.documentElement.dataset.siteName;
    const previousTimezone = document.documentElement.dataset.siteTimezone;
    const previousTitle = document.title;
    document.documentElement.dataset.siteName = settings.websiteName;
    document.documentElement.dataset.siteTimezone = settings.timezone;
    if (pathname === '/' && settings.seoTitle) document.title = settings.seoTitle;
    else document.title = document.title.replace(/ · [^·]+$/, ` · ${settings.websiteName}`);
    const appliedTitle = document.title;
    const image = assetUrl(settings.ogImageKey);
    const values: Record<string, string> = {
      description: settings.seoDescription || settings.description,
      'og:title': settings.seoTitle || settings.websiteName,
      'og:description': settings.seoDescription || settings.description,
      'og:image': image ? new URL(image, settings.siteUrl || window.location.origin).href : '',
    };
    for (const [name, content] of Object.entries(values)) {
      const attr = name.startsWith('og:') ? 'property' : 'name';
      cleanup.push(applyHeadTag(`meta[${attr}="${name}"]`, 'meta', { [attr]: name, content }));
    }
    cleanup.push(
      applyHeadTag('link[rel="icon"]', 'link', {
        rel: 'icon',
        href: assetUrl(settings.faviconKey) ?? '/assets/favicon.ico',
      }),
    );
    const originalCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (settings.siteUrl) {
      cleanup.push(
        applyHeadTag('link[rel="canonical"]', 'link', {
          rel: 'canonical',
          href: new URL(pathname, settings.siteUrl).href,
        }),
      );
    } else if (originalCanonical) {
      originalCanonical.remove();
      cleanup.push(() => {
        if (!document.head.querySelector('link[rel="canonical"]'))
          document.head.appendChild(originalCanonical);
      });
    }
    if (!data.preview) applyDefaultLanguage(settings.defaultLanguage);
    return () => {
      cleanup.reverse().forEach((restore) => restore());
      if (document.title === appliedTitle) document.title = previousTitle;
      if (document.documentElement.dataset.siteName === settings.websiteName) {
        if (previousName === undefined) delete document.documentElement.dataset.siteName;
        else document.documentElement.dataset.siteName = previousName;
      }
      if (document.documentElement.dataset.siteTimezone === settings.timezone) {
        if (previousTimezone === undefined) delete document.documentElement.dataset.siteTimezone;
        else document.documentElement.dataset.siteTimezone = previousTimezone;
      }
    };
  }, [data, pathname]);
  return null;
}

function applyHeadTag(selector: string, kind: 'meta' | 'link', attributes: Record<string, string>) {
  const original = document.head.querySelector(selector);
  const tag = original ?? document.createElement(kind);
  const previous = new Map(Object.keys(attributes).map((name) => [name, tag.getAttribute(name)]));
  Object.entries(attributes).forEach(([name, value]) => tag.setAttribute(name, value));
  if (!original) document.head.appendChild(tag);
  return () => {
    // A page can install more specific metadata while the public layout stays mounted.
    if (!Object.entries(attributes).every(([name, value]) => tag.getAttribute(name) === value))
      return;
    if (!original) tag.remove();
    else
      previous.forEach((value, name) => {
        if (value === null) tag.removeAttribute(name);
        else tag.setAttribute(name, value);
      });
  };
}

export function CmsNavigation({
  placement,
  className,
}: {
  placement: 'HEADER' | 'FOOTER';
  className?: string;
}) {
  const { data } = useCmsSite();
  const items =
    data?.navigation
      .filter((item) => item.visible && item.placement === placement)
      .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];
  if (!items.length) return null;
  return (
    <nav
      aria-label={placement === 'HEADER' ? 'Navigasi website' : 'Tautan footer'}
      className={className}
    >
      {items.map((item) =>
        item.href.startsWith('/') ? (
          <Link
            key={item.id}
            to={item.href}
            className="flex min-h-11 items-center text-sm hover:underline"
          >
            {item.label}
          </Link>
        ) : (
          <a
            key={item.id}
            href={item.href}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noopener noreferrer' : undefined}
            className="flex min-h-11 items-center text-sm hover:underline"
          >
            {item.label}
          </a>
        ),
      )}
    </nav>
  );
}
