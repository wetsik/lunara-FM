import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Heart, Shuffle, Repeat, ListMusic, Maximize2, ChevronUp,
} from "lucide-react";
import { usePlayer } from "../player/PlayerContext";
import { TrackMenu } from "./TrackMenu";

type Page = "home" | "search" | "library" | "favorites" | "albums" | "artists" | "podcasts" | "settings" | "album" | "artist" | "playlist" | "fullscreen" | "profile" | "premium";

interface MusicPlayerProps {
  onNavigate: (page: Page) => void;
}

export function MusicPlayer({ onNavigate }: MusicPlayerProps) {
  const {
    currentTrack, isPlaying, togglePlay, next, prev,
    currentTime, duration, seek, volume, muted, setVolume, toggleMute,
    shuffle, repeat, toggleShuffle, toggleRepeat, toggleLike, isLiked, formatTime,
  } = usePlayer();

  // Nothing selected yet (new user) → hide the player bar entirely.
  if (!currentTrack) return null;

  const liked = currentTrack ? isLiked(currentTrack.id) : false;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const title = currentTrack?.title ?? "Nothing playing";
  const artist = currentTrack?.artist ?? "Pick a track to start";

  return (
    <div
      className="relative flex items-center px-3 sm:px-5 py-3 shrink-0 gap-2 sm:gap-4"
      style={{
        background: "rgba(0, 0, 0, 0.92)",
        backdropFilter: "blur(30px)",
        borderTop: "1px solid var(--glass-border)",
        minHeight: "72px",
      }}
    >
      {/* Mobile progress line on top of the bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 sm:hidden" style={{ background: "var(--glass-hover)" }}>
        <div className="h-full" style={{ width: `${progress}%`, background: "var(--emerald)" }} />
      </div>

      {/* Track info */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:flex-none md:w-60">
        <div className="relative group cursor-pointer" onClick={() => currentTrack && onNavigate("fullscreen")}>
          {currentTrack?.cover ? (
            <img
              src={currentTrack.cover}
              alt={title}
              className="h-10 w-10 rounded-lg object-cover sm:h-11 sm:w-11"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg sm:h-11 sm:w-11" style={{ background: "var(--surface-2)" }} />
          )}
          <div
            className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <Maximize2 size={12} color="#fff" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-xs font-medium sm:text-sm" style={{ color: "var(--text-primary)" }}>
            {title}
          </p>
          <p className="truncate text-[11px] sm:text-xs" style={{ color: "var(--text-muted)" }}>
            {artist}
          </p>
        </div>
        <button
          onClick={() => currentTrack && toggleLike(currentTrack)}
          className="hidden shrink-0 transition-all duration-200 sm:block"
          style={{ color: liked ? "var(--emerald)" : "var(--text-muted)" }}
        >
          <Heart size={15} fill={liked ? "currentColor" : "none"} />
        </button>
        {/* ••• menu — visible on mobile (desktop has it in the right cluster) */}
        <TrackMenu track={currentTrack} iconSize={18} align="left" className="shrink-0 sm:hidden" />
      </div>

      {/* Center controls */}
      <div className="flex-none md:flex-1 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={toggleShuffle}
            className="hidden md:block transition-colors"
            style={{ color: shuffle ? "var(--emerald)" : "var(--text-muted)" }}
          >
            <Shuffle size={14} />
          </button>
          <button
            onClick={prev}
            className="block transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)")}
          >
            <SkipBack size={17} />
          </button>
          <button
            onClick={togglePlay}
            className="brand-glow w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
            style={{
              background: "var(--emerald)",
              boxShadow: isPlaying ? "0 0 20px var(--emerald-glow)" : "none",
            }}
          >
            {isPlaying ? <Pause size={16} color="var(--brand-on-accent)" fill="var(--brand-on-accent)" /> : <Play size={16} color="var(--brand-on-accent)" fill="var(--brand-on-accent)" style={{ marginLeft: "2px" }} />}
          </button>
          <button
            onClick={next}
            className="transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)")}
          >
            <SkipForward size={17} />
          </button>
          <button
            onClick={toggleRepeat}
            className="hidden md:block transition-colors"
            style={{ color: repeat ? "var(--emerald)" : "var(--text-muted)" }}
          >
            <Repeat size={14} />
          </button>
        </div>

        {/* Progress bar (desktop/tablet) */}
        <div className="hidden sm:flex w-full max-w-md items-center gap-2">
          <span className="text-[10px] tabular-nums w-8 text-right" style={{ color: "var(--text-muted)" }}>
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative group">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--glass-hover)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  background: "var(--emerald)",
                  boxShadow: "0 0 6px var(--emerald-glow)",
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.5}
              value={currentTime}
              onChange={e => seek(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-1"
            />
          </div>
          <span className="text-[10px] tabular-nums w-8" style={{ color: "var(--text-muted)" }}>
            {duration > 0 ? formatTime(duration) : (currentTrack?.duration ?? "0:00")}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="hidden items-center gap-3 w-48 justify-end shrink-0 lg:flex">
        <button
          onClick={() => currentTrack && onNavigate("fullscreen")}
          className="transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
        >
          <ListMusic size={15} />
        </button>
        <button
          onClick={toggleMute}
          className="transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
        >
          {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        <div className="relative w-20 group">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--glass-hover)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${muted ? 0 : volume}%`, background: "var(--text-secondary)" }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-1"
          />
        </div>
        <button
          onClick={() => currentTrack && onNavigate("fullscreen")}
          className="transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
        >
          <ChevronUp size={15} />
        </button>
      </div>
    </div>
  );
}
