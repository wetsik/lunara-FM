import { useEffect, useRef, useState } from "react";
import { Play, Heart, ArrowLeft, Shuffle, Clock, Plus, Music, Pin, PinOff, Trash2, GripVertical } from "lucide-react";
import { usePlayer } from "../player/PlayerContext";
import { TrackMenu } from "./TrackMenu";

type Page = "home" | "search" | "library" | "favorites" | "albums" | "artists" | "podcasts" | "settings" | "album" | "artist" | "playlist" | "fullscreen" | "profile" | "premium";

interface PlaylistPageProps {
  onNavigate: (page: Page, payload?: any) => void;
  playlistId: string | null;
}

export function PlaylistPage({ onNavigate, playlistId }: PlaylistPageProps) {
  const {
    playlists, play, currentTrack, toggleShuffle, shuffle, toggleLike, isLiked,
    removeFromPlaylist, reorderPlaylist, deletePlaylist, togglePinPlaylist,
  } = usePlayer();

  const playlist = playlists.find(p => p.id === playlistId) || null;

  const handleDeletePlaylist = () => {
    if (!playlist) return;
    if (window.confirm(`Удалить плейлист «${playlist.title}»?`)) {
      deletePlaylist(playlist.id);
      onNavigate("library");
    }
  };

  // --- Drag-to-reorder (pointer based, works with mouse + touch) ------------
  // The dragged row follows the pointer (translateY), and the rows it passes
  // slide out of the way with a CSS transition, so it animates live.
  const scrollRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startScrollRef = useRef(0);
  const maxScrollRef = useRef(0);
  const pointerYRef = useRef(0);
  const rowHRef = useRef(64);
  const dragRef = useRef<number | null>(null);
  const targetRef = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [dragY, setDragY] = useState(0);
  // Suppresses transitions for the single frame where the new order commits,
  // so rows snap into place instead of animating back (the "jerk").
  const [noAnim, setNoAnim] = useState(false);

  const startDrag = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rowEl = (e.currentTarget as HTMLElement).closest("[data-row]") as HTMLElement | null;
    rowHRef.current = rowEl?.getBoundingClientRect().height || 64;
    startYRef.current = e.clientY;
    pointerYRef.current = e.clientY;
    const sc = scrollRef.current;
    startScrollRef.current = sc?.scrollTop ?? 0;
    // Natural max scroll captured before any drag transform extends the
    // scrollable area — clamping to it prevents a runaway auto-scroll loop.
    maxScrollRef.current = sc ? Math.max(0, sc.scrollHeight - sc.clientHeight) : 0;
    dragRef.current = index;
    targetRef.current = index;
    setDragIndex(index);
    setTargetIndex(index);
    setDragY(0);
  };

  useEffect(() => {
    if (dragIndex === null) return;
    const len = playlist?.tracks.length ?? 0;
    // Recompute the drag offset + target, factoring in how far we've scrolled
    // since the drag began (the content moves under the pointer).
    const recompute = () => {
      const scrollTop = scrollRef.current?.scrollTop ?? 0;
      const dy = (pointerYRef.current - startYRef.current) + (scrollTop - startScrollRef.current);
      setDragY(dy);
      const t = Math.max(0, Math.min(len - 1, dragIndex + Math.round(dy / rowHRef.current)));
      targetRef.current = t;
      setTargetIndex(t);
    };
    const move = (e: PointerEvent) => {
      pointerYRef.current = e.clientY;
      recompute();
    };
    // Auto-scroll when the pointer nears the top/bottom edge of the list.
    let raf = 0;
    const tick = () => {
      const el = scrollRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const edge = 64;
        const y = pointerYRef.current;
        let v = 0;
        if (y < rect.top + edge) v = -Math.ceil(((rect.top + edge - y) / edge) * 14);
        else if (y > rect.bottom - edge) v = Math.ceil(((y - (rect.bottom - edge)) / edge) * 14);
        if (v !== 0) {
          const before = el.scrollTop;
          // Clamp to the natural max so the dragged row's transform (which
          // inflates scrollHeight) can't feed an infinite scroll.
          const next = Math.max(0, Math.min(before + v, maxScrollRef.current));
          if (next !== before) {
            el.scrollTop = next;
            recompute();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const end = () => {
      const from = dragRef.current;
      const to = targetRef.current;
      if (playlist && from !== null && to !== null && to !== from) {
        setNoAnim(true); // commit without animating the settle
        reorderPlaylist(playlist.id, from, to);
      }
      dragRef.current = null;
      targetRef.current = null;
      setDragIndex(null);
      setTargetIndex(null);
      setDragY(0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragIndex]);

  // Re-enable transitions one frame after the order commits.
  useEffect(() => {
    if (!noAnim) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setNoAnim(false)));
    return () => cancelAnimationFrame(id);
  }, [noAnim]);

  if (!playlist) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <button
          onClick={() => onNavigate("library")}
          className="flex items-center gap-2 mb-8 text-sm" style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: "var(--text-muted)" }}>
          <Music size={40} />
          <p className="text-sm">Playlist not found. Pick one from your library.</p>
        </div>
      </div>
    );
  }

  const tracks = playlist.tracks;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {/* Header */}
      <div
        className="relative px-4 pt-5 pb-8 sm:px-6 lg:px-8 lg:pt-6"
        style={{ background: "linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%)" }}
      >
        <button
          onClick={() => onNavigate("library")}
          className="flex items-center gap-2 mb-6 text-sm transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end lg:gap-8">
          <div className="relative shrink-0">
            {playlist.cover ? (
              <img
                src={playlist.cover}
                alt={playlist.title}
                className="h-40 w-40 rounded-2xl object-cover sm:h-44 sm:w-44 lg:h-52 lg:w-52"
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
              />
            ) : (
              <div className="h-40 w-40 rounded-2xl flex items-center justify-center sm:h-44 sm:w-44 lg:h-52 lg:w-52" style={{ background: "var(--surface-2)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
                <Music size={56} style={{ color: "var(--emerald)" }} />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--emerald)" }}>
              Playlist
            </p>
            <h1 className="text-3xl font-bold mb-2 sm:text-4xl" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
              {playlist.title}
            </h1>
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{playlist.description}</p>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>{tracks.length} songs</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => tracks.length && play(tracks[0], tracks)}
                disabled={tracks.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
                style={{ background: "var(--emerald)", color: "var(--brand-on-accent)", boxShadow: "0 0 28px var(--moon-glow-soft)" }}
              >
                <Play size={14} color="var(--brand-on-accent)" fill="var(--brand-on-accent)" />
                Play
              </button>
              <button
                onClick={() => { toggleShuffle(); if (tracks.length) play(tracks[Math.floor(Math.random() * tracks.length)], tracks); }}
                disabled={tracks.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all disabled:opacity-40"
                style={{ background: shuffle ? "var(--emerald-dim)" : "var(--glass-bg)", color: shuffle ? "var(--emerald)" : "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
              >
                <Shuffle size={14} />
                Shuffle
              </button>
              <button
                onClick={() => onNavigate("search")}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                style={{ background: "var(--glass-bg)", color: "var(--text-muted)", border: "1px solid var(--glass-border)" }}
                title="Добавить песни"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={() => togglePinPlaylist(playlist.id)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: playlist.pinned ? "var(--emerald-dim)" : "var(--glass-bg)",
                  color: playlist.pinned ? "var(--emerald)" : "var(--text-muted)",
                  border: `1px solid ${playlist.pinned ? "rgba(255,255,255,0.3)" : "var(--glass-border)"}`,
                }}
                title={playlist.pinned ? "Открепить из меню" : "Закрепить в меню"}
              >
                {playlist.pinned ? <PinOff size={16} /> : <Pin size={16} />}
              </button>
              <button
                onClick={handleDeletePlaylist}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                title="Удалить плейлист"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: "var(--text-muted)" }}>
            <p className="text-sm">This playlist is empty.</p>
            <button
              onClick={() => onNavigate("search")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
              style={{ background: "var(--emerald)", color: "var(--brand-on-accent)" }}
            >
              <Plus size={15} /> Add songs
            </button>
          </div>
        ) : (
          <>
            <div
              className="hidden items-center gap-4 px-4 py-2 mb-1 sm:grid"
              style={{ gridTemplateColumns: "2rem 1fr 1fr auto", borderBottom: "1px solid var(--glass-border)" }}
            >
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>#</span>
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>TITLE</span>
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>ARTIST</span>
              <Clock size={12} style={{ color: "var(--text-muted)" }} />
            </div>

            <div>
            {tracks.map((track, i) => {
              const isActive = currentTrack?.id === track.id;
              const lk = isLiked(track.id);
              const dragging = dragIndex !== null;
              const isDragged = dragIndex === i;
              // Live drag motion: the grabbed row follows the pointer; the rows it
              // crosses slide up/down by one row height to open a gap.
              let translateY = 0;
              let transition = noAnim ? "none" : "transform 180ms cubic-bezier(0.2, 0, 0, 1)";
              let zIndex: number | "auto" = "auto";
              let shadow = "none";
              if (dragging && targetIndex !== null) {
                if (isDragged) {
                  translateY = dragY;
                  transition = "none";
                  zIndex = 50;
                  shadow = "0 12px 30px rgba(0,0,0,0.5)";
                } else if (dragIndex < targetIndex && i > dragIndex && i <= targetIndex) {
                  translateY = -rowHRef.current;
                } else if (dragIndex > targetIndex && i >= targetIndex && i < dragIndex) {
                  translateY = rowHRef.current;
                }
              }
              // Only apply transform/z-index while actually dragging. At rest a
              // translateY(0) still creates a stacking context that would trap
              // the row's dropdown menu behind later rows.
              return (
                <div
                  key={track.id}
                  data-row
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-3 cursor-pointer group sm:grid-cols-[2rem_minmax(0,1fr)_minmax(6rem,0.5fr)_auto] sm:gap-4 sm:px-4"
                  style={{
                    background: isActive ? "var(--emerald-dim)" : "transparent",
                    transform: translateY !== 0 ? `translateY(${translateY}px)` : "none",
                    transition,
                    zIndex,
                    position: "relative",
                    boxShadow: shadow,
                    pointerEvents: isDragged ? "none" : undefined,
                    willChange: dragging ? "transform" : undefined,
                  }}
                  onMouseEnter={e => { if (!isActive && !dragging) e.currentTarget.style.background = "var(--glass-bg)"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  onClick={() => play(track, tracks)}
                >
                  <div className="hidden items-center justify-center sm:flex">
                    {isActive ? (
                      <div className="flex items-end gap-0.5 h-3">
                        {[1, 2, 3].map(b => (
                          <div key={b} className="w-0.5 rounded-full animate-pulse" style={{ background: "var(--emerald)", height: `${[100, 60, 80][b - 1]}%`, animationDelay: `${b * 100}ms` }} />
                        ))}
                      </div>
                    ) : (
                      <>
                        <span className="text-sm tabular-nums group-hover:hidden" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                        <Play size={12} className="hidden group-hover:block" fill="currentColor" style={{ color: "var(--text-primary)" }} />
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={track.cover} alt={track.title} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                    <p className="text-sm font-medium truncate" style={{ color: isActive ? "var(--emerald)" : "var(--text-primary)" }}>{track.title}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onNavigate("artist", { id: track.artistId || track.artist, name: track.artist, image: track.cover }); }}
                    className="hidden text-sm truncate text-left sm:block hover:underline"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {track.artist}
                  </button>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: lk ? "var(--emerald)" : "var(--text-muted)" }}
                      onClick={e => { e.stopPropagation(); toggleLike(track); }}
                    >
                      <Heart size={13} fill={lk ? "currentColor" : "none"} />
                    </button>
                    <span className="text-sm tabular-nums" style={{ color: "var(--text-muted)" }}>{track.duration}</span>
                    <TrackMenu
                      track={track}
                      onNavigate={onNavigate}
                      iconSize={14}
                      onRemove={() => removeFromPlaylist(playlist.id, track.id)}
                    />
                    <button
                      onPointerDown={e => startDrag(e, i)}
                      onClick={e => e.stopPropagation()}
                      className="cursor-grab active:cursor-grabbing transition-colors"
                      style={{ color: "var(--text-muted)", touchAction: "none" }}
                      title="Перетащите, чтобы изменить порядок"
                      aria-label="Изменить порядок"
                    >
                      <GripVertical size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
            </div>

            <button
              onClick={() => onNavigate("search")}
              className="flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl text-sm transition-all"
              style={{ color: "var(--text-muted)", background: "transparent" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--glass-bg)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
            >
              <Plus size={15} />
              Add more songs
            </button>
          </>
        )}
      </div>
    </div>
  );
}
