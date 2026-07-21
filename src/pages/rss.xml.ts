import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { entryUrl, getAllContent, sectionLabel } from '../lib/content';
import { SITE } from '../site';

export const GET: APIRoute = async (context) => {
  const content = await getAllContent();
  return rss({
    title: `${SITE.name} guides and analysis`,
    description: SITE.description,
    site: context.site ?? 'https://embroiderycalc-pro.pages.dev',
    items: content.map(({ section, entry }) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.published,
      link: entryUrl(section, entry),
      categories: [sectionLabel[section], ...entry.data.tags],
    })),
    customData: '<language>en-us</language>',
  });
};
