import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { searchTracks, fetchRadio, type Track } from "./youtube";
import { isNativeAudio, nativeAudio } from "./nativeAudio";
import { buildStreamUrl } from "./audioServer";

export type { Track, Album } from "./youtube";

export interface Playlist {
  id: string;
  title: string;
  description: string;
  cover: string;
  tracks: Track[];
  createdAt: string;
  pinned?: boolean; // pinned playlists are shown in the desktop sidebar
}

export interface LikedArtist {
  id: string;
  name: string;
  image?: string;
}

interface HistoryTrack extends Track {
  playedAt?: string;
}

interface PlayerState {
  // playback
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: boolean;
  ready: boolean;
  // queue
  queue: Track[];
  // data
  discovery: Track[];
  discoveryLoading: boolean;
  searchResults: Track[];
  searchLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  history: HistoryTrack[];
  liked: Track[];
  disliked: Track[];
  likedArtists: LikedArtist[];
  playlists: Playlist[];
  // actions
  play: (track: Track, queue?: Track[]) => void;
  playStation: (track: Track) => void;
  playSmartMix: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleLike: (track: Track) => void;
  isLiked: (id: string) => boolean;
  toggleDislike: (track: Track) => void;
  isDisliked: (id: string) => boolean;
  toggleArtistLike: (artist: LikedArtist) => void;
  isArtistLiked: (id: string) => boolean;
  runSearch: (query: string) => void;
  clearSearch: () => void;
  createPlaylist: (title: string) => Playlist;
  addToPlaylist: (playlistId: string, track: Track) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  reorderPlaylist: (playlistId: string, from: number, to: number) => void;
  deletePlaylist: (playlistId: string) => void;
  togglePinPlaylist: (playlistId: string) => void;
  formatTime: (sec: number) => string;
}

const PlayerContext = createContext<PlayerState | null>(null);

const STORAGE_KEY = "lunaraMusicState";

const DISCOVERY_QUERIES = [
  "trending music 2024",
  "top hits",
  "pop music",
  "hip hop music",
  "electronic dance music",
  "r&b music",
];

function formatTime(sec = 0): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    WestForgePlayerBridge?: {
      updatePlayer: (title: string, artist: string, coverUrl: string, playing: boolean) => void;
      hidePlayer: () => void;
    };
    __westForgeNativeMediaAction?: (action: string) => void;
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(72);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [ready, setReady] = useState(false);

  // On Android we drive a native ExoPlayer (background-safe). On web we keep
  // the YouTube IFrame engine. Decided once; the native bridge is injected
  // before the page's JS runs.
  const [useNative] = useState(() => isNativeAudio());

  const [queue, setQueue] = useState<Track[]>([]);
  const [discovery, setDiscovery] = useState<Track[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [history, setHistory] = useState<HistoryTrack[]>([]);
  const [liked, setLiked] = useState<Track[]>([]);
  const [disliked, setDisliked] = useState<Track[]>([]);
  const [likedArtists, setLikedArtists] = useState<LikedArtist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const playerRef = useRef<any>(null);
  const apiReadyRef = useRef(false);
  const [apiReady, setApiReady] = useState(false);
  const volumeRef = useRef(volume);
  const repeatRef = useRef(repeat);
  const queueRef = useRef<Track[]>([]);
  const currentIdRef = useRef<string | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const nativeActionHandlersRef = useRef<Record<string, () => void>>({});
  const pendingPlayRef = useRef<Track | null>(null);
  // A restored track waiting to be cued into the YouTube engine once it's ready.
  const needsCueRef = useRef<Track | null>(null);
  // Native engine: which queue index is loaded, and youtubeIds that failed to
  // stream (dead/region-locked uploads) so we don't retry them in a loop.
  const currentNativeIndexRef = useRef(0);
  const failedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentIdRef.current = currentTrack?.id ?? null; }, [currentTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // --- persistence ---------------------------------------------------------
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        setHistory(s.history || []);
        setLiked(s.liked || []);
        setDisliked(s.disliked || []);
        setLikedArtists(s.likedArtists || []);
        setPlaylists(s.playlists || []);
        if (typeof s.volume === "number") setVolumeState(s.volume);
        // Restore the last track + queue so the player bar shows it on launch.
        // It is cued (loaded, not auto-played) once the engine is ready.
        if (s.currentTrack) {
          setCurrentTrack(s.currentTrack);
          needsCueRef.current = s.currentTrack;
          if (typeof s.currentTrack.durationSec === "number") setDuration(s.currentTrack.durationSec);
        }
        if (Array.isArray(s.queue) && s.queue.length) setQueue(s.queue);
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ history, liked, disliked, likedArtists, playlists, volume, currentTrack, queue })
      );
    } catch {
      /* ignore quota errors */
    }
  }, [history, liked, disliked, likedArtists, playlists, volume, currentTrack, queue]);

  // --- YouTube IFrame API --------------------------------------------------
  useEffect(() => {
    if (useNative) return; // native engine handles playback
    if (window.YT && window.YT.Player) {
      apiReadyRef.current = true;
      setApiReady(true);
      return;
    }
    const id = "youtube-iframe-api";
    if (!document.getElementById(id)) {
      const script = document.createElement("script");
      script.id = id;
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      apiReadyRef.current = true;
      setApiReady(true);
    };
  }, []);

  const advance = useRef<() => void>(() => {});

  useEffect(() => {
    if (useNative || !apiReady || playerRef.current) return;
    const el = document.getElementById("yt-player-target");
    if (!el) return;

    playerRef.current = new window.YT.Player("yt-player-target", {
      height: "100%",
      width: "100%",
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        fs: 0,
        iv_load_policy: 3,
      },
      events: {
        onReady: (e: any) => {
          setReady(true);
          e.target.setVolume(volumeRef.current);
        },
        onStateChange: (e: any) => {
          const PS = window.YT?.PlayerState;
          if (!PS) return;
          if (e.data === PS.PLAYING) {
            setIsPlaying(true);
            const d = e.target.getDuration();
            if (Number.isFinite(d) && d > 0) setDuration(d);
          } else if (e.data === PS.PAUSED) {
            setIsPlaying(false);
          } else if (e.data === PS.ENDED) {
            if (repeatRef.current && playerRef.current && currentIdRef.current) {
              playerRef.current.seekTo(0, true);
              playerRef.current.playVideo();
            } else {
              advance.current();
            }
          }
        },
      },
    });

    return () => {
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [apiReady]);

  // progress ticker
  useEffect(() => {
    if (useNative || !ready || !isPlaying) return;
    const timer = window.setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== "function") return;
      const t = p.getCurrentTime();
      const d = p.getDuration();
      if (Number.isFinite(t)) setCurrentTime(t);
      if (Number.isFinite(d) && d > 0) setDuration(d);
    }, 500);
    return () => window.clearInterval(timer);
  }, [ready, isPlaying]);

  // Cue (load without playing) the restored track once the engine is ready, so
  // the user can resume it with one tap on launch.
  useEffect(() => {
    if (useNative) return;
    if (ready && needsCueRef.current && playerRef.current?.cueVideoById) {
      const t = needsCueRef.current;
      needsCueRef.current = null;
      try {
        playerRef.current.cueVideoById(t.youtubeId);
        if (t.durationSec) setDuration(t.durationSec);
      } catch {
        /* engine not ready yet — ignore */
      }
    }
  }, [ready]);

  // Mobile WebView can initialize the YouTube iframe after the user already
  // tapped a track. Keep that first play request and replay it once ready.
  useEffect(() => {
    if (useNative) return;
    if (!ready || !pendingPlayRef.current || !playerRef.current?.loadVideoById) return;
    const track = pendingPlayRef.current;
    pendingPlayRef.current = null;
    playerRef.current.loadVideoById(track.youtubeId);
    playerRef.current.playVideo();
  }, [ready]);

  // --- native engine (Android) --------------------------------------------
  const buildNativeItems = (list: Track[]) =>
    list.map((t) => ({
      url: buildStreamUrl(t.youtubeId),
      title: t.title,
      artist: t.artist,
      artwork: t.cover || "",
    }));

  // A track can fail to stream because that specific YouTube upload is dead /
  // region-locked (common with "- Topic" Art Tracks). Rather than just skip,
  // search for another upload of the same song and swap it in.
  const recoverFromNativeError = async () => {
    const list = queueRef.current;
    const idx = currentNativeIndexRef.current;
    const failed = list[idx];
    if (!failed || failedIdsRef.current.has(failed.youtubeId)) {
      nativeAudio.skipNext();
      return;
    }
    failedIdsRef.current.add(failed.youtubeId);
    try {
      const artist = failed.artist.replace(/\s*-\s*Topic$/i, "").trim();
      const results = await searchTracks(`${artist} ${failed.title}`, 6);
      const alt = results.find(
        (r) => r.youtubeId !== failed.youtubeId && !failedIdsRef.current.has(r.youtubeId)
      );
      if (alt) {
        const newList = [...list];
        // Keep the displayed title/artist; swap in the playable upload's id.
        newList[idx] = { ...failed, youtubeId: alt.youtubeId, cover: failed.cover || alt.cover };
        queueRef.current = newList;
        setQueue(newList);
        nativeAudio.setQueue(buildNativeItems(newList), idx, true);
        return;
      }
    } catch {
      /* search failed — fall through to skip */
    }
    nativeAudio.skipNext();
  };

  // Drive React state from native player events.
  useEffect(() => {
    if (!useNative) return;
    setReady(true);
    const unsub = nativeAudio.subscribe((e) => {
      if (e.type === "state") {
        setIsPlaying(e.playing);
      } else if (e.type === "time") {
        if (Number.isFinite(e.position)) setCurrentTime(e.position);
        if (Number.isFinite(e.duration) && e.duration > 0) setDuration(e.duration);
      } else if (e.type === "track") {
        currentNativeIndexRef.current = e.index;
        const t = queueRef.current[e.index];
        if (t) {
          setCurrentTrack(t);
          if (t.durationSec) setDuration(t.durationSec);
          setHistory((prev) => {
            const next = [
              { ...t, playedAt: new Date().toISOString() },
              ...prev.filter((x) => x.id !== t.id),
            ];
            return next.slice(0, 50);
          });
        }
      } else if (e.type === "ended") {
        setIsPlaying(false);
      } else if (e.type === "error") {
        recoverFromNativeError();
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useNative]);

  // Restore the last track/queue into the native engine on launch (paused),
  // so the player bar shows it and one tap resumes.
  useEffect(() => {
    if (!useNative || !ready) return;
    const t = needsCueRef.current;
    if (!t) return;
    needsCueRef.current = null;
    const list = queueRef.current.length ? queueRef.current : [t];
    const idx = Math.max(0, list.findIndex((x) => x.id === t.id));
    nativeAudio.setQueue(buildNativeItems(list), idx, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useNative, ready]);

  // --- discovery feed ------------------------------------------------------
  useEffect(() => {
    const controller = new AbortController();
    const seed = DISCOVERY_QUERIES[Math.floor(Math.random() * DISCOVERY_QUERIES.length)];
    setDiscoveryLoading(true);
    searchTracks(seed, 20, controller.signal)
      .then((r) => setDiscovery(r))
      .catch((err) => {
        if (err?.name !== "AbortError") console.error("Discovery error:", err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDiscoveryLoading(false);
      });
    return () => controller.abort();
  }, []);

  // --- actions -------------------------------------------------------------
  const loadAndPlay = (track: Track) => {
    if (playerRef.current && ready) {
      playerRef.current.loadVideoById(track.youtubeId);
      playerRef.current.playVideo();
    } else {
      pendingPlayRef.current = track;
    }
    setCurrentTime(0);
    setDuration(track.durationSec || 0);
  };

  const play = (track: Track, list?: Track[]) => {
    const q = list && list.length ? list : [track];
    queueRef.current = q; // sync now so native 'track' events map correctly
    setCurrentTrack(track);
    setIsPlaying(true);
    setQueue(q);
    setHistory((prev) => {
      const next = [
        { ...track, playedAt: new Date().toISOString() },
        ...prev.filter((t) => t.id !== track.id),
      ];
      return next.slice(0, 50);
    });
    if (useNative) {
      const idx = Math.max(0, q.findIndex((t) => t.id === track.id));
      currentNativeIndexRef.current = idx;
      nativeAudio.setQueue(buildNativeItems(q), idx, true);
    } else {
      loadAndPlay(track);
    }
  };

  // Tap a single song to start a "wave": play it now, then queue similar songs
  // (YouTube Mix) behind it, so "next" plays similar music instead of marching
  // through the browse/search list.
  const playStation = (track: Track) => {
    play(track, [track]);
    fetchRadio(track.youtubeId)
      .then((similar) => {
        if (currentIdRef.current !== track.id) return; // user moved on
        const seen = new Set<string>([track.youtubeId]);
        const wave = similar.filter(
          (t) => t.youtubeId && !seen.has(t.youtubeId) && (seen.add(t.youtubeId), true)
        );
        if (!wave.length) return;
        const q = [track, ...wave];
        queueRef.current = q;
        setQueue(q);
        if (useNative) nativeAudio.appendQueue(buildNativeItems(wave));
      })
      .catch(() => {
        /* best-effort — keep the single track if the wave fails */
      });
  };

  const playIndex = (idx: number) => {
    const list = queueRef.current;
    if (!list.length) return;
    const i = ((idx % list.length) + list.length) % list.length;
    const track = list[i];
    setCurrentTrack(track);
    setIsPlaying(true);
    setHistory((prev) => {
      const next = [
        { ...track, playedAt: new Date().toISOString() },
        ...prev.filter((t) => t.id !== track.id),
      ];
      return next.slice(0, 50);
    });
    if (useNative) {
      currentNativeIndexRef.current = i;
      nativeAudio.setIndex(i);
    } else {
      loadAndPlay(track);
    }
  };

  const next = () => {
    if (useNative) {
      nativeAudio.skipNext();
      return;
    }
    const list = queueRef.current;
    if (!list.length) return;
    const cur = list.findIndex((t) => t.id === currentIdRef.current);
    if (shuffle) {
      playIndex(Math.floor(Math.random() * list.length));
    } else {
      playIndex(cur + 1);
    }
  };
  advance.current = next;

  const prev = () => {
    if (currentTime > 3) {
      if (useNative) nativeAudio.seekTo(0);
      else if (playerRef.current) playerRef.current.seekTo(0, true);
      setCurrentTime(0);
      return;
    }
    if (useNative) {
      nativeAudio.skipPrev();
      return;
    }
    const list = queueRef.current;
    if (!list.length) return;
    const cur = list.findIndex((t) => t.id === currentIdRef.current);
    playIndex(cur - 1);
  };

  const togglePlay = () => {
    if (!useNative && !playerRef.current) return;
    if (isPlaying) {
      if (useNative) nativeAudio.pause();
      else playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      if (!currentTrack && queueRef.current[0]) {
        play(queueRef.current[0], queueRef.current);
        return;
      }
      if (useNative) nativeAudio.play();
      else playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const seek = (sec: number) => {
    if (!Number.isFinite(sec)) return;
    if (useNative) {
      nativeAudio.seekTo(sec);
      setCurrentTime(sec);
      return;
    }
    if (!playerRef.current) return;
    playerRef.current.seekTo(sec, true);
    setCurrentTime(sec);
  };

  const setVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setVolumeState(clamped);
    if (clamped > 0) setMuted(false);
    if (useNative) nativeAudio.setVolume(clamped / 100);
    else if (playerRef.current) playerRef.current.setVolume(clamped);
  };

  const toggleMute = () => {
    setMuted((m) => {
      const nextMuted = !m;
      if (useNative) {
        nativeAudio.setVolume(nextMuted ? 0 : volumeRef.current / 100);
      } else if (playerRef.current) {
        if (nextMuted) playerRef.current.mute();
        else {
          playerRef.current.unMute();
          playerRef.current.setVolume(volumeRef.current);
        }
      }
      return nextMuted;
    });
  };

  const toggleShuffle = () =>
    setShuffle((s) => {
      const n = !s;
      if (useNative) nativeAudio.setShuffle(n);
      return n;
    });
  const toggleRepeat = () =>
    setRepeat((r) => {
      const n = !r;
      if (useNative) nativeAudio.setRepeat(n ? 1 : 0);
      return n;
    });

  const isLiked = (id: string) => liked.some((t) => t.id === id);

  const toggleLike = (track: Track) => {
    setLiked((prev) =>
      prev.some((t) => t.id === track.id)
        ? prev.filter((t) => t.id !== track.id)
        : [{ ...track }, ...prev]
    );
    // Liking something clears a previous dislike.
    setDisliked((prev) => prev.filter((t) => t.id !== track.id));
  };

  const isDisliked = (id: string) => disliked.some((t) => t.id === id);

  const toggleDislike = (track: Track) => {
    const willDislike = !disliked.some((t) => t.id === track.id);
    setDisliked((prev) =>
      willDislike
        ? [{ ...track }, ...prev].slice(0, 200)
        : prev.filter((t) => t.id !== track.id)
    );
    if (willDislike) {
      // A disliked track shouldn't stay liked, and shouldn't keep playing.
      setLiked((prev) => prev.filter((t) => t.id !== track.id));
      if (currentIdRef.current === track.id) next();
    }
  };

  const isArtistLiked = (id: string) => likedArtists.some((a) => a.id === id);

  const toggleArtistLike = (artist: LikedArtist) => {
    setLikedArtists((prev) =>
      prev.some((a) => a.id === artist.id)
        ? prev.filter((a) => a.id !== artist.id)
        : [{ ...artist }, ...prev]
    );
  };

  // Build a personalized shuffle from your taste: liked tracks + listening
  // history, expanded with fresh results seeded by a favorite artist/genre.
  const playSmartMix = () => {
    const seedPool = liked.length ? liked : history.length ? history : discovery;
    const seedArtist =
      likedArtists[0]?.name ||
      seedPool[Math.floor(Math.random() * Math.max(1, seedPool.length))]?.artist ||
      DISCOVERY_QUERIES[Math.floor(Math.random() * DISCOVERY_QUERIES.length)];

    const dedupe = (list: Track[]) => {
      const seen = new Set<string>();
      return list.filter((t) => {
        if (!t || seen.has(t.id) || disliked.some((d) => d.id === t.id)) return false;
        seen.add(t.id);
        return true;
      });
    };
    const shuffleList = (list: Track[]) => {
      const a = [...list];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const startMix = (extra: Track[]) => {
      const pool = shuffleList(dedupe([...liked, ...history, ...extra, ...discovery]));
      if (!pool.length) return;
      setShuffle(true);
      play(pool[0], pool);
    };

    searchTracks(seedArtist, 25)
      .then((fresh) => startMix(fresh))
      .catch(() => startMix([]));
  };

  const searchAbort = useRef<AbortController | null>(null);

  const runSearch = (query: string) => {
    searchAbort.current?.abort();
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    const controller = new AbortController();
    searchAbort.current = controller;
    setSearchLoading(true);
    searchTracks(query, 25, controller.signal)
      .then((r) => setSearchResults(r))
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.error("Search error:", err);
          setSearchResults([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearchLoading(false);
      });
  };

  const clearSearch = () => {
    searchAbort.current?.abort();
    setSearchResults([]);
    setSearchLoading(false);
  };

  // Debounced live search driven by the shared query.
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      clearSearch();
      return;
    }
    const t = setTimeout(() => runSearch(q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const createPlaylist = (title: string): Playlist => {
    const pl: Playlist = {
      id: `pl-${Date.now()}`,
      title: title.trim() || "New Playlist",
      description: "Your playlist",
      cover: "",
      tracks: [],
      createdAt: new Date().toISOString(),
    };
    setPlaylists((prev) => [pl, ...prev]);
    return pl;
  };

  const addToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.tracks.some((t) => t.id === track.id)) return pl;
        return {
          ...pl,
          tracks: [track, ...pl.tracks],
          cover: pl.cover || track.cover,
        };
      })
    );
  };

  const removeFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        const tracks = pl.tracks.filter((t) => t.id !== trackId);
        // Keep the cover in sync if the cover track was removed.
        const cover = pl.cover && !tracks.some((t) => t.cover === pl.cover)
          ? tracks[0]?.cover || ""
          : pl.cover;
        return { ...pl, tracks, cover };
      })
    );
  };

  const reorderPlaylist = (playlistId: string, from: number, to: number) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        const n = pl.tracks.length;
        if (from === to || from < 0 || to < 0 || from >= n || to >= n) return pl;
        const tracks = [...pl.tracks];
        const [moved] = tracks.splice(from, 1);
        tracks.splice(to, 0, moved);
        return { ...pl, tracks };
      })
    );
  };

  const deletePlaylist = (playlistId: string) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
  };

  const togglePinPlaylist = (playlistId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => (pl.id === playlistId ? { ...pl, pinned: !pl.pinned } : pl))
    );
  };

  // Hide disliked tracks from discovery + search so they stop resurfacing.
  const visibleDiscovery = useMemo(
    () => discovery.filter((t) => !disliked.some((d) => d.id === t.id)),
    [discovery, disliked]
  );
  const visibleSearchResults = useMemo(
    () => searchResults.filter((t) => !disliked.some((d) => d.id === t.id)),
    [searchResults, disliked]
  );

  useEffect(() => {
    nativeActionHandlersRef.current = {
      playPause: togglePlay,
      next,
      previous: prev,
      pause: () => {
        if (isPlayingRef.current) togglePlay();
      },
    };
  });

  useEffect(() => {
    window.__westForgeNativeMediaAction = (action: string) => {
      nativeActionHandlersRef.current[action]?.();
    };

    return () => {
      delete window.__westForgeNativeMediaAction;
    };
  }, []);

  useEffect(() => {
    if (useNative) return; // native MediaSession owns the notification
    const bridge = window.WestForgePlayerBridge;
    if (!bridge) return;

    if (!currentTrack) {
      bridge.hidePlayer();
      return;
    }

    bridge.updatePlayer(
      currentTrack.title,
      currentTrack.artist,
      currentTrack.cover || "",
      isPlaying
    );
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (useNative) return; // native MediaSession handles lockscreen controls
    if (!("mediaSession" in navigator)) return;

    if (currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        artwork: currentTrack.cover
          ? [
              { src: currentTrack.cover, sizes: "96x96", type: "image/jpeg" },
              { src: currentTrack.cover, sizes: "512x512", type: "image/jpeg" },
            ]
          : [],
      });
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }

    navigator.mediaSession.setActionHandler("play", () => {
      if (!isPlayingRef.current) togglePlay();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      if (isPlayingRef.current) togglePlay();
    });
    navigator.mediaSession.setActionHandler("previoustrack", prev);
    navigator.mediaSession.setActionHandler("nexttrack", next);
  }, [currentTrack, isPlaying]);

  const value = useMemo<PlayerState>(
    () => ({
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      ready,
      queue,
      discovery: visibleDiscovery,
      discoveryLoading,
      searchResults: visibleSearchResults,
      searchLoading,
      searchQuery,
      setSearchQuery,
      history,
      liked,
      disliked,
      likedArtists,
      playlists,
      play,
      playStation,
      playSmartMix,
      togglePlay,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      toggleRepeat,
      toggleLike,
      isLiked,
      toggleDislike,
      isDisliked,
      toggleArtistLike,
      isArtistLiked,
      runSearch,
      clearSearch,
      createPlaylist,
      addToPlaylist,
      removeFromPlaylist,
      reorderPlaylist,
      deletePlaylist,
      togglePinPlaylist,
      formatTime,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      currentTrack, isPlaying, currentTime, duration, volume, muted, shuffle,
      repeat, ready, queue, visibleDiscovery, discoveryLoading, visibleSearchResults,
      searchLoading, searchQuery, history, liked, disliked, likedArtists, playlists,
    ]
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* Keep the YouTube engine rendered in WebView; fully offscreen iframes
          are often throttled on Android and can fail to start audio. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          width: 160,
          height: 90,
          left: 0,
          bottom: 0,
          opacity: 0.01,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        <div id="yt-player-target" />
      </div>
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
