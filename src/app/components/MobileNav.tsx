import { Home, Search, Library, Heart } from "lucide-react";

type Page = "home" | "search" | "library" | "favorites" | "albums" | "artists" | "podcasts" | "settings" | "album" | "artist" | "playlist" | "fullscreen" | "profile" | "premium";

interface MobileNavProps {
  currentPage: Page;
  onNavigate: (page: Page, payload?: string) => void;
}

const items = [
  { icon: Home, label: "Home", page: "home" as Page },
  { icon: Search, label: "Search", page: "search" as Page },
  { icon: Library, label: "Library", page: "library" as Page },
  { icon: Heart, label: "Favorites", page: "favorites" as Page },
];

export function MobileNav({ currentPage, onNavigate }: MobileNavProps) {
  return (
    <nav
      className="flex items-stretch justify-around md:hidden shrink-0"
      style={{
        background: "rgba(0, 0, 0, 0.95)",
        backdropFilter: "blur(30px)",
        borderTop: "1px solid var(--glass-border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {items.map(({ icon: Icon, label, page }) => {
        const active = currentPage === page || (page === "library" && currentPage === "playlist");
        return (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2.5 transition-colors"
            style={{ color: active ? "var(--emerald)" : "var(--text-muted)" }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
