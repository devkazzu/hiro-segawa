import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  FolderArchive,
  GitBranch,
  LoaderCircle,
  Rocket,
} from "lucide-react";
import { downloadSourceProject } from "./exportProject";

export function ExportDialog() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function download() {
    if (busy) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setComplete(false);
    setStatus("Collecting your source files...");
    try {
      await downloadSourceProject(setStatus, controller.signal);
      setComplete(true);
      setStatus("Your source ZIP is ready. Check your browser's Downloads.");
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(
          reason instanceof Error
            ? reason.message
            : "The ZIP could not be created. Use the platform download button above the preview.",
        );
        setStatus("");
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <div className="export-project-dialog">
      <div className="export-summary">
        <span>
          <FolderArchive size={25} />
        </span>
        <div>
          <strong>Your app. Ready to take with you.</strong>
          <p>
            Complete source, original artwork, music scores, setup instructions,
            and GitHub Pages deployment workflow.
          </p>
        </div>
      </div>
      <button
        className="primary-button export-source-button"
        onClick={() => void download()}
        disabled={busy}
      >
        {busy ? (
          <LoaderCircle size={16} className="loading-spin" />
        ) : complete ? (
          <Check size={16} />
        ) : (
          <Download size={16} />
        )}{" "}
        {busy ? "Preparing your ZIP..." : "Download source ZIP"}
      </button>
      <p
        className={`export-status ${error ? "export-error" : ""}`}
        role="status"
        aria-live="polite"
      >
        {error || status}
      </p>
      <div className="export-fallback">
        <strong>Downloading from the preview?</strong>
        <p>
          The white <b>Download Project as Zip File</b> button above the app
          also exports this project. If your mobile browser blocks in-app
          downloads, use that button or open the preview in a new tab.
        </p>
      </div>
      <ol className="export-steps">
        <li>
          <span>1</span>
          <div>
            <strong>Extract, then upload to GitHub</strong>
            <p>
              Open the extracted hiro-segawa folder. Upload its contents, not
              the ZIP itself. package.json must be at the repository root.
            </p>
          </div>
          <GitBranch size={17} />
        </li>
        <li>
          <span>2</span>
          <div>
            <strong>Deploy with Vercel or Netlify</strong>
            <p>
              Import your GitHub repository. Build command:{" "}
              <code>npm run build</code>. Output directory: <code>dist</code>.
            </p>
          </div>
          <Rocket size={17} />
        </li>
        <li>
          <span>3</span>
          <div>
            <strong>Or use GitHub Pages</strong>
            <p>
              In your repository, open Settings, then Pages. Select GitHub
              Actions as the source. The included workflow deploys the main
              branch.
            </p>
          </div>
          <ArrowRight size={17} />
        </li>
      </ol>
      <p className="dialog-footnote">
        No account or backend is required to run the app. Your imported personal
        audio and saved listening data are not exported. Demo instrumentals are
        synthesized locally from the included scores.
      </p>
    </div>
  );
}
