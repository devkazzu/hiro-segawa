import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Check,
  Heart,
  ListMusic,
  ListPlus,
  Music2,
  Pencil,
  Play,
  Plus,
  Search,
  SkipForward,
  Trash2,
} from "lucide-react";
import { usePlayer } from "./PlayerContext";
import { useNavigation } from "./Navigation";
import { Dialog, EmptyState, SelectionCheck } from "./components";
import { QueueList } from "./layout";
import { formatTime } from "./catalog";
import { ExportDialog } from "./ExportDialog";

export function AppDialogs() {
  const { modal, setModal, navigate } = useNavigation();
  const { playlists, deletePlaylist } = usePlayer();
  const close = () => setModal(null);
  if (!modal) return null;
  const playlist =
    "playlistId" in modal
      ? playlists.find((item) => item.id === modal.playlistId)
      : undefined;
  return (
    <AnimatePresence mode="wait">
      {modal.type === "export-project" && (
        <Dialog
          key="export-project"
          title="Download & deploy your app"
          onClose={close}
          className="export-dialog"
        >
          <ExportDialog />
        </Dialog>
      )}
      {modal.type === "create-playlist" && (
        <Dialog
          key="create-playlist"
          title="A new little world"
          onClose={close}
        >
          <PlaylistForm trackId={modal.trackId} />
        </Dialog>
      )}
      {modal.type === "rename-playlist" && playlist && (
        <Dialog
          key="rename-playlist"
          title="A new name, same feeling"
          onClose={close}
        >
          <PlaylistForm playlistId={playlist.id} />
        </Dialog>
      )}
      {modal.type === "track" && (
        <Dialog
          key={`track-${modal.trackId}`}
          title="Make it your moment"
          onClose={close}
        >
          <TrackActions trackId={modal.trackId} playlistId={modal.playlistId} />
        </Dialog>
      )}
      {modal.type === "add-to-playlist" && (
        <Dialog
          key="add-to-playlist"
          title="Find it a little home"
          onClose={close}
        >
          <AddToPlaylist trackId={modal.trackId} />
        </Dialog>
      )}
      {modal.type === "playlist-add-tracks" && playlist && (
        <Dialog
          key="playlist-add-tracks"
          title={`Add songs to ${playlist.name}`}
          onClose={close}
        >
          <PlaylistTrackPicker playlistId={playlist.id} />
        </Dialog>
      )}
      {modal.type === "delete-playlist" && playlist && (
        <Dialog
          key="delete-playlist"
          title="Let this little world go?"
          onClose={close}
        >
          <p className="dialog-description">
            Delete &ldquo;{playlist.name}&rdquo;? Your songs will stay safe in
            your library. Only this playlist will be removed.
          </p>
          <div className="dialog-actions">
            <button className="secondary-button" onClick={close}>
              Keep it
            </button>
            <button
              className="danger-button"
              onClick={() => {
                deletePlaylist(playlist.id);
                close();
                navigate("playlists");
              }}
            >
              <Trash2 size={15} />
              Delete playlist
            </button>
          </div>
        </Dialog>
      )}
      {modal.type === "queue" && (
        <Dialog
          key="queue"
          title="The rest of your night"
          onClose={close}
          className="queue-dialog"
        >
          <QueueDialog />
        </Dialog>
      )}
      {modal.type === "shortcuts" && (
        <Dialog
          key="shortcuts"
          title="Less clicking. More listening."
          onClose={close}
        >
          <div className="shortcuts-list">
            {[
              ["Play / pause", ["Space"]],
              ["Next track", ["Alt", "Right"]],
              ["Previous track", ["Alt", "Left"]],
              ["Seek forward 5 seconds", ["Right"]],
              ["Seek back 5 seconds", ["Left"]],
              ["Search your library", ["Ctrl / Cmd", "K"]],
              ["Close a dialog", ["Esc"]],
            ].map(([label, keys]) => (
              <div key={label as string}>
                <span>{label}</span>
                <span>
                  {(keys as string[]).map((key) => (
                    <kbd key={key}>{key}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <p className="dialog-footnote">
            Playback shortcuts are paused while you type or edit.
          </p>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

function PlaylistForm({
  playlistId,
  trackId,
}: {
  playlistId?: string;
  trackId?: string;
}) {
  const { playlists, createPlaylist, renamePlaylist } = usePlayer();
  const { setModal, selectPlaylist } = useNavigation();
  const playlist = playlists.find((item) => item.id === playlistId);
  const [name, setName] = useState(playlist?.name ?? "");
  const [description, setDescription] = useState("");
  return (
    <form
      className="playlist-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        if (playlistId) renamePlaylist(playlistId, name);
        else {
          const id = createPlaylist(name, description, trackId);
          selectPlaylist(id);
        }
        setModal(null);
      }}
    >
      <div className="playlist-form-art">
        <ListMusic size={37} />
        <span aria-hidden="true" className="form-flower">
          *
        </span>
      </div>
      <label>
        Playlist name
        <input
          aria-label="Playlist name"
          placeholder="Something that feels like you..."
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          required
        />
      </label>
      {!playlistId && (
        <label>
          A little description <span>(optional)</span>
          <textarea
            aria-label="Playlist description"
            placeholder="For slow mornings, late nights, or anything in between."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={180}
            rows={3}
          />
        </label>
      )}
      <div className="dialog-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => setModal(null)}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="primary-button"
          disabled={!name.trim()}
        >
          {playlistId ? <Check size={15} /> : <Plus size={15} />}{" "}
          {playlistId ? "Save name" : "Create playlist"}
        </button>
      </div>
    </form>
  );
}

function TrackActions({
  trackId,
  playlistId,
}: {
  trackId: string;
  playlistId?: string;
}) {
  const {
    tracks,
    playTrack,
    playNext,
    favorites,
    toggleFavorite,
    removeFromPlaylist,
    removeTrack,
  } = usePlayer();
  const { setModal } = useNavigation();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const track = tracks.find((item) => item.id === trackId);
  if (!track) return null;
  const liked = favorites.includes(trackId);
  return (
    <>
      <div className="dialog-track">
        <img src={track.image} alt="" />
        <span>
          <strong>{track.title}</strong>
          <small>
            {track.artist} &middot; {formatTime(track.duration)}
          </small>
          <span>
            {track.imported ? "YOUR LOCAL AUDIO" : "ORIGINAL DEMO INSTRUMENTAL"}
          </span>
        </span>
      </div>
      {confirmRemove ? (
        <>
          <p className="dialog-description">
            Remove this imported audio file from this device? It will also be
            removed from your playlists.
          </p>
          <div className="dialog-actions">
            <button
              className="secondary-button"
              onClick={() => setConfirmRemove(false)}
            >
              Keep it
            </button>
            <button
              className="danger-button"
              onClick={() => {
                void removeTrack(trackId);
                setModal(null);
              }}
            >
              Remove track
            </button>
          </div>
        </>
      ) : (
        <div className="track-action-list">
          <button
            onClick={() => {
              playTrack(trackId);
              setModal(null);
            }}
          >
            <Play size={18} />
            Play this moment
          </button>
          <button
            onClick={() => {
              playNext(trackId);
              setModal(null);
            }}
          >
            <SkipForward size={18} />
            Play next
          </button>
          <button
            onClick={() => setModal({ type: "add-to-playlist", trackId })}
          >
            <ListPlus size={18} />
            Add to playlist
          </button>
          <button
            onClick={() => {
              toggleFavorite(trackId);
              setModal(null);
            }}
          >
            <Heart size={18} fill={liked ? "currentColor" : "none"} />
            {liked ? "Remove from favorites" : "Save to favorites"}
          </button>
          {playlistId && (
            <button
              className="danger-text"
              onClick={() => {
                removeFromPlaylist(playlistId, trackId);
                setModal(null);
              }}
            >
              <ListMusic size={18} />
              Remove from this playlist
            </button>
          )}
          {track.imported && (
            <button
              className="danger-text"
              onClick={() => setConfirmRemove(true)}
            >
              <Trash2 size={18} />
              Remove from your library
            </button>
          )}
        </div>
      )}
    </>
  );
}

function AddToPlaylist({ trackId }: { trackId: string }) {
  const { playlists, addToPlaylist } = usePlayer();
  const { setModal } = useNavigation();
  return (
    <div className="playlist-picker">
      {playlists.map((playlist) => (
        <button
          key={playlist.id}
          onClick={() => {
            addToPlaylist(playlist.id, trackId);
            setModal(null);
          }}
        >
          <img src={playlist.image} alt="" />
          <span>
            <strong>{playlist.name}</strong>
            <small>{playlist.trackIds.length} songs</small>
          </span>
          {playlist.trackIds.includes(trackId) ? (
            <Check size={17} />
          ) : (
            <Plus size={17} />
          )}
        </button>
      ))}
      <button
        className="playlist-picker-new"
        onClick={() => setModal({ type: "create-playlist", trackId })}
      >
        <span className="picker-plus">
          <Plus size={22} />
        </span>
        <span>
          <strong>A new little world</strong>
          <small>Create a playlist with this song</small>
        </span>
      </button>
    </div>
  );
}

function PlaylistTrackPicker({ playlistId }: { playlistId: string }) {
  const { tracks, playlists, addToPlaylist, removeFromPlaylist } = usePlayer();
  const { setModal } = useNavigation();
  const [search, setSearch] = useState("");
  const playlist = playlists.find((item) => item.id === playlistId);
  return (
    <>
      <label className="picker-search">
        <Search size={16} />
        <input
          aria-label="Search songs to add"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Find a song for this feeling..."
        />
      </label>
      <div className="playlist-picker song-picker">
        {tracks
          .filter((track) =>
            `${track.title} ${track.artist}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((track) => {
            const selected = playlist?.trackIds.includes(track.id) ?? false;
            return (
              <button
                key={track.id}
                aria-pressed={selected}
                onClick={() =>
                  selected
                    ? removeFromPlaylist(playlistId, track.id)
                    : addToPlaylist(playlistId, track.id)
                }
              >
                <img src={track.image} alt="" />
                <span>
                  <strong>{track.title}</strong>
                  <small>{track.artist}</small>
                </span>
                <SelectionCheck selected={selected} />
              </button>
            );
          })}
      </div>
      <div className="dialog-actions">
        <span className="muted">
          {playlist?.trackIds.length ?? 0} songs in this world
        </span>
        <button className="primary-button" onClick={() => setModal(null)}>
          <Check size={15} />
          All set
        </button>
      </div>
    </>
  );
}

function QueueDialog() {
  const { current, queue, tracks, playTrack, repeat } = usePlayer();
  return (
    <>
      <p className="eyebrow queue-now-label">YOUR CURRENT MOMENT</p>
      <div className="dialog-track">
        <img src={current.image} alt="" />
        <span>
          <strong>{current.title}</strong>
          <small>{current.artist}</small>
        </span>
        <span className="queue-current-mark">
          <Music2 size={21} />
        </span>
      </div>
      <div className="queue-dialog-header">
        <h3>Coming up next</h3>
        <span>
          {repeat === "all"
            ? Math.max(0, queue.length - 1)
            : Math.max(0, queue.length - queue.indexOf(current.id) - 1)}{" "}
          songs
        </span>
      </div>
      <div className="queue-dialog-list">
        <QueueList all removable />
      </div>
      {queue.indexOf(current.id) === queue.length - 1 && (
        <EmptyState
          icon={<Pencil />}
          title="Write a new chapter"
          text="Start the library again, or find a new favorite."
          action={
            <button
              className="primary-button"
              onClick={() =>
                playTrack(
                  tracks[0].id,
                  tracks.map((track) => track.id),
                )
              }
            >
              Start a new session
            </button>
          }
        />
      )}
    </>
  );
}
