import { getCollection, type CollectionEntry } from 'astro:content';

export type SiteSection = 'guides' | 'articles' | 'news';
export type SiteEntry = CollectionEntry<SiteSection>;

export const sectionPath: Record<SiteSection, string> = {
  guides: 'guides',
  articles: 'articles',
  news: 'embroidery-news',
};

export const sectionLabel: Record<SiteSection, string> = {
  guides: 'Guide',
  articles: 'Article',
  news: 'News & analysis',
};

export function entryUrl(section: SiteSection, entry: SiteEntry): string {
  return `/${sectionPath[section]}/${entry.id}/`;
}

export async function getAllContent() {
  const sections: SiteSection[] = ['guides', 'articles', 'news'];
  const groups = await Promise.all(sections.map(async (section) => ({
    section,
    entries: await getCollection(section),
  })));

  return groups
    .flatMap(({ section, entries }) => entries.map((entry) => ({ section, entry })))
    .sort((a, b) => b.entry.data.published.valueOf() - a.entry.data.published.valueOf());
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
