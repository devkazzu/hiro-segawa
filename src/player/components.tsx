import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  AudioLines,
  Check,
  Clock3,
  Heart,
  LoaderCircle,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { usePlayer } from "./PlayerContext";
import { useNavigation } from "./Navigation";
import { formatTime } from "./catalog";
import type { Playlist, Track } from "./types";

export function FoxMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`fox-mark ${className}`}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m11 7 13 15c5-2 11-2 16 0L53 7l-1 19-6 8 1 10-11 8-4 7-4-7-11-8 1-10-6-8-1-19Z" />
      <path d="m16 36 12 5-6 1-6-6Zm32 0-12 5 6 1 6-6ZM28 48l4 4 4-4" />
      <path d="m13 12 7 14m31-14-7 14" opacity=".55" />
    </svg>
  );
}

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <span className={`brand ${large ? "brand-large" : ""}`}>
      <FoxMark />
      <span>
        <strong>Hiro Segawa</strong>
        <span className="brand-japanese" lang="ja">
          ヒロセガワ <span>MUSIC PLAYER</span>
        </span>
      </span>
    </span>
  );
}

export function IconButton({
  children,
  label,
  active = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${active ? "is-active" : ""} ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`app-switch ${on ? "is-on" : ""}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
    >
      <span />
    </button>
  );
}

export function FavoriteButton({ trackId }: { trackId: string }) {
  const { favorites, toggleFavorite } = usePlayer();
  const liked = favorites.includes(trackId);
  return (
    <IconButton
      label={liked ? "Remove from favorites" : "Add to favorites"}
      active={liked}
      aria-pressed={liked}
      onClick={() => toggleFavorite(trackId)}
      className="favorite-button"
    >
      <Heart fill={liked ? "currentColor" : "none"} />
    </IconButton>
  );
}

export function PlayButton({ className = "" }: { className?: string }) {
  const { playing, loading, togglePlay } = usePlayer();
  return (
    <button
      type="button"
      className={`play-button ${className}`}
      onClick={togglePlay}
      aria-label={playing || loading ? "Pause music" : "Play music"}
      title="Play / pause (Space)"
    >
      {loading ? (
        <LoaderCircle className="loading-spin" />
      ) : playing ? (
        <Pause fill="currentColor" />
      ) : (
        <Play fill="currentColor" className="play-triangle" />
      )}
    </button>
  );
}

export function Transport({ small = false }: { small?: boolean }) {
  const { shuffle, setShuffle, repeat, cycleRepeat, previous, next } =
    usePlayer();
  return (
    <div className={`transport ${small ? "transport-small" : ""}`}>
      <IconButton
        label={shuffle ? "Turn shuffle off" : "Turn shuffle on"}
        active={shuffle}
        aria-pressed={shuffle}
        onClick={() => setShuffle(!shuffle)}
      >
        <Shuffle />
      </IconButton>
      <IconButton
        label="Previous track"
        onClick={previous}
        className="skip-control"
      >
        <SkipBack fill="currentColor" />
      </IconButton>
      <PlayButton />
      <IconButton label="Next track" onClick={next} className="skip-control">
        <SkipForward fill="currentColor" />
      </IconButton>
      <IconButton
        label={`Repeat: ${repeat}`}
        active={repeat !== "off"}
        onClick={cycleRepeat}
      >
        {repeat === "one" ? <Repeat1 /> : <Repeat />}
      </IconButton>
    </div>
  );
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label,
  className = "",
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  className?: string;
}) {
  const clamped = Math.max(min, Math.min(max, value));
  return (
    <input
      className={`music-range ${className}`}
      type="range"
      aria-label={label}
      min={min}
      max={max || 1}
      step={step}
      value={clamped}
      onChange={(event) => onChange(Number(event.target.value))}
      style={
        {
          "--range-progress": `${((clamped - min) / (max - min || 1)) * 100}%`,
        } as CSSProperties
      }
    />
  );
}

export function SeekBar({ compact = false }: { compact?: boolean }) {
  const { position, duration, seek } = usePlayer();
  return (
    <div className={`seek-bar ${compact ? "seek-inline" : ""}`}>
      {compact && <span>{formatTime(position)}</span>}
      <Slider
        label="Playback position"
        min={0}
        max={duration || 1}
        value={position}
        step={0.1}
        onChange={seek}
      />
      {compact ? (
        <span>{formatTime(duration)}</span>
      ) : (
        <div className="seek-times">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}
    </div>
  );
}

export function AudioVisualizer({
  variant = "bars",
  className = "",
}: {
  variant?: "bars" | "ring";
  className?: string;
}) {
  const { engine, playing, preferences, theme } = usePlayer();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animation = 0;
    let width = 0;
    let height = 0;
    const data = new Uint8Array(256);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const analyser = engine.analyser;
      if (playing && analyser) analyser.getByteFrequencyData(data);
      else data.fill(0);
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, theme.accent + "24");
      gradient.addColorStop(0.5, theme.accent);
      gradient.addColorStop(1, theme.soft);
      ctx.fillStyle = gradient;
      ctx.strokeStyle = theme.accent;
      const count = variant === "ring" ? 100 : 56;
      for (let index = 0; index < count; index++) {
        const sample = Math.floor(Math.pow(index / count, 1.8) * 190);
        const frequency = data[sample] / 255;
        if (variant === "bars") {
          const barWidth = width / count;
          const minimum = 2 + Math.sin(index * 0.65) ** 2 * 6;
          const barHeight = Math.max(minimum, frequency * height * 0.96);
          ctx.globalAlpha = playing ? 0.9 : 0.33;
          ctx.beginPath();
          ctx.roundRect(
            index * barWidth + 1,
            (height - barHeight) / 2,
            Math.max(1, barWidth - 2),
            barHeight,
            2,
          );
          ctx.fill();
        } else {
          const angle = (index / count) * Math.PI * 2;
          const radius = Math.min(width, height) * 0.37;
          const length = 4 + frequency * Math.min(width, height) * 0.1;
          ctx.globalAlpha = 0.45 + frequency * 0.55;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(
            width / 2 + Math.cos(angle) * radius,
            height / 2 + Math.sin(angle) * radius,
          );
          ctx.lineTo(
            width / 2 + Math.cos(angle) * (radius + length),
            height / 2 + Math.sin(angle) * (radius + length),
          );
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      if (preferences.motion && !reducedMotion && playing)
        animation = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(() => {
      resize();
      if (!playing || !preferences.motion) draw();
    });
    observer.observe(canvas);
    resize();
    draw();
    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
    };
  }, [engine, playing, preferences.motion, theme]);
  return (
    <canvas
      ref={ref}
      className={`audio-visualizer ${className}`}
      aria-label={
        playing ? "Live audio frequency visualizer" : "Audio visualizer, paused"
      }
      role="img"
    />
  );
}

export function TrackList({
  tracks,
  playlistId,
  minimal = false,
}: {
  tracks: Track[];
  playlistId?: string;
  minimal?: boolean;
}) {
  const { current, playing, playTrack } = usePlayer();
  const { setModal } = useNavigation();
  return (
    <div className={`track-table-wrap ${minimal ? "minimal-tracks" : ""}`}>
      <table className="track-table">
        <thead>
          <tr>
            <th className="track-number">#</th>
            <th>Title</th>
            <th className="album-column">Album</th>
            <th className="time-column">
              <Clock3 size={14} />
              <span className="sr-only">Duration</span>
            </th>
            <th>
              <span className="sr-only">Favorite</span>
            </th>
            <th>
              <span className="sr-only">Options</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, index) => (
            <tr
              key={track.id}
              className={current.id === track.id ? "current-track" : ""}
            >
              <td className="track-number">
                <button
                  className="track-index"
                  aria-label={`Play ${track.title}`}
                  onClick={() =>
                    playTrack(
                      track.id,
                      tracks.map((item) => item.id),
                    )
                  }
                >
                  {current.id === track.id && playing ? (
                    <AudioLines size={15} className="live-track-icon" />
                  ) : (
                    <>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <Play size={13} fill="currentColor" />
                    </>
                  )}
                </button>
              </td>
              <td>
                <button
                  className="track-title-button"
                  onClick={() =>
                    playTrack(
                      track.id,
                      tracks.map((item) => item.id),
                    )
                  }
                >
                  <img src={track.image} alt="" loading="lazy" />
                  <span>
                    <strong>{track.title}</strong>
                    <small>{track.artist}</small>
                  </span>
                  {track.imported && <span className="local-label">LOCAL</span>}
                </button>
              </td>
              <td className="album-column">{track.album}</td>
              <td className="time-column">{formatTime(track.duration)}</td>
              <td>
                <FavoriteButton trackId={track.id} />
              </td>
              <td>
                <IconButton
                  label={`More options for ${track.title}`}
                  onClick={() =>
                    setModal({ type: "track", trackId: track.id, playlistId })
                  }
                >
                  <MoreHorizontal />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlaylistTile({ playlist }: { playlist: Playlist }) {
  const { selectPlaylist } = useNavigation();
  const { playTrack } = usePlayer();
  return (
    <article className="playlist-tile">
      <div className="playlist-art">
        <button
          onClick={() => selectPlaylist(playlist.id)}
          aria-label={`Open ${playlist.name}`}
        >
          <img src={playlist.image} alt={playlist.name} loading="lazy" />
        </button>
        <button
          className="playlist-play"
          aria-label={`Play ${playlist.name}`}
          disabled={!playlist.trackIds.length}
          onClick={() => playTrack(playlist.trackIds[0], playlist.trackIds)}
        >
          <Play fill="currentColor" size={19} />
        </button>
        <span className="playlist-track-count">
          {playlist.trackIds.length} tracks
        </span>
      </div>
      <button
        className="playlist-caption"
        onClick={() => selectPlaylist(playlist.id)}
      >
        <strong>{playlist.name}</strong>
        <span>{playlist.description}</span>
      </button>
    </article>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Dialog({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const timeout = setTimeout(
      () =>
        ref.current
          ?.querySelector<HTMLElement>("input, button, [tabindex='0']")
          ?.focus(),
      50,
    );
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select, textarea, [tabindex='0']",
        ) ?? [],
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, []);
  return createPortal(
    <motion.div
      className="dialog-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`app-dialog ${className}`}
        initial={{ y: 16, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 12, opacity: 0 }}
      >
        <div className="dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

export function AppPetals() {
  const { preferences } = usePlayer();
  if (!preferences.petals) return null;
  return (
    <div
      className={`app-petals ${preferences.motion ? "" : "petals-still"}`}
      aria-hidden="true"
    >
      {Array.from({ length: 12 }, (_, index) => (
        <i
          key={index}
          style={
            {
              left: `${(index * 23 + 7) % 100}%`,
              "--petal-duration": `${16 + ((index * 3) % 13)}s`,
              "--petal-delay": `${-index * 3.8}s`,
              "--petal-drift": `${(index % 2 ? 1 : -1) * (35 + index * 8)}px`,
              width: `${5 + (index % 4) * 2}px`,
              height: `${9 + (index % 4) * 2}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function SelectionCheck({ selected }: { selected: boolean }) {
  return (
    <span className={`selection-check ${selected ? "selected" : ""}`}>
      {selected && <Check size={13} strokeWidth={3} />}
    </span>
  );
}
