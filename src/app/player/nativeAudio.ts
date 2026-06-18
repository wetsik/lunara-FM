// Thin typed wrapper over the native Android audio engine (Media3 ExoPlayer +
// MediaSessionService), exposed to the WebView as `window.WestForgeNative`.
// On web / non-native, `available()` is false and PlayerContext keeps using the
// YouTube IFrame engine.
import { Capacitor } from "@capacitor/core";

export interface NativeQueueItem {
  url: string; // full /stream URL from buildStreamUrl
  title: string;
  artist: string;
  artwork: string;
}

export type AudioEvent =
  | { type: "state"; playing: boolean }
  | { type: "time"; position: number; duration: number } // seconds
  | { type: "track"; index: number } // index within the queue we last sent
  | { type: "ended" }
  | { type: "error"; message?: string };

interface NativeBridge {
  setQueue(json: string, startIndex: number, autoplay: boolean): void;
  appendQueue(json: string): void;
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  skipNext(): void;
  skipPrev(): void;
  setIndex(index: number): void;
  setRepeat(mode: number): void; // 0 off · 1 one · 2 all
  setShuffle(enabled: boolean): void;
  setVolume(v: number): void; // 0..1
  stop(): void;
}

declare global {
  interface Window {
    WestForgeNative?: NativeBridge;
    __westForgeAudioEvent?: (json: string) => void;
  }
}

type Listener = (e: AudioEvent) => void;
const listeners = new Set<Listener>();

if (typeof window !== "undefined") {
  // The native side calls this with a JSON string for every player event.
  window.__westForgeAudioEvent = (json: string) => {
    try {
      const e = JSON.parse(json) as AudioEvent;
      listeners.forEach((l) => l(e));
    } catch {
      /* ignore malformed event */
    }
  };
}

const bridge = (): NativeBridge | undefined =>
  typeof window !== "undefined" ? window.WestForgeNative : undefined;

export function isNativeAudio(): boolean {
  return Capacitor.getPlatform() === "android" && !!bridge();
}

export const nativeAudio = {
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setQueue(items: NativeQueueItem[], startIndex: number, autoplay: boolean) {
    bridge()?.setQueue(JSON.stringify(items), startIndex, autoplay);
  },
  appendQueue(items: NativeQueueItem[]) {
    bridge()?.appendQueue(JSON.stringify(items));
  },
  play() {
    bridge()?.play();
  },
  pause() {
    bridge()?.pause();
  },
  seekTo(sec: number) {
    bridge()?.seekTo(sec);
  },
  skipNext() {
    bridge()?.skipNext();
  },
  skipPrev() {
    bridge()?.skipPrev();
  },
  setIndex(i: number) {
    bridge()?.setIndex(i);
  },
  setRepeat(mode: number) {
    bridge()?.setRepeat(mode);
  },
  setShuffle(on: boolean) {
    bridge()?.setShuffle(on);
  },
  setVolume(v: number) {
    bridge()?.setVolume(v);
  },
  stop() {
    bridge()?.stop();
  },
};
