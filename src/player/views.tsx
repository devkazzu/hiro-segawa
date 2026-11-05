import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronDown,
  Clock3,
  Disc3,
  Flower2,
  FolderHeart,
  HardDrive,
  Heart,
  Keyboard,
  ListMusic,
  Maximize2,
  MoreHorizontal,
  Music2,
  Palette,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Volume2,
  Waves,
  X,
} from "lucide-react";
import { usePlayer } from "./PlayerContext";
import { useNavigation } from "./Navigation";
import {
  AudioVisualizer,
  EmptyState,
  FavoriteButton,
  IconButton,
  PageHeading,
  PlaylistTile,
  SeekBar,
  SelectionCheck,
  Toggle,
  TrackList,
  Transport,
} from "./components";
import { BackToPlaylists } from "./layout";
import { EQ_LABELS, EQ_PRESETS, THEMES } from "./catalog";
import type { Page } from "./types";

export function HomeView() {
  const {
    tracks,
    recent,
    favorites,
    playlists,
    playTrack,
    preferences,
    theme,
  } = usePlayer();
  const { navigate, importMusic } = useNavigation();
  const history = recent
    .map((id) => tracks.find((track) => track.id === id))
    .filter((track) => !!track)
    .slice(0, 4);
  const quickLinks = [
    {
      icon: Music2,
      label: "Songs",
      value: `${tracks.length} tracks`,
      page: "library",
    },
    {
      icon: ListMusic,
      label: "Playlists",
      value: `${playlists.length} collections`,
      page: "playlists",
    },
    {
      icon: Heart,
      label: "Favorites",
      value: `${favorites.filter((id) => tracks.some((track) => track.id === id)).length} little loves`,
      page: "favorites",
    },
    {
      icon: Clock3,
      label: "Recently played",
      value: "Your own rotation",
      page: "recent",
    },
  ];
  return (
    <div className="home-view">
      <section className="home-hero">
        <div
          className="hero-scene"
          style={{
            backgroundImage: `url(${theme.image})`,
            filter: theme.filter,
          }}
        />
        <img
          className="hero-listener"
          src="images/anime-girl.jpg"
          alt="Anime girl lost in the music, surrounded by sakura blossoms"
        />
        <div className="hero-shade" />
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <p className="eyebrow">
            <span />
            YOUR PERSONAL SOUNDTRACK
          </p>
          <h1 className="brand-display">Hiro Segawa</h1>
          <p className="hero-tagline">
            Good vibes.
            <br />
            <span>good nights.</span>
          </p>
          <p className="hero-description">
            Let the world fade. Find your frequency.
          </p>
          <button
            className="primary-button"
            onClick={() =>
              playTrack(
                tracks[0].id,
                tracks.map((track) => track.id),
              )
            }
          >
            <Play size={15} fill="currentColor" />
            Play something
          </button>
          <span className="hero-japanese" lang="ja">
            音楽は、心の居場所。
          </span>
        </motion.div>
      </section>
      <div className="home-welcome">
        <span>
          Welcome back, {preferences.name}
          <span className="welcome-dot">.</span>
        </span>
        <span>Stay a while. You belong here.</span>
      </div>
      <nav className="quick-links" aria-label="Your music collections">
        {quickLinks.map(({ icon: Icon, label, value, page }) => (
          <button key={page} onClick={() => navigate(page as Page)}>
            <span className="quick-link-icon">
              <Icon />
            </span>
            <span>
              <strong>{label}</strong>
              <small>{value}</small>
            </span>
            <ArrowUpRight size={15} className="quick-arrow" />
          </button>
        ))}
      </nav>
      <section className="home-section">
        <div className="section-heading">
          <div>
            <h2>
              Recently played
              <span className="heading-dot" />
            </h2>
            <p>A few familiar feelings.</p>
          </div>
          <button className="text-button" onClick={() => navigate("recent")}>
            View all <ArrowRight size={14} />
          </button>
        </div>
        {history.length ? (
          <TrackList tracks={history} minimal />
        ) : (
          <EmptyState
            icon={<HeadphonesIcon />}
            title="Your story starts here"
            text="Play a song and it will find a home here."
            action={
              <button
                className="primary-button"
                onClick={() => navigate("library")}
              >
                Explore your library
              </button>
            }
          />
        )}
      </section>
      <section className="home-section mood-section">
        <div className="section-heading">
          <div>
            <h2>Made for your mood</h2>
            <p>Press play on a different kind of night.</p>
          </div>
          <button className="text-button" onClick={() => navigate("playlists")}>
            Explore <ArrowRight size={14} />
          </button>
        </div>
        <div className="playlist-grid home-playlist-grid">
          {playlists.slice(0, 4).map((playlist) => (
            <PlaylistTile key={playlist.id} playlist={playlist} />
          ))}
        </div>
      </section>
      <div className="home-signoff">
        <Flower2 size={17} />
        <span>Your music. Your world. Your little escape.</span>
        <button onClick={importMusic}>
          Bring your own music <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

function HeadphonesIcon() {
  return <AudioLines />;
}

export function LibraryView() {
  const { tracks, playTrack, importing } = usePlayer();
  const { query, setQuery, importMusic } = useNavigation();
  const [tab, setTab] = useState("Songs");
  const [sort, setSort] = useState("default");
  const [entity, setEntity] = useState<{
    type: "artist" | "album" | "source";
    name: string;
  } | null>(null);
  useEffect(() => {
    if (query.trim()) {
      setTab("Songs");
      setEntity(null);
    }
  }, [query]);
  const filtered = useMemo(() => {
    let items = tracks.filter((track) =>
      `${track.title} ${track.artist} ${track.album}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    if (entity)
      items = items.filter((track) =>
        entity.type === "artist"
          ? track.artist === entity.name
          : entity.type === "album"
            ? track.album === entity.name
            : entity.name === "Your imports"
              ? track.imported
              : !track.imported,
      );
    return [...items].sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "artist"
          ? a.artist.localeCompare(b.artist)
          : sort === "duration"
            ? a.duration - b.duration
            : sort === "recent"
              ? tracks.indexOf(b) - tracks.indexOf(a)
              : 0,
    );
  }, [tracks, query, entity, sort]);
  const artists = [...new Set(tracks.map((track) => track.artist))];
  const albums = [...new Set(tracks.map((track) => track.album))];
  function openEntity(type: "artist" | "album" | "source", name: string) {
    setEntity({ type, name });
    setTab("Songs");
    setQuery("");
  }
  return (
    <div className="page-view">
      <PageHeading
        eyebrow="A WORLD THAT SOUNDS LIKE YOU"
        title="Music Library"
        description={`${tracks.length} songs, ${artists.length} artists. All your favorites, one little universe.`}
        action={
          <button
            className="primary-button"
            onClick={importMusic}
            disabled={importing}
          >
            <Plus size={16} />
            {importing ? "Adding music..." : "Add music"}
          </button>
        }
      />
      <div className="library-toolbar">
        <div
          className="segmented-tabs"
          role="tablist"
          aria-label="Library categories"
        >
          {["Songs", "Artists", "Albums", "Folders"].map((item) => (
            <button
              key={item}
              role="tab"
              aria-selected={tab === item}
              className={tab === item ? "active" : ""}
              onClick={() => {
                setTab(item);
                setEntity(null);
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="sort-select">
          <SlidersHorizontal size={14} />
          <select
            aria-label="Sort music"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="default">Library order</option>
            <option value="recent">Recently added</option>
            <option value="title">Title A-Z</option>
            <option value="artist">Artist A-Z</option>
            <option value="duration">Duration</option>
          </select>
          <ChevronDown size={12} />
        </label>
      </div>
      {entity && (
        <div className="active-filter">
          <span>
            {entity.type === "source" ? "Collection" : entity.type}:{" "}
            <strong>{entity.name}</strong>
          </span>
          <button
            aria-label="Clear collection filter"
            onClick={() => setEntity(null)}
          >
            <X size={13} />
          </button>
        </div>
      )}
      {query && (
        <p className="search-summary">
          Results for &ldquo;{query}&rdquo;{" "}
          <button onClick={() => setQuery("")}>Clear search</button>
        </p>
      )}
      {tab === "Songs" &&
        (filtered.length ? (
          <>
            <div className="library-play-row">
              <button
                className="round-primary"
                aria-label="Play all songs"
                onClick={() =>
                  playTrack(
                    filtered[0].id,
                    filtered.map((item) => item.id),
                  )
                }
              >
                <Play size={18} fill="currentColor" />
              </button>
              <span>
                {filtered.length} songs{" "}
                <span className="muted">
                  &middot;{" "}
                  {Math.round(
                    filtered.reduce((sum, item) => sum + item.duration, 0) / 60,
                  )}{" "}
                  min
                </span>
              </span>
            </div>
            <TrackList tracks={filtered} />
          </>
        ) : (
          <EmptyState
            icon={<Search />}
            title="A little too quiet here"
            text="No songs match your search. Try another title, artist, or album."
            action={
              <button
                className="secondary-button"
                onClick={() => {
                  setQuery("");
                  setEntity(null);
                }}
              >
                Show all music
              </button>
            }
          />
        ))}
      {tab === "Artists" && (
        <div className="artist-grid">
          {artists
            .filter((artist) =>
              artist.toLowerCase().includes(query.toLowerCase()),
            )
            .map((artist) => (
              <button
                key={artist}
                className="artist-tile"
                onClick={() => openEntity("artist", artist)}
              >
                <img
                  src={tracks.find((track) => track.artist === artist)!.image}
                  alt=""
                />
                <strong>{artist}</strong>
                <span>
                  Artist &middot;{" "}
                  {tracks.filter((track) => track.artist === artist).length}{" "}
                  songs
                </span>
              </button>
            ))}
        </div>
      )}
      {tab === "Albums" && (
        <div className="album-grid">
          {albums
            .filter((album) =>
              album.toLowerCase().includes(query.toLowerCase()),
            )
            .map((album) => (
              <button
                className="album-tile"
                key={album}
                onClick={() => openEntity("album", album)}
              >
                <img
                  src={tracks.find((track) => track.album === album)!.image}
                  alt=""
                />
                <strong>{album}</strong>
                <span>
                  {tracks.filter((track) => track.album === album).length} songs
                </span>
              </button>
            ))}
        </div>
      )}
      {tab === "Folders" && (
        <div className="source-list">
          {[
            {
              name: "Sakura Sessions",
              description:
                "8 original instrumental demos, bundled with the app",
              icon: Disc3,
              count: tracks.filter((track) => !track.imported).length,
            },
            {
              name: "Your imports",
              description: "Your audio files, saved securely on this device",
              icon: HardDrive,
              count: tracks.filter((track) => track.imported).length,
            },
          ].map(({ name, description, icon: Icon, count }) => (
            <button key={name} onClick={() => openEntity("source", name)}>
              <span className="source-icon">
                <Icon />
              </span>
              <span>
                <strong>{name}</strong>
                <small>{description}</small>
              </span>
              <span className="source-count">{count} songs</span>
              <ArrowRight size={17} />
            </button>
          ))}
        </div>
      )}
      <div className="library-import-note">
        <HardDrive size={18} />
        <div>
          <strong>Your soundtrack stays yours.</strong>
          <p>
            Drop audio files anywhere, or add music to your library. No uploads.
            No account. Just you and the music.
          </p>
        </div>
        <button className="text-button" onClick={importMusic}>
          <Upload size={14} />
          Import
        </button>
      </div>
    </div>
  );
}

export function CollectionView({ recent = false }: { recent?: boolean }) {
  const { tracks, favorites, recent: history, playTrack } = usePlayer();
  const { navigate } = useNavigation();
  const ids = recent ? history : favorites;
  const collection = ids
    .map((id) => tracks.find((track) => track.id === id))
    .filter((track) => !!track);
  const Icon = recent ? Clock3 : Heart;
  return (
    <div className="page-view">
      <div className={`collection-banner ${recent ? "recent-banner" : ""}`}>
        <span className="collection-big-icon">
          <Icon fill={recent ? "none" : "currentColor"} />
        </span>
        <div>
          <p className="eyebrow">
            {recent ? "A LITTLE DEJA VU" : "SAVED WITH LOVE"}
          </p>
          <h1>{recent ? "Recently Played" : "Your Favorites"}</h1>
          <p>
            {recent
              ? "The sounds you've been coming back to."
              : "All the songs that feel a little like home."}
          </p>
          <span>{collection.length} songs &middot; Made by you</span>
        </div>
      </div>
      {collection.length ? (
        <>
          <div className="collection-controls">
            <button
              className="primary-button"
              onClick={() =>
                playTrack(
                  collection[0].id,
                  collection.map((track) => track.id),
                )
              }
            >
              <Play size={16} fill="currentColor" />
              Play {recent ? "again" : "favorites"}
            </button>
            <span className="muted">
              {Math.round(
                collection.reduce((sum, track) => sum + track.duration, 0) / 60,
              )}{" "}
              minutes of feeling
            </span>
          </div>
          <TrackList tracks={collection} />
        </>
      ) : (
        <EmptyState
          icon={<Icon />}
          title={recent ? "A fresh start" : "Room for a little love"}
          text={
            recent
              ? "Your listening history will appear as you play."
              : "Tap the heart on a song to make it part of your world."
          }
          action={
            <button
              className="primary-button"
              onClick={() => navigate("library")}
            >
              Explore your library <ArrowRight size={15} />
            </button>
          }
        />
      )}
    </div>
  );
}

export function PlaylistsView() {
  const { playlists, tracks, playTrack, setShuffle } = usePlayer();
  const { selectedPlaylist, setModal, navigate } = useNavigation();
  const [options, setOptions] = useState(false);
  const playlist = playlists.find((item) => item.id === selectedPlaylist);
  if (playlist) {
    const items = playlist.trackIds
      .map((id) => tracks.find((track) => track.id === id))
      .filter((track) => !!track);
    return (
      <div className="page-view playlist-detail">
        <BackToPlaylists />
        <div className="playlist-banner">
          <img className="playlist-banner-bg" src={playlist.image} alt="" />
          <img className="playlist-detail-art" src={playlist.image} alt="" />
          <div>
            <p className="eyebrow">YOUR OWN LITTLE UNIVERSE</p>
            <h1>{playlist.name}</h1>
            <p>{playlist.description}</p>
            <span>
              {items.length} songs &middot;{" "}
              {Math.round(
                items.reduce((sum, track) => sum + track.duration, 0) / 60,
              )}{" "}
              min &middot; Made by you
            </span>
          </div>
        </div>
        <div className="collection-controls">
          <button
            className="primary-button"
            disabled={!items.length}
            onClick={() =>
              playTrack(
                items[0].id,
                items.map((track) => track.id),
              )
            }
          >
            <Play size={16} fill="currentColor" />
            Play playlist
          </button>
          <IconButton
            label="Shuffle playlist"
            disabled={!items.length}
            onClick={() => {
              setShuffle(true);
              const random = items[Math.floor(Math.random() * items.length)];
              playTrack(
                random.id,
                items.map((track) => track.id),
              );
            }}
          >
            <Shuffle />
          </IconButton>
          <button
            className="secondary-button add-playlist-tracks"
            onClick={() =>
              setModal({ type: "playlist-add-tracks", playlistId: playlist.id })
            }
          >
            <Plus size={15} />
            Add songs
          </button>
          <div className="playlist-options">
            <IconButton
              label="Playlist options"
              onClick={() => setOptions(!options)}
              aria-expanded={options}
            >
              <MoreHorizontal />
            </IconButton>
            {options && (
              <div className="small-menu">
                <button
                  onClick={() => {
                    setOptions(false);
                    setModal({
                      type: "rename-playlist",
                      playlistId: playlist.id,
                    });
                  }}
                >
                  Rename playlist
                </button>
                <button
                  className="danger-text"
                  onClick={() => {
                    setOptions(false);
                    setModal({
                      type: "delete-playlist",
                      playlistId: playlist.id,
                    });
                  }}
                >
                  Delete playlist
                </button>
              </div>
            )}
          </div>
        </div>
        {items.length ? (
          <TrackList tracks={items} playlistId={playlist.id} />
        ) : (
          <EmptyState
            icon={<ListMusic />}
            title="A blank page. A new feeling."
            text="Add a few songs and make this playlist your own."
            action={
              <button
                className="primary-button"
                onClick={() =>
                  setModal({
                    type: "playlist-add-tracks",
                    playlistId: playlist.id,
                  })
                }
              >
                <Plus size={15} />
                Add songs
              </button>
            }
          />
        )}
      </div>
    );
  }
  return (
    <div className="page-view">
      <PageHeading
        eyebrow="COLLECT A FEELING"
        title="Your Playlists"
        description="A different world for every version of you."
        action={
          <button
            className="primary-button"
            onClick={() => setModal({ type: "create-playlist" })}
          >
            <Plus size={16} />
            New playlist
          </button>
        }
      />
      <div className="playlist-grid all-playlists">
        {playlists.map((item) => (
          <PlaylistTile key={item.id} playlist={item} />
        ))}
        <button
          className="create-playlist-tile"
          onClick={() => setModal({ type: "create-playlist" })}
        >
          <span>
            <Plus size={28} />
          </span>
          <strong>A new little world</strong>
          <small>Create a playlist</small>
        </button>
      </div>
      <div className="section-bottom-note">
        <FolderHeart size={17} />
        <span>Made by you. Saved on this device. Always your vibe.</span>
        <button className="text-button" onClick={() => navigate("library")}>
          Find more music <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export function ThemesView() {
  const { theme, updatePreferences } = usePlayer();
  return (
    <div className="page-view themes-view">
      <PageHeading
        eyebrow="SAME MUSIC. DIFFERENT MAGIC."
        title="Set the Atmosphere"
        description="A little change of scenery for your next listening session."
      />
      <div className="theme-preview-banner">
        <img
          src={theme.image}
          style={{ filter: theme.filter }}
          alt={`${theme.name} Japanese night landscape`}
        />
        <div>
          <Flower2 size={22} />
          <p className="eyebrow">YOUR CURRENT ESCAPE</p>
          <h2>{theme.name}</h2>
          <p>{theme.description}</p>
        </div>
        <span className="theme-preview-jp" lang="ja">
          君だけの世界。
        </span>
      </div>
      <div className="section-heading theme-collection-heading">
        <h2>Find your kind of night</h2>
        <span className="muted">8 handcrafted atmospheres</span>
      </div>
      <div className="theme-grid">
        {THEMES.map((item) => (
          <button
            key={item.id}
            className={`theme-tile ${theme.id === item.id ? "selected" : ""}`}
            onClick={() => updatePreferences({ theme: item.id })}
            aria-pressed={theme.id === item.id}
            style={{ "--tile-accent": item.accent } as React.CSSProperties}
          >
            <div className="theme-art">
              <img src={item.image} alt="" style={{ filter: item.filter }} />
              <SelectionCheck selected={theme.id === item.id} />
              <span className="theme-art-shade" />
            </div>
            <span className="theme-name">
              <span>
                <i style={{ background: item.accent }} />
                {item.name}
              </span>
              {theme.id === item.id && <small>ACTIVE</small>}
            </span>
          </button>
        ))}
      </div>
      <p className="theme-footer-note">
        <Sparkles size={15} />
        Your theme colors follow you everywhere. Make yourself at home.
      </p>
    </div>
  );
}

export function EqualizerView() {
  const { preferences, updatePreferences, theme } = usePlayer();
  const presets = Object.keys(EQ_PRESETS);
  return (
    <div className="page-view equalizer-view">
      <PageHeading
        eyebrow="EVERY FREQUENCY. YOUR WAY."
        title="Shape Your Sound"
        description="A little more bass, a little more clarity. Make it feel right."
        action={
          <div className="eq-enable">
            <span>Equalizer</span>
            <Toggle
              label="Enable equalizer"
              on={preferences.eqEnabled}
              onChange={() =>
                updatePreferences({ eqEnabled: !preferences.eqEnabled })
              }
            />
          </div>
        }
      />
      <section
        className={`equalizer-workspace ${preferences.eqEnabled ? "" : "eq-disabled"}`}
        aria-label="Seven-band equalizer"
      >
        <div className="preset-heading">
          <span className="eyebrow">YOUR SOUND PROFILE</span>
          <button
            className="text-button"
            onClick={() =>
              updatePreferences({ eqPreset: "Flat", eq: EQ_PRESETS.Flat })
            }
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
        <div className="eq-presets">
          {presets.map((preset) => (
            <button
              key={preset}
              className={preferences.eqPreset === preset ? "selected" : ""}
              onClick={() =>
                updatePreferences({
                  eqPreset: preset,
                  eq: [...EQ_PRESETS[preset]],
                })
              }
            >
              {preset}
            </button>
          ))}
        </div>
        <div className="eq-sliders">
          <div className="eq-scale">
            <span>+12</span>
            <span>0 dB</span>
            <span>-12</span>
          </div>
          <div className="eq-guides">
            <i />
            <i />
            <i />
          </div>
          {preferences.eq.map((gain, index) => (
            <label key={EQ_LABELS[index]} className="eq-band">
              <output>
                {gain > 0 ? "+" : ""}
                {gain}
                <small>dB</small>
              </output>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={gain}
                disabled={!preferences.eqEnabled}
                aria-label={`${EQ_LABELS[index]} Hz gain`}
                onChange={(event) =>
                  updatePreferences({
                    eq: preferences.eq.map((value, i) =>
                      i === index ? Number(event.target.value) : value,
                    ),
                    eqPreset: "Custom",
                  })
                }
              />
              <span>
                {EQ_LABELS[index]}
                <small>Hz</small>
              </span>
            </label>
          ))}
        </div>
        <AudioVisualizer className="eq-live-wave" />
      </section>
      <div className="audio-effects">
        <div className="effect-row">
          <span className="effect-icon">
            <Volume2 />
          </span>
          <div>
            <strong>Bass Boost</strong>
            <p>A little extra weight behind every beat.</p>
          </div>
          <Toggle
            label="Bass Boost"
            on={preferences.bass}
            onChange={() => updatePreferences({ bass: !preferences.bass })}
          />
        </div>
        <div className="effect-row">
          <span className="effect-icon">
            <Waves />
          </span>
          <div>
            <strong>Spatial Sound</strong>
            <p>Let the sound gently move around you.</p>
          </div>
          <Toggle
            label="Spatial Sound"
            on={preferences.spatial}
            onChange={() =>
              updatePreferences({ spatial: !preferences.spatial })
            }
          />
        </div>
      </div>
      <div className="sound-landscape">
        <img src={theme.image} alt="" style={{ filter: theme.filter }} />
        <span>
          <HeadphonesIcon />
          <strong>Close your eyes. Open your world.</strong>
          <small>Best experienced with headphones.</small>
        </span>
      </div>
    </div>
  );
}

export function VisualizerView() {
  const { current, playing, preferences, theme, notify } = usePlayer();
  const [mode, setMode] = useState("orbit");
  const stage = useRef<HTMLDivElement>(null);
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.current?.requestFullscreen();
    } catch {
      notify("Full screen is not available in this browser.");
    }
  }
  return (
    <div className="page-view visualizer-view">
      <PageHeading
        eyebrow="SOME THINGS ARE BETTER FELT"
        title="Feel Every Beat"
        description="A little light. A little sound. Completely in the moment."
        action={
          <button className="secondary-button" onClick={fullscreen}>
            <Maximize2 size={15} />
            Focus mode
          </button>
        }
      />
      <div className="visual-stage" ref={stage}>
        <img
          className="visual-background"
          src={theme.image}
          alt=""
          style={{ filter: theme.filter }}
        />
        <div className="visual-mode-label">
          <i className={playing ? "live" : ""} />
          {playing ? "LIVE AUDIO REACTIVE" : "WAITING FOR YOUR SOUNDTRACK"}
        </div>
        {mode === "spectrum" ? (
          <div className="spectrum-stage">
            <AudioVisualizer />
            <img src={current.image} alt="" />
          </div>
        ) : (
          <div
            className={`orbit-stage ${mode === "vinyl" ? "vinyl-stage" : ""} ${playing && preferences.motion ? "in-motion" : ""}`}
          >
            <AudioVisualizer variant="ring" />
            <svg className="cat-ears" viewBox="0 0 360 360" aria-hidden="true">
              <path d="m91 99-25-54q-5-12 7-7l55 25m105 0 55-25q12-5 7 7l-25 54" />
            </svg>
            <div className="orbit-image">
              <img src={current.image} alt={`${current.title} artwork`} />
              {mode === "vinyl" && (
                <>
                  <i className="vinyl-grooves" />
                  <span className="vinyl-center">
                    <Disc3 size={22} />
                  </span>
                </>
              )}
            </div>
            <div className="orbit-ring" />
          </div>
        )}
        <div className="visual-track-title">
          <h2>{current.title}</h2>
          <p>{current.artist}</p>
        </div>
        <div
          className="visualizer-mode-buttons"
          role="group"
          aria-label="Visualizer style"
        >
          {[
            { id: "spectrum", label: "Spectrum", icon: AudioLines },
            { id: "orbit", label: "Sakura Orbit", icon: Disc3 },
            { id: "vinyl", label: "Vinyl", icon: Music2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={mode === id ? "active" : ""}
              aria-label={label}
              aria-pressed={mode === id}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button
          className="fullscreen-exit"
          onClick={() => void document.exitFullscreen()}
          aria-label="Exit focus mode"
        >
          <X />
        </button>
      </div>
      <div className="visualizer-playback">
        <div className="visualizer-current">
          <img src={current.image} alt="" />
          <span>
            <strong>{current.title}</strong>
            <small>{current.artist}</small>
          </span>
          <FavoriteButton trackId={current.id} />
        </div>
        <Transport />
        <SeekBar />
      </div>
    </div>
  );
}

export function SettingsView() {
  const {
    preferences,
    updatePreferences,
    theme,
    tracks,
    exportBackup,
    restoreBackup,
    notify,
  } = usePlayer();
  const { navigate, importMusic, setModal } = useNavigation();
  const [name, setName] = useState(preferences.name);
  useEffect(() => setName(preferences.name), [preferences.name]);
  const backupInput = useRef<HTMLInputElement>(null);
  return (
    <div className="page-view settings-view">
      <PageHeading
        eyebrow="THIS LITTLE WORLD IS YOURS"
        title="Make Yourself at Home"
        description="The details that make your listening experience, yours."
      />
      <form
        className="profile-settings"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) {
            updatePreferences({ name: name.trim() });
            notify("Looking good. Your name has been updated.");
          }
        }}
      >
        <span className="settings-avatar">
          {preferences.name.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <label htmlFor="display-name">What should we call you?</label>
          <input
            id="display-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={30}
            minLength={1}
            required
          />
        </div>
        <button className="secondary-button" type="submit">
          <Check size={15} />
          Save
        </button>
      </form>
      <SettingsSection title="Your atmosphere">
        <button
          className="settings-row settings-link"
          onClick={() => navigate("themes")}
        >
          <span className="settings-icon">
            <Palette />
          </span>
          <span>
            <strong>Appearance</strong>
            <small>
              {theme.name} &middot; Themes, colors, and a change of scenery
            </small>
          </span>
          <img
            className="settings-theme-thumb"
            src={theme.image}
            alt=""
            style={{ filter: theme.filter }}
          />
          <ArrowUpRight size={16} />
        </button>
        <SettingToggle
          icon={<Flower2 />}
          title="Sakura blossoms"
          description="A few falling petals to keep you company."
          on={preferences.petals}
          onChange={() => updatePreferences({ petals: !preferences.petals })}
        />
        <SettingToggle
          icon={<Sparkles />}
          title="Animations & motion"
          description="Soft transitions and audio-reactive movement."
          on={preferences.motion}
          onChange={() => updatePreferences({ motion: !preferences.motion })}
        />
      </SettingsSection>
      <SettingsSection title="The way it sounds">
        <button
          className="settings-row settings-link"
          onClick={() => navigate("equalizer")}
        >
          <span className="settings-icon">
            <SlidersHorizontal />
          </span>
          <span>
            <strong>Equalizer & effects</strong>
            <small>
              {preferences.eqEnabled ? preferences.eqPreset : "Off"} &middot;
              Fine-tune every frequency
            </small>
          </span>
          <ArrowUpRight size={16} />
        </button>
        <SettingToggle
          icon={<Volume2 />}
          title="Sound normalization"
          description="Gentle compression for a more even volume."
          on={preferences.normalize}
          onChange={() =>
            updatePreferences({ normalize: !preferences.normalize })
          }
        />
      </SettingsSection>
      <SettingsSection title="Your music, kept safe">
        <button className="settings-row settings-link" onClick={importMusic}>
          <span className="settings-icon">
            <Upload />
          </span>
          <span>
            <strong>Bring your own music</strong>
            <small>
              {tracks.filter((track) => track.imported).length} imported tracks
              &middot; MP3, WAV, OGG, M4A, and more
            </small>
          </span>
          <Plus size={17} />
        </button>
        <button className="settings-row settings-link" onClick={exportBackup}>
          <span className="settings-icon">
            <ArrowDownToLine />
          </span>
          <span>
            <strong>Back up your space</strong>
            <small>
              Export settings, favorites, and playlists. Audio is not included.
            </small>
          </span>
          <ArrowUpRight size={16} />
        </button>
        <button
          className="settings-row settings-link"
          onClick={() => backupInput.current?.click()}
        >
          <span className="settings-icon">
            <RotateCcw />
          </span>
          <span>
            <strong>Restore a backup</strong>
            <small>
              Pick up where you left off with a Hiro Segawa JSON backup.
            </small>
          </span>
          <ArrowUpRight size={16} />
        </button>
        <input
          className="sr-only"
          type="file"
          accept=".json,application/json"
          ref={backupInput}
          aria-label="Restore settings backup"
          onChange={(event) => {
            if (event.target.files?.[0])
              void restoreBackup(event.target.files[0]);
            event.target.value = "";
          }}
        />
      </SettingsSection>
      <SettingsSection title="A few little things">
        <button
          className="settings-row settings-link"
          onClick={() => setModal({ type: "shortcuts" })}
        >
          <span className="settings-icon">
            <Keyboard />
          </span>
          <span>
            <strong>Keyboard shortcuts</strong>
            <small>Less clicking. More listening.</small>
          </span>
          <ArrowUpRight size={16} />
        </button>
        <div className="settings-row">
          <span className="settings-icon">
            <ShieldCheck />
          </span>
          <span>
            <strong>Private by design</strong>
            <small>
              Your files stay in your browser. Nothing is uploaded to a server.
            </small>
          </span>
        </div>
      </SettingsSection>
      <div className="settings-about">
        <Flower2 size={19} />
        <strong>Hiro Segawa</strong>
        <span>MUSIC PLAYER &middot; v1.0</span>
        <p>
          A little escape for your everyday.
          <br />
          Includes eight original instrumental demos.
        </p>
        <span lang="ja">音楽は、心の居場所。</span>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function SettingToggle({
  icon,
  title,
  description,
  on,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <div className="settings-row">
      <span className="settings-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <Toggle label={title} on={on} onChange={onChange} />
    </div>
  );
}
