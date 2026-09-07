import { cp, rm, copyFile, mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist-native");
if (root !== path.join(process.cwd(), "dist-native"))
  throw Error("Invalid native output path");
await rm(root, { recursive: true, force: true });
await mkdir(root, { recursive: true });
await cp("dist/_astro", path.join(root, "_astro"), { recursive: true });
await cp("dist/calculator", path.join(root, "calculator"), { recursive: true });
await copyFile("dist/calculator/index.html", path.join(root, "index.html"));
const pages = {
  privacy: {
    title: "Privacy",
    body: '<p>Updated September 7, 2026.</p><p>EmbroideryCalc works on this device without accounts, advertising, analytics or automatic server uploads. Job inputs, machine profiles and sampled DST previews are stored in private app files. A preceding snapshot is retained for recovery. Custom color references use local web storage; images are processed locally and are not retained.</p><p>Camera use is optional. Choose an image instead if you decline camera access. Exported PDF quotes and JSON backups go only to destinations you choose in the share sheet. Those destinations control their own copies.</p><p>Back up jobs before removing the app or changing devices. Jobs/profile backups exclude source DST files, photos and custom color CSVs; keep originals separately. Device or iCloud backups are controlled by your iOS settings. This app does not operate a cloud-sync service.</p><p>External support links open a third-party site with its own privacy practices. Do not post private artwork, job backups or customer information publicly.</p><p><a href="https://github.com/bmparent/emb-calc/issues" target="_blank" rel="noreferrer">Contact support</a> for questions or privacy requests. A GitHub account is required to post.</p>',
  },
  support: {
    title: "Help and support",
    body: '<p>A: enter the job, quantity, machine and stitches. B: review the batch plan, production time and costs. C: save and share a quote, then start production when ready.</p><h2>Recover saved jobs</h2><p>In Shop, export a backup regularly. Import merges without overwriting conflicting jobs or profiles. On the recovery screen, export a recovery file first, then restore the previous save or an exported backup. Unreadable data is archived before replacement.</p><h2>Calibrate for your shop</h2><p>Measure setup, hooping, removal, finishing and actual production time. Edit Shop defaults; changes apply to new jobs. Duplicate existing production jobs to change their inputs.</p><p>Version 1.0.0. <a href="https://github.com/bmparent/emb-calc/issues" target="_blank" rel="noreferrer">Report a problem</a> with device model, steps and error text. The tracker is public and requires a GitHub account; exclude confidential data.</p>',
  },
  methodology: {
    title: "How estimates work",
    body: "<p>Formula 3.1.0. This is a planning model, not a delivery guarantee or a machine-control program.</p><h2>Whole machine cycles</h2><p>Runs = ceiling(items / usable heads). Sewing minutes = runs × stitches / (RPM × efficiency × design speed). A partial final run takes a full sewing cycle. Placements run in sequence.</p><h2>Hands-on work and overlap</h2><p>Handling is counted in whole waves of items per operator, separately for each placement. Setup, initial preparation, final removal and finishing remain included. Eligible handling can overlap only unattended earlier sewing cycles at that placement. The last cycle is reserved as a conservative limit. One item is never divided among several operators.</p><p>Color changes, trims, manual stops, thread-break risk and bobbin interventions add machine occupancy. Manual interventions also count as labor. The model assumes fresh bobbins per placement; enter a manual stop or measured setup allowance for extra changes. Finishing is counted once per physical garment. Contingency applies to elapsed production time.</p><h2>Pricing and actual time</h2><p>Price before tax = cost / (1 − margin / 100). Labor cost uses hands-on minutes; machine cost uses occupied machine minutes; overhead uses elapsed time. Avoid counting overhead in two rates. Customer PDFs omit internal cost and margin.</p><p>Actual production = finish − start − explicitly excluded pauses. Routine machine stops stay in production time. Existing 3.0.0 production retains that formula; older unstarted estimates need recalculation.</p><h2>Limits</h2><p>DST paths are sampled, sequence colors are illustrative and trims are inferred. Confirm orientation and machine behavior in your embroidery software. Physical sew-outs and shade cards are required to validate timings and colors for your shop.</p>",
  },
};
for (const [slug, p] of Object.entries(pages)) {
  await mkdir(path.join(root, slug), { recursive: true });
  await writeFile(
    path.join(root, slug, "index.html"),
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>' +
      p.title +
      ' — EmbroideryCalc</title><style>body{font:1rem/1.6 -apple-system,system-ui,sans-serif;color:#172033;margin:0}main{max-width:42rem;margin:auto;padding:calc(24px + env(safe-area-inset-top)) 24px calc(40px + env(safe-area-inset-bottom))}a{color:#4338ca;display:inline-block;padding:10px 0}h1{line-height:1.2}a:focus-visible{outline:3px solid #4f46e5}</style></head><body><main><a href="/">← Return to EmbroideryCalc</a><h1>' +
      p.title +
      "</h1>" +
      p.body +
      "</main></body></html>",
  );
}
const home = await readFile(path.join(root, "index.html"), "utf8");
if (/googletagmanager|google-analytics|cloudflareinsights/.test(home))
  throw Error("Unexpected analytics in native entry");
console.log(
  "Native bundle: calculator, local assets and offline privacy/support/methodology only.",
);
