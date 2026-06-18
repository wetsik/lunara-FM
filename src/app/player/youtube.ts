// Real YouTube Data API integration. Search returns playable tracks,
// enriched with real durations + view counts so the UI shows real data.
import { AUDIO_SERVER_BASE, AUDIO_SERVER_TOKEN } from "./audioServer";

export interface Track {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  artistId?: string; // YouTube channelId, when known
  album?: string;
  cover: string;
  duration: string; // "3:42"
  durationSec: number;
  plays?: string; // "1.2M"
  liked?: boolean;
}

export interface Album {
  id: string; // YouTube playlistId
  title: string;
  artist: string;
  cover: string;
  trackCount?: number;
}

export const YOUTUBE_API_KEY =
  ((import.meta as any).env?.VITE_YOUTUBE_API_KEY as string) || "";

const API = "https://www.googleapis.com/youtube/v3";

// Decode the handful of HTML entities YouTube puts in titles.
function decodeHtml(text = ""): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseISODuration(iso = ""): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);
}

function formatViews(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "";
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

interface SearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    channelId?: string;
    liveBroadcastContent?: string; // "live" | "upcoming" | "none"
    thumbnails?: { medium?: { url: string }; high?: { url: string }; default?: { url: string } };
  };
}

// Normalize a title so near-duplicate uploads of the same song collapse to one
// key: drop "(Official Video)", "[Lyrics]", "feat. ...", emoji, punctuation, etc.
function normalizeTitle(title = ""): string {
  return title
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ") // bracketed tags
    .replace(/\b(official|lyric|lyrics|video|audio|music|hd|hq|4k|mv|m\/v|visualizer|explicit|remaster(ed)?|live|performance)\b/g, " ")
    .replace(/\bfe?a?t\.?\b.*$/g, " ") // feat ... to end
    .replace(/[^\p{L}\p{N}]+/gu, " ") // strip punctuation/emoji
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeArtist(artist = ""): string {
  return artist
    .toLowerCase()
    .replace(/\b(vevo|official|topic|music|records|tv)\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Collapse duplicate tracks (same song re-uploaded by many channels). Keeps the
// first occurrence, which is the most relevant per YouTube's ranking.
export function dedupeTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const out: Track[] = [];
  for (const t of tracks) {
    const titleKey = normalizeTitle(t.title);
    // Key on title + artist; if title alone is distinctive enough keep it loose.
    const key = `${normalizeArtist(t.artist)}::${titleKey}`;
    if (!titleKey || seen.has(key) || seen.has(t.youtubeId)) continue;
    seen.add(key);
    seen.add(t.youtubeId);
    out.push(t);
  }
  return out;
}

// Telltale Shorts markers in the title or channel name: the #shorts hashtag,
// the word "Shorts" (incl. channels like "ViralMusicShorts"), or Reels/TikTok.
// We match "shorts" (plural) / "reels" (plural) / "tiktok" only — singular
// "short"/"reel" is left alone so songs like "Short Change Hero" or "Reel
// Around the Fountain" are kept.
function looksLikeShort(title = "", channel = ""): boolean {
  return /#\s?(yt)?shorts?\b|shorts\b|\breels\b|\btiktok\b/i.test(`${title} ${channel}`);
}

// Shorts cap at 3 min, so only tracks up to that need the reliable check.
const SHORTS_CHECK_MAX_SECONDS = 180;

// Ask the audio server which ids are actually Shorts (it checks the
// youtube.com/shorts/<id> redirect — a real Short stays, a video redirects to
// /watch). This is the authoritative check; works on web + native now that the
// server is HTTPS. Best-effort: any failure leaves the list untouched.
async function filterShortsViaServer(tracks: Track[], signal?: AbortSignal): Promise<Track[]> {
  const candidates = tracks.filter(
    (t) => !t.durationSec || t.durationSec <= SHORTS_CHECK_MAX_SECONDS
  );
  if (!candidates.length) return tracks;
  try {
    const base = AUDIO_SERVER_BASE.replace(/\/+$/, "");
    const token = AUDIO_SERVER_TOKEN ? `&token=${encodeURIComponent(AUDIO_SERVER_TOKEN)}` : "";
    const ids = candidates.map((t) => t.youtubeId).join(",");
    const res = await fetch(`${base}/shorts?ids=${encodeURIComponent(ids)}${token}`, { signal });
    if (!res.ok) return tracks;
    const data = await res.json();
    const shorts = new Set<string>(Array.isArray(data.shorts) ? data.shorts : []);
    return shorts.size ? tracks.filter((t) => !shorts.has(t.youtubeId)) : tracks;
  } catch {
    return tracks; // best-effort — never block search on this
  }
}

// Real songs run ~45s–10min. Longer = a mix / "1 hour" compilation; much
// shorter = a Short / status clip. The floor is intentionally low (45s) so real
// short songs (incl. ~1 min) are kept; tagged Shorts are dropped by title and,
// on native, by the precise server check.
const MAX_TRACK_SECONDS = 600; // 10 minutes
const MIN_TRACK_SECONDS = 45; // below this it's a clip/Short, not a song

// Drop compilations/mixes (too long) and obvious clips/Shorts (too short). When
// `strict` is set (we successfully fetched durations), also drop tracks with no
// real duration — these are live radio streams that would render a blank "—"
// time. When enrichment failed, durations are unknown for everyone, so we keep
// them.
function filterByDuration(tracks: Track[], strict: boolean): Track[] {
  return tracks.filter((t) => {
    if (t.durationSec) {
      return t.durationSec >= MIN_TRACK_SECONDS && t.durationSec <= MAX_TRACK_SECONDS;
    }
    return !strict;
  });
}

// Fetch real video durations + view counts in a single batched request.
async function enrich(ids: string[], signal?: AbortSignal) {
  if (ids.length === 0) return new Map<string, { durationSec: number; plays: string }>();
  const res = await fetch(
    `${API}/videos?part=contentDetails,statistics&id=${ids.join(",")}&key=${YOUTUBE_API_KEY}`,
    { signal }
  );
  const data = await res.json();
  const map = new Map<string, { durationSec: number; plays: string }>();
  (data.items || []).forEach((item: any) => {
    map.set(item.id, {
      durationSec: parseISODuration(item.contentDetails?.duration),
      plays: formatViews(Number(item.statistics?.viewCount || 0)),
    });
  });
  return map;
}

// "Wave" / radio: similar songs for a seed track, from YouTube's own Mix
// playlist (served by our /radio endpoint). Used to autoplay similar music
// instead of marching through the search list. Best-effort: [] on failure.
export async function fetchRadio(youtubeId: string, signal?: AbortSignal): Promise<Track[]> {
  if (!youtubeId) return [];
  try {
    const base = AUDIO_SERVER_BASE.replace(/\/+$/, "");
    const token = AUDIO_SERVER_TOKEN ? `&token=${encodeURIComponent(AUDIO_SERVER_TOKEN)}` : "";
    const res = await fetch(`${base}/radio?id=${encodeURIComponent(youtubeId)}&limit=30${token}`, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    const items: any[] = Array.isArray(data.tracks) ? data.tracks : [];
    return items
      .filter((it) => it && it.id)
      .map((it) => ({
        id: it.id,
        youtubeId: it.id,
        title: decodeHtml(it.title || "Unknown"),
        artist: decodeHtml(it.artist || ""),
        cover: `https://i.ytimg.com/vi/${it.id}/mqdefault.jpg`,
        duration: it.duration ? formatDuration(it.duration) : "—",
        durationSec: Number(it.duration) || 0,
        plays: "",
      } as Track));
  } catch {
    return [];
  }
}

export async function searchTracks(
  query: string,
  limit = 20,
  signal?: AbortSignal
): Promise<Track[]> {
  if (!query.trim()) return [];
  // Over-fetch so that, after dropping long mixes/compilations, we still have
  // roughly `limit` real tracks left.
  const fetchCount = Math.min(50, Math.max(limit, limit * 2));
  const res = await fetch(
    `${API}/search?part=snippet&q=${encodeURIComponent(
      query
    )}&key=${YOUTUBE_API_KEY}&maxResults=${fetchCount}&type=video&videoCategoryId=10`,
    { signal }
  );
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error?.message || "YouTube API error");
  }
  const items: SearchItem[] = data.items || [];
  const base = items
    .filter((item) => item.id?.videoId)
    // Skip live radio / upcoming premieres — they have no real track length.
    .filter((item) => !item.snippet.liveBroadcastContent || item.snippet.liveBroadcastContent === "none")
    // Drop YouTube Shorts: tagged (#shorts) or named (…Shorts / Reels / TikTok)
    // in the title or channel. The duration floor catches the rest.
    .filter((item) => !looksLikeShort(item.snippet.title, item.snippet.channelTitle))
    .map((item) => {
      const t = item.snippet.thumbnails;
      return {
        id: item.id.videoId,
        youtubeId: item.id.videoId,
        title: decodeHtml(item.snippet.title),
        artist: decodeHtml(item.snippet.channelTitle),
        artistId: item.snippet.channelId,
        cover: t?.medium?.url || t?.high?.url || t?.default?.url || "",
        duration: "—",
        durationSec: 0,
        plays: "",
      } as Track;
    });

  let enriched = false;
  try {
    const meta = await enrich(base.map((b) => b.id), signal);
    enriched = true;
    base.forEach((track) => {
      const m = meta.get(track.id);
      if (m) {
        track.durationSec = m.durationSec;
        track.duration = formatDuration(m.durationSec);
        track.plays = m.plays;
      }
    });
  } catch {
    // Enrichment is best-effort; tracks are still playable without it.
  }

  const result = dedupeTracks(filterByDuration(base, enriched)).slice(0, limit);
  return filterShortsViaServer(result, signal);
}

// --- Albums (modeled as YouTube playlists) ---------------------------------

interface PlaylistSearchItem {
  id: { playlistId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails?: { medium?: { url: string }; high?: { url: string }; default?: { url: string } };
  };
}

// Find "albums" for an artist by searching playlists. Not perfect (YouTube has
// no real album metadata in the public API), but gives a believable discography.
export async function searchAlbums(
  artist: string,
  limit = 12,
  signal?: AbortSignal
): Promise<Album[]> {
  if (!artist.trim()) return [];
  const res = await fetch(
    `${API}/search?part=snippet&q=${encodeURIComponent(
      `${artist} album`
    )}&key=${YOUTUBE_API_KEY}&maxResults=${limit}&type=playlist`,
    { signal }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error?.message || "YouTube API error");
  const items: PlaylistSearchItem[] = data.items || [];
  return items
    .filter((item) => item.id?.playlistId)
    .map((item) => {
      const t = item.snippet.thumbnails;
      return {
        id: item.id.playlistId,
        title: decodeHtml(item.snippet.title),
        artist: decodeHtml(item.snippet.channelTitle),
        cover: t?.medium?.url || t?.high?.url || t?.default?.url || "",
      } as Album;
    });
}

interface PlaylistItem {
  snippet: {
    title: string;
    videoOwnerChannelTitle?: string;
    channelTitle?: string;
    thumbnails?: { medium?: { url: string }; high?: { url: string }; default?: { url: string } };
    resourceId?: { videoId?: string };
  };
}

// Fetch the tracks inside a playlist ("album").
export async function getPlaylistTracks(
  playlistId: string,
  limit = 50,
  signal?: AbortSignal
): Promise<Track[]> {
  if (!playlistId) return [];
  const res = await fetch(
    `${API}/playlistItems?part=snippet&playlistId=${encodeURIComponent(
      playlistId
    )}&key=${YOUTUBE_API_KEY}&maxResults=${limit}`,
    { signal }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error?.message || "YouTube API error");
  const items: PlaylistItem[] = data.items || [];
  const base = items
    .filter((item) => item.snippet?.resourceId?.videoId)
    // Deleted/private videos come back with placeholder titles.
    .filter((item) => item.snippet.title && item.snippet.title !== "Deleted video" && item.snippet.title !== "Private video")
    .map((item) => {
      const t = item.snippet.thumbnails;
      const vid = item.snippet.resourceId!.videoId!;
      return {
        id: vid,
        youtubeId: vid,
        title: decodeHtml(item.snippet.title),
        artist: decodeHtml(item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle || ""),
        cover: t?.medium?.url || t?.high?.url || t?.default?.url || "",
        duration: "—",
        durationSec: 0,
        plays: "",
      } as Track;
    });

  let enriched = false;
  try {
    const meta = await enrich(base.map((b) => b.id), signal);
    enriched = true;
    base.forEach((track) => {
      const m = meta.get(track.id);
      if (m) {
        track.durationSec = m.durationSec;
        track.duration = formatDuration(m.durationSec);
        track.plays = m.plays;
      }
    });
  } catch {
    /* best-effort enrichment */
  }

  return filterByDuration(base, enriched);
}

export { formatDuration, formatViews };
