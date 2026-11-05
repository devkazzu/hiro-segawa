import { useEffect, useRef, useState, type DragEvent } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Upload } from "lucide-react";
import { PlayerProvider, usePlayer } from "./player/PlayerContext";
import { NavigationProvider, useNavigation } from "./player/Navigation";
import { AppPetals } from "./player/components";
import { AppDialogs } from "./player/dialogs";
import {
  ExpandedPlayer,
  MobileDrawer,
  MobileNav,
  NowPlayingPanel,
  PlayerDock,
  Sidebar,
  Toast,
  Topbar,
} from "./player/layout";
import {
  CollectionView,
  EqualizerView,
  HomeView,
  LibraryView,
  PlaylistsView,
  SettingsView,
  ThemesView,
  VisualizerView,
} from "./player/views";

function Workspace() {
  const { page, selectedPlaylist, fileInput, drawer, expanded, modal } =
    useNavigation();
  const {
    preferences,
    theme,
    current,
    playing,
    importFiles,
    importing,
    notify,
  } = usePlayer();
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const scroll = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--accent-soft", theme.soft);
    root.dataset.motion = preferences.motion ? "on" : "off";
    root.dataset.theme = theme.id;
    root.style.colorScheme = "dark";
  }, [theme, preferences.motion]);

  useEffect(() => {
    document.title = playing
      ? `${current.title} - ${current.artist} | Hiro Segawa`
      : "Hiro Segawa | Your personal soundtrack";
  }, [current.title, current.artist, playing]);
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0 });
  }, [page, selectedPlaylist]);

  function enter(event: DragEvent) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current++;
    setDragging(true);
  }
  function leave(event: DragEvent) {
    event.preventDefault();
    dragDepth.current--;
    if (dragDepth.current <= 0) {
      setDragging(false);
      dragDepth.current = 0;
    }
  }
  function drop(event: DragEvent) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (importing) {
      notify("Your music is still being added. Just a moment.");
      return;
    }
    if (event.dataTransfer.files.length)
      void importFiles(event.dataTransfer.files);
  }

  let view;
  switch (page) {
    case "library":
      view = <LibraryView />;
      break;
    case "playlists":
      view = <PlaylistsView />;
      break;
    case "favorites":
      view = <CollectionView />;
      break;
    case "recent":
      view = <CollectionView recent />;
      break;
    case "visualizer":
      view = <VisualizerView />;
      break;
    case "equalizer":
      view = <EqualizerView />;
      break;
    case "themes":
      view = <ThemesView />;
      break;
    case "settings":
      view = <SettingsView />;
      break;
    default:
      view = <HomeView />;
  }

  return (
    <MotionConfig reducedMotion={preferences.motion ? "user" : "always"}>
      <div
        className="music-app"
        inert={drawer || expanded || !!modal}
        onDragEnter={enter}
        onDragLeave={leave}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files"))
            event.preventDefault();
        }}
        onDrop={drop}
      >
        <a className="skip-to-content" href="#main-content">
          Skip to your music
        </a>
        <div
          className="app-atmosphere"
          style={{
            backgroundImage: `url(${theme.image})`,
            filter: theme.filter,
          }}
        />
        <AppPetals />
        <div className="desktop-sidebar">
          <Sidebar />
        </div>
        <div className="workspace">
          <Topbar />
          <div className="workspace-body">
            <main
              id="main-content"
              className="main-scroll"
              ref={scroll}
              tabIndex={-1}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${page}-${selectedPlaylist ?? ""}`}
                  className="view-transition"
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  {view}
                </motion.div>
              </AnimatePresence>
            </main>
            <NowPlayingPanel />
          </div>
        </div>
        <PlayerDock />
        <MobileNav />
        <MobileDrawer />
        <ExpandedPlayer />
        <AppDialogs />
        <Toast />
        <input
          type="file"
          ref={fileInput}
          className="sr-only"
          aria-label="Import audio files"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus"
          multiple
          onChange={(event) => {
            if (event.target.files?.length)
              void importFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <AnimatePresence>
          {dragging && (
            <motion.div
              className="file-drop-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Upload size={46} />
              <h2>A new feeling is one drop away.</h2>
              <p>Drop your audio files to make them part of your world.</p>
              <span>MP3, WAV, OGG, M4A, FLAC &amp; more</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <NavigationProvider>
        <Workspace />
      </NavigationProvider>
    </PlayerProvider>
  );
}
