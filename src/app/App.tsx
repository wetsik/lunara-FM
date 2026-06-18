import { useEffect, useRef, useState } from "react";
import type { Album, LikedArtist } from "./player/PlayerContext";
import { Sidebar } from "./components/Sidebar";
import { MobileNav } from "./components/MobileNav";
import { TopNav } from "./components/TopNav";
import { MusicPlayer } from "./components/MusicPlayer";
import { HomePage } from "./components/HomePage";
import { SearchPage } from "./components/SearchPage";
import { AlbumPage } from "./components/AlbumPage";
import { ArtistPage } from "./components/ArtistPage";
import { PlaylistPage } from "./components/PlaylistPage";
import { FullscreenPlayer } from "./components/FullscreenPlayer";
import { UserProfile } from "./components/UserProfile";
import { PremiumPage } from "./components/PremiumPage";
import { LibraryPage } from "./components/LibraryPage";
import { AIAssistant } from "./components/AIAssistant";
import { Sparkles } from "lucide-react";
import { PlayerProvider } from "./player/PlayerContext";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import "../styles/fonts.css";

/* MARKER-MAKE-KIT-INVOKED */

type Page =
  | "home"
  | "search"
  | "library"
  | "favorites"
  | "albums"
  | "artists"
  | "podcasts"
  | "settings"
  | "album"
  | "artist"
  | "playlist"
  | "fullscreen"
  | "profile"
  | "premium";

const libraryModes: Partial<Record<Page, "library" | "favorites" | "albums" | "artists" | "podcasts">> = {
  library: "library",
  favorites: "favorites",
  albums: "albums",
  artists: "artists",
  podcasts: "podcasts",
};

export type NavPayload = string | LikedArtist | Album;
export type Navigate = (p: Page, payload?: NavPayload) => void;

interface NavState {
  page: Page;
  selectedPlaylistId: string | null;
  artistParam: LikedArtist | null;
  albumParam: Album | null;
}

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <MusicApp />
      </PlayerProvider>
    </AuthProvider>
  );
}

function MusicApp() {
  const [page, setPage] = useState<Page>("home");
  const [showAssistant, setShowAssistant] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [artistParam, setArtistParam] = useState<LikedArtist | null>(null);
  const [albumParam, setAlbumParam] = useState<Album | null>(null);

  // History stack mirroring browser history depth, so the Android hardware
  // back button (which Capacitor routes to window.history.back) pops a page
  // instead of closing the app. currentRef holds the latest nav state so the
  // navigate/popstate handlers never read stale values.
  const stackRef = useRef<NavState[]>([]);
  const currentRef = useRef<NavState>({ page: "home", selectedPlaylistId: null, artistParam: null, albumParam: null });
  useEffect(() => {
    currentRef.current = { page, selectedPlaylistId, artistParam, albumParam };
  }, [page, selectedPlaylistId, artistParam, albumParam]);

  const navigate: Navigate = (p, payload) => {
    stackRef.current.push(currentRef.current);
    window.history.pushState(null, "");
    if (p === "playlist" && typeof payload === "string") setSelectedPlaylistId(payload);
    if (p === "artist" && payload && typeof payload !== "string") setArtistParam(payload as LikedArtist);
    if (p === "album" && payload && typeof payload !== "string") setAlbumParam(payload as Album);
    setPage(p);
  };

  // In-app "back" affordances delegate to the browser so the history stays in
  // sync with the hardware back button.
  const goBack = () => {
    if (stackRef.current.length) window.history.back();
    else setPage("home");
  };

  useEffect(() => {
    const onPop = () => {
      const prev = stackRef.current.pop();
      if (!prev) {
        setPage("home");
        return;
      }
      setPage(prev.page);
      setSelectedPlaylistId(prev.selectedPlaylistId);
      setArtistParam(prev.artistParam);
      setAlbumParam(prev.albumParam);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const renderPage = () => {
    if (page === "fullscreen") {
      return <FullscreenPlayer onNavigate={navigate} onBack={goBack} />;
    }

    switch (page) {
      case "home":
        return <HomePage onNavigate={navigate} />;
      case "search":
        return <SearchPage onNavigate={navigate} />;
      case "library":
      case "favorites":
      case "albums":
      case "artists":
      case "podcasts":
        return <LibraryPage onNavigate={navigate} mode={libraryModes[page]} />;
      case "album":
        return <AlbumPage onNavigate={navigate} onBack={goBack} album={albumParam} />;
      case "artist":
        return <ArtistPage onNavigate={navigate} onBack={goBack} artist={artistParam} />;
      case "playlist":
        return <PlaylistPage onNavigate={navigate} playlistId={selectedPlaylistId} />;
      case "profile":
        return <UserProfile onNavigate={navigate} />;
      case "premium":
        return <PremiumPage onNavigate={navigate} />;
      case "settings":
        return <SettingsPage onNavigate={navigate} />;
      default:
        return <HomePage onNavigate={navigate} />;
    }
  };

  const isFullscreen = page === "fullscreen";

  return (
      <div
        className="flex h-dvh w-screen overflow-hidden"
        style={{ background: "var(--background)", fontFamily: "'Inter', sans-serif" }}
      >
        {!isFullscreen && (
          <Sidebar currentPage={page} onNavigate={navigate} />
        )}

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {!isFullscreen && (
            <TopNav onNavigate={navigate} currentPage={page} />
          )}

          <div className="flex flex-1 min-h-0 overflow-hidden">
            {renderPage()}
          </div>

          {!isFullscreen && (
            <MusicPlayer onNavigate={navigate} />
          )}

          {!isFullscreen && (
            <MobileNav currentPage={page} onNavigate={navigate} />
          )}
        </div>

        {/* AI playlist assistant — floating launcher + slide-over panel */}
        {!isFullscreen && !showAssistant && (
          <button
            onClick={() => setShowAssistant(true)}
            className="brand-glow fixed right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 132px)",
              background: "var(--emerald)",
              boxShadow: "0 0 34px var(--moon-glow-medium), 0 0 78px var(--moon-glow-soft)",
            }}
            aria-label="AI-подборщик"
          >
            <Sparkles size={20} color="var(--brand-on-accent)" />
          </button>
        )}
        {showAssistant && (
          <div
            className="fixed inset-0 z-[60] flex justify-end"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setShowAssistant(false)}
          >
            <div className="h-full w-full sm:w-80" onClick={e => e.stopPropagation()}>
              <AIAssistant onClose={() => setShowAssistant(false)} onNavigate={navigate} />
            </div>
          </div>
        )}
      </div>
  );
}

// --- Settings persistence ---------------------------------------------------
interface SettingsItem {
  key: string;
  label: string;
  description: string;
  type: "toggle" | "select";
  on?: boolean;
  options?: string[];
}
interface SettingsSection { title: string; items: SettingsItem[]; }

const SETTINGS_KEY = "lunaraSettings";

function loadSettings(): Record<string, unknown> {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch { return {}; }
}
function saveSetting(key: string, value: unknown) {
  try {
    const all = loadSettings();
    all[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(all));
  } catch { /* quota */ }
}

// Inline settings page — simple enough to not need its own file
function SettingsPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { user, signOut, deleteAccount } = useAuth();
  const handleDelete = () => {
    if (window.confirm("Удалить аккаунт? Это действие необратимо.")) deleteAccount();
  };
  const sections: SettingsSection[] = [
    {
      title: "Audio",
      items: [
        { key: "audioQuality", label: "Audio Quality", description: "Качество звука", type: "select", options: ["Авто", "Высокое (320kbps)", "Lossless (FLAC)"] },
        { key: "volumeNormalization", label: "Volume Normalization", description: "Выравнивать громкость треков", type: "toggle", on: true },
        { key: "crossfade", label: "Crossfade", description: "Плавные переходы между треками", type: "toggle", on: false },
        { key: "equalizer", label: "Equalizer", description: "Настроить звучание", type: "toggle", on: false },
      ],
    },
    {
      title: "Playback",
      items: [
        { key: "autoplay", label: "Auto-play", description: "Продолжать похожую музыку", type: "toggle", on: true },
        { key: "explicit", label: "Explicit Content", description: "Показывать explicit-треки", type: "toggle", on: true },
        { key: "downloadQuality", label: "Download Quality", description: "Качество загрузки", type: "select", options: ["Обычное", "Высокое (320kbps)", "Максимальное"] },
      ],
    },
    {
      title: "Privacy",
      items: [
        { key: "privateSession", label: "Private Session", description: "Скрыть активность прослушивания", type: "toggle", on: false },
        { key: "shareHistory", label: "Share Listening History", description: "Делиться с друзьями", type: "toggle", on: true },
      ],
    },
    {
      title: "Notifications",
      items: [
        { key: "notifNewReleases", label: "New Releases", description: "От артистов, которых вы лайкнули", type: "toggle", on: true },
        { key: "notifPlaylistUpdates", label: "Playlist Updates", description: "Когда плейлисты обновляются", type: "toggle", on: false },
      ],
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Settings</h1>

      <div className="max-w-2xl space-y-6">
        {sections.map(section => (
          <div key={section.title}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
              {section.title}
            </h2>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid var(--glass-border)" }}
            >
              {section.items.map((item, i) => (
                <div
                  key={item.label}
                  className="flex flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                  style={{
                    background: "var(--surface-1)",
                    borderBottom: i < section.items.length - 1 ? "1px solid var(--glass-border)" : "none",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.description}</p>
                  </div>
                  {item.type === "toggle" && (
                    <ToggleSwitch settingKey={item.key} defaultOn={!!item.on} />
                  )}
                  {item.type === "select" && (
                    <SettingSelect settingKey={item.key} options={item.options ?? []} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Danger zone */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Account</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
            {/* Real signed-in account */}
            <div className="px-5 py-4" style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--glass-border)" }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{user?.name ?? "Account"}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
                </div>
                <button
                  onClick={signOut}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg"
                  style={{ background: "var(--glass-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                >
                  Выйти
                </button>
              </div>
            </div>
            {/* Subscription — showcase only */}
            <div className="px-5 py-4" style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--glass-border)" }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Subscription</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Lunara Pro · Renews June 8, 2027</p>
                </div>
                <button
                  onClick={() => onNavigate("premium")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg"
                  style={{ background: "var(--emerald-dim)", color: "var(--emerald)", border: "1px solid rgba(255, 255, 255, 0.2)" }}
                >
                  Manage
                </button>
              </div>
            </div>
            <div className="px-5 py-4" style={{ background: "var(--surface-1)" }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: "#ef4444" }}>Delete Account</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>This action is irreversible</p>
                </div>
                <button
                  onClick={handleDelete}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg"
                  style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs pb-8" style={{ color: "var(--text-muted)" }}>
          Lunara v2.4.1 · © 2024 Lunara
        </p>
      </div>
    </div>
  );
}

function SettingSelect({ settingKey, options }: { settingKey: string; options: string[] }) {
  const saved = loadSettings()[settingKey];
  const initial = typeof saved === "string" && options.includes(saved) ? saved : options[0] ?? "";
  const [value, setValue] = useState(initial);
  const cycle = () => {
    const idx = options.indexOf(value);
    const next = options[(idx + 1) % options.length] ?? options[0];
    setValue(next);
    saveSetting(settingKey, next);
  };
  return (
    <button
      onClick={cycle}
      className="max-w-full truncate text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all"
      style={{ background: "var(--glass-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
      title="Нажмите, чтобы переключить"
    >
      {value}
    </button>
  );
}

function ToggleSwitch({ settingKey, defaultOn }: { settingKey?: string; defaultOn?: boolean }) {
  const saved = settingKey ? loadSettings()[settingKey] : undefined;
  const [enabled, setEnabled] = useState(typeof saved === "boolean" ? saved : !!defaultOn);
  const toggle = () => {
    setEnabled(prev => {
      const next = !prev;
      if (settingKey) saveSetting(settingKey, next);
      return next;
    });
  };
  return (
    <button
      onClick={toggle}
      className="relative w-10 h-5.5 rounded-full transition-all duration-300 shrink-0"
      style={{
        background: enabled ? "var(--emerald)" : "var(--glass-hover)",
        width: "40px",
        height: "22px",
        boxShadow: enabled ? "0 0 18px var(--moon-glow-soft)" : "none",
      }}
    >
      <span
        className="absolute top-0.5 rounded-full transition-all duration-300"
        style={{
          width: "18px",
          height: "18px",
          background: enabled ? "var(--brand-on-accent)" : "#fff",
          left: enabled ? "20px" : "2px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}
