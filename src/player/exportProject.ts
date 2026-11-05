import { strToU8, zip, type Zippable } from "fflate";
import { PUBLIC_FILES } from "./media";
import exporterSource from "./exportProject.ts?raw";

const sources = import.meta.glob<string>(
  [
    "/src/**/*.{ts,tsx,css}",
    "/scripts/*.{mjs,py}",
    "/.github/workflows/*.{yml,yaml}",
    "/.gitignore",
    "/README.md",
    "/index.html",
    "/package.json",
    "/package-lock.json",
    "/tsconfig.json",
    "/vite.config.ts",
    "/netlify.toml",
  ],
  { query: "?raw", import: "default", eager: true },
);
// Vite excludes the importing module from globs; keep the exporter re-exportable.
sources["/src/player/exportProject.ts"] = exporterSource;

export async function downloadSourceProject(
  onProgress: (message: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const files: Zippable = {};
  const folder = "hiro-segawa/";
  const required = [
    "/src/App.tsx",
    "/src/player/demoAudio.ts",
    "/package.json",
    "/package-lock.json",
    "/vite.config.ts",
    "/README.md",
    "/.github/workflows/deploy-pages.yml",
  ];
  if (required.some((path) => typeof sources[path] !== "string"))
    throw new Error(
      "The source export is incomplete. Use the white Download Project button above the preview instead.",
    );
  for (const [path, content] of Object.entries(sources))
    files[folder + path.replace(/^\//, "")] = strToU8(content);
  let completed = 0;
  await Promise.all(
    PUBLIC_FILES.map(async (path) => {
      signal.throwIfAborted();
      const relative = path.replace(/^public\//, "");
      const response = await fetch(new URL(relative, document.baseURI), {
        signal,
      });
      if (
        !response.ok ||
        !(response.headers.get("content-type") ?? "").startsWith("image/")
      )
        throw new Error(
          `Artwork could not be exported: ${relative}. Refresh the app or use the platform download button.`,
        );
      files[folder + path] = [
        new Uint8Array(await response.arrayBuffer()),
        { level: 0 },
      ];
      completed++;
      onProgress(`Packing artwork ${completed} of ${PUBLIC_FILES.length}...`);
    }),
  );
  signal.throwIfAborted();
  onProgress("Creating your complete source ZIP...");
  const result = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 6 }, (error, data) =>
      error ? reject(error) : resolve(data),
    );
  });
  signal.throwIfAborted();
  const blob = new Blob([Uint8Array.from(result)], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hiro-segawa-source.zip";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
