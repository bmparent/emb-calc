# UX and accessibility audit — July 2026

## Scope and user goal

The audit covered the standalone path from entering a job through importing a
design, calculating production time, and comparing the estimate with the actual
finish. It also covered the new artwork/photo color workflow.

The primary user goal is to get a trustworthy production-time estimate without
needing to understand every calibration variable. A secondary goal is to turn
customer artwork or a product photo into a useful color/thread starting point.

## Strengths

- The trusted Data Graphics baseline remains the default.
- Files and shop data stay local; the calculator needs no account or ERP.
- The calculation explains machine time, operator time, and major time drivers.
- Job history and templates support repeat work.

## Risks found

- The original page exposed every production factor at once, making the first
  calculation feel more complicated than it is.
- “Generate Matrix,” “Archive,” and “Awaiting Parameters” were system-oriented
  phrases rather than clear shop actions.
- The DST reader trusted only header metadata and silently removed failed files.
- Tiny uppercase labels and several small targets created readability and
  keyboard-focus risks.
- Actual-finish comparison competed with the primary estimate even though it is
  used later in the workflow.
- A photo-to-PMS result can look more authoritative than camera and screen data
  justify. Madeira itself recommends physical color cards for precise approval.

## Changes implemented

- Added an explicit DST / Photo & color match choice at the point of entry.
- Replaced the DST header-only read with a full binary pass and visible errors,
  health warnings, jumps, inferred trims, dimensions, and thread-use estimates.
- Moved per-location tuning behind “Advanced production factors.”
- Renamed the primary action to “Calculate production time” and “Archive” to
  “Job history.”
- Kept the result panel in view on desktop and moved after-run comparison into a
  disclosure.
- Added inline calculation errors, larger field targets, and visible focus rings.
- Made color extraction local, added point sampling, disclosed color uncertainty,
  and required a user-provided licensed catalog before showing PMS estimates.

## Remaining opportunities

- Add named machine/calibration profiles instead of one active profile.
- Add a stitch-path thumbnail so a user can visually confirm the DST before
  adding it to a job.
- Add a printable run sheet with design size, thread sequence, and approved
  substitutions once exact thread-sequence data is available.
- Test the final UI with shop staff on phones and tablets and conduct keyboard,
  screen-reader, contrast, zoom, and browser-camera checks before claiming WCAG
  conformance.

## Evidence limit

The hosted-browser preview was unavailable in this workspace, so this pass used
source-flow inspection, automated logic tests, TypeScript checks, and production
build verification rather than screenshot-based visual comparison. No claim of
full WCAG conformance is made.
