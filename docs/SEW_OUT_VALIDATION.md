# Measured production validation

Status: **not measured**. The CSV contains planned cases, not results. Complete it
before making a shop accuracy claim or treating the example defaults as calibrated.

1. Record the candidate commit, formula version, machine model, usable heads,
   garment, operator count, design identifiers/hashes, stitch/color/trim counts,
   placement sequence and every Shop calibration value. Export the estimated job
   JSON before starting so the inputs and estimate remain available.
2. Choose a tolerable error for the intended shop **before** measuring: the maximum
   underestimate the scheduling process can absorb. The owner sets this acceptance
   threshold; the software does not invent or silently enforce one.
3. Run the same safe production process for the single-item, full-head and partial
   final-batch cases. Time setup, hooping/loading, sewing, routine interventions,
   removal and finishing separately. Multiple placements need separate observations.
4. Start the job when production starts. Keep normal thread breaks, bobbin changes
   and other routine interruptions inside elapsed time. Explicitly pause off-shift
   or unrelated interruptions and record why. Complete with the real timestamp.
5. Record hands-on person-minutes separately from elapsed clock minutes when two
   people work. Two operators cannot halve one item's indivisible handling task.
6. Repeat each representative case at least three times where practical. Retain
   each observation, including slow runs and failures. Compare ranges and systematic
   underestimates; do not present one successful run as general accuracy.

## Calculations and limits

```text
actual_minutes = (finish_timestamp - start_timestamp) / 60 - excluded_pause_seconds / 60
error_percent = 100 * (estimated_minutes - actual_minutes) / actual_minutes
absolute_error_percent = abs(error_percent)
ideal_sewing_floor_minutes = ceil(quantity / usable_heads) * stitches_per_item / RPM
price_before_tax = total_cost / (1 - gross_margin_fraction)
```

Timestamps in the first line are measured in seconds. Negative error means an
underestimate. Undefined or invalid measurements stay blank with a reason; never
replace them with zero. The ideal floor applies independently to each placement
before slowdown, efficiency loss or stops. Partial batches consume whole cycles.

The model limits overlap to eligible handling and preceding unattended machine time
within the same placement. It retains setup, initial preparation, final removal and
finishing. It is not a discrete-event simulation of every operator movement. Compare
the exported breakdown with observed work to identify which assumption needs tuning.

Use manual Shop calibration only after inspecting the observations. Save the
before/after settings and repeat the cases. Existing production records retain their
formula and inputs; do not rewrite history to make the new settings look accurate.

For release acceptance, record the chosen tolerance, all observed errors, any failed
case and the owner's decision. Keep measurement records and customer artwork out of
the public repository unless synthetic or explicitly approved for publication.
