# EmbroideryCalc Pro

A standalone embroidery production-time calculator. It runs entirely in the
browser: no account, ERP integration, AI service, or API key is required.

## Calculation models

- **DG verified** preserves the original Data Graphics shop-tested formula and
  remains the default estimate.
- **Batch-aware** rounds multi-head work into whole machine runs and models
  trims, color changes, manual stops, bobbins, design slowdown, difficult
  handling, break risk, operator count, and operator/machine overlap.
- Both estimates are calculated together so completed jobs can be compared
  without changing the trusted quoting baseline.

The calibration rationale and source links are in
[`docs/CALIBRATION_RESEARCH.md`](docs/CALIBRATION_RESEARCH.md).

## Local features

- Full Tajima DST stitch-stream parsing for stitch/color counts, dimensions,
  jumps, inferred trims, thread travel, thread-use estimates, long-stitch checks,
  header mismatches, truncation, and missing end records
- Guided artwork/photo color matching with automatic palette extraction,
  adjustable point sampling, drag-to-select areas, mobile camera capture, and
  selection-quality warnings
- Direct Madeira thread ranking with CIEDE2000 against approximate screen
  samples from Madeira's public Polyneon and Classic Rayon electronic cards
- Three approximate community PMS references per selected color, kept separate
  from the direct thread ranking so conversion errors are not compounded
- Optional local CSV overrides for PMS or Madeira references
- Shop calibration saved in local browser storage
- Job history and reusable templates
- Actual-finish comparisons for both calculation models
- Pause-aware projected finish time

## Development

Requires Node.js 20 or newer.

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

The production build is emitted to `dist/` and can be hosted as a static site.

## Color matching

Images are resized and analyzed locally. The matching flow is:

1. Choose an automatically detected color, sample an adjustable point, or drag
   an area around the desired color.
2. Rank Madeira threads directly from the selected sRGB color using CIEDE2000.
3. Show PMS references separately as approximate lookup suggestions.

The built-in Madeira library is derived from Madeira USA's public electronic
color cards. It contains screen approximations for Classic Rayon 40, Polyneon
40, and Polyneon fluorescent colors. Madeira notes that monitor and printed
colors may not match physical thread; use the physical shade card for production
approval.

The built-in PMS references come from the MIT-licensed
[`adonald/Pantone-CMYK-RGB-Hex`](https://github.com/adonald/Pantone-CMYK-RGB-Hex)
project. They are older community approximations, not official Pantone values.
Pantone is a trademark of Pantone LLC. See
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Custom color reference catalog

Custom references override matching codes and stay in local browser storage.
The CSV must include `hex` plus `pms`/`pantone` and/or
`madeira`/`thread`. `name` and `line` are optional.

```csv
pms,hex,madeira,name,line
YOUR-CODE,#0047AB,1842,Sample blue,Polyneon 40
```

Alternatively, use `type,code,hex,name,line` and set `type` to `pms` or
`thread`. Photo, monitor, and electronic-card matches are estimates.
