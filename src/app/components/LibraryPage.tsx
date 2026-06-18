import { useState } from "react";
import { Play, Heart, Plus, Grid3X3, List, Music, User, Pin, PinOff } from "lucide-react";
import { usePlayer, type Track } from "../player/PlayerContext";
import { TrackMenu } from "./TrackMenu";

type Page = "home" | "search" | "library" | "favorites" | "albums" | "artists" | "podcasts" | "settings" | "album" | "artist" | "playlist" | "fullscreen" | "profile" | "premium";

interface LibraryPageProps {
  onNavigate: (page: Page, payload?: any) => void;
  mode?: "library" | "favorites" | "albums" | "artists" | "podcasts";
}

const titles: Record<string, string> = {
  library: "Your Library",
  favorites: "Liked Songs",
  albums: "Albums",
  artists: "Artists",
  podcasts: "Podcasts",
};

export function LibraryPage({ onNavigate, mode = "library" }: LibraryPageProps) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const { playlists, liked, likedArtists, play, currentTrack, toggleLike, createPlaylist, togglePinPlaylist } = usePlayer();

  const handleCreate = () => {
    const pl = createPlaylist("New Playlist");
    onNavigate("playlist", pl.id);
  };

  const renderFavorites = () => {
    if (liked.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: "var(--text-muted)" }}>
          <Heart size={40} />
          <p className="text-sm">No liked songs yet. Tap the heart on any track.</p>
        </div>
      );
    }
    return (
      <div className="space-y-1">
        {liked.map((track: Track, i) => {
          const active = currentTrack?.id === track.id;
          return (
            <div
              key={track.id}
              onClick={() => play(track, liked)}
              className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 cursor-pointer transition-all group sm:gap-4 sm:px-4"
              style={{ background: active ? "var(--emerald-dim)" : "transparent" }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--glass-bg)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              <span className="hidden w-5 text-sm tabular-nums text-center sm:inline" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
              <img src={track.cover} alt={track.title} className="w-11 h-11 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: active ? "var(--emerald)" : "var(--text-primary)" }}>{track.title}</p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{track.artist}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); toggleLike(track); }}
                style={{ color: "var(--emerald)" }}
              >
                <Heart size={15} fill="currentColor" />
              </button>
              <span className="hidden text-sm tabular-nums sm:inline" style={{ color: "var(--text-muted)" }}>{track.duration}</span>
              <TrackMenu track={track} onNavigate={onNavigate} iconSize={14} />
            </div>
          );
        })}
      </div>
    );
  };

  const renderPlaylists = () => {
    if (playlists.length === 0) {
      return (
        <button
          onClick={handleCreate}
          className="flex items-center gap-3 px-5 py-4 rounded-2xl transition-all"
          style={{ background: "var(--surface-1)", border: "1px dashed var(--glass-border)", color: "var(--text-muted)" }}
        >
          <Plus size={18} />
          <span className="text-sm">Create your first playlist</span>
        </button>
      );
    }
    return (
      <div className={view === "grid" ? "grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4" : "space-y-2"}>
        {playlists.map(pl => (
          view === "grid" ? (
            <div key={pl.id} className="cursor-pointer group" onClick={() => onNavigate("playlist", pl.id)}>
              <div className="relative mb-3">
                {pl.cover ? (
                  <img src={pl.cover} alt={pl.title} className="w-full aspect-square rounded-2xl object-cover" />
                ) : (
                  <div className="w-full aspect-square rounded-2xl flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                    <Music size={32} style={{ color: "var(--emerald)" }} />
                  </div>
                )}
                <button
                  onClick={e => { e.stopPropagation(); togglePinPlaylist(pl.id); }}
                  className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${pl.pinned ? "" : "opacity-0 group-hover:opacity-100"}`}
                  style={{ background: pl.pinned ? "var(--emerald)" : "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
                  title={pl.pinned ? "Открепить из меню" : "Закрепить в меню"}
                >
                  {pl.pinned ? <PinOff size={13} color="var(--brand-on-accent)" /> : <Pin size={13} color="#fff" />}
                </button>
                <button className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" style={{ background: "var(--emerald)", boxShadow: "0 0 24px var(--moon-glow-soft)" }}>
                  <Play size={13} color="var(--brand-on-accent)" fill="var(--brand-on-accent)" style={{ marginLeft: "2px" }} />
                </button>
              </div>
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{pl.title}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{pl.tracks.length} tracks</p>
            </div>
          ) : (
            <div key={pl.id} className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 cursor-pointer transition-all group sm:gap-4 sm:px-4" onClick={() => onNavigate("playlist", pl.id)} onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-bg)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              {pl.cover ? (
                <img src={pl.cover} alt={pl.title} className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "var(--surface-2)" }}><Music size={18} style={{ color: "var(--emerald)" }} /></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{pl.title}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{pl.tracks.length} tracks</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); togglePinPlaylist(pl.id); }}
                className={`shrink-0 transition-all ${pl.pinned ? "" : "opacity-0 group-hover:opacity-100"}`}
                style={{ color: pl.pinned ? "var(--emerald)" : "var(--text-muted)" }}
                title={pl.pinned ? "Открепить из меню" : "Закрепить в меню"}
              >
                {pl.pinned ? <PinOff size={15} /> : <Pin size={15} />}
              </button>
            </div>
          )
        ))}
      </div>
    );
  };

  const renderArtists = () => {
    if (likedArtists.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: "var(--text-muted)" }}>
          <User size={40} />
          <p className="text-sm">Нет любимых артистов. Откройте страницу артиста и нажмите «Лайкнуть артиста».</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {likedArtists.map(a => (
          <div key={a.id} className="cursor-pointer group text-center" onClick={() => onNavigate("artist", a)}>
            <div className="relative mb-3">
              {a.image ? (
                <img src={a.image} alt={a.name} className="w-full aspect-square rounded-full object-cover" />
              ) : (
                <div className="w-full aspect-square rounded-full flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                  <User size={32} style={{ color: "var(--emerald)" }} />
                </div>
              )}
            </div>
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{a.name}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Артист</p>
          </div>
        ))}
      </div>
    );
  };

  const isFavorites = mode === "favorites";
  const isArtists = mode === "artists";

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          {titles[mode]}
        </h1>
        <div className="flex items-center gap-2">
          {!isFavorites && !isArtists && (
            <>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: "var(--glass-bg)", color: view === "grid" ? "var(--emerald)" : "var(--text-muted)", border: "1px solid var(--glass-border)" }}
                onClick={() => setView("grid")}
              >
                <Grid3X3 size={14} />
              </button>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: "var(--glass-bg)", color: view === "list" ? "var(--emerald)" : "var(--text-muted)", border: "1px solid var(--glass-border)" }}
                onClick={() => setView("list")}
              >
                <List size={14} />
              </button>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: "var(--emerald)", color: "var(--brand-on-accent)" }}
              >
                <Plus size={12} />
                <span className="hidden sm:inline">New Playlist</span>
                <span className="sm:hidden">New</span>
              </button>
            </>
          )}
        </div>
      </div>
      {isFavorites ? renderFavorites() : isArtists ? renderArtists() : renderPlaylists()}
    </div>
  );
}
