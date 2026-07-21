# EmbroideryCalc

A free, standalone embroidery production-time calculator with browser-local DST
analysis, artwork/photo color extraction, and Madeira thread matching. The site
also includes statically rendered guides, articles, news analysis, methodology,
privacy, terms, RSS, structured data, and crawler files.

The core calculator does not require an account, ERP integration, AI service,
or API key. DST files, images, local history, templates, and calibration stay in
the browser. An optional Pro workspace adds cloud saves, user-authorized
read-only Printavo order import, and account-isolated timing suggestions.

## Calculator capabilities

- **DG verified** preserves the original shop-tested formula and remains the
  default estimate.
- **Batch-aware** rounds multi-head work into whole machine runs and models
  trims, color changes, manual stops, bobbins, design slowdown, difficult
  handling, break risk, operator count, and operator/machine overlap.
- Both estimates are calculated together and can be compared with an actual
  finish.
- Full Tajima DST command-stream parsing reports stitch/color counts,
  dimensions, jumps, inferred trims, thread travel, thread-use estimates,
  long-stitch checks, header mismatches, truncation, and missing end records.
- Image and camera color tools support automatic palette extraction, adjustable
  point samples, drag-to-select areas, sample-quality warnings, and CIEDE2000
  Madeira ranking.
- Approximate community PMS references are shown separately from direct Madeira
  matches so conversion errors are not compounded.
- Shop calibration, job history, templates, and custom color CSV references use
  local browser storage.
- Optional passwordless accounts use Cloudflare Pages Functions and D1.
- Pro subscriptions use Stripe-hosted Checkout and the customer portal.
- Printavo credentials are encrypted server-side and never returned to browser
  code after connection; the integration performs read-only, user-initiated
  order queries.
- Personal learning is opt-in, per-account, explainable, and requires at least
  five completed runs before showing a suggestion. It never changes the base
  calculator calibration automatically.

The calibration rationale and source links are in
[`docs/CALIBRATION_RESEARCH.md`](docs/CALIBRATION_RESEARCH.md). Public-facing
formulas and limits are also rendered at `/methodology/`.

## Architecture

- Astro statically renders the site shell and editorial pages for fast loading,
  search indexing, and resilient hosting.
- React hydrates only the calculator on `/calculator/`.
- Markdown in `src/content/` powers guides, articles, and news analysis.
- Tailwind provides the shared visual system.
- The production build is fully static and is emitted to `dist/`.
- Cloudflare Pages Functions in `functions/` provide the optional account,
  billing, Printavo, saved-work, and learning APIs.
- D1 migrations live in `migrations/`; the free calculator remains usable when
  the optional backend is not configured.

## Development

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm test
npm run typecheck
npm run build
```

Astro telemetry can be disabled locally with
`ASTRO_TELEMETRY_DISABLED=1`; CI already sets it.

## Deployment configuration

For the current Cloudflare Pages project, set build command `npm run build`,
output directory `dist`, and leave the root directory blank. The complete D1,
Resend, Stripe, encryption, webhook, and launch procedure is in
[`docs/CLOUDFLARE_PRO_SETUP.md`](docs/CLOUDFLARE_PRO_SETUP.md).

Copy `.env.example` into the hosting provider's environment settings. All
values are build-time values.

- `SITE_URL` sets canonical, sitemap, RSS, robots, and structured-data URLs.
- `PUBLIC_GTM_ID` enables Google Tag Manager after analytics consent.
- `PUBLIC_GA_MEASUREMENT_ID` enables direct GA4 after analytics consent when
  GTM is not set.
- `PUBLIC_GOOGLE_SITE_VERIFICATION` and `PUBLIC_BING_SITE_VERIFICATION` publish
  the ownership tokens supplied by the two webmaster tools.

Set only one analytics integration. With neither ID, no analytics script or
consent banner is rendered. Events use coarse quantity, machine-size, and
location-count buckets and exclude files, filenames, images, job identifiers,
names, exact stitches, exact quantities, history, and calibration values.

Before enabling advertising, add a certified consent-management platform where
required, update the privacy policy, and verify the ad network's current rules.
The included ad-slot component is development-only and does not load an ad
network.

## Publishing content

Add Markdown or MDX files to:

- `src/content/guides/`
- `src/content/articles/`
- `src/content/news/`

The schema requires a title, a 50–180 character description, and a publication
date. Add original source URLs in `sources` when a page relies on external
facts. The build validates frontmatter, generates routes, includes the entries
in RSS and the sitemap, and adds article structured data.

## Affiliate framework

`src/data/affiliateOffers.ts` contains the typed recommendation catalog and
context rules. The production catalog is intentionally empty. Add an offer only
after reviewing its merchant, destination, terms, disclosure, and tracking
parameters. Recommendations are hidden when no reviewed offers exist and never
change calculator or color-ranking results.

## Color matching

Images are resized and analyzed locally:

1. Choose an automatically detected color, sample an adjustable point, or drag
   an area around the desired color.
2. Rank Madeira threads directly from the selected sRGB color using CIEDE2000.
3. Show PMS references separately as approximate lookup suggestions.

The built-in Madeira library is derived from Madeira USA's public electronic
color cards. It contains screen approximations for Classic Rayon 40, Polyneon
40, and Polyneon fluorescent colors. Use a physical shade card for production
approval.

The built-in PMS references come from the MIT-licensed
[`adonald/Pantone-CMYK-RGB-Hex`](https://github.com/adonald/Pantone-CMYK-RGB-Hex)
project. They are older community approximations, not official Pantone values.
Pantone is a trademark of Pantone LLC. See
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Custom color reference catalog

Custom references override matching codes and stay in local browser storage.
The CSV must include `hex` plus `pms`/`pantone` and/or `madeira`/`thread`. `name`
and `line` are optional.

```csv
pms,hex,madeira,name,line
YOUR-CODE,#0047AB,1842,Sample blue,Polyneon 40
```

Alternatively, use `type,code,hex,name,line` and set `type` to `pms` or
`thread`. Photo, monitor, and electronic-card matches are estimates.
