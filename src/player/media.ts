// Migrate older locally saved playlists to the original, checked-in artwork.
export function normalizeArtwork(value: string): string {
  return value
    .replace(/^\/+images\//, "images/")
    .replace(/^images\/listener-(?:hero|cover)\.webp$/, "images/anime-girl.jpg")
    .replace(/^(images\/[\w-]+)\.webp$/, "$1.jpg");
}

export const PUBLIC_FILES = [
  "public/favicon.svg",
  "public/images/hero-bg.jpg",
  "public/images/bg-temple.jpg",
  "public/images/anime-girl.jpg",
  "public/images/fox-mask-girl.jpg",
  "public/images/bg-sunset.jpg",
  "public/images/bg-moon-lake.jpg",
  "public/images/anime-boy-moon.jpg",
  "public/images/anime-boy-sword.jpg",
  "public/images/bg-fuji.jpg",
  "public/images/visualizer-bg.jpg",
] as const;
