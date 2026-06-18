import { useEffect, useState } from "react";
import { Play, Heart, ArrowLeft, Share2, Loader2, Music2 } from "lucide-react";
import { usePlayer, type Album, type LikedArtist } from "../player/PlayerContext";
import { searchTracks, searchAlbums, type Track } from "../player/youtube";
import { TrackMenu } from "./TrackMenu";
import { shareTrack } from "../player/platform";

type Page = "home" | "search" | "library" | "favorites" | "albums" | "artists" | "podcasts" | "settings" | "album" | "artist" | "playlist" | "fullscreen" | "profile" | "premium";

interface ArtistPageProps {
  onNavigate: (page: Page, payload?: any) => void;
  onBack?: () => void;
  artist: LikedArtist | null;
}

export function ArtistPage({ onNavigate, onBack, artist }: ArtistPageProps) {
  const { play, currentTrack, isArtistLiked, toggleArtistLike } = usePlayer();
  const [activeTab, setActiveTab] = useState<"popular" | "albums" | "about">("popular");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);

  const following = artist ? isArtistLiked(artist.id) : false;

  // Top tracks for the artist, pulled live from YouTube.
  useEffect(() => {
    if (!artist) return;
    const controller = new AbortController();
    setTracksLoading(true);
    setTracks([]);
    searchTracks(artist.name, 20, controller.signal)
      .then(setTracks)
      .catch(err => { if (err?.name !== "AbortError") console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setTracksLoading(false); });
    return () => controller.abort();
  }, [artist?.id, artist?.name]);

  // Albums (YouTube playlists) — loaded lazily when the tab is opened.
  useEffect(() => {
    if (!artist || activeTab !== "albums" || albums.length || albumsLoading) return;
    const controller = new AbortController();
    setAlbumsLoading(true);
    searchAlbums(artist.name, 12, controller.signal)
      .then(setAlbums)
      .catch(err => { if (err?.name !== "AbortError") console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setAlbumsLoading(false); });
    return () => controller.abort();
  }, [activeTab, artist?.id]);

  if (!artist) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
        Выберите артиста
      </div>
    );
  }

  const heroImage = artist.image || tracks[0]?.cover || "";

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero */}
      <div className="relative h-56 sm:h-72">
        {heroImage ? (
          <img src={heroImage} alt={artist.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, var(--surface-2), var(--surface-1))" }} />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(15,17,21,0.2) 0%, rgba(15,17,21,0.7) 60%, rgba(15,17,21,1) 100%)" }}
        />
        <button
          onClick={() => (onBack ? onBack() : onNavigate("home"))}
          className="absolute left-4 top-5 flex items-center gap-2 text-sm transition-colors sm:left-6 lg:left-8 lg:top-6"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          <ArrowLeft size={15} />
          Назад
        </button>
      </div>

      {/* Artist info */}
      <div className="relative z-10 mb-6 -mt-12 px-4 sm:-mt-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold mb-3 sm:text-5xl" style={{ color: "var(--text-primary)", letterSpacing: "-0.04em" }}>
          {artist.name}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={!tracks.length}
            onClick={() => tracks.length && play(tracks[0], tracks)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "var(--emerald)", color: "var(--brand-on-accent)", boxShadow: "0 0 28px var(--moon-glow-soft)" }}
          >
            <Play size={14} color="var(--brand-on-accent)" fill="var(--brand-on-accent)" />
            Слушать
          </button>
          <button
            onClick={() => toggleArtistLike({ id: artist.id, name: artist.name, image: heroImage })}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
            style={{
              background: following ? "var(--emerald-dim)" : "var(--glass-bg)",
              color: following ? "var(--emerald)" : "var(--text-secondary)",
              border: `1px solid ${following ? "rgba(255, 255, 255, 0.3)" : "var(--glass-border)"}`,
            }}
          >
            <Heart size={14} fill={following ? "currentColor" : "none"} />
            {following ? "В любимых" : "Лайкнуть артиста"}
          </button>
          <button
            onClick={() => tracks[0] && shareTrack(tracks[0])}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "var(--glass-bg)", color: "var(--text-muted)", border: "1px solid var(--glass-border)" }}
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1 mb-6 overflow-x-auto" style={{ borderBottom: "1px solid var(--glass-border)" }}>
          {([["popular", "Популярное"], ["albums", "Альбомы"], ["about", "Об артисте"]] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2.5 text-sm font-medium transition-all relative whitespace-nowrap"
              style={{ color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              {label}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full" style={{ background: "var(--emerald)" }} />
              )}
            </button>
          ))}
        </div>

        {activeTab === "popular" && (
          <div className="space-y-1 mb-8">
            {tracksLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--emerald)" }} />
              </div>
            )}
            {!tracksLoading && tracks.length === 0 && (
              <p className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>Треки не найдены</p>
            )}
            {tracks.map((track, i) => {
              const active = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => play(track, tracks)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group sm:gap-4 sm:px-4"
                  style={{ background: active ? "var(--emerald-dim)" : "transparent" }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--glass-bg)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span className="hidden w-5 text-sm tabular-nums text-right shrink-0 sm:inline" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                  <img src={track.cover} alt={track.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium" style={{ color: active ? "var(--emerald)" : "var(--text-primary)" }}>{track.title}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{track.plays ? `${track.plays} plays` : track.artist}</p>
                  </div>
                  <span className="hidden text-xs tabular-nums sm:inline" style={{ color: "var(--text-muted)" }}>{track.duration}</span>
                  <TrackMenu track={track} onNavigate={onNavigate} iconSize={14} />
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "albums" && (
          <div className="mb-8">
            {albumsLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--emerald)" }} />
              </div>
            )}
            {!albumsLoading && albums.length === 0 && (
              <p className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>Альбомы не найдены</p>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {albums.map(album => (
                <div key={album.id} className="cursor-pointer group" onClick={() => onNavigate("album", album)}>
                  <div className="relative mb-3">
                    <img src={album.cover} alt={album.title} className="w-full aspect-square rounded-2xl object-cover" />
                    <div
                      className="absolute bottom-2 right-2 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      style={{ background: "var(--emerald)", boxShadow: "0 0 24px var(--moon-glow-soft)" }}
                    >
                      <Play size={14} color="var(--brand-on-accent)" fill="var(--brand-on-accent)" style={{ marginLeft: 2 }} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{album.title}</p>
                  <p className="text-xs mt-1 truncate" style={{ color: "var(--text-muted)" }}>{album.artist}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "about" && (
          <div className="mb-8 max-w-2xl">
            <div className="p-6 rounded-2xl" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
              <div className="flex items-center gap-3 mb-4">
                <Music2 size={16} style={{ color: "var(--emerald)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Об артисте</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {artist.name} — исполнитель, чьи треки доступны в Lunara. Слушайте популярное,
                открывайте альбомы и добавляйте песни в свои плейлисты. Лайкните артиста, чтобы он
                влиял на ваш персональный микс по интересам.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
