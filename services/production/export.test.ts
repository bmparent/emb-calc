import { afterEach, expect, it, vi } from "vitest";
import { emptyStore, estimateJob } from "./model";
import { shareQuote } from "./export";
import { Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock("@capacitor/filesystem", () => ({
  Directory: { Cache: "CACHE" },
  Filesystem: {
    writeFile: vi.fn(async () => ({ uri: "file:///test-cache/quote.pdf" })),
    deleteFile: vi.fn(async () => undefined),
  },
}));
vi.mock("@capacitor/share", () => ({
  Share: { share: vi.fn(async () => ({})) },
}));
afterEach(() => vi.unstubAllGlobals());

it("exports an imported job ID as a cache filename, never a relative path", async () => {
  vi.stubGlobal(
    "FileReader",
    class {
      result = "data:application/pdf;base64,cGRm";
      onload?: () => void;
      readAsDataURL() {
        this.onload?.();
      }
    },
  );
  const job = emptyStore().jobs[0];
  job.id = "/../../customer-id";
  job.designs[0].stitches = 1000;
  await shareQuote(estimateJob(job), "Example shop");
  const written = vi.mocked(Filesystem.writeFile).mock.calls[0][0];
  expect(written.directory).toBe("CACHE");
  expect(written.path).toMatch(/^quote-[a-zA-Z0-9_-]+\.pdf$/);
  expect(Share.share).toHaveBeenCalledWith(
    expect.objectContaining({
      files: ["file:///test-cache/quote.pdf"],
    }),
  );
  expect(Filesystem.deleteFile).toHaveBeenCalledWith({
    path: written.path,
    directory: "CACHE",
  });
});
