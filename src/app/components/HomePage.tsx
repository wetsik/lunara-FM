import { Play, Heart, TrendingUp, Sparkles, Clock, Loader2, Plus, Shuffle } from "lucide-react";
import { usePlayer, type Track } from "../player/PlayerContext";
import { TrackMenu } from "./TrackMenu";

type Page = "home" | "search" | "library" | "favorites" | "albums" | "artists" | "podcasts" | "settings" | "album" | "artist" | "playlist" | "fullscreen" | "profile" | "premium";

interface HomePageProps {
  onNavigate: (page: Page, payload?: any) => void;
}

function SectionHeader({ title, icon: Icon, action, onAction }: { title: string; icon?: React.ComponentType<{ size?: number }>; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
        {Icon && <Icon size={16} />}
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
          {title}
        </h2>
      </div>
      {action && (
        <button className="text-xs font-medium transition-colors" style={{ color: "var(--text-muted)" }}
          onClick={onAction}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--emerald)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
        >
          {action}
        </button>
      )}
    </div>
  );
}

export function HomePage({ onNavigate }: HomePageProps) {
  const {
    discovery, discoveryLoading, history, liked, playlists,
    play, playStation, currentTrack, isLiked, toggleLike, createPlaylist, playSmartMix,
  } = usePlayer();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const recent = history.length ? history : discovery.slice(0, 6);
  const colLeft = discovery.slice(0, 5);
  const colRight = discovery.slice(5, 10);
  const trending = discovery.slice(0, 10);

  // Real "artists" = unique channels from what's actually available.
  const artistNames = Array.from(
    new Set([...history, ...discovery].map(t => t.artist))
  ).slice(0, 6);

  const goArtist = (name: string) => {
    const t = [...history, ...discovery].find(x => x.artist === name);
    onNavigate("artist", { id: t?.artistId || name, name, image: t?.cover });
  };

  const TrackRow = ({ track, index }: { track: Track; index: number }) => {
    const active = currentTrack?.id === track.id;
    const lk = isLiked(track.id);
    return (
      <div
        onClick={() => playStation(track)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group cursor-pointer"
        style={{ background: active ? "var(--emerald-dim)" : "transparent" }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--glass-bg)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
      >
        <div className="relative w-8 h-8 shrink-0">
          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium tabular-nums group-hover:opacity-0" style={{ color: "var(--text-muted)" }}>{index + 1}</span>
          <img src={track.cover} alt={track.title} className="w-8 h-8 rounded object-cover opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: active ? "var(--emerald)" : "var(--text-primary)" }}>{track.title}</p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{track.artist}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); toggleLike(track); }}
            style={{ color: lk ? "var(--emerald)" : "var(--text-muted)" }}
            className="opacity-0 group-hover:opacity-100 transition-all"
          >
            <Heart size={13} fill={lk ? "currentColor" : "none"} />
          </button>
          <span className="text-xs tabular-nums w-10 text-right" style={{ color: "var(--text-muted)" }}>
            {track.duration}
          </span>
          <div onClick={e => e.stopPropagation()}>
            <TrackMenu track={track} onNavigate={onNavigate} iconSize={14} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
      {/* Welcome */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="brand-text-glow text-xs font-medium mb-1" style={{ color: "var(--emerald)" }}>
              {greeting} ✦
            </p>
            <h1 className="brand-text-glow text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
              Welcome back
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              {discoveryLoading ? "Loading fresh music…" : "Real tracks, streamed from YouTube."}
            </p>
          </div>
          <div
            className="grid w-full grid-cols-3 items-center gap-3 rounded-2xl px-4 py-3 md:flex md:w-auto md:gap-4 md:px-5"
            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
          >
            <div className="text-center">
              <p className="brand-number-glow text-lg font-bold" style={{ color: "var(--text-primary)" }}>{liked.length}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Liked</p>
            </div>
            <div className="hidden h-8 w-px md:block" style={{ background: "var(--glass-border)" }} />
            <div className="text-center">
              <p className="brand-number-glow text-lg font-bold" style={{ color: "var(--text-primary)" }}>{playlists.length}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Playlists</p>
            </div>
            <div className="hidden h-8 w-px md:block" style={{ background: "var(--glass-border)" }} />
            <div className="text-center">
              <p className="brand-number-glow text-lg font-bold" style={{ color: "var(--emerald)" }}>{history.length}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Played</p>
            </div>
          </div>
        </div>

        {/* Smart mix — a personalized shuffle from your taste */}
        <button
          onClick={playSmartMix}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.99] sm:w-auto"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--emerald)" }}>
            <Shuffle size={16} color="var(--brand-on-accent)" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Микс по интересам</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Перемешанный поток из ваших лайков и истории</p>
          </div>
        </button>
      </div>

      {discoveryLoading && discovery.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: "var(--emerald)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Fetching music from YouTube…</p>
        </div>
      ) : (
        <>
          {/* Recently Played */}
          <section className="mb-8">
            <SectionHeader title={history.length ? "Recently Played" : "Start Listening"} icon={Clock} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recent.slice(0, 6).map(track => (
                <div
                  key={track.id}
                  onClick={() => play(track, recent)}
                  className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-150 group"
                  style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--surface-1)")}
                >
                  <img src={track.cover} alt={track.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{track.title}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{track.artist}</p>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <TrackMenu track={track} onNavigate={onNavigate} iconSize={15} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recommended */}
          <section className="mb-8">
            <SectionHeader title="Recommended For You" icon={Sparkles} />
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-6">
              <div>{colLeft.map((track, i) => <TrackRow key={track.id} track={track} index={i} />)}</div>
              <div>{colRight.map((track, i) => <TrackRow key={track.id} track={track} index={i} />)}</div>
            </div>
          </section>

          {/* Trending */}
          <section className="mb-8">
            <SectionHeader title="Trending Now" icon={TrendingUp} />
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {trending.map((track, i) => {
                const active = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    className="w-36 shrink-0 cursor-pointer group sm:w-40 lg:w-44"
                    onClick={() => playStation(track)}
                  >
                    <div className="relative mb-3">
                      <img src={track.cover} alt={track.title} className="aspect-square w-full rounded-2xl object-cover" />
                      <div
                        className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
                      >
                        <span className="text-[10px] font-bold" style={{ color: "#fff" }}>#{i + 1}</span>
                      </div>
                      <button
                        className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-95"
                        style={{ background: "var(--emerald)", boxShadow: "0 4px 16px var(--emerald-glow)" }}
                      >
                        <Play size={14} color="var(--brand-on-accent)" fill="var(--brand-on-accent)" style={{ marginLeft: "2px" }} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: active ? "var(--emerald)" : "var(--text-primary)" }}>{track.title}</p>
                      <div onClick={e => e.stopPropagation()}>
                        <TrackMenu track={track} onNavigate={onNavigate} iconSize={14} />
                      </div>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{track.artist}</p>
                    {track.plays && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{track.plays} plays</p>}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Artists */}
          {artistNames.length > 0 && (
            <section className="mb-8">
              <SectionHeader title="Artists You Hear" />
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:flex md:flex-wrap md:gap-5">
                {artistNames.map(name => (
                  <button
                    key={name}
                    className="flex min-w-0 flex-col items-center cursor-pointer group md:w-24"
                    onClick={() => goArtist(name)}
                  >
                    <div
                      className="aspect-square w-full max-w-24 rounded-full flex items-center justify-center text-2xl font-bold mb-3 transition-all group-hover:scale-105"
                      style={{ background: "var(--surface-2)", color: "var(--emerald)", border: "1px solid var(--glass-border)" }}
                    >
                      {name.slice(0, 1).toUpperCase()}
                    </div>
                    <p className="text-sm font-medium text-center truncate w-full" style={{ color: "var(--text-primary)" }}>{name}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Playlists */}
          <section className="mb-8">
            <SectionHeader title="Your Playlists" action="Create new" onAction={() => { const pl = createPlaylist("New Playlist"); onNavigate("playlist", pl.id); }} />
            {playlists.length === 0 ? (
              <button
                onClick={() => { const pl = createPlaylist("My Playlist"); onNavigate("playlist", pl.id); }}
                className="flex items-center gap-3 px-5 py-4 rounded-2xl transition-all"
                style={{ background: "var(--surface-1)", border: "1px dashed var(--glass-border)", color: "var(--text-muted)" }}
              >
                <Plus size={18} />
                <span className="text-sm">Create your first playlist</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {playlists.map(pl => (
                  <div
                    key={pl.id}
                    className="cursor-pointer group"
                    onClick={() => onNavigate("playlist", pl.id)}
                  >
                    <div className="relative mb-3">
                      {pl.cover ? (
                        <img src={pl.cover} alt={pl.title} className="w-full aspect-square rounded-2xl object-cover" />
                      ) : (
                        <div className="w-full aspect-square rounded-2xl flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                          <span className="text-3xl font-bold" style={{ color: "var(--emerald)" }}>{pl.title.slice(0, 1).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{pl.title}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{pl.tracks.length} tracks</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
