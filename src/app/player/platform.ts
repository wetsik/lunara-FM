import { Capacitor } from "@capacitor/core";
import type { Track } from "./youtube";

// Coarse pointer == touch device (phone/tablet, incl. the Capacitor WebView).
// Used to hide the volume slider, which the YouTube IFrame engine can't drive
// on mobile — there, volume is owned by the hardware buttons.
export const isCoarsePointer =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

// Lightweight transient toast (no dependency / no mounted provider needed).
function showToast(message: string) {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = message;
  el.style.cssText =
    "position:fixed;left:50%;bottom:96px;transform:translateX(-50%);" +
    "background:#141416;color:#fafafa;border:1px solid rgba(255,255,255,0.12);" +
    "padding:10px 16px;border-radius:12px;font-size:13px;z-index:99999;" +
    "box-shadow:0 8px 28px rgba(0,0,0,0.55);opacity:0;transition:opacity .2s;pointer-events:none;";
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = "1"; });
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 250); }, 1800);
}

// Share a track:
//  • Native app  → Capacitor Share plugin (real Android share sheet).
//  • Mobile web  → navigator.share (proper bottom sheet).
//  • Desktop web → copy link + toast. We deliberately avoid navigator.share on
//    desktop because it triggers the OS share dialog, which on Windows often
//    hangs on a blank loading panel.
export async function shareTrack(track: Track | null): Promise<void> {
  if (!track) return;
  const url = `https://youtu.be/${track.youtubeId}`;
  const text = `${track.title} — ${track.artist}`;

  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: track.title, text, url, dialogTitle: "Поделиться треком" });
      return;
    } catch {
      /* plugin unavailable or user cancelled — fall through */
    }
  } else if (isCoarsePointer && typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: track.title, text, url });
      return;
    } catch {
      return; // user dismissed the sheet
    }
  }

  // Desktop web (and any fallback): copy the link.
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      showToast("Ссылка на трек скопирована");
      return;
    }
  } catch {
    /* clipboard blocked — show the link instead */
  }
  showToast(url);
}
