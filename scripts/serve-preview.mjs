import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist-native");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const target = path.resolve(
        root,
        "." + pathname + (pathname.endsWith("/") ? "index.html" : ""),
      );
      if (!target.startsWith(root + path.sep)) throw Error("Invalid path");
      const body = await readFile(target);
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(target)] || "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(4322, "127.0.0.1", () =>
    console.log("Native bundle preview: http://127.0.0.1:4322"),
  );
