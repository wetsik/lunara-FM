import { useEffect, useRef, useState } from "react";
import {
  MoreHorizontal, Heart, ThumbsDown, Share2, User, Plus, ListPlus, Check, Trash2, Waves,
} from "lucide-react";
import { usePlayer } from "../player/PlayerContext";
import { shareTrack } from "../player/platform";
import type { Track } from "../player/youtube";

interface TrackMenuProps {
  track: Track;
  onNavigate?: (page: string, payload?: any) => void;
  iconSize?: number;
  className?: string;
  color?: string;
  align?: "left" | "right";
  // Open the dropdown upward (for bars pinned to the bottom of the screen).
  openUp?: boolean;
  // When provided, shows a "remove from this playlist" action.
  onRemove?: () => void;
}

// Shared "•••" actions menu for a track: like, dislike, add to playlist,
// go to artist, share. Self-contained dropdown with click-away handling.
export function TrackMenu({
  track, onNavigate, iconSize = 14, className, color = "var(--text-muted)", align = "right", openUp = false, onRemove,
}: TrackMenuProps) {
  const {
    isLiked, toggleLike, isDisliked, toggleDislike,
    playlists, addToPlaylist, createPlaylist, playStation,
  } = usePlayer();
  const [open, setOpen] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowPlaylists(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const liked = isLiked(track.id);
  const disliked = isDisliked(track.id);

  const close = () => { setOpen(false); setShowPlaylists(false); };

  const handleNewPlaylist = () => {
    const name = window.prompt("Название нового плейлиста", "Мой плейлист");
    if (name === null) return;
    const pl = createPlaylist(name);
    addToPlaylist(pl.id, track);
    close();
  };

  const item: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10, width: "100%",
    padding: "9px 12px", fontSize: 13, textAlign: "left",
    color: "var(--text-secondary)", background: "transparent", cursor: "pointer",
  };

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ color }}
        className="transition-colors"
        aria-label="More actions"
      >
        <MoreHorizontal size={iconSize} />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 mt-1 rounded-xl overflow-hidden"
          style={{
            right: align === "right" ? 0 : "auto",
            left: align === "left" ? 0 : "auto",
            minWidth: 210,
            background: "var(--surface-2, #1a1f27)",
            border: "1px solid var(--glass-border)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
          }}
        >
          {!showPlaylists ? (
            <>
              <button style={item} onClick={() => { playStation(track); close(); }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--glass-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <Waves size={15} style={{ color: "var(--emerald)" }} />
                Волна по треку
              </button>
              <button style={item} onClick={() => { toggleLike(track); close(); }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--glass-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <Heart size={15} fill={liked ? "currentColor" : "none"} style={{ color: liked ? "var(--emerald)" : undefined }} />
                {liked ? "Убрать из любимых" : "В любимые"}
              </button>
              <button style={item} onClick={() => { toggleDislike(track); close(); }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--glass-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <ThumbsDown size={15} fill={disliked ? "currentColor" : "none"} style={{ color: disliked ? "#ef4444" : undefined }} />
                {disliked ? "Убрать дизлайк" : "Не нравится"}
              </button>
              <button style={item} onClick={() => setShowPlaylists(true)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--glass-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <ListPlus size={15} />
                В плейлист…
              </button>
              {onNavigate && (
                <button style={item} onClick={() => { onNavigate("artist", { id: track.artistId || track.artist, name: track.artist, image: track.cover }); close(); }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--glass-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <User size={15} />
                  Перейти к артисту
                </button>
              )}
              <button style={item} onClick={() => { shareTrack(track); close(); }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--glass-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <Share2 size={15} />
                Поделиться
              </button>
              {onRemove && (
                <button style={{ ...item, color: "#ef4444" }} onClick={() => { onRemove(); close(); }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--glass-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <Trash2 size={15} />
                  Удалить из плейлиста
                </button>
              )}
            </>
          ) : (
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              <button style={{ ...item, color: "var(--emerald)", fontWeight: 600 }} onClick={handleNewPlaylist}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--glass-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <Plus size={15} />
                Новый плейлист
              </button>
              {playlists.length === 0 && (
                <p style={{ padding: "9px 12px", fontSize: 12, color: "var(--text-muted)" }}>
                  Пока нет плейлистов
                </p>
              )}
              {playlists.map((pl) => {
                const already = pl.tracks.some((t) => t.id === track.id);
                return (
                  <button key={pl.id} style={item}
                    onClick={() => { if (!already) addToPlaylist(pl.id, track); close(); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--glass-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    {already ? <Check size={15} style={{ color: "var(--emerald)" }} /> : <ListPlus size={15} />}
                    <span className="truncate">{pl.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
