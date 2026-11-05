import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_PREFERENCES, PLAYLISTS, THEMES, TRACKS } from "./catalog";
import { AudioEngine } from "./engine";
import { resolveTrackSource } from "./demoAudio";
import { normalizeArtwork } from "./media";
import {
  deleteAudio,
  loadAudio,
  readLocal,
  saveAudio,
  writeLocal,
} from "./storage";
import type { Playlist, Preferences, Track } from "./types";

function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const saved = readLocal(key, initial);
    if (key === "playlists" && Array.isArray(saved)) {
      return saved.map((playlist: Playlist) => ({
        ...playlist,
        image: normalizeArtwork(playlist.image),
      })) as T;
    }
    return saved;
  });
  useEffect(() => writeLocal(key, value), [key, value]);
  return [value, setValue] as const;
}

interface PlayerValue {
  tracks: Track[];
  current: Track;
  playlists: Playlist[];
  favorites: string[];
  recent: string[];
  preferences: Preferences;
  theme: (typeof THEMES)[number];
  playing: boolean;
  loading: boolean;
  position: number;
  duration: number;
  queue: string[];
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  engine: AudioEngine;
  importing: boolean;
  toast: string;
  sleepEndsAt: number | null;
  playTrack: (id: string, ids?: string[]) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setShuffle: (value: boolean) => void;
  cycleRepeat: () => void;
  toggleFavorite: (id: string) => void;
  updatePreferences: (value: Partial<Preferences>) => void;
  importFiles: (files: FileList | File[]) => Promise<void>;
  removeTrack: (id: string) => Promise<void>;
  createPlaylist: (
    name: string,
    description: string,
    trackId?: string,
  ) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  playNext: (id: string) => void;
  removeFromQueue: (id: string) => void;
  notify: (message: string) => void;
  dismissToast: () => void;
  setSleepTimer: (minutes: number) => void;
  exportBackup: () => void;
  restoreBackup: (file: File) => Promise<void>;
}

const PlayerContext = createContext<PlayerValue | null>(null);

function shuffledQueue(ids: string[], currentId: string) {
  const remaining = [...new Set(ids)].filter((id) => id !== currentId);
  for (let index = remaining.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1));
    [remaining[index], remaining[target]] = [
      remaining[target],
      remaining[index],
    ];
  }
  return ids.includes(currentId) ? [currentId, ...remaining] : remaining;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(() => new AudioEngine());
  const [tracks, setTracks] = useState(TRACKS);
  const [preferences, setPreferences] = useStored<Preferences>(
    "preferences",
    DEFAULT_PREFERENCES,
  );
  const [playlists, setPlaylists] = useStored<Playlist[]>(
    "playlists",
    PLAYLISTS,
  );
  const [favorites, setFavorites] = useStored<string[]>("favorites", [
    "raat",
    "blossom",
    "lost",
  ]);
  const [recent, setRecent] = useStored<string[]>("recent", [
    "raat",
    "blossom",
    "lost",
    "numb",
  ]);
  const [currentId, setCurrentId] = useState(() => {
    const stored = readLocal("last-track", "raat");
    return TRACKS.some((track) => track.id === stored) ? stored : "raat";
  });
  const [queue, setQueue] = useState(TRACKS.map((track) => track.id));
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [shuffle, setShuffleState] = useState(false);
  const shuffleEnabled = useRef(false);
  const originalQueue = useRef(TRACKS.map((track) => track.id));
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState("");
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urls = useRef(new Map<string, string>());
  const requestId = useRef(0);
  const wantsPlay = useRef(false);
  const current = tracks.find((track) => track.id === currentId) ?? tracks[0];
  const theme =
    THEMES.find((item) => item.id === preferences.theme) ?? THEMES[0];
  const snapshot = useRef({
    tracks,
    currentId,
    queue,
    shuffle,
    repeat,
    preferences,
  });
  snapshot.current = { tracks, currentId, queue, shuffle, repeat, preferences };
  const actions = useRef({
    next: () => {},
    togglePlay: () => {},
    previous: () => {},
  });

  const notify = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  }, []);

  const updatePreferences = useCallback(
    (value: Partial<Preferences>) => {
      setPreferences((previous) => ({
        ...DEFAULT_PREFERENCES,
        ...previous,
        ...value,
      }));
    },
    [setPreferences],
  );

  function setShuffle(enabled: boolean) {
    shuffleEnabled.current = enabled;
    setShuffleState(enabled);
    const state = snapshot.current;
    if (enabled) {
      originalQueue.current = state.queue;
      setQueue(shuffledQueue(state.queue, state.currentId));
    } else {
      const known = originalQueue.current.filter((id) =>
        state.queue.includes(id),
      );
      setQueue([...known, ...state.queue.filter((id) => !known.includes(id))]);
    }
  }

  useEffect(() => {
    engine.apply(preferences);
  }, [engine, preferences]);

  const startAudio = useCallback(
    async (requested?: Track) => {
      const track =
        requested ??
        snapshot.current.tracks.find(
          (item) => item.id === snapshot.current.currentId,
        );
      if (!track) return;
      const token = ++requestId.current;
      wantsPlay.current = true;
      setLoading(true);
      try {
        // Resume the output context during the user gesture, before rendering a demo.
        await engine.initialize(snapshot.current.preferences);
        const source = await resolveTrackSource(track);
        if (token !== requestId.current || !wantsPlay.current) return;
        if (engine.audio.dataset.trackId !== track.id || !engine.audio.src) {
          engine.audio.src = source;
          engine.audio.dataset.trackId = track.id;
        }
        await engine.audio.play();
      } catch (error) {
        if (
          token !== requestId.current ||
          (error as DOMException).name === "AbortError"
        )
          return;
        wantsPlay.current = false;
        setLoading(false);
        setPlaying(false);
        notify(
          "This track could not be played. Try another track or import an audio file.",
        );
      }
    },
    [engine, notify],
  );

  const playTrack = useCallback(
    (id: string, ids?: string[]) => {
      const track = snapshot.current.tracks.find((item) => item.id === id);
      if (!track) return;
      if (ids?.length) {
        originalQueue.current = ids;
        setQueue(shuffleEnabled.current ? shuffledQueue(ids, id) : ids);
      } else if (!snapshot.current.queue.includes(id))
        setQueue((previous) => [...previous, id]);
      if (engine.audio.dataset.trackId !== id) {
        engine.audio.pause();
        setPosition(0);
        setMediaDuration(track.duration);
      }
      setCurrentId(id);
      writeLocal("last-track", id);
      setRecent((previous) =>
        [id, ...previous.filter((item) => item !== id)].slice(0, 30),
      );
      void startAudio(track);
    },
    [engine, setRecent, startAudio],
  );

  const togglePlay = useCallback(() => {
    if (!engine.audio.paused || (wantsPlay.current && loading)) {
      wantsPlay.current = false;
      ++requestId.current;
      engine.audio.pause();
      setLoading(false);
    } else {
      playTrack(snapshot.current.currentId);
    }
  }, [engine, loading, playTrack]);

  const next = useCallback(() => {
    const state = snapshot.current;
    const available = state.queue.filter((id) =>
      state.tracks.some((track) => track.id === id),
    );
    if (!available.length) return;
    const index = available.indexOf(state.currentId);
    const nextIndex = (index + 1) % available.length;
    playTrack(available[nextIndex]);
  }, [playTrack]);

  const previous = useCallback(() => {
    if (engine.audio.currentTime > 3) {
      engine.audio.currentTime = 0;
      setPosition(0);
      return;
    }
    const state = snapshot.current;
    const index = state.queue.indexOf(state.currentId);
    playTrack(
      state.queue[(index - 1 + state.queue.length) % state.queue.length] ??
        state.currentId,
    );
  }, [engine, playTrack]);

  actions.current = { next, previous, togglePlay };

  const seek = useCallback(
    (seconds: number) => {
      const duration = engine.audio.duration;
      if (!Number.isFinite(duration)) return;
      engine.audio.currentTime = Math.max(0, Math.min(seconds, duration));
      setPosition(engine.audio.currentTime);
    },
    [engine],
  );

  useEffect(() => {
    const audio = engine.audio;
    if (!audio.src) {
      const track =
        snapshot.current.tracks.find(
          (item) => item.id === snapshot.current.currentId,
        ) ?? TRACKS[0];
      if (!track.src.startsWith("demo:")) {
        audio.src = track.src;
        audio.dataset.trackId = track.id;
      }
    }
    const onTime = () => setPosition(audio.currentTime);
    const onPlay = () => {
      setPlaying(true);
      setLoading(false);
    };
    const onPause = () => {
      setPlaying(false);
      setLoading(false);
    };
    const onWaiting = () => {
      if (wantsPlay.current) setLoading(true);
    };
    const onCanPlay = () => setLoading(false);
    const onDuration = () => {
      if (
        !Number.isFinite(audio.duration) ||
        audio.dataset.trackId !== snapshot.current.currentId
      )
        return;
      setMediaDuration(audio.duration);
      setTracks((items) =>
        items.map((track) =>
          track.id === audio.dataset.trackId
            ? { ...track, duration: audio.duration }
            : track,
        ),
      );
    };
    const onEnded = () => {
      const state = snapshot.current;
      if (state.repeat === "one") {
        audio.currentTime = 0;
        void startAudio();
      } else if (
        state.repeat === "all" ||
        state.queue.indexOf(state.currentId) < state.queue.length - 1
      )
        actions.current.next();
      else {
        wantsPlay.current = false;
        setPlaying(false);
      }
    };
    const onError = () => {
      setLoading(false);
      setPlaying(false);
      wantsPlay.current = false;
      if (audio.error)
        notify(
          "Audio unavailable. You can choose another track or add your own music.",
        );
    };
    const listeners: [string, EventListener][] = [
      ["timeupdate", onTime],
      ["play", onPlay],
      ["pause", onPause],
      ["waiting", onWaiting],
      ["playing", onPlay],
      ["canplay", onCanPlay],
      ["loadedmetadata", onDuration],
      ["ended", onEnded],
      ["error", onError],
    ];
    listeners.forEach(([name, listener]) =>
      audio.addEventListener(name, listener),
    );
    return () => {
      listeners.forEach(([name, listener]) =>
        audio.removeEventListener(name, listener),
      );
      audio.pause();
    };
  }, [engine, notify, startAudio]);

  useEffect(() => {
    let active = true;
    void loadAudio()
      .then((stored) => {
        if (!active) return;
        const restored = stored.map(({ track, file }) => {
          const url = URL.createObjectURL(file);
          urls.current.set(track.id, url);
          return { ...track, image: normalizeArtwork(track.image), src: url };
        });
        setTracks((previous) => [
          ...previous,
          ...restored.filter(
            (track) => !previous.some((item) => item.id === track.id),
          ),
        ]);
      })
      .catch(() => {});
    const objectUrls = urls.current;
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName) ||
        target.isContentEditable ||
        document.querySelector("[role='dialog']")
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        actions.current.togglePlay();
      }
      if (event.altKey && event.code === "ArrowRight") {
        event.preventDefault();
        actions.current.next();
      }
      if (event.altKey && event.code === "ArrowLeft") {
        event.preventDefault();
        actions.current.previous();
      }
      if (!event.altKey && event.code === "ArrowRight") {
        event.preventDefault();
        seek(engine.audio.currentTime + 5);
      }
      if (!event.altKey && event.code === "ArrowLeft") {
        event.preventDefault();
        seek(engine.audio.currentTime - 5);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [engine, seek]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: current.album,
      artwork: [{ src: new URL(current.image, location.href).href }],
    });
    navigator.mediaSession.setActionHandler("play", () => {
      if (engine.audio.paused) actions.current.togglePlay();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      engine.audio.pause();
      wantsPlay.current = false;
    });
    navigator.mediaSession.setActionHandler("nexttrack", () =>
      actions.current.next(),
    );
    navigator.mediaSession.setActionHandler("previoustrack", () =>
      actions.current.previous(),
    );
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) seek(details.seekTime);
    });
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [current, engine, playing, seek]);

  useEffect(() => {
    if (!sleepEndsAt) return;
    const timer = setInterval(() => {
      if (Date.now() >= sleepEndsAt) {
        engine.audio.pause();
        wantsPlay.current = false;
        ++requestId.current;
        setSleepEndsAt(null);
        notify("Sleep timer finished. Sweet dreams.");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sleepEndsAt, engine, notify]);

  const toggleFavorite = (id: string) =>
    setFavorites((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );

  async function importFiles(files: FileList | File[]) {
    const accepted = Array.from(files).filter(
      (file) =>
        file.type.startsWith("audio/") ||
        /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(file.name),
    );
    if (!accepted.length) {
      notify("Choose an MP3, WAV, OGG, M4A, or another supported audio file.");
      return;
    }
    setImporting(true);
    let added = 0;
    let saved = true;
    for (const file of accepted) {
      if (file.size > 200 * 1024 * 1024) {
        notify("Files must be smaller than 200 MB.");
        continue;
      }
      const url = URL.createObjectURL(file);
      const probe = new Audio();
      probe.src = url;
      const duration = await new Promise<number>((resolve) => {
        const timeout = setTimeout(() => resolve(0), 5000);
        probe.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve(Number.isFinite(probe.duration) ? probe.duration : 0);
        };
        probe.onerror = () => {
          clearTimeout(timeout);
          resolve(0);
        };
      });
      probe.removeAttribute("src");
      probe.load();
      if (!duration) {
        URL.revokeObjectURL(url);
        continue;
      }
      const filename = file.name.replace(/\.[^.]+$/, "");
      const parts = filename.split(" - ");
      const track: Track = {
        id: crypto.randomUUID(),
        title: parts.length > 1 ? parts.slice(1).join(" - ") : filename,
        artist: parts.length > 1 ? parts[0] : "Your music",
        album: "Local collection",
        image: "images/hero-bg.jpg",
        src: url,
        duration,
        genre: "Imported",
        imported: true,
      };
      try {
        await saveAudio(track, file);
      } catch {
        saved = false;
      }
      urls.current.set(track.id, url);
      setTracks((previous) => [...previous, track]);
      setQueue((previous) => [...previous, track.id]);
      ++added;
    }
    setImporting(false);
    notify(
      added
        ? `${added} ${added === 1 ? "track" : "tracks"} added${saved ? ". Saved on this device." : " for this session. Browser storage is unavailable."}`
        : "These files could not be decoded by your browser.",
    );
  }

  async function removeTrack(id: string) {
    const track = tracks.find((item) => item.id === id);
    if (!track?.imported) return;
    try {
      await deleteAudio(id);
    } catch {
      notify("Could not remove the saved file. Please try again.");
      return;
    }
    if (currentId === id) {
      engine.audio.pause();
      wantsPlay.current = false;
      ++requestId.current;
      engine.audio.removeAttribute("src");
      engine.audio.load();
      engine.audio.dataset.trackId = TRACKS[0].id;
      setCurrentId(TRACKS[0].id);
      setPosition(0);
    }
    setTracks((items) => items.filter((item) => item.id !== id));
    setFavorites((items) => items.filter((item) => item !== id));
    setRecent((items) => items.filter((item) => item !== id));
    setQueue((items) => items.filter((item) => item !== id));
    setPlaylists((items) =>
      items.map((item) => ({
        ...item,
        trackIds: item.trackIds.filter((trackId) => trackId !== id),
      })),
    );
    const url = urls.current.get(id);
    if (url) URL.revokeObjectURL(url);
    urls.current.delete(id);
    notify("Track removed from your local collection.");
  }

  function createPlaylist(name: string, description: string, trackId?: string) {
    const id = crypto.randomUUID();
    setPlaylists((items) => [
      ...items,
      {
        id,
        name: name.trim(),
        description: description.trim() || "Your own little world of sound.",
        image: THEMES[items.length % THEMES.length].image,
        trackIds: trackId ? [trackId] : [],
      },
    ]);
    notify(`Created "${name.trim()}".`);
    return id;
  }

  function addToPlaylist(playlistId: string, trackId: string) {
    const playlist = playlists.find((item) => item.id === playlistId);
    if (playlist?.trackIds.includes(trackId)) {
      notify("This track is already in that playlist.");
      return;
    }
    setPlaylists((items) =>
      items.map((item) =>
        item.id === playlistId
          ? { ...item, trackIds: [...item.trackIds, trackId] }
          : item,
      ),
    );
    notify(`Added to ${playlist?.name ?? "playlist"}.`);
  }

  function playNext(id: string) {
    if (id === currentId) {
      notify("This track is already selected.");
      return;
    }
    setQueue((items) => {
      const cleaned = items.filter((item) => item !== id);
      const index = cleaned.indexOf(currentId);
      return [...cleaned.slice(0, index + 1), id, ...cleaned.slice(index + 1)];
    });
    notify("Added to play next.");
  }

  function exportBackup() {
    const blob = new Blob(
      [
        JSON.stringify(
          { app: "hiro-segawa", version: 1, preferences, favorites, playlists },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hiro-segawa-backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Settings and playlists exported. Audio files are not included.");
  }

  async function restoreBackup(file: File) {
    try {
      const value = JSON.parse(await file.text());
      if (
        value.app !== "hiro-segawa" ||
        value.version !== 1 ||
        !Array.isArray(value.playlists) ||
        !Array.isArray(value.favorites)
      )
        throw new Error("Invalid backup");
      if (
        !value.playlists.every(
          (item: Playlist) =>
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.description === "string" &&
            typeof item.image === "string" &&
            /^\/?images\/[\w-]+\.(?:jpg|png|svg|webp)$/.test(item.image) &&
            Array.isArray(item.trackIds) &&
            item.trackIds.every((id) => typeof id === "string"),
        )
      )
        throw new Error("Invalid playlists");
      if (!value.favorites.every((id: unknown) => typeof id === "string"))
        throw new Error("Invalid favorites");
      const prefs = value.preferences;
      if (
        !prefs ||
        typeof prefs.name !== "string" ||
        !THEMES.some((item) => item.id === prefs.theme) ||
        typeof prefs.volume !== "number" ||
        prefs.volume < 0 ||
        prefs.volume > 1 ||
        !Array.isArray(prefs.eq) ||
        prefs.eq.length !== 7 ||
        !prefs.eq.every(
          (n: unknown) =>
            typeof n === "number" && Number.isFinite(n) && n >= -12 && n <= 12,
        ) ||
        ![
          "petals",
          "motion",
          "eqEnabled",
          "bass",
          "spatial",
          "normalize",
        ].every((key) => typeof prefs[key] === "boolean") ||
        typeof prefs.eqPreset !== "string"
      )
        throw new Error("Invalid settings");
      setPlaylists(
        value.playlists.map((playlist: Playlist) => ({
          ...playlist,
          image: normalizeArtwork(playlist.image),
        })),
      );
      setFavorites(value.favorites);
      setPreferences({ ...DEFAULT_PREFERENCES, ...prefs });
      notify("Your settings and playlists have been restored.");
    } catch {
      notify("This is not a valid Hiro Segawa backup file.");
    }
  }

  const value: PlayerValue = {
    tracks,
    current,
    playlists,
    favorites,
    recent,
    preferences,
    theme,
    playing,
    loading,
    position,
    duration: mediaDuration || current.duration,
    queue,
    shuffle,
    repeat,
    engine,
    importing,
    toast,
    sleepEndsAt,
    playTrack,
    togglePlay,
    next,
    previous,
    seek,
    setShuffle,
    cycleRepeat: () =>
      setRepeat((mode) =>
        mode === "off" ? "all" : mode === "all" ? "one" : "off",
      ),
    toggleFavorite,
    updatePreferences,
    importFiles,
    removeTrack,
    createPlaylist,
    renamePlaylist: (id, name) => {
      setPlaylists((items) =>
        items.map((item) =>
          item.id === id ? { ...item, name: name.trim() } : item,
        ),
      );
      notify("Playlist renamed.");
    },
    deletePlaylist: (id) => {
      setPlaylists((items) => items.filter((item) => item.id !== id));
      notify("Playlist deleted.");
    },
    addToPlaylist,
    removeFromPlaylist: (playlistId, trackId) =>
      setPlaylists((items) =>
        items.map((item) =>
          item.id === playlistId
            ? {
                ...item,
                trackIds: item.trackIds.filter((id) => id !== trackId),
              }
            : item,
        ),
      ),
    playNext,
    removeFromQueue: (id) => {
      if (id !== currentId)
        setQueue((items) => items.filter((item) => item !== id));
    },
    notify,
    dismissToast: () => setToast(""),
    setSleepTimer: (minutes) => {
      setSleepEndsAt(minutes ? Date.now() + minutes * 60000 : null);
      notify(
        minutes
          ? `Music will pause in ${minutes} minutes.`
          : "Sleep timer turned off.",
      );
    },
    exportBackup,
    restoreBackup,
  };
  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("PlayerProvider is missing");
  return value;
}
