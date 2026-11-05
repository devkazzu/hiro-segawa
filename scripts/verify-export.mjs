import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  acceptDownloads: true,
});
let page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await context.addInitScript(() => {
  window.__exportAudio = [];
  const OriginalAudio = window.Audio;
  window.Audio = function (...args) {
    const audio = new OriginalAudio(...args);
    window.__exportAudio.push(audio);
    return audio;
  };
  window.Audio.prototype = OriginalAudio.prototype;
});
let server;
let temporary;

async function exportSource() {
  await page
    .getByRole("button", { name: "Download project ZIP", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Download & deploy your app",
    exact: true,
  });
  await expect(modal).toBeVisible();
  const event = page.waitForEvent("download");
  await modal
    .getByRole("button", { name: "Download source ZIP", exact: true })
    .click();
  const download = await event;
  assert.equal(await download.failure(), null);
  assert.equal(download.suggestedFilename(), "hiro-segawa-source.zip");
  const data = await readFile(await download.path());
  assert.equal(data.subarray(0, 2).toString(), "PK");
  return { data, entries: unzipSync(data) };
}

async function checkImages() {
  await expect
    .poll(async () =>
      page
        .locator("img")
        .evaluateAll(
          (images) =>
            images.filter((image) => !image.complete || !image.naturalWidth)
              .length,
        ),
    )
    .toBe(0);
}

try {
  await page.goto(process.env.APP_URL || "http://localhost:5173", {
    waitUntil: "networkidle",
  });
  await checkImages();
  const { data, entries } = await exportSource();
  const required = [
    ".gitignore",
    "README.md",
    "package.json",
    "package-lock.json",
    "vite.config.ts",
    "netlify.toml",
    ".github/workflows/deploy-pages.yml",
    "src/App.tsx",
    "src/vite-env.d.ts",
    "src/player/demoAudio.ts",
    "src/player/exportProject.ts",
    "public/images/hero-bg.jpg",
    "public/images/anime-girl.jpg",
    "public/favicon.svg",
  ];
  for (const file of required)
    assert.ok(entries[`hiro-segawa/${file}`], `Missing export file: ${file}`);
  assert.equal(
    Object.keys(entries).filter((name) => name.endsWith(".jpg")).length,
    10,
  );
  assert.ok(
    Object.keys(entries).every(
      (name) =>
        !/(?:^|\/)(?:node_modules|\.git|\.env|artifacts|downloads)(?:\/|$)/.test(
          name,
        ),
    ),
  );
  assert.equal(
    strFromU8(entries["hiro-segawa/package.json"]),
    await readFile("package.json", "utf8"),
  );
  const source = path.resolve("artifacts/export-check");
  await mkdir(source, { recursive: true });
  await writeFile(path.join(source, "verified-source.zip"), data);
  await rm(path.join(source, "hiro-segawa"), { recursive: true, force: true });
  temporary = await mkdtemp(path.join(tmpdir(), "hiro-export-check-"));
  for (const [name, contents] of Object.entries(entries)) {
    const destination = path.resolve(temporary, name);
    assert.ok(destination.startsWith(temporary + path.sep), "Unsafe ZIP path");
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, contents);
  }
  console.log(
    `PASS: browser-created source ZIP, ${Object.keys(entries).length} files, ${Math.round(data.length / 1024)} KiB, no static download URL`,
  );

  await page.close();
  const extracted = path.join(temporary, "hiro-segawa");
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  execFileSync(npm, ["ci", "--no-audit", "--no-fund"], {
    cwd: extracted,
    stdio: "inherit",
    timeout: 180000,
  });
  execFileSync(npm, ["exec", "--", "tsc", "--noEmit"], {
    cwd: extracted,
    stdio: "inherit",
    timeout: 120000,
  });
  execFileSync(npm, ["run", "build", "--", "--base=./"], {
    cwd: extracted,
    stdio: "inherit",
    timeout: 120000,
  });
  console.log(
    "PASS: downloaded source installs, type checks, and builds without Python or generated media",
  );

  const distribution = path.join(extracted, "dist");
  const prefix = "/hiro-segawa/";
  const types = {
    ".html": "text/html",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
  };
  server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, "http://localhost").pathname;
      if (!pathname.startsWith(prefix)) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      const filename = path.resolve(
        distribution,
        decodeURIComponent(pathname.slice(prefix.length) || "index.html"),
      );
      if (!filename.startsWith(distribution + path.sep))
        throw new Error("Invalid path");
      await stat(filename);
      response.writeHead(200, {
        "Content-Type":
          types[path.extname(filename)] || "application/octet-stream",
      });
      response.end(await readFile(filename));
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}${prefix}`;
  const failures = [];
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().startsWith(url) && response.status() >= 400)
      failures.push(response.url());
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await checkImages();
  await page
    .getByRole("button", { name: "Play something", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        page.evaluate(
          () =>
            window.__exportAudio.find((audio) => audio.dataset.trackId)
              ?.currentTime || 0,
        ),
      { timeout: 20000 },
    )
    .toBeGreaterThan(0.3);
  assert.deepEqual(failures, []);
  const { entries: exportedAgain } = await exportSource();
  for (const file of required)
    assert.ok(
      exportedAgain[`hiro-segawa/${file}`],
      `Cannot re-export deployed source: ${file}`,
    );
  await page.screenshot({
    path: "artifacts/export-check/deployed-export-dialog.png",
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: artwork, real audio, and another source export work from a GitHub Pages-style subpath with no 404s",
  );
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await browser.close();
  if (temporary) await rm(temporary, { recursive: true, force: true });
}
