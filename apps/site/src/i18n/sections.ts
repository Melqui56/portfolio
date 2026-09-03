import type { ui } from './ui';

/**
 * Single source of truth for the site's sections.
 *
 * The number and the codename appear in the page eyebrow, in the Deck's chart,
 * and in the nav order — they must never drift apart, so they live here only.
 */
export interface Section {
  key: string;
  n: string;
  href: string;
  code: Record<keyof typeof ui, string>;
}

export const sections: Section[] = [
  { key: 'about', n: '01', href: '/about', code: { en: 'LOGBOOK', es: 'BITÁCORA' } },
  { key: 'projects', n: '02', href: '/projects', code: { en: 'WANTED POSTERS', es: 'CARTELES DE REBUSCA' } },
  { key: 'stack', n: '03', href: '/stack', code: { en: 'CREW', es: 'TRIPULACIÓN' } },
  { key: 'roadmap', n: '04', href: '/roadmap', code: { en: 'NAVIGATION', es: 'NAVEGACIÓN' } },
  { key: 'journal', n: '05', href: '/journal', code: { en: 'JOURNAL', es: 'DIARIO' } },
  { key: 'studio', n: '06', href: '/studio', code: { en: 'MQE STUDIOS', es: 'MQE STUDIOS' } },
  { key: 'contact', n: '07', href: '/contact', code: { en: 'CABIN', es: 'CAMAROTE' } },
];

export const getSection = (key: string): Section => {
  const found = sections.find((s) => s.key === key);
  if (!found) throw new Error(`Unknown section: ${key}`);
  return found;
};

/** Prefix an internal path for the Spanish tree. */
export const localisePath = (path: string, lang: keyof typeof ui) =>
  lang === 'es' ? `/es${path === '/' ? '' : path}` : path;
