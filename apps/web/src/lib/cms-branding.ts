import type { CSSProperties } from 'react';
import type { CmsSite } from './cms';

export function siteStyle(site?: CmsSite): CSSProperties {
  const primary = site?.settings.primaryColor ?? '#2563eb';
  const secondary = site?.settings.secondaryColor ?? '#0f172a';
  const primaryLuminance = luminance(primary);
  return {
    '--cms-primary': primary,
    '--cms-primary-ink':
      (primaryLuminance + 0.05) / 0.05 > 1.05 / (primaryLuminance + 0.05) ? '#000000' : '#ffffff',
    '--cms-link': 1.05 / (primaryLuminance + 0.05) >= 4.5 ? primary : '#0f172a',
    '--cms-secondary': secondary,
    '--cms-secondary-safe': 1.05 / (luminance(secondary) + 0.05) >= 4.5 ? secondary : '#0f172a',
  } as CSSProperties;
}
function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
