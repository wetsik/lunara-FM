import { useEffect, useState } from "react";
import { Play, Heart, Clock, ArrowLeft, Shuffle, Plus, Loader2, Check } from "lucide-react";
import { usePlayer, type Album } from "../player/PlayerContext";
import { getPlaylistTracks, type Track } from "../player/youtube";
import { TrackMenu } from "./TrackMenu";

type Page = "home" | "search" | "library" | "favorites" | "albums" | "artists" | "podcasts" | "settings" | "album" | "artist" | "playlist" | "fullscreen" | "profile" | "premium";

interface AlbumPageProps {
  onNavigate: (page: Page, payload?: any) => void;
  onBack?: () => void;
  album: Album | null;
}

export function AlbumPage({ onNavigate, onBack, album }: AlbumPageProps) {
  const { play, shuffle, toggleShuffle, currentTrack, createPlaylist, addToPlaylist } = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!album) return;
    const controller = new AbortController();
    setLoading(true);
    setTracks([]);
    setSaved(false);
    getPlaylistTracks(album.id, 50, controller.signal)
      .then(setTracks)
      .catch(err => { if (err?.name !== "AbortError") console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [album?.id]);

  if (!album) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
        Выберите альбом
      </div>
    );
  }

  const playAll = () => { if (tracks.length) play(tracks[0], tracks); };
  const shufflePlay = () => {
    if (!tracks.length) return;
    if (!shuffle) toggleShuffle();
    play(tracks[Math.floor(Math.random() * tracks.length)], tracks);
  };
  const saveAsPlaylist = () => {
    if (!tracks.length || saved) return;
    const pl = createPlaylist(album.title);
    tracks.forEach(t => addToPlaylist(pl.id, t));
    setSaved(true);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero */}
      <div className="relative px-4 pt-5 pb-8 sm:px-6 lg:px-8 lg:pt-6" style={{ background: "linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, transparent 100%)" }}>
        <button
          onClick={() => (onBack ? onBack() : onNavigate("home"))}
          className="flex items-center gap-2 mb-6 text-sm transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
        >
          <ArrowLeft size={15} />
          Назад
        </button>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end lg:gap-8">
          <div className="relative shrink-0">
            <img src={album.cover} alt={album.title} className="h-40 w-40 rounded-2xl object-cover sm:h-44 sm:w-44 lg:h-52 lg:w-52" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--emerald)" }}>Альбом</p>
            <h1 className="text-3xl font-bold mb-2 sm:text-4xl" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>{album.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                onClick={() => onNavigate("artist", { id: album.artist, name: album.artist, image: album.cover })}
                className="text-sm font-medium hover:underline"
                style={{ color: "var(--text-primary)" }}
              >
                {album.artist}
              </button>
              {tracks.length > 0 && (
                <>
                  <span style={{ color: "var(--text-muted)" }}>·</span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>{tracks.length} songs</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={playAll}
                disabled={!tracks.length}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "var(--emerald)", color: "var(--brand-on-accent)", boxShadow: "0 4px 20px var(--emerald-glow)" }}
              >
                <Play size={14} color="var(--brand-on-accent)" fill="var(--brand-on-accent)" />
                Слушать
              </button>
              <button
                onClick={shufflePlay}
                disabled={!tracks.length}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "var(--glass-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--glass-hover)")}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--glass-bg)")}
              >
                <Shuffle size={14} />
                Перемешать
              </button>
              <button
                onClick={saveAsPlaylist}
                disabled={!tracks.length}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                title={saved ? "Сохранено в плейлисты" : "Сохранить как плейлист"}
                style={{
                  background: saved ? "var(--emerald-dim)" : "var(--glass-bg)",
                  color: saved ? "var(--emerald)" : "var(--text-muted)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {saved ? <Check size={16} /> : <Plus size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        <div
          className="hidden items-center gap-4 px-4 py-2 mb-2 sm:grid"
          style={{ gridTemplateColumns: "2rem 1fr auto", borderBottom: "1px solid var(--glass-border)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>#</span>
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>TITLE</span>
          <Clock size={12} style={{ color: "var(--text-muted)" }} />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--emerald)" }} />
          </div>
        )}
        {!loading && tracks.length === 0 && (
          <p className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>Треки не найдены</p>
        )}

        {tracks.map((track, i) => {
          const isActive = currentTrack?.id === track.id;
          return (
            <div
              key={track.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-3 cursor-pointer transition-all duration-150 group sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:gap-4 sm:px-4"
              style={{ background: isActive ? "var(--emerald-dim)" : "transparent" }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--glass-bg)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              onClick={() => play(track, tracks)}
            >
              <div className="hidden items-center justify-center w-6 sm:flex">
                {isActive ? (
                  <div className="flex items-end gap-0.5 h-3">
                    {[1, 2, 3].map(bar => (
                      <div key={bar} className="w-0.5 rounded-full animate-pulse" style={{ background: "var(--emerald)", height: `${[100, 60, 80][bar - 1]}%`, animationDelay: `${bar * 100}ms` }} />
                    ))}
                  </div>
                ) : (
                  <>
                    <span className="text-sm tabular-nums group-hover:hidden" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                    <Play size={12} className="hidden group-hover:block" fill="currentColor" style={{ color: "var(--text-primary)" }} />
                  </>
                )}
              </div>
              <div className="min-w-0 flex items-center gap-3">
                <img src={track.cover} alt={track.title} className="w-10 h-10 rounded-lg object-cover shrink-0 sm:hidden" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" style={{ color: isActive ? "var(--emerald)" : "var(--text-primary)" }}>{track.title}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{track.artist}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden text-sm tabular-nums sm:inline" style={{ color: "var(--text-muted)" }}>{track.duration}</span>
                <TrackMenu track={track} onNavigate={onNavigate} iconSize={14} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
