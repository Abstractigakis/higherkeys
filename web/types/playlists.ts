import { Tables } from "./supabase";

export type Playlist = any;
export type PlaylistHighlight = any & {
    highlights: Tables<"highlights"> & {
        sources: Tables<"sources">;
        higherkeys: Tables<"higherkeys">[];
    };
};

export type PlaylistWithHighlights = Playlist & {
    playlist_highlights: PlaylistHighlight[];
};
