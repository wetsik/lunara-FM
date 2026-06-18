import { Search, Play, TrendingUp, Loader2, Heart } from "lucide-react";
import { usePlayer } from "../player/PlayerContext";
import { TrackMenu } from "./TrackMenu";

type Page = "home" | "search" | "library" | "favorites" | "albums" | "artists" | "podcasts" | "settings" | "album" | "artist" | "playlist" | "fullscreen" | "profile" | "premium";

interface SearchPageProps {
  onNavigate: (page: Page, payload?: any) => void;
}

const genres = [
  { label: "Pop", color: "#242424", accent: "#f5f5f5" },
  { label: "Lo-fi", color: "#1a1a2e", accent: "#6366f1" },
  { label: "Rock", color: "#2a1a1a", accent: "#ef4444" },
  { label: "Synthwave", color: "#2a1a2e", accent: "#a855f7" },
  { label: "Jazz", color: "#1a1e2a", accent: "#3b82f6" },
  { label: "Classical", color: "#2a2a1a", accent: "#eab308" },
  { label: "Hip Hop", color: "#1e2a1e", accent: "#14b8a6" },
  { label: "Electronic", color: "#2a1e1a", accent: "#f97316" },
];

const trendingSearches = [
  "Top hits 2024", "Lo-fi beats", "Workout mix", "Chill vibes",
  "Hip hop", "Rock classics", "Dance party", "Acoustic",
];

export function SearchPage({ onNavigate }: SearchPageProps) {
  const {
    searchResults, searchLoading, discovery, play, playStation, currentTrack,
    isLiked, toggleLike, searchQuery: query, setSearchQuery: onSearch,
  } = usePlayer();

  const goToArtist = (artist: string, artistId: string | undefined, cover: string) =>
    onNavigate("artist", { id: artistId || artist, name: artist, image: cover });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
      {/* Search input large */}
      <div className="mb-8 relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          autoFocus
          placeholder="What do you want to listen to?"
          value={query}
          onChange={e => onSearch(e.target.value)}
          className="w-full rounded-2xl py-3.5 pl-11 pr-5 text-sm outline-none transition-all sm:text-base"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)")}
          onBlur={e => (e.currentTarget.style.borderColor = "var(--glass-border)")}
        />
        {searchLoading && (
          <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin" style={{ color: "var(--emerald)" }} />
        )}
      </div>

      {query ? (
        <>
          {searchLoading && searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={28} className="animate-spin" style={{ color: "var(--emerald)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Searching YouTube…</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-1">
              {searchResults.map(track => {
                const active = currentTrack?.id === track.id;
                const liked = isLiked(track.id);
                return (
                  <div
                    key={track.id}
                    onClick={() => playStation(track)}
                    className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 cursor-pointer transition-all group sm:gap-4 sm:px-4"
                    style={{ background: active ? "var(--emerald-dim)" : "transparent" }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--glass-bg)"; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div className="relative shrink-0">
                      <img src={track.cover} alt={track.title} className="w-10 h-10 rounded-lg object-cover" />
                      <div
                        className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.6)" }}
                      >
                        <Play size={13} color="#fff" fill="#fff" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: active ? "var(--emerald)" : "var(--text-primary)" }}>{track.title}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        <span
                          role="button"
                          onClick={e => { e.stopPropagation(); goToArtist(track.artist, track.artistId, track.cover); }}
                          className="hover:underline"
                        >
                          {track.artist}
                        </span>
                        {track.plays ? ` · ${track.plays} plays` : ""}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); toggleLike(track); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: liked ? "var(--emerald)" : "var(--text-muted)" }}
                    >
                      <Heart size={14} fill={liked ? "currentColor" : "none"} />
                    </button>
                    <span className="hidden text-xs tabular-nums shrink-0 sm:inline" style={{ color: "var(--text-muted)" }}>{track.duration}</span>
                    <TrackMenu track={track} onNavigate={onNavigate} iconSize={14} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-base font-medium" style={{ color: "var(--text-secondary)" }}>No results for "{query}"</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Check your spelling or try different keywords</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Trending searches */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} style={{ color: "var(--emerald)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Trending Searches</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingSearches.map(term => (
                <button
                  key={term}
                  onClick={() => onSearch(term)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: "var(--glass-bg)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--glass-border)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255, 255, 255, 0.4)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--emerald)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--glass-border)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </section>

          {/* Browse genres */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Browse by Genre</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {genres.map(genre => (
                <button
                  key={genre.label}
                  onClick={() => onSearch(`${genre.label} music`)}
                  className="relative min-h-20 rounded-2xl overflow-hidden text-left px-4 py-3 font-semibold text-sm transition-all hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${genre.color} 0%, ${genre.accent}22 100%)`,
                    border: `1px solid ${genre.accent}30`,
                    color: "#fff",
                  }}
                >
                  <div
                    className="absolute right-2 bottom-2 w-12 h-12 rounded-xl opacity-20"
                    style={{ background: genre.accent }}
                  />
                  {genre.label}
                </button>
              ))}
            </div>
          </section>

          {/* Discover from real feed */}
          <section>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Fresh Right Now</h2>
            <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
              {discovery.slice(0, 10).map(track => {
                const active = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => playStation(track)}
                  className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-2 cursor-pointer transition-all group"
                    style={{ background: active ? "var(--emerald-dim)" : "transparent" }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--glass-bg)"; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <img src={track.cover} alt={track.title} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: active ? "var(--emerald)" : "var(--text-primary)" }}>{track.title}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        <span role="button" onClick={e => { e.stopPropagation(); goToArtist(track.artist, track.artistId, track.cover); }} className="hover:underline">{track.artist}</span>
                      </p>
                    </div>
                    <span className="hidden text-xs tabular-nums sm:inline" style={{ color: "var(--text-muted)" }}>{track.duration}</span>
                    <TrackMenu track={track} onNavigate={onNavigate} iconSize={14} />
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
