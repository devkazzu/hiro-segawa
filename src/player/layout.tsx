import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  AudioLines,
  Bell,
  ChevronDown,
  ChevronRight,
  Disc3,
  Download,
  Flower2,
  Headphones,
  Heart,
  Home,
  Keyboard,
  LibraryBig,
  ListMusic,
  Maximize2,
  Menu,
  Mic2,
  Moon,
  Palette,
  Play,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { usePlayer } from "./PlayerContext";
import { useNavigation } from "./Navigation";
import {
  AudioVisualizer,
  Brand,
  Dialog,
  FavoriteButton,
  FoxMark,
  IconButton,
  PlayButton,
  SeekBar,
  Slider,
  Transport,
} from "./components";
import type { Page } from "./types";

const MAIN_NAV = [
  { page: "home", icon: Home, label: "Home" },
  { page: "library", icon: LibraryBig, label: "Music Library" },
  { page: "playlists", icon: ListMusic, label: "Playlists" },
  { page: "favorites", icon: Heart, label: "Favorites" },
] as const;
const SOUND_NAV = [
  { page: "visualizer", icon: AudioLines, label: "Visualizer" },
  { page: "equalizer", icon: SlidersHorizontal, label: "Equalizer" },
  { page: "themes", icon: Palette, label: "Themes" },
  { page: "settings", icon: Settings2, label: "Settings" },
] as const;

export function Sidebar() {
  const { page, navigate, selectedPlaylist, selectPlaylist, setModal } =
    useNavigation();
  const { playlists, favorites, theme, preferences } = usePlayer();
  return (
    <aside className="sidebar">
      <button
        className="sidebar-brand"
        aria-label="Hiro Segawa home"
        onClick={() => navigate("home")}
      >
        <Brand />
      </button>
      <div className="sidebar-section-label">YOUR SANCTUARY</div>
      <nav className="primary-nav" aria-label="Main navigation">
        {MAIN_NAV.map(({ page: target, icon: Icon, label }) => (
          <button
            key={target}
            onClick={() => navigate(target)}
            className={`nav-item ${page === target && !selectedPlaylist ? "active" : ""}`}
            aria-current={
              page === target && !selectedPlaylist ? "page" : undefined
            }
          >
            <Icon />
            <span>{label}</span>
            {target === "favorites" && <small>{favorites.length}</small>}
            {target === "home" && page === "home" && <i className="nav-dot" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-section-label sound-label">MAKE IT YOURS</div>
      <nav className="primary-nav secondary-nav" aria-label="Personalization">
        {SOUND_NAV.map(({ page: target, icon: Icon, label }) => (
          <button
            key={target}
            onClick={() => navigate(target)}
            className={`nav-item ${page === target ? "active" : ""}`}
            aria-current={page === target ? "page" : undefined}
          >
            <Icon />
            <span>{label}</span>
            {target === "visualizer" && (
              <span className="tiny-wave">
                <i />
                <i />
                <i />
                <i />
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-section-label playlist-label">
        <span>YOUR PLAYLISTS</span>
        <IconButton
          label="Create playlist"
          onClick={() => setModal({ type: "create-playlist" })}
        >
          <Plus />
        </IconButton>
      </div>
      <nav className="playlist-nav" aria-label="Your playlists">
        {playlists.slice(0, 5).map((playlist) => (
          <button
            key={playlist.id}
            onClick={() => selectPlaylist(playlist.id)}
            className={selectedPlaylist === playlist.id ? "selected" : ""}
          >
            <span className="playlist-nav-dot" />
            <span>{playlist.name}</span>
            <small>{playlist.trackIds.length}</small>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="current-theme" onClick={() => navigate("themes")}>
          <img src={theme.image} alt="" style={{ filter: theme.filter }} />
          <span className="current-theme-content">
            <Flower2 size={18} />
            <span>
              <small>YOUR CURRENT THEME</small>
              <strong>{theme.name}</strong>
            </span>
            <ArrowUpRight size={15} />
          </span>
        </button>
        <div className="sidebar-signoff">
          <span>
            <i />
            Made for your midnight
          </span>
          <button
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts"
            onClick={() => setModal({ type: "shortcuts" })}
          >
            <Keyboard size={15} />
          </button>
        </div>
        <span className="sr-only">Listening as {preferences.name}</span>
      </div>
    </aside>
  );
}

export function MobileDrawer() {
  const { drawer, setDrawer } = useNavigation();
  return (
    <AnimatePresence>
      {drawer && (
        <Dialog
          title="Your sanctuary"
          onClose={() => setDrawer(false)}
          className="navigation-dialog"
        >
          <Sidebar />
        </Dialog>
      )}
    </AnimatePresence>
  );
}

const PAGE_TITLES: Record<Page, string> = {
  home: "Your daily escape",
  library: "Your music library",
  playlists: "Your collections",
  favorites: "Close to your heart",
  recent: "On your rotation",
  visualizer: "Feel every frequency",
  equalizer: "Find your perfect sound",
  themes: "Set the atmosphere",
  settings: "Make yourself at home",
};

export function Topbar() {
  const { page, navigate, query, setQuery, setDrawer, importMusic, setModal } =
    useNavigation();
  const { preferences, theme, tracks, importing } = usePlayer();
  const [notifications, setNotifications] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        search.current?.focus();
      }
      if (event.key === "Escape") setNotifications(false);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  useEffect(() => {
    if (!notifications) return;
    const outside = (event: MouseEvent) => {
      if (!status.current?.contains(event.target as Node))
        setNotifications(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [notifications]);
  return (
    <header className="topbar">
      <div className="topbar-intro">
        <IconButton
          label="Open navigation"
          onClick={() => setDrawer(true)}
          className="mobile-menu-toggle"
        >
          <Menu />
        </IconButton>
        <span>
          {PAGE_TITLES[page]}
          <small>A little quiet. A lot of feeling.</small>
        </span>
      </div>
      <label className="global-search">
        <Search size={17} />
        <input
          ref={search}
          type="search"
          placeholder="Search your music..."
          aria-label="Search songs, artists, and albums"
          value={query}
          onChange={(event) => {
            if (page !== "library") navigate("library");
            setQuery(event.target.value);
          }}
        />
        <kbd>Ctrl K</kbd>
      </label>
      <div className="topbar-actions">
        <button className="topbar-theme" onClick={() => navigate("themes")}>
          <Flower2 size={15} />
          <span>{theme.name}</span>
        </button>
        <IconButton
          label={importing ? "Importing music" : "Import music"}
          onClick={importMusic}
          disabled={importing}
          className="topbar-import"
        >
          <Plus />
        </IconButton>
        <IconButton
          label="Download project ZIP"
          onClick={() => setModal({ type: "export-project" })}
        >
          <Download />
        </IconButton>
        <div className="status-popover-wrap" ref={status}>
          <IconButton
            label="Library status"
            onClick={() => setNotifications(!notifications)}
            aria-expanded={notifications}
          >
            <Bell />
          </IconButton>
          {notifications && (
            <motion.div
              className="status-popover"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="popover-icon">
                <Headphones size={22} />
              </span>
              <strong>Your space, your music.</strong>
              <p>
                {tracks.length} tracks in your library. Your favorites and
                playlists are saved on this device.
              </p>
              <button
                onClick={() => {
                  setNotifications(false);
                  importMusic();
                }}
              >
                Bring your own soundtrack <Plus size={14} />
              </button>
            </motion.div>
          )}
        </div>
        <button
          className="profile-avatar"
          onClick={() => navigate("settings")}
          aria-label="Open your settings"
          title={preferences.name}
        >
          {preferences.name.slice(0, 2).toUpperCase()}
        </button>
      </div>
    </header>
  );
}

export function QueueList({
  all = false,
  removable = false,
}: {
  all?: boolean;
  removable?: boolean;
}) {
  const { queue, current, tracks, repeat, playTrack, removeFromQueue } =
    usePlayer();
  const index = queue.indexOf(current.id);
  const remaining =
    repeat === "all"
      ? [...queue.slice(index + 1), ...queue.slice(0, index)]
      : queue.slice(index + 1);
  const items = remaining
    .map((id) => tracks.find((track) => track.id === id))
    .filter((track) => !!track)
    .slice(0, all ? 100 : 2);
  return (
    <div className="queue-list">
      {items.length ? (
        items.map((track, i) => (
          <div key={track.id} className="queue-track">
            <span className="queue-position">
              {String(i + 1).padStart(2, "0")}
            </span>
            <button
              className="queue-track-main"
              onClick={() => playTrack(track.id)}
            >
              <img src={track.image} alt="" />
              <span>
                <strong>{track.title}</strong>
                <small>{track.artist}</small>
              </span>
              <Play size={13} fill="currentColor" className="queue-play-icon" />
            </button>
            {removable ? (
              <IconButton
                label={`Remove ${track.title} from queue`}
                onClick={() => removeFromQueue(track.id)}
              >
                <X size={15} />
              </IconButton>
            ) : (
              <FavoriteButton trackId={track.id} />
            )}
          </div>
        ))
      ) : (
        <div className="queue-empty">
          <Disc3 size={22} />
          <p>The end of this little journey.</p>
          <span>Choose a track to keep the night going.</span>
        </div>
      )}
    </div>
  );
}

export function LyricsMessage() {
  const { current } = usePlayer();
  return (
    <div className="lyrics-message">
      <QuoteMark />
      <strong>
        {current.imported
          ? "A song worth getting lost in."
          : "No words. Just feelings."}
      </strong>
      <p>
        {current.imported ? (
          "Synced lyrics aren't available for this local file."
        ) : (
          <>
            This is an instrumental track.
            <br />
            Let the music do the talking.
          </>
        )}
      </p>
    </div>
  );
}

function QuoteMark() {
  return (
    <span className="quote-mark" aria-hidden="true">
      &ldquo;
    </span>
  );
}

export function NowPlayingPanel() {
  const { current, playing, loading } = usePlayer();
  const { setExpanded, setModal, navigate } = useNavigation();
  const [tab, setTab] = useState<"queue" | "lyrics">("queue");
  return (
    <aside className="now-playing-panel" aria-label="Now playing">
      <div className="now-playing-heading">
        <span>NOW PLAYING</span>
        <IconButton label="Expand player" onClick={() => setExpanded(true)}>
          <Maximize2 />
        </IconButton>
      </div>
      <div className="playing-status">
        <i className={playing ? "playing" : ""} />
        {loading
          ? "Finding your frequency..."
          : playing
            ? "A soundtrack for this moment"
            : "Your next favorite moment"}
      </div>
      <button
        className="now-cover"
        onClick={() => setExpanded(true)}
        aria-label="Open now playing"
      >
        <img
          key={current.image}
          src={current.image}
          alt={`${current.album} artwork`}
        />
        <span className="cover-expand">
          <Maximize2 size={18} />
        </span>
      </button>
      <div className="now-track-info">
        <div>
          <h2>{current.title}</h2>
          <p>{current.artist}</p>
        </div>
        <FavoriteButton trackId={current.id} />
      </div>
      <SeekBar />
      <Transport />
      <button
        className="mini-visualizer"
        onClick={() => navigate("visualizer")}
        aria-label="Open audio visualizer"
      >
        <AudioVisualizer />
        <span>
          FEEL EVERY BEAT <ArrowUpRight size={10} />
        </span>
      </button>
      <div className="queue-tabs">
        <button
          className={tab === "queue" ? "active" : ""}
          onClick={() => setTab("queue")}
        >
          Up next
        </button>
        <button
          className={tab === "lyrics" ? "active" : ""}
          onClick={() => setTab("lyrics")}
        >
          Lyrics
        </button>
        {tab === "queue" && (
          <IconButton
            label="Open play queue"
            onClick={() => setModal({ type: "queue" })}
          >
            <ListMusic />
          </IconButton>
        )}
      </div>
      {tab === "queue" ? <QueueList /> : <LyricsMessage />}
      <div className="night-note">
        <Flower2 size={16} />
        <span>Same sky. Different dreams.</span>
      </div>
    </aside>
  );
}

export function VolumeControl() {
  const { preferences, updatePreferences } = usePlayer();
  const previous = useRef(0.65);
  if (preferences.volume > 0) previous.current = preferences.volume;
  const Icon =
    preferences.volume === 0
      ? VolumeX
      : preferences.volume < 0.5
        ? Volume1
        : Volume2;
  return (
    <div className="volume-control">
      <IconButton
        label={preferences.volume === 0 ? "Unmute" : "Mute"}
        onClick={() =>
          updatePreferences({
            volume: preferences.volume === 0 ? previous.current : 0,
          })
        }
      >
        <Icon />
      </IconButton>
      <Slider
        label="Volume"
        value={preferences.volume}
        max={1}
        step={0.01}
        onChange={(volume) => updatePreferences({ volume })}
      />
    </div>
  );
}

export function PlayerDock() {
  const { current, playing } = usePlayer();
  const { setExpanded, setModal, navigate } = useNavigation();
  return (
    <footer className="player-dock" aria-label="Music playback controls">
      <div className="dock-track">
        <button
          className="dock-art"
          onClick={() => setExpanded(true)}
          aria-label="Open current track"
        >
          <img src={current.image} alt="" />
        </button>
        <button className="dock-track-title" onClick={() => setExpanded(true)}>
          <strong>{current.title}</strong>
          <span>
            {current.artist}
            <span className="dock-album">{current.album}</span>
          </span>
        </button>
        <FavoriteButton trackId={current.id} />
      </div>
      <div className="dock-center">
        <Transport small />
        <SeekBar compact />
      </div>
      <div className="dock-tools">
        <IconButton
          label="Open equalizer"
          onClick={() => navigate("equalizer")}
        >
          <SlidersHorizontal />
        </IconButton>
        <IconButton
          label="Open play queue"
          onClick={() => setModal({ type: "queue" })}
        >
          <ListMusic />
        </IconButton>
        <span className="dock-tool-divider" />
        <VolumeControl />
        <IconButton label="Expand player" onClick={() => setExpanded(true)}>
          <Maximize2 />
        </IconButton>
      </div>
      <div className="mobile-dock-controls">
        <PlayButton />
        <IconButton label="Expand player" onClick={() => setExpanded(true)}>
          <ChevronDown className="expand-chevron" />
        </IconButton>
      </div>
      <span className={`dock-progress-line ${playing ? "is-playing" : ""}`} />
    </footer>
  );
}

export function MobileNav() {
  const { page, navigate, setExpanded } = useNavigation();
  const nav = [
    { page: "home", icon: Home, label: "Home" },
    { page: "library", icon: LibraryBig, label: "Library" },
    { page: "now", icon: AudioLines, label: "Player" },
    { page: "playlists", icon: ListMusic, label: "Playlists" },
    { page: "settings", icon: Settings2, label: "Settings" },
  ];
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {nav.map(({ page: target, icon: Icon, label }) => (
        <button
          key={target}
          onClick={() =>
            target === "now" ? setExpanded(true) : navigate(target as Page)
          }
          className={`${page === target ? "active" : ""} ${target === "now" ? "mobile-player-button" : ""}`}
          aria-current={page === target ? "page" : undefined}
        >
          <span>
            <Icon />
          </span>
          <small>{label}</small>
        </button>
      ))}
    </nav>
  );
}

export function ExpandedPlayer() {
  const { expanded, setExpanded, navigate } = useNavigation();
  const { current, theme, sleepEndsAt, setSleepTimer } = usePlayer();
  const [lyrics, setLyrics] = useState(false);
  return (
    <AnimatePresence>
      {expanded && (
        <Dialog
          title="Now Playing"
          onClose={() => setExpanded(false)}
          className="expanded-player"
        >
          <div
            className="expanded-atmosphere"
            style={{
              backgroundImage: `url(${theme.image})`,
              filter: theme.filter,
            }}
          />
          <div className="expanded-player-grid">
            <div className="expanded-cover-wrap">
              <img
                className="expanded-cover"
                src={current.image}
                alt={`${current.album} artwork`}
              />
              <span className="expanded-cover-caption">
                <FoxMark />
                <span>
                  HIRO SEGAWA<small>YOUR PERSONAL SOUNDTRACK</small>
                </span>
              </span>
            </div>
            <div className="expanded-info">
              <p className="eyebrow">FROM {current.album}</p>
              <div className="expanded-track-title">
                <h2>{current.title}</h2>
                <FavoriteButton trackId={current.id} />
              </div>
              <p className="expanded-artist">{current.artist}</p>
              <AudioVisualizer className="expanded-wave" />
              <SeekBar />
              <Transport />
              <div className="expanded-actions">
                <button
                  className={lyrics ? "active" : ""}
                  onClick={() => setLyrics(!lyrics)}
                >
                  <Mic2 size={16} />
                  Lyrics
                </button>
                <button
                  onClick={() => {
                    setExpanded(false);
                    navigate("visualizer");
                  }}
                >
                  <AudioLines size={16} />
                  Visualizer
                </button>
                <button
                  onClick={() => {
                    setExpanded(false);
                    navigate("equalizer");
                  }}
                >
                  <SlidersHorizontal size={16} />
                  Equalizer
                </button>
              </div>
              {lyrics ? (
                <LyricsMessage />
              ) : (
                <div className="expanded-next">
                  <h3>Up next</h3>
                  <QueueList />
                </div>
              )}
              <label className="sleep-control">
                <Moon size={15} />
                <span>Sleep timer</span>
                <select
                  aria-label="Sleep timer"
                  value={sleepEndsAt ? "active" : "0"}
                  onChange={(event) =>
                    setSleepTimer(Number(event.target.value))
                  }
                >
                  {sleepEndsAt && <option value="active">Timer on</option>}
                  <option value="0">Off</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
                <ChevronDown size={13} />
              </label>
            </div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

export function Toast() {
  const { toast, dismissToast } = usePlayer();
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            className="app-toast"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <span className="toast-flower">
              <Flower2 size={19} />
            </span>
            <p>{toast}</p>
            <IconButton label="Dismiss notification" onClick={dismissToast}>
              <X size={15} />
            </IconButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BackToPlaylists() {
  const { navigate } = useNavigation();
  return (
    <button
      className="text-button back-to-playlists"
      onClick={() => navigate("playlists")}
    >
      <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
      Your playlists
    </button>
  );
}
