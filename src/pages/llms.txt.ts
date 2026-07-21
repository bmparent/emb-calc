import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('https://embroiderycalc-pro.pages.dev');
  const absolute = (path: string) => new URL(path, origin).toString();
  return new Response(`# EmbroideryCalc

EmbroideryCalc is a free browser-based embroidery production-time calculator, Tajima DST analyzer, and image-to-Madeira thread color matching tool.

## Primary pages
- Calculator: ${absolute('/calculator/')}
- DST stitch count reader: ${absolute('/tools/dst-stitch-count/')}
- Thread color matcher: ${absolute('/tools/thread-color-match/')}
- Calculation methodology: ${absolute('/methodology/')}
- Guides: ${absolute('/guides/')}
- Articles: ${absolute('/articles/')}
- News and analysis: ${absolute('/embroidery-news/')}

## Important qualifications
- Production times are planning estimates, not guarantees.
- DST trims are inferred because the format does not carry a universal explicit trim command.
- Madeira matches use electronic-card screen colors and CIEDE2000 ranking; verify against physical thread.
- PMS references are approximate community screen values, not official Pantone data.
- Files and image analysis remain in the user's browser.
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
