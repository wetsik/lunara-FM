// Self-hosted yt-dlp audio server (see /server). The native engine streams
// audio from here so playback survives backgrounding. Search still uses the
// YouTube Data API; only the audio bytes come from this server.
//
// Override per-build with VITE_AUDIO_SERVER / VITE_AUDIO_TOKEN. The token only
// guards casual abuse of the public URL — it ships in the bundle, so treat the
// server as semi-public (rotate the token on the VPS if it leaks).
const DEFAULT_BASE = "";
const DEFAULT_TOKEN = "";

export const AUDIO_SERVER_BASE =
  ((import.meta as any).env?.VITE_AUDIO_SERVER as string) || DEFAULT_BASE;
export const AUDIO_SERVER_TOKEN =
  ((import.meta as any).env?.VITE_AUDIO_TOKEN as string) ?? DEFAULT_TOKEN;

// Full URL the native player opens for a given YouTube video id.
export function buildStreamUrl(youtubeId: string): string {
  const base = AUDIO_SERVER_BASE.replace(/\/+$/, "");
  const q = AUDIO_SERVER_TOKEN
    ? `?token=${encodeURIComponent(AUDIO_SERVER_TOKEN)}`
    : "";
  return `${base}/stream/${encodeURIComponent(youtubeId)}${q}`;
}
