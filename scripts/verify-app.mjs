import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium, expect as playwrightExpect } from "@playwright/test";

const expect = playwrightExpect.configure({ timeout: 15000 });

const baseURL = process.env.APP_URL || "http://localhost:5173";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(12000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await mkdir("artifacts", { recursive: true });

// Observe native audio nodes without adding test hooks to the shipped application.
await page.addInitScript(() => {
  window.__audioTest = { audio: [], filters: [], analysers: [] };
  const OriginalAudio = window.Audio;
  window.Audio = function (...args) {
    const audio = new OriginalAudio(...args);
    window.__audioTest.audio.push(audio);
    return audio;
  };
  window.Audio.prototype = OriginalAudio.prototype;
  for (const [method, key] of [
    ["createBiquadFilter", "filters"],
    ["createAnalyser", "analysers"],
  ]) {
    const original = AudioContext.prototype[method];
    AudioContext.prototype[method] = function (...args) {
      const node = original.apply(this, args);
      window.__audioTest[key].push(node);
      return node;
    };
  }
});

const main = () => page.locator(".main-scroll");
const currentAudio = () =>
  page.evaluate(() => {
    const audio = window.__audioTest.audio.find((item) => item.dataset.trackId);
    return audio
      ? {
          paused: audio.paused,
          time: audio.currentTime,
          duration: audio.duration,
          id: audio.dataset.trackId,
          source: audio.src,
        }
      : null;
  });
async function navigate(name) {
  await page
    .locator(".desktop-sidebar .nav-item")
    .filter({ hasText: name })
    .click();
  await page.waitForTimeout(300);
}
async function setRange(locator, value) {
  await locator.evaluate((element, next) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set.call(element, String(next));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
async function checkWidth() {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth > innerWidth,
    main:
      document.querySelector(".main-scroll").scrollWidth >
      document.querySelector(".main-scroll").clientWidth + 1,
  }));
  assert.equal(
    overflow.document,
    false,
    "Document must not overflow horizontally",
  );
  assert.equal(
    overflow.main,
    false,
    "Main view must not overflow horizontally",
  );
}

try {
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await expect(
    main().getByRole("heading", { name: "Hiro Segawa", exact: true }),
  ).toBeVisible();
  await checkWidth();
  await page.screenshot({ path: "artifacts/app-desktop.png" });
  console.log("PASS: app shell, artwork, and desktop layout");

  await page
    .getByRole("button", { name: "Play something", exact: true })
    .click();
  await expect
    .poll(async () => (await currentAudio())?.time)
    .toBeGreaterThan(0.3);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const analyser = window.__audioTest.analysers[0];
        if (!analyser) return 0;
        const values = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(values);
        return Math.max(...values);
      }),
    )
    .toBeGreaterThan(0);
  await page
    .locator(".now-playing-panel")
    .getByRole("button", { name: "Next track", exact: true })
    .click();
  await expect(page.locator(".now-track-info h2")).toHaveText("Blossom");
  await expect.poll(async () => (await currentAudio())?.id).toBe("blossom");
  await setRange(
    page
      .locator(".now-playing-panel")
      .getByRole("slider", { name: "Playback position" }),
    25,
  );
  await expect
    .poll(async () => (await currentAudio())?.time)
    .toBeGreaterThan(24);
  await page
    .locator(".now-playing-panel")
    .getByRole("button", { name: "Pause music", exact: true })
    .click();
  assert.equal((await currentAudio()).paused, true);
  await page
    .locator(".now-playing-panel")
    .getByRole("button", { name: "Repeat: off", exact: true })
    .click();
  await expect(
    page
      .locator(".now-playing-panel")
      .getByRole("button", { name: "Repeat: all", exact: true }),
  ).toBeVisible();
  await page
    .locator(".now-playing-panel")
    .getByRole("button", { name: "Repeat: all", exact: true })
    .click();
  await page
    .locator(".now-playing-panel")
    .getByRole("button", { name: "Play music", exact: true })
    .click();
  await setRange(
    page
      .locator(".now-playing-panel")
      .getByRole("slider", { name: "Playback position" }),
    (await currentAudio()).duration - 0.2,
  );
  await expect.poll(async () => (await currentAudio())?.time).toBeLessThan(3);
  assert.equal((await currentAudio()).id, "blossom");
  await page
    .locator(".now-playing-panel")
    .getByRole("button", { name: "Pause music", exact: true })
    .click();
  await page
    .locator(".now-playing-panel")
    .getByRole("button", { name: "Repeat: one", exact: true })
    .click();
  await page
    .locator(".now-playing-panel")
    .getByRole("button", { name: "Play music", exact: true })
    .click();
  await setRange(
    page
      .locator(".now-playing-panel")
      .getByRole("slider", { name: "Playback position" }),
    (await currentAudio()).duration - 0.2,
  );
  await expect.poll(async () => (await currentAudio())?.id).toBe("lost");
  await page
    .locator(".now-playing-panel")
    .getByRole("button", { name: "Pause music", exact: true })
    .click();
  await page
    .locator(".now-playing-panel")
    .getByRole("button", { name: "Turn shuffle on", exact: true })
    .click();
  await expect(
    page
      .locator(".now-playing-panel")
      .getByRole("button", { name: "Turn shuffle off", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const shuffledNext = await page
    .locator(".now-playing-panel .queue-track strong")
    .first()
    .innerText();
  await page
    .locator(".now-playing-panel")
    .getByRole("button", { name: "Next track", exact: true })
    .click();
  await expect(page.locator(".now-track-info h2")).toHaveText(shuffledNext);
  await page
    .locator(".now-playing-panel")
    .getByRole("button", { name: "Pause music", exact: true })
    .click();
  await page
    .locator(".now-playing-panel")
    .getByRole("button", { name: "Turn shuffle off", exact: true })
    .click();
  console.log(
    "PASS: real local audio, frequency analyser, seeking, pause, next, repeat, shuffle",
  );

  const search = page.getByRole("searchbox", {
    name: "Search songs, artists, and albums",
  });
  await main()
    .getByRole("heading", { name: "Hiro Segawa", exact: true })
    .click();
  await page.keyboard.press("Space");
  await expect.poll(async () => (await currentAudio())?.paused).toBe(false);
  await page.keyboard.press("Space");
  await expect.poll(async () => (await currentAudio())?.paused).toBe(true);
  await page.keyboard.press("Control+k");
  await expect(search).toBeFocused();
  await search.fill("Blossom");
  await expect(
    main().getByRole("heading", { name: "Music Library", exact: true }),
  ).toBeVisible();
  await expect(main().locator(".track-table tbody tr")).toHaveCount(1);
  await search.fill("");
  await expect(main().locator(".track-table tbody tr")).toHaveCount(8);
  await main().getByRole("tab", { name: "Artists", exact: true }).click();
  await main()
    .getByRole("button", { name: /Hiro Segawa Artist/ })
    .click();
  await expect(main().locator(".track-table tbody tr")).toHaveCount(5);
  await main()
    .getByRole("button", { name: "Clear collection filter", exact: true })
    .click();
  const raat = main()
    .locator(".track-table tbody tr")
    .filter({ hasText: "Raat Ke Saaye" });
  await raat
    .getByRole("button", { name: "Remove from favorites", exact: true })
    .click();
  await navigate("Favorites");
  await expect(main().locator(".track-table tbody tr")).toHaveCount(2);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("hiro:favorites")).includes("raat"),
    ),
    false,
  );
  console.log("PASS: search, artist filtering, favorites, and persistence");

  await navigate("Playlists");
  await main()
    .getByRole("button", { name: "New playlist", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Playlist name", exact: true })
    .fill("Midnight Test Mix");
  await page
    .getByRole("textbox", { name: "Playlist description", exact: true })
    .fill("An automated little listening session.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create playlist", exact: true })
    .click();
  await expect(
    main().getByRole("heading", { name: "Midnight Test Mix", exact: true }),
  ).toBeVisible();
  await main()
    .getByRole("button", { name: "Add songs", exact: true })
    .first()
    .click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: /Raat Ke Saaye RJNX Beats/ })
    .click();
  await dialog.getByRole("button", { name: /Blossom Hiro Segawa/ }).click();
  await dialog.getByRole("button", { name: "All set", exact: true }).click();
  await expect(main().locator(".track-table tbody tr")).toHaveCount(2);
  await main()
    .getByRole("button", { name: "Playlist options", exact: true })
    .click();
  await main()
    .getByRole("button", { name: "Rename playlist", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Playlist name", exact: true })
    .fill("Test Night Drive");
  await page.getByRole("button", { name: "Save name", exact: true }).click();
  await expect(
    main().getByRole("heading", { name: "Test Night Drive", exact: true }),
  ).toBeVisible();
  await main()
    .getByRole("button", {
      name: "More options for Raat Ke Saaye",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Remove from this playlist", exact: true })
    .click();
  await expect(main().locator(".track-table tbody tr")).toHaveCount(1);
  console.log(
    "PASS: playlist creation, song selection, rename, and track removal",
  );

  await navigate("Music Library");
  const sampleRate = 22050;
  const samples = sampleRate * 4;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index++)
    buffer.writeInt16LE(
      Math.round(Math.sin((index / sampleRate) * Math.PI * 440) * 3000),
      44 + index * 2,
    );
  await page.getByLabel("Import audio files", { exact: true }).setInputFiles({
    name: "Test Artist - Midnight Import.wav",
    mimeType: "audio/wav",
    buffer,
  });
  await expect(main().locator(".track-table tbody tr")).toHaveCount(9);
  await page.reload({ waitUntil: "networkidle" });
  await navigate("Music Library");
  await expect(main().locator(".track-table tbody tr")).toHaveCount(9);
  await main()
    .locator(".track-title-button")
    .filter({ hasText: "Midnight Import" })
    .click();
  await expect
    .poll(async () => (await currentAudio())?.time)
    .toBeGreaterThan(0.2);
  assert.ok((await currentAudio()).source.startsWith("blob:"));
  await main()
    .getByRole("button", {
      name: "More options for Midnight Import",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Remove from your library", exact: true })
    .click();
  await page.getByRole("button", { name: "Remove track", exact: true }).click();
  await expect(main().locator(".track-table tbody tr")).toHaveCount(8);
  console.log(
    "PASS: audio file import, IndexedDB restoration, local playback, and removal",
  );

  await navigate("Themes");
  await main().getByRole("button", { name: "Moonlight", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "moonlight");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "moonlight");
  await navigate("Equalizer");
  await main().getByRole("button", { name: "Bass Boost", exact: true }).click();
  assert.equal(
    await main()
      .getByRole("slider", { name: "60 Hz gain", exact: true })
      .inputValue(),
    "8",
  );
  await setRange(
    main().getByRole("slider", { name: "1K Hz gain", exact: true }),
    7,
  );
  assert.equal(
    await main()
      .getByRole("slider", { name: "1K Hz gain", exact: true })
      .inputValue(),
    "7",
  );
  await main().getByRole("switch", { name: "Bass Boost", exact: true }).click();
  await expect(
    main().getByRole("switch", { name: "Bass Boost", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page
    .locator(".player-dock")
    .getByRole("button", { name: "Play music", exact: true })
    .click();
  await expect
    .poll(async () =>
      page.evaluate(() =>
        Math.round(
          window.__audioTest.filters.find(
            (filter) => filter.frequency.value === 1000,
          ).gain.value,
        ),
      ),
    )
    .toBe(7);
  await expect
    .poll(async () =>
      page.evaluate(() =>
        Math.round(
          window.__audioTest.filters.find(
            (filter) => filter.frequency.value === 130,
          ).gain.value,
        ),
      ),
    )
    .toBe(6);
  await page.screenshot({ path: "artifacts/app-equalizer.png" });
  console.log(
    "PASS: persistent theme changes, EQ presets, real filter gain, and bass boost",
  );

  await navigate("Visualizer");
  await expect(main().locator(".orbit-stage")).toBeVisible();
  await main().getByRole("button", { name: "Spectrum", exact: true }).click();
  await expect(main().locator(".spectrum-stage")).toBeVisible();
  await main().getByRole("button", { name: "Vinyl", exact: true }).click();
  await expect(main().locator(".vinyl-stage.in-motion")).toBeVisible();
  await main()
    .getByRole("button", { name: "Sakura Orbit", exact: true })
    .click();
  await page.screenshot({ path: "artifacts/app-visualizer.png" });
  await navigate("Settings");
  await main()
    .getByRole("switch", { name: "Sakura blossoms", exact: true })
    .click();
  await expect(page.locator(".app-petals")).toHaveCount(0);
  await main()
    .getByRole("switch", { name: "Animations & motion", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await main()
    .getByRole("textbox", { name: "What should we call you?", exact: true })
    .fill("Night Owl");
  await main().getByRole("button", { name: "Save", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await main()
    .getByRole("button", { name: /Back up your space/ })
    .click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "hiro-segawa-backup.json");
  const backup = await readFile(await download.path());
  assert.equal(JSON.parse(backup.toString()).preferences.name, "Night Owl");
  await main()
    .getByRole("textbox", { name: "What should we call you?", exact: true })
    .fill("Temporary name");
  await main().getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByLabel("Restore settings backup", { exact: true })
    .setInputFiles({
      name: "hiro-backup.json",
      mimeType: "application/json",
      buffer: backup,
    });
  await expect(
    main().getByRole("textbox", {
      name: "What should we call you?",
      exact: true,
    }),
  ).toHaveValue("Night Owl");
  await page
    .getByRole("button", { name: "Expand player", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("dialog", { name: "Now Playing", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Sleep timer", exact: true })
    .selectOption("15");
  await expect(
    page.getByRole("combobox", { name: "Sleep timer", exact: true }),
  ).toHaveValue("active");
  await page.evaluate(() => {
    window.__nativeNow = Date.now;
    Date.now = () => window.__nativeNow() + 16 * 60000;
  });
  await expect.poll(async () => (await currentAudio())?.paused).toBe(true);
  await expect(
    page.getByRole("combobox", { name: "Sleep timer", exact: true }),
  ).toHaveValue("0");
  await page.evaluate(() => {
    Date.now = window.__nativeNow;
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  console.log(
    "PASS: visualizer styles, settings, profile, backup export, expanded player, sleep timer",
  );

  await navigate("Playlists");
  await main()
    .getByRole("button", { name: "Open Test Night Drive", exact: true })
    .click();
  await main()
    .getByRole("button", { name: "Playlist options", exact: true })
    .click();
  await main()
    .getByRole("button", { name: "Delete playlist", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete playlist", exact: true })
    .click();
  await expect(
    main().getByRole("heading", { name: "Your Playlists", exact: true }),
  ).toBeVisible();
  assert.equal(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("hiro:playlists")).some(
        (item) => item.name === "Test Night Drive",
      ),
    ),
    false,
  );

  for (const [width, height] of [
    [1024, 900],
    [768, 1024],
    [390, 844],
    [320, 700],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    await checkWidth();
    if (width <= 768) {
      await page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("button", { name: "Home", exact: true })
        .click();
      await expect(
        main().getByRole("heading", { name: "Hiro Segawa", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Equalizer", exact: true })
        .click();
      await expect(
        main().getByRole("heading", { name: "Shape Your Sound", exact: true }),
      ).toBeVisible();
      await checkWidth();
      await page.screenshot({ path: `artifacts/app-${width}-equalizer.png` });
      await page
        .locator(".mobile-dock-controls")
        .getByRole("button", { name: "Expand player", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Now Playing", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".dialog-backdrop")).toHaveCSS("opacity", "1");
      await page.screenshot({ path: `artifacts/app-${width}-player.png` });
      await page.keyboard.press("Escape");
    }
  }
  console.log(
    "PASS: tablet, mobile, 320px layout, mobile drawer, and full-screen player",
  );
  await page.evaluate(() => {
    localStorage.setItem("hiro:preferences", '{"volume":9}');
    localStorage.setItem("hiro:playlists", '"invalid"');
    localStorage.setItem("hiro:favorites", "{}");
  });
  await page.reload({ waitUntil: "networkidle" });
  await expect(
    main().getByRole("heading", { name: "Hiro Segawa", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sakura");
  console.log("PASS: safe recovery from invalid local settings");
  assert.deepEqual(errors, [], "No unhandled browser errors");
  console.log("ALL CHECKS PASSED. No uncaught browser errors.");
} catch (error) {
  await page.screenshot({ path: "artifacts/test-failure.png" });
  console.error("BROWSER ERRORS", errors);
  throw error;
} finally {
  await browser.close();
}
