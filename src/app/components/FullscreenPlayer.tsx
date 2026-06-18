import { useRef, useState } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Heart, ThumbsDown, Shuffle, Repeat, ListMusic, ChevronDown, Share2,
} from "lucide-react";
import { usePlayer } from "../player/PlayerContext";
import { TrackMenu } from "./TrackMenu";
import { shareTrack, isCoarsePointer } from "../player/platform";
import { isNativeAudio } from "../player/nativeAudio";

// The native ExoPlayer engine honours software volume; the YouTube IFrame on
// touch devices does not. Show the slider whenever volume is actually drivable.
const showVolumeSlider = !isCoarsePointer || isNativeAudio();

type Page = "home" | "search" | "library" | "favorites" | "albums" | "artists" | "podcasts" | "settings" | "album" | "artist" | "playlist" | "fullscreen" | "profile" | "premium";

interface FullscreenPlayerProps {
  onNavigate: (page: Page, payload?: any) => void;
  onBack?: () => void;
}

export function FullscreenPlayer({ onNavigate, onBack }: FullscreenPlayerProps) {
  const {
    currentTrack, isPlaying, togglePlay, next, prev,
    currentTime, duration, seek, volume, muted, setVolume, toggleMute,
    shuffle, repeat, toggleShuffle, toggleRepeat, toggleLike, isLiked,
    toggleDislike, isDisliked, formatTime, queue, play,
  } = usePlayer();
  const [showQueue, setShowQueue] = useState(false);
  const [queueDragY, setQueueDragY] = useState(0);
  const queueStartY = useRef(0);
  const [sheetY, setSheetY] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Swipe-down to close the player. Ignore swipes on buttons/inputs.
  const startPlayerDrag = (e: React.PointerEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest('button, input, a, [role="button"]')) return;
    const startY = e.clientY;
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - startY;
      setSheetY(dy > 0 ? dy : 0);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (ev.clientY - startY > 120) goBack();
      setSheetY(0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Swipe-down to dismiss the queue sheet.
  const startQueueDrag = (e: React.PointerEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest('button, input, a, [role="button"]')) return;
    queueStartY.current = e.clientY;
    const move = (ev: PointerEvent) => setQueueDragY(Math.max(0, ev.clientY - queueStartY.current));
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (Math.max(0, ev.clientY - queueStartY.current) > 90) setShowQueue(false);
      setQueueDragY(0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const liked = currentTrack ? isLiked(currentTrack.id) : false;
  const disliked = currentTrack ? isDisliked(currentTrack.id) : false;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const upNext = queue.filter(t => t.id !== currentTrack?.id);
  const goBack = onBack ?? (() => onNavigate("home"));

  return (
    <div
      ref={rootRef}
      className="relative flex-1 flex flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
      style={{
        background: "var(--background)",
        transform: sheetY ? `translateY(${sheetY}px)` : undefined,
        opacity: sheetY ? Math.max(0.5, 1 - sheetY / 500) : 1,
        transition: sheetY ? "none" : "transform 0.28s ease, opacity 0.28s ease",
        borderTopLeftRadius: sheetY ? 20 : 0,
        borderTopRightRadius: sheetY ? 20 : 0,
      }}
      >
      {/* Ambient backdrop — the track's own artwork, blurred, sets the mood */}
      {currentTrack?.cover && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src={currentTrack.cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "blur(90px) saturate(1.5)", transform: "scale(1.4)", opacity: 0.4 }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.82) 55%, #000 100%)" }}
          />
        </div>
      )}

      {/* Main player */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] sm:px-8 sm:pt-5 sm:pb-6 lg:px-12 lg:py-6">
        <div
          className="flex min-h-0 flex-1 flex-col items-center"
          style={{ touchAction: "none" }}
          onPointerDown={startPlayerDrag}
        >
          {/* Top bar */}
          <div className="flex w-full items-center justify-between shrink-0">
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-sm transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
            >
              <ChevronDown size={16} />
              Now Playing
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => shareTrack(currentTrack)}
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
              >
                <Share2 size={15} />
              </button>
              {currentTrack && (
                <TrackMenu track={currentTrack} onNavigate={onNavigate} iconSize={16} align="right" />
              )}
            </div>
          </div>

          {/* Top media area, drag can start anywhere here */}
          <div className="my-auto flex w-full max-w-md flex-col items-center sm:my-0">
            {/* Artwork */}
            <div className="relative mb-5 sm:mb-8">
              {currentTrack?.cover ? (
                <img
                  src={currentTrack.cover}
                  alt={currentTrack.title}
                  className="h-48 w-48 rounded-3xl object-cover sm:h-60 sm:w-60 lg:h-64 lg:w-64"
                  style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(255, 255, 255, 0.14)" }}
                />
              ) : (
                <div className="h-48 w-48 rounded-3xl sm:h-60 sm:w-60 lg:h-64 lg:w-64" style={{ background: "var(--surface-2)" }} />
              )}
              {isPlaying && (
                <div
                  className="absolute -bottom-3 -right-3 h-12 w-12 rounded-full border-4 flex items-center justify-center sm:h-14 sm:w-14"
                  style={{
                    borderColor: "var(--background)",
                    background: "rgba(20,20,22,0.9)",
                    animation: "spin 8s linear infinite",
                  }}
                >
                  <div className="w-3.5 h-3.5 rounded-full" style={{ background: "var(--emerald)" }} />
                </div>
              )}
            </div>

            {/* Title + like/dislike */}
            <div className="flex w-full items-start justify-between gap-4 mb-3 sm:mb-5">
              <div className="min-w-0">
                <h2 className="text-lg font-bold mb-1 truncate sm:text-2xl" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {currentTrack?.title ?? "Nothing playing"}
                </h2>
                <button
                  disabled={!currentTrack}
                  onClick={() => currentTrack && onNavigate("artist", { id: currentTrack.artistId || currentTrack.artist, name: currentTrack.artist, image: currentTrack.cover })}
                  className="text-sm truncate text-left transition-colors hover:underline sm:text-base"
                  style={{ color: "var(--text-muted)" }}
                >
                  {currentTrack?.artist ?? "Pick a track to start"}
                </button>
              </div>
              <div className="mt-1 flex items-center gap-3 shrink-0">
                <button
                  onClick={() => currentTrack && toggleDislike(currentTrack)}
                  className="transition-all duration-200"
                  style={{ color: disliked ? "#ef4444" : "var(--text-muted)" }}
                  aria-label="Dislike"
                >
                  <ThumbsDown size={18} fill={disliked ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => currentTrack && toggleLike(currentTrack)}
                  className="transition-all duration-200"
                  style={{ color: liked ? "var(--emerald)" : "var(--text-muted)" }}
                  aria-label="Like"
                >
                  <Heart size={20} fill={liked ? "currentColor" : "none"} />
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-3 w-full mb-4 sm:mt-0 sm:mb-5">
              <div className="relative mb-2 group py-1.5 -my-1.5 flex items-center">
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--glass-hover)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, var(--emerald), #d7d7d7)",
                      boxShadow: "0 0 12px var(--emerald-glow)",
                    }}
                  />
                </div>
                {/* Draggable thumb (appears on hover) */}
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ left: `calc(${progress}% - 6px)`, background: "#fff", boxShadow: "0 0 10px var(--emerald-glow)" }}
                />
                <input
                  type="range" min={0} max={duration || 0} step={0.5} value={currentTime}
                  onChange={e => seek(Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex justify-between">
                <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{formatTime(currentTime)}</span>
                <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{duration > 0 ? formatTime(duration) : (currentTrack?.duration ?? "0:00")}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex w-full items-center justify-between mb-4 sm:mb-5">
              <button
                onClick={toggleShuffle}
                style={{ color: shuffle ? "var(--emerald)" : "var(--text-muted)" }}
              >
                <Shuffle size={18} />
              </button>
              <button onClick={prev} style={{ color: "var(--text-secondary)" }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)")}
              >
                <SkipBack size={22} />
              </button>
              <button
                onClick={togglePlay}
                className="brand-glow w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                style={{ background: "var(--emerald)", boxShadow: "0 0 30px var(--emerald-glow)" }}
              >
                {isPlaying ? <Pause size={22} color="var(--brand-on-accent)" fill="var(--brand-on-accent)" /> : <Play size={22} color="var(--brand-on-accent)" fill="var(--brand-on-accent)" style={{ marginLeft: "3px" }} />}
              </button>
              <button onClick={next} style={{ color: "var(--text-secondary)" }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)")}
              >
                <SkipForward size={22} />
              </button>
              <button
                onClick={toggleRepeat}
                style={{ color: repeat ? "var(--emerald)" : "var(--text-muted)" }}
              >
                <Repeat size={18} />
              </button>
            </div>

            {/* Volume + Queue */}
            <div className="flex w-full items-center gap-4">
              {/* Native engine drives software volume; the YouTube IFrame on
                  touch can't, so the slider is hidden there (hardware buttons). */}
              {showVolumeSlider && (
                <>
                  <button onClick={toggleMute} style={{ color: "var(--text-muted)" }}>
                    {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <div className="flex-1 relative">
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--glass-hover)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${muted ? 0 : volume}%`, background: "var(--text-secondary)" }}
                      />
                    </div>
                    <input
                      type="range" min={0} max={100} value={muted ? 0 : volume}
                      onChange={e => setVolume(Number(e.target.value))}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer h-1"
                    />
                  </div>
                </>
              )}
              {!showVolumeSlider && <div className="flex-1" />}
              <button
                onClick={() => setShowQueue(!showQueue)}
                style={{ color: showQueue ? "var(--emerald)" : "var(--text-muted)" }}
              >
                <ListMusic size={16} />
              </button>
            </div>

            {/* Equalizer visualization — gently pulses while playing */}
            <div className="mt-8 hidden h-12 w-full items-end gap-0.5 sm:flex">
              {Array.from({ length: 44 }).map((_, i) => {
                const h = Math.sin(i * 0.4) * 18 + 16;
                const played = i < (44 * progress) / 100;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      height: `${h}px`,
                      transformOrigin: "bottom",
                      background: played ? "var(--emerald)" : "rgba(255,255,255,0.35)",
                      opacity: played ? 0.95 : 0.5,
                      animation: isPlaying ? `eqPulse ${0.7 + (i % 6) * 0.14}s ease-in-out ${i * 0.02}s infinite alternate` : "none",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Queue — bottom sheet on mobile (overlay, swipe to dismiss), side panel on desktop */}
      {showQueue && (
        <div
          className="fixed inset-0 z-[70] lg:hidden"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setShowQueue(false)}
        />
      )}
      {showQueue && (
        <div
          onClick={e => e.stopPropagation()}
          className="fixed inset-x-0 bottom-0 z-[71] flex max-h-[72vh] w-full flex-col rounded-t-2xl
                     lg:static lg:inset-auto lg:z-10 lg:h-full lg:max-h-none lg:w-72 lg:rounded-none"
          style={{
            background: "rgba(10,10,12,0.96)",
            backdropFilter: "blur(20px)",
            borderLeft: "1px solid var(--glass-border)",
            transform: queueDragY ? `translateY(${queueDragY}px)` : undefined,
            transition: queueDragY ? "none" : "transform 0.25s ease",
          }}
        >
          {/* Drag handle (mobile only) */}
          <div
            className="flex items-center justify-between px-5 py-3 lg:py-4"
            style={{ touchAction: "none", cursor: "grab", borderBottom: "1px solid var(--glass-border)" }}
            onPointerDown={startQueueDrag}
          >
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Up Next</h3>
            <button
              className="lg:hidden"
              style={{ color: "var(--text-muted)" }}
              onClick={() => setShowQueue(false)}
              aria-label="Закрыть очередь"
            >
              <ChevronDown size={18} />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto px-3 py-2"
            style={{
              touchAction: "pan-y",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
            {upNext.length === 0 && (
              <p className="text-xs px-3 py-4" style={{ color: "var(--text-muted)" }}>Queue is empty.</p>
            )}
            {upNext.map((track) => (
              <div
                key={track.id}
                onClick={() => play(track, queue)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-bg)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <img src={track.cover} alt={track.title} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{track.title}</p>
                  <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{track.artist}</p>
                </div>
                <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>{track.duration}</span>
                <div onClick={e => e.stopPropagation()}>
                  <TrackMenu track={track} onNavigate={onNavigate} iconSize={13} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes eqPulse {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
