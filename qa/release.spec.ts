import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
const key = "embroidery.production.v3";
async function opened(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "What are we making?" }),
  ).toBeVisible();
}
async function saved(page: Page) {
  await expect(page.locator(".p-save")).toHaveText("Saved on this device");
}
async function example(page: Page) {
  await opened(page);
  await page.getByRole("button", { name: "Try an example job" }).click();
  await saved(page);
  await page
    .getByRole("button", { name: "Review estimate", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your production plan" }),
  ).toBeVisible();
}
async function ready(page: Page) {
  await example(page);
  await page
    .getByRole("button", { name: "Save estimate", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ready when you are" }),
  ).toBeVisible();
  await saved(page);
}
async function check(page: Page, name: string, project: string) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  await mkdir("artifacts/release/screenshots", { recursive: true });
  await writeFile(
    "artifacts/release/" + project + "-" + name + "-axe.json",
    JSON.stringify(result.violations, null, 2),
  );
  expect(result.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/release/screenshots/" + project + "-" + name + ".png",
    fullPage: true,
  });
}
test("A to B to C, accessible plan, PDF, run, pause, restart and duplication", async ({
  page,
}, info) => {
  const errors: string[] = [],
    requests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (
      r.url().startsWith("http") &&
      !r.url().startsWith("http://127.0.0.1:4322")
    )
      requests.push(r.url());
  });
  await opened(page);
  expect(await page.title()).toContain("EmbroideryCalc");
  await check(page, "a-job", info.project.name);
  await page.getByRole("button", { name: "Try an example job" }).click();
  await saved(page);
  await page
    .getByRole("button", { name: "Review estimate", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your production plan" }),
  ).toBeVisible();
  await check(page, "b-estimate", info.project.name);
  await page
    .getByRole("button", { name: "Save estimate", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ready when you are" }),
  ).toBeVisible();
  await saved(page);
  await check(page, "c-next", info.project.name);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Share quote", exact: true }).click();
  const pdf = await download;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  await pdf.saveAs("artifacts/release/" + info.project.name + "-quote.pdf");
  await page
    .getByRole("button", { name: "Start production", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Production is running" }),
  ).toBeVisible();
  await saved(page);
  await page
    .getByRole("button", { name: "Pause production", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Production paused" }),
  ).toBeVisible();
  await saved(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Production paused" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume production", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Production is running" }),
  ).toBeVisible();
  await saved(page);
  await page.getByRole("button", { name: "Complete job", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Job complete", exact: true }),
  ).toBeVisible();
  await saved(page);
  await check(page, "complete", info.project.name);
  await page
    .getByRole("button", { name: "Duplicate job", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "What are we making?" }),
  ).toBeVisible();
  await saved(page);
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!).jobs.length,
      key,
    ),
  ).toBe(2);
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
});
test("invalid drafts survive restart; shop edits survive navigation and explicit save", async ({
  page,
}, info) => {
  await opened(page);
  await page.getByLabel("Quantity", { exact: true }).fill("");
  await saved(page);
  await page.reload();
  await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue("0");
  await page
    .getByRole("button", { name: "Review estimate", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("quantity");
  await check(page, "validation", info.project.name);
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  await page.getByLabel("Shop name on quotes").fill("Release test shop");
  await page.getByRole("button", { name: "Jobs", exact: true }).click();
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  await expect(page.getByLabel("Shop name on quotes")).toHaveValue(
    "Release test shop",
  );
  await page.getByRole("button", { name: "Save shop settings" }).click();
  await saved(page);
  await page.reload();
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  await expect(page.getByLabel("Shop name on quotes")).toHaveValue(
    "Release test shop",
  );
  await check(page, "shop", info.project.name);
});
test("a failed production write does not advance status", async ({
  page,
}, info) => {
  await ready(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await page
    .getByRole("button", { name: "Start production", exact: true })
    .click();
  await expect(page.locator(".p-save")).toHaveText("Not saved");
  await expect(
    page.getByRole("heading", { name: "Ready when you are" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Production is running" }),
  ).toHaveCount(0);
  await check(page, "save-failed", info.project.name);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ready when you are" }),
  ).toBeVisible();
});
test("backups merge and corrupt browser data has an accessible restore path", async ({
  page,
}, info) => {
  await ready(page);
  const raw = await page.evaluate((k) => localStorage.getItem(k)!, key);
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const file = await pending;
  expect(file.suggestedFilename()).toContain("embroidery-backup");
  const changed = JSON.parse(raw);
  changed.jobs[0].name = "Restored job";
  await page
    .locator('input[type=file][accept="application/json,.json"]')
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(changed)),
    });
  await saved(page);
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!).jobs.length,
      key,
    ),
  ).toBe(2);
  await page.evaluate((k) => localStorage.setItem(k, "broken data"), key);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Export recovery file" }),
  ).toBeVisible();
  await check(page, "recovery", info.project.name);
  await page
    .getByLabel("Restore an exported backup")
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
  await expect(
    page.getByRole("heading", { name: "Ready when you are" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) =>
        k.startsWith("embroidery.recovery."),
      ),
    ),
  ).toBe(true);
});
test("DST multi-location and local color tools", async ({ page }, info) => {
  await opened(page);
  const header = Buffer.alloc(512, 32);
  header.write("LA:SYNTHETIC\rST:0000004\rCO:001\r");
  const dst = Buffer.concat([
    header,
    Buffer.from([1, 0, 3, 0, 0, 195, 0, 1, 3, 1, 0, 131, 1, 0, 3, 0, 0, 243]),
  ]);
  await page
    .locator('input[accept=".dst"]')
    .setInputFiles({
      name: "synthetic.dst",
      mimeType: "application/octet-stream",
      buffer: dst,
    });
  await expect(page.locator(".p-stitch")).toBeVisible();
  await saved(page);
  await page.getByRole("button", { name: "Add location" }).click();
  await page.getByLabel("Stitches 2", { exact: true }).fill("10000");
  await saved(page);
  await page
    .getByRole("button", { name: "Review estimate", exact: true })
    .click();
  await expect(page.locator(".p-batch")).toHaveCount(2);
  await check(page, "dst-plan", info.project.name);
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Choose image", exact: true }),
  ).toBeVisible();
  await check(page, "tools-empty", info.project.name);
  const png = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#2244aa";
      ctx.fillRect(0, 0, 100, 200);
      ctx.fillStyle = "#ee9922";
      ctx.fillRect(100, 0, 100, 200);
      return canvas.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await page
    .locator('input[type=file][accept="image/*"]:not([capture])')
    .setInputFiles({ name: "sample.png", mimeType: "image/png", buffer: png });
  await expect(
    page.getByRole("button", { name: "Replace", exact: true }),
  ).toBeVisible();
  await check(page, "tools-image", info.project.name);
});
test("narrow landscape, keyboard and enlarged text layout", async ({
  page,
}, info) => {
  await example(page);
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await check(page, "size-" + viewport.width, info.project.name);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const sizes = Array.from(
      document.querySelectorAll(".production-app *"),
      (el) => ({
        el: el as HTMLElement,
        size: parseFloat(getComputedStyle(el).fontSize),
      }),
    );
    sizes.forEach(({ el, size }) => {
      el.style.fontSize = size * 2 + "px";
    });
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path:
      "artifacts/release/screenshots/" + info.project.name + "-large-text.png",
    fullPage: true,
  });
});
