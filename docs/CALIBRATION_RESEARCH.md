# Embroidery Runtime Calibration Research

## Why the calculator has two models

The existing constants were timed in a working embroidery shop and remain the
`DG verified` baseline. They should not be replaced by generic industry
averages. A second `batch-aware` model adds parameters used by commercial
embroidery runtime tools so the two approaches can be compared against actual
completed jobs.

## Parameters supported by professional estimators

Sierra's production-time estimator describes four input groups: order quantity,
design characteristics (stitches, colors, trims, and stitch length), machine
characteristics (heads, needles, speed chart, color-change time, and trim time),
and operator work (hooping and bobbin changes). It also explicitly recommends
creating machine-specific profiles rather than assuming one universal default.

Wilcom likewise allows named machine runtime profiles with fast and slow speeds,
the stitch length that triggers slow speed, trim time, color-change time, and
slow restart stitches. Wilcom's public production guidance currently uses 750
RPM, 6-9 seconds per color change, and about 4 seconds per trim as example
averages. Another Wilcom production article gives a 3-4 second trim range and
explains that a trim includes slowing, cutting, restarting, and accelerating.

Melco's public calculator says stitch count, thread cuts, and color changes can
materially change production time. Its EMT16X specifications also distinguish
maximum flat and cap speeds, reinforcing that garment/frame type needs its own
machine setting.

## What public shop/operator reports add

Public production discussions reinforce why we should not replace the Data
Graphics measurements with a universal "shop average." One experienced
operator reported roughly 10-20 seconds for trims or color changes on an older
Brother single-head and said a typical file might contain 5-15 trims. That is
far slower than Wilcom's modern-machine examples. Another multi-head discussion
reported practical flat speeds around 650-750 SPM and cap speeds around 550-650
SPM on some lower-cost equipment, plus more operator intervention for thread
breaks. These are anecdotes rather than controlled benchmarks, but the spread
is useful evidence for machine-, garment-, and design-specific modifiers.

Shop discussions about hooping stations consistently emphasize a different
variable: repeatability and operator workflow. Repeat orders and multi-operator
shops benefit differently than one-person shops doing varied small runs. That
supports keeping hooping time and operator overlap calibratable instead of
assuming a fixed productivity gain from a particular hoop system.

## Logic added in engine v2

- Preserve the original verified formula as a selectable baseline.
- Round production up to whole machine runs with
  `runs = ceil(location quantity / active heads)`.
- Count finishing once per physical garment instead of once per decoration
  location.
- Apply fixed DST loading and machine setup once per design/location.
- Model color changes as `max(colors - 1, 0)` for every machine run.
- Add trim count, manual stops, per-design speed adjustment, difficult-location
  handling, break-risk adjustment, bobbin changes, and machine downtime as
  independent calibration inputs.
- Keep machine-occupied time and operator labor visible as separate results.
- Make operator overlap configurable instead of assuming that all manual work
  is either fully serial or fully parallel with sewing.
- Store actual finish comparisons so the verified and research models can be
  evaluated on the same completed jobs.

## Parameters intentionally not hard-coded

Fabric, difficult locations, 3D foam, appliqué, metallic thread, long/short
stitch mix, hoop type, operator count, available hoop sets, and machine condition
can all change output. These should be measured by each shop or represented by
an explicit modifier; a generic value should not silently override the verified
shop profile.

## Primary and industry sources

- Sierra production timing manual:
  https://www.sierra-software.com/downloads/manuals/se20/emb-design-production-timing.html
- Wilcom machine runtime settings:
  https://docs.wilcom.com/embroiderystudio/e4/en/MainHelp/Setup/hardware/Configure_machine_runtime_settings.htm
- Wilcom runtime averages:
  https://wilcom.com/resources/blog/sustainable-embroidery-eco-friendly-tips
- Wilcom trim-time discussion:
  https://wilcom.com/resources/blog/high-impact-low-stitch-count-designs
- Wilcom embroidery factors (job type, fabric, location, colors, special
  processes):
  https://help.wilcom.com/portal/en/kb/wilcom-international/wilcom-account/estimator-price-table/articles/embroidery-pricing
- Melco production calculator overview:
  https://melco.com/calculate-production-times-and-costs/
- Melco EMT16X speed specifications:
  https://melco.com/wp-content/uploads/2021/02/EMT16X-Brochure_Digital_SPREADS.pdf
- DigitSmith operator discussion on trims, color changes, and effective speed:
  https://www.digitsmith.com/help-newbie-who-bought-brother-bes-1210ac-53205
- DigitSmith multi-head discussion on machine speed, break rate, and staffing:
  https://www.digitsmith.com/richpeace-feyia-richrui-and-other-chineese-brands-39830
- Machine Embroidery community discussion on hooping workflow:
  https://www.reddit.com/r/Machine_Embroidery/comments/1gu2svp/is_the_hoopmaster_station_worth_to_buy/
