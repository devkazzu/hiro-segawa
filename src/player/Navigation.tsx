import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { Page } from "./types";

export type AppModal =
  | { type: "create-playlist"; trackId?: string }
  | { type: "track"; trackId: string; playlistId?: string }
  | { type: "add-to-playlist"; trackId: string }
  | { type: "rename-playlist"; playlistId: string }
  | { type: "delete-playlist"; playlistId: string }
  | { type: "playlist-add-tracks"; playlistId: string }
  | { type: "shortcuts" }
  | { type: "queue" }
  | { type: "export-project" }
  | null;

interface NavigationValue {
  page: Page;
  navigate: (page: Page) => void;
  selectedPlaylist: string | null;
  selectPlaylist: (id: string) => void;
  query: string;
  setQuery: (query: string) => void;
  drawer: boolean;
  setDrawer: (open: boolean) => void;
  expanded: boolean;
  setExpanded: (open: boolean) => void;
  modal: AppModal;
  setModal: (modal: AppModal) => void;
  fileInput: RefObject<HTMLInputElement | null>;
  importMusic: () => void;
}
const NavigationContext = createContext<NavigationValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>("home");
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [modal, setModalState] = useState<AppModal>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  function setModal(next: AppModal) {
    if (next) {
      setDrawer(false);
      setExpanded(false);
    }
    setModalState(next);
  }
  function navigate(next: Page) {
    setPage(next);
    setSelectedPlaylist(null);
    setQuery("");
    setDrawer(false);
  }
  function selectPlaylist(id: string) {
    setPage("playlists");
    setSelectedPlaylist(id);
    setQuery("");
    setDrawer(false);
  }
  return (
    <NavigationContext.Provider
      value={{
        page,
        navigate,
        selectedPlaylist,
        selectPlaylist,
        query,
        setQuery,
        drawer,
        setDrawer,
        expanded,
        setExpanded,
        modal,
        setModal,
        fileInput,
        importMusic: () => fileInput.current?.click(),
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("NavigationProvider is missing");
  return context;
}
