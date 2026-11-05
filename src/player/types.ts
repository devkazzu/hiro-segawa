export type Page =
  | "home"
  | "library"
  | "playlists"
  | "favorites"
  | "recent"
  | "visualizer"
  | "equalizer"
  | "themes"
  | "settings";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  src: string;
  duration: number;
  genre: string;
  imported?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  image: string;
  trackIds: string[];
}

export interface Theme {
  id: string;
  name: string;
  accent: string;
  soft: string;
  image: string;
  filter: string;
  description: string;
}

export interface Preferences {
  theme: string;
  petals: boolean;
  motion: boolean;
  name: string;
  volume: number;
  eqEnabled: boolean;
  eqPreset: string;
  eq: number[];
  bass: boolean;
  spatial: boolean;
  normalize: boolean;
}
