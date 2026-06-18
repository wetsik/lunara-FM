import { Home, Search, Library, Heart, Plus, Zap, PinOff } from "lucide-react";
import { usePlayer } from "../player/PlayerContext";

type Page = "home" | "search" | "library" | "favorites" | "albums" | "artists" | "podcasts" | "settings" | "album" | "artist" | "playlist" | "fullscreen" | "profile" | "premium";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page, payload?: string) => void;
}

const navItems = [
  { icon: Home, label: "Home", page: "home" as Page },
  { icon: Search, label: "Search", page: "search" as Page },
  { icon: Library, label: "Library", page: "library" as Page },
  { icon: Heart, label: "Favorites", page: "favorites" as Page },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { playlists, createPlaylist, togglePinPlaylist } = usePlayer();

  // The sidebar only surfaces pinned playlists; the full list lives in Library.
  const pinned = playlists.filter(pl => pl.pinned);

  const handleCreate = () => {
    const pl = createPlaylist("New Playlist");
    onNavigate("playlist", pl.id);
  };

  return (
    <aside
      className="hidden md:flex flex-col h-full w-60 shrink-0"
      style={{ background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "var(--emerald)" }}
        >
          <Zap size={16} color="var(--brand-on-accent)" fill="var(--brand-on-accent)" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Lunara
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map(({ icon: Icon, label, page }) => {
            const active = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                style={{
                  background: active ? "var(--glass-hover)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--sidebar-foreground)",
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--glass-bg)";
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <Icon
                  size={16}
                  style={{ color: active ? "var(--emerald)" : "currentColor" }}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className="font-medium">{label}</span>
                {active && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--emerald)" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Playlists */}
        <div className="mt-6 mb-2">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Playlists
            </span>
            <button
              onClick={handleCreate}
              className="w-5 h-5 rounded flex items-center justify-center transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
              title="Create playlist"
            >
              <Plus size={13} />
            </button>
          </div>
          <div className="space-y-0.5">
            {pinned.length === 0 && (
              <p className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>Нет закреплённых плейлистов</p>
            )}
            {pinned.map(pl => (
              <div
                key={pl.id}
                className="group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150"
                style={{ color: "var(--sidebar-foreground)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--glass-bg)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <button
                  onClick={() => onNavigate("playlist", pl.id)}
                  className="flex flex-1 min-w-0 items-center gap-2.5 text-left"
                >
                  {pl.cover ? (
                    <img src={pl.cover} alt={pl.title} className="w-7 h-7 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: "var(--surface-2)", color: "var(--emerald)" }}>
                      <span className="text-[11px] font-bold">{pl.title.slice(0, 1).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{pl.title}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{pl.tracks.length} tracks</p>
                  </div>
                </button>
                <button
                  onClick={() => togglePinPlaylist(pl.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-muted)" }}
                  title="Открепить"
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--emerald)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
                >
                  <PinOff size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
