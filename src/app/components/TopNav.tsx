import { useEffect, useRef, useState } from "react";
import { Search, Bell } from "lucide-react";
import { usePlayer } from "../player/PlayerContext";
import { useAuth } from "../auth/AuthContext";

type Page = "home" | "search" | "library" | "favorites" | "albums" | "artists" | "podcasts" | "settings" | "album" | "artist" | "playlist" | "fullscreen" | "profile" | "premium";

interface TopNavProps {
  onNavigate: (page: Page) => void;
  currentPage?: Page;
}

interface Notification {
  id: string;
  title: string;
  body: string;
}

function avatarInitials(name: string): string {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

export function TopNav({ onNavigate, currentPage }: TopNavProps) {
  const { searchQuery, setSearchQuery, liked, playlists, history } = usePlayer();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Notifications derived from the user's real activity.
  const notifications: Notification[] = [];
  if (user) notifications.push({ id: "welcome", title: `Привет, ${user.name}!`, body: "Лайкайте треки и артистов — микс по интересам станет точнее." });
  if (history[0]) notifications.push({ id: "recent", title: "Продолжить прослушивание", body: `Последним играл «${history[0].title}» — ${history[0].artist}` });
  if (liked.length) notifications.push({ id: "liked", title: "Любимое", body: `В вашей коллекции ${liked.length} ${liked.length === 1 ? "трек" : "треков"}` });
  if (playlists.length) notifications.push({ id: "pl", title: "Плейлисты", body: `Создано плейлистов: ${playlists.length}` });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // The search page has its own large input — avoid a second search box there,
  // and keep the top bar search desktop-only (mobile uses the bottom nav).
  const showSearch = currentPage !== "search";
  const hasUnread = !read && notifications.length > 0;

  return (
    <header
      className="relative flex items-center gap-3 px-4 py-3 shrink-0 sm:px-6 sm:py-3.5"
      style={{
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border)",
        zIndex: 40,
      }}
    >
      {/* Search bar (desktop, non-search pages) */}
      <div className={`min-w-0 flex-1 max-w-lg relative ${showSearch ? "hidden sm:block" : "hidden"}`}>
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          placeholder="Search songs, artists..."
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            onNavigate("search");
          }}
          onFocus={() => onNavigate("search")}
          className="w-full pl-8 pr-4 py-2 rounded-xl text-sm outline-none transition-all"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
          }}
          onBlur={e => (e.currentTarget.style.borderColor = "var(--glass-border)")}
        />
      </div>

      <div className="flex items-center gap-2 ml-auto" ref={ref}>
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setOpen(o => !o); setRead(true); }}
            className="moon-hover-glow relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "var(--glass-bg)", color: open ? "var(--text-primary)" : "var(--text-muted)" }}
            aria-label="Notifications"
          >
            <Bell size={15} />
            {hasUnread && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: "var(--emerald)", boxShadow: "0 0 10px var(--moon-glow-soft)" }}
              />
            )}
          </button>

          {open && (
            <div
              className="absolute right-0 mt-2 rounded-2xl overflow-hidden z-50"
              style={{
                width: 300,
                background: "var(--surface-2, #1a1f27)",
                border: "1px solid var(--glass-border)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
              }}
            >
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Уведомления</p>
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {notifications.length === 0 && (
                  <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>Пока нет уведомлений</p>
                )}
                {notifications.map(n => (
                  <div key={n.id} className="px-4 py-3" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{n.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{n.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <button
          onClick={() => onNavigate("profile")}
          className="moon-hover-glow hidden items-center gap-2 rounded-xl py-1 pl-1 pr-3 sm:flex"
          style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-lg object-cover" />
          ) : (
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold"
              style={{ background: "var(--emerald)", color: "var(--brand-on-accent)" }}
            >
              {user ? avatarInitials(user.name) : "?"}
            </div>
          )}
          <span className="text-xs font-medium truncate max-w-[80px]" style={{ color: "var(--text-secondary)" }}>{user?.name ?? "You"}</span>
        </button>
      </div>
    </header>
  );
}
