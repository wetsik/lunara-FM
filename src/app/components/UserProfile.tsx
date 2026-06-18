import { useState } from "react";
import { ArrowLeft, Edit3, Settings, Music2, Heart, Clock, Users, Zap, Play, LogOut } from "lucide-react";
import { usePlayer } from "../player/PlayerContext";
import { useAuth } from "../auth/AuthContext";
import { TrackMenu } from "./TrackMenu";

type Page = "home" | "search" | "library" | "favorites" | "albums" | "artists" | "podcasts" | "settings" | "album" | "artist" | "playlist" | "fullscreen" | "profile" | "premium";

interface UserProfileProps {
  onNavigate: (page: Page, payload?: any) => void;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return d === 1 ? "вчера" : `${d} дн назад`;
}

function memberSince(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export function UserProfile({ onNavigate }: UserProfileProps) {
  const { user, signOut, updateProfile, deleteAccount } = useAuth();
  const { liked, playlists, history, likedArtists, play } = usePlayer();
  const [activeTab, setActiveTab] = useState<"overview" | "playlists" | "history">("overview");

  if (!user) return null;

  // Real stats derived from actual usage.
  const hoursListened = history.reduce((s, t) => s + (t.durationSec || 0), 0) / 3600;
  const hoursLabel = hoursListened >= 1 ? `${hoursListened.toFixed(1)}h` : `${Math.round(hoursListened * 60)}m`;
  const stats = [
    { icon: Music2, label: "Прослушано", value: String(history.length), color: "var(--emerald)" },
    { icon: Heart, label: "Любимых", value: String(liked.length), color: "#ef4444" },
    { icon: Clock, label: "Часов", value: hoursLabel, color: "#a855f7" },
    { icon: Users, label: "Артистов", value: String(likedArtists.length), color: "#3b82f6" },
  ];

  // Top artists by play frequency in history (fallback to liked artists).
  const freq = new Map<string, { name: string; count: number; cover: string }>();
  history.forEach(t => {
    const cur = freq.get(t.artist) || { name: t.artist, count: 0, cover: t.cover };
    cur.count += 1;
    freq.set(t.artist, cur);
  });
  const topArtists = [...freq.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  const editName = () => {
    const name = window.prompt("Ваше имя", user.name);
    if (name && name.trim().length >= 2) updateProfile({ name: name.trim() });
  };

  const handleDelete = () => {
    if (window.confirm("Удалить аккаунт? Это действие необратимо.")) deleteAccount();
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="relative px-4 pt-5 pb-8 sm:px-6 lg:px-8 lg:pt-6" style={{ background: "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, transparent 100%)" }}>
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2 mb-6 text-sm transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
        >
          <ArrowLeft size={15} />
          Назад
        </button>

        <div className="flex flex-col gap-5 md:flex-row md:items-end lg:gap-8">
          <div className="relative">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-24 w-24 rounded-3xl object-cover sm:h-28 sm:w-28" style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }} />
            ) : (
              <div
                className="h-24 w-24 rounded-3xl flex items-center justify-center text-3xl font-bold sm:h-28 sm:w-28"
                style={{ background: "var(--emerald)", color: "var(--brand-on-accent)", boxShadow: "0 0 30px var(--moon-glow-soft)" }}
              >
                {initials(user.name)}
              </div>
            )}
            <button
              onClick={editName}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={{ background: "var(--surface-3, #2a2f37)", border: "1px solid var(--glass-border)" }}
            >
              <Edit3 size={13} color="#fff" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {/* Showcase badge */}
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "var(--emerald-dim)", color: "var(--emerald)" }}>
                <Zap size={10} fill="currentColor" />
                PRO
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              {user.name}
            </h1>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              {user.email} · с {memberSince(user.createdAt)}
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {[
                { label: "Плейлистов", value: String(playlists.length) },
                { label: "Любимых", value: String(liked.length) },
                { label: "Артистов", value: String(likedArtists.length) },
              ].map(s => (
                <div key={s.label}>
                  <span className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</span>
                  <span className="text-xs ml-1.5" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("settings")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
              style={{ background: "var(--glass-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--glass-hover)")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--glass-bg)")}
            >
              <Settings size={14} />
              Настройки
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
              style={{ background: "var(--glass-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#ef4444")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)")}
            >
              <LogOut size={14} />
              Выйти
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mb-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="p-4 rounded-2xl" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <p className="text-xl font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>{value}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1 mb-6 overflow-x-auto" style={{ borderBottom: "1px solid var(--glass-border)" }}>
          {([["overview", "Обзор"], ["playlists", "Плейлисты"], ["history", "История"]] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2.5 text-sm font-medium transition-all relative whitespace-nowrap"
              style={{ color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              {label}
              {activeTab === tab && <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full" style={{ background: "var(--emerald)" }} />}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
            {/* Top Artists */}
            <div>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Ваши артисты</h3>
              {topArtists.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Послушайте музыку — здесь появятся ваши артисты.</p>
              ) : (
                <div className="space-y-3">
                  {topArtists.map((a, i) => (
                    <div
                      key={a.name}
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => onNavigate("artist", { id: a.name, name: a.name, image: a.cover })}
                    >
                      <span className="text-xs tabular-nums w-4 text-right" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                      <img src={a.cover} alt={a.name} className="w-9 h-9 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{a.name}</p>
                      </div>
                      <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{a.count} {a.count === 1 ? "трек" : "треков"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent activity (from real history) */}
            <div>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Недавняя активность</h3>
              {history.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Пока пусто.</p>
              ) : (
                <div className="space-y-3">
                  {history.slice(0, 5).map((t, i) => (
                    <div key={`${t.id}-${i}`} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "var(--glass-bg)" }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "var(--emerald)" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>Слушали «{t.title}» — {t.artist}</p>
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{relativeTime(t.playedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "playlists" && (
          playlists.length === 0 ? (
            <p className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>Плейлистов пока нет.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-3 xl:grid-cols-4">
              {playlists.map(pl => (
                <div key={pl.id} className="cursor-pointer group" onClick={() => onNavigate("playlist", pl.id)}>
                  <div className="relative mb-3">
                    {pl.cover ? (
                      <img src={pl.cover} alt={pl.title} className="w-full aspect-square rounded-2xl object-cover" />
                    ) : (
                      <div className="w-full aspect-square rounded-2xl flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                        <Music2 size={28} style={{ color: "var(--emerald)" }} />
                      </div>
                    )}
                    <button className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" style={{ background: "var(--emerald)", boxShadow: "0 0 24px var(--moon-glow-soft)" }}>
                      <Play size={13} color="var(--brand-on-accent)" fill="var(--brand-on-accent)" style={{ marginLeft: "2px" }} />
                    </button>
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{pl.title}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{pl.tracks.length} tracks</p>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "history" && (
          history.length === 0 ? (
            <p className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>История пуста.</p>
          ) : (
            <div className="space-y-1 mb-8">
              {history.map((track, i) => (
                <div
                  key={`${track.id}-${i}`}
                  onClick={() => play(track, history)}
                  className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 cursor-pointer transition-all sm:gap-4 sm:px-4"
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <img src={track.cover} alt={track.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>{track.title}</p>
                    <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>{track.artist}</p>
                  </div>
                  <span className="hidden text-xs sm:inline" style={{ color: "var(--text-muted)" }}>{relativeTime(track.playedAt)}</span>
                  <span className="hidden text-xs tabular-nums sm:inline" style={{ color: "var(--text-muted)" }}>{track.duration}</span>
                  <div onClick={e => e.stopPropagation()}>
                    <TrackMenu track={track} onNavigate={onNavigate} iconSize={14} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Danger zone */}
        <div className="mb-10 max-w-md">
          <button
            onClick={handleDelete}
            className="text-xs font-medium px-3 py-2 rounded-lg"
            style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
          >
            Удалить аккаунт
          </button>
        </div>
      </div>
    </div>
  );
}
