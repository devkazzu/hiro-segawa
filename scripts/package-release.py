"""Package complete source and deployment ZIPs without credentials or dependencies."""
from pathlib import Path
import os
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
DOWNLOADS = ROOT / "releases"
SOURCE = DOWNLOADS / "hiro-segawa-source.zip"
DEPLOY = DOWNLOADS / "hiro-segawa-deploy.zip"
ROOT_FILES = [
    ".gitignore", "README.md", "index.html", "package.json",
    "package-lock.json", "tsconfig.json", "vite.config.ts", "public/favicon.svg", "netlify.toml",
]
SOURCE_DIRS = ["src", "scripts", "public/images", ".github"]
EXCLUDED_PARTS = {
    ".git", "node_modules", "__pycache__", ".vite", "artifacts",
    "test-results", "playwright-report", "blob-report", ".idea", ".vscode",
}


def allowed(path):
    return (
        path.is_file()
        and not path.is_symlink()
        and not (set(path.relative_to(ROOT).parts) & EXCLUDED_PARTS)
        and not path.name.startswith(".env")
        and path.name != ".npmrc"
        and path.suffix.lower() not in {".pem", ".key", ".log", ".pyc"}
    )


def verify_media():
    manifest = (ROOT / "src" / "player" / "media.ts").read_text(encoding="utf-8")
    references = re.findall(r'''["'](public/[^"']+)["']''', manifest)
    missing = [path for path in references if not (ROOT / path).is_file()]
    if missing:
        raise SystemExit(
            "Cannot export an incomplete app. Missing media:\n"
            + "\n".join(missing)
            + "\nRestore the original public/images files from the source project."
        )


def archive(destination, files, base, prefix=""):
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as output:
        for path in sorted(files):
            name = prefix + path.relative_to(base).as_posix()
            compression = zipfile.ZIP_STORED if path.suffix.lower() in {".zip", ".mp3", ".webp", ".jpg"} else zipfile.ZIP_DEFLATED
            output.write(path, name, compress_type=compression)
    with zipfile.ZipFile(destination) as output:
        damaged = output.testzip()
        if damaged:
            raise SystemExit(f"Archive integrity check failed: {damaged}")
    print(f"Verified: {destination.relative_to(ROOT)} ({destination.stat().st_size / 1024**2:.1f} MiB)")


def main():
    verify_media()
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    # Remove only our previous generated files, avoiding nested deployment archives.
    SOURCE.unlink(missing_ok=True)
    DEPLOY.unlink(missing_ok=True)
    files = [ROOT / name for name in ROOT_FILES if (ROOT / name).is_file()]
    for directory in SOURCE_DIRS:
        files.extend(path for path in (ROOT / directory).rglob("*") if allowed(path))
    archive(SOURCE, set(files), ROOT, "hiro-segawa/")

    npm = "npm.cmd" if os.name == "nt" else "npm"
    subprocess.run([npm, "run", "build", "--", "--base=./"], cwd=ROOT, check=True)
    distribution = ROOT / "dist"
    deploy_files = [path for path in distribution.rglob("*") if allowed(path)]
    archive(DEPLOY, deploy_files, distribution)
    print("Source ZIP: extract hiro-segawa/, then run npm ci and npm run dev.")
    print("Deploy ZIP: extract and serve index.html on a static web host. No Python or MP3 generation is needed to run the app.")


if __name__ == "__main__":
    main()