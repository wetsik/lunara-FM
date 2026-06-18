import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Music2, Loader2, Bot, Play, Check } from "lucide-react";
import { usePlayer } from "../player/PlayerContext";
import { searchTracks, type Track } from "../player/youtube";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  title?: string;
  tracks?: Track[];
}

const suggestions = [
  "Плейлист для работы и фокуса",
  "Что-то для тренировки",
  "Грустное и медленное под настроение",
  "Energetic pop hits",
];

// Map a free-text mood/request into a concrete music search query + a label.
function interpret(input: string): { query: string; title: string; text: string } {
  const lower = input.toLowerCase();
  const has = (...w: string[]) => w.some(x => lower.includes(x));

  if (has("код", "cod", "работ", "focus", "фокус", "concentr", "учеб", "study"))
    return { query: "lofi beats for focus and coding", title: "Фокус и работа", text: "Собрал спокойный фон для концентрации — lo-fi и эмбиент без отвлекающего вокала." };
  if (has("трениров", "workout", "gym", "энерг", "energy", "бег", "run"))
    return { query: "high energy workout mix", title: "Энергия и тренировка", text: "Подобрал заряжающий микс с высоким темпом — то, что нужно для движения." };
  if (has("груст", "sad", "melanchol", "медлен", "spokoy", "спокой", "calm", "relax"))
    return { query: "sad chill emotional songs", title: "Под настроение", text: "Нашёл медленные, атмосферные треки — пусть музыка побудет рядом." };
  if (has("сон", "sleep", "ноч", "night", "вечер"))
    return { query: "calm ambient music for sleep", title: "Перед сном", text: "Тихий эмбиент, чтобы расслабиться вечером." };
  if (has("party", "вечеринк", "танц", "dance", "клуб"))
    return { query: "dance party hits", title: "Вечеринка", text: "Танцевальные хиты для настроения." };
  return { query: `${input} music`, title: input.trim() || "Микс для вас", text: "Вот что я нашёл по вашему запросу — реальные треки, можно сразу слушать." };
}

interface AIAssistantProps {
  onClose: () => void;
  onNavigate?: (page: string, payload?: any) => void;
}

export function AIAssistant({ onClose }: AIAssistantProps) {
  const { play, createPlaylist, addToPlaylist } = usePlayer();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content: "Привет! Скажите настроение, занятие или жанр — соберу плейлист из реальных треков, которые можно сразу включить.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const { query, title, text: reply } = interpret(text);
    try {
      const tracks = await searchTracks(query, 12);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: tracks.length ? reply : "Ничего не нашёл по этому запросу — попробуйте сформулировать иначе.",
        title: tracks.length ? title : undefined,
        tracks: tracks.length ? tracks : undefined,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Не удалось загрузить треки. Проверьте соединение и попробуйте снова.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const savePlaylist = (msg: Message) => {
    if (!msg.tracks?.length) return;
    const pl = createPlaylist(msg.title || "AI плейлист");
    msg.tracks.forEach(t => addToPlaylist(pl.id, t));
    setSaved(prev => new Set(prev).add(msg.id));
  };

  return (
    <div className="flex flex-col h-full w-full sm:w-80 shrink-0" style={{ background: "var(--surface-1)", borderLeft: "1px solid var(--glass-border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 shrink-0" style={{ borderBottom: "1px solid var(--glass-border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--emerald-dim)" }}>
            <Sparkles size={14} style={{ color: "var(--emerald)" }} />
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>AI-подборщик</p>
            <p className="text-[10px]" style={{ color: "var(--emerald)" }}>● Готов</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--emerald-dim)" }}>
                <Bot size={12} style={{ color: "var(--emerald)" }} />
              </div>
            )}
            <div className="flex flex-col gap-2 max-w-[85%]">
              <div
                className="px-3 py-2.5 rounded-2xl text-xs leading-relaxed"
                style={{
                  background: msg.role === "user" ? "var(--emerald)" : "var(--surface-2)",
                  color: msg.role === "user" ? "var(--brand-on-accent)" : "var(--text-secondary)",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                }}
              >
                {msg.content}
              </div>

              {msg.tracks && msg.tracks.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-2)", border: "1px solid var(--glass-border)" }}>
                  <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: "var(--emerald-dim)", borderBottom: "1px solid var(--glass-border)" }}>
                    <Music2 size={12} style={{ color: "var(--emerald)" }} />
                    <span className="text-xs font-semibold truncate" style={{ color: "var(--emerald)" }}>{msg.title}</span>
                  </div>
                  <div className="px-2 py-1.5 max-h-56 overflow-y-auto">
                    {msg.tracks.map((track, i) => (
                      <div
                        key={track.id}
                        onClick={() => play(track, msg.tracks!)}
                        className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg cursor-pointer transition-all group"
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-bg)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <span className="text-[9px] w-3 text-center shrink-0" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                        <img src={track.cover} alt={track.title} className="w-7 h-7 rounded object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{track.title}</p>
                          <p className="text-[9px] truncate" style={{ color: "var(--text-muted)" }}>{track.artist}</p>
                        </div>
                        <Play size={11} className="opacity-0 group-hover:opacity-100 shrink-0" style={{ color: "var(--emerald)" }} fill="currentColor" />
                      </div>
                    ))}
                  </div>
                  <div className="px-3 pb-3 pt-1 flex gap-2">
                    <button
                      onClick={() => play(msg.tracks![0], msg.tracks!)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{ background: "var(--emerald)", color: "var(--brand-on-accent)", boxShadow: "0 0 24px var(--moon-glow-soft)" }}
                    >
                      Включить
                    </button>
                    <button
                      onClick={() => savePlaylist(msg)}
                      disabled={saved.has(msg.id)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
                      style={{ background: "var(--glass-bg)", color: saved.has(msg.id) ? "var(--emerald)" : "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                    >
                      {saved.has(msg.id) ? <Check size={12} /> : null}
                      {saved.has(msg.id) ? "Сохранён" : "Сохранить"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--emerald-dim)" }}>
              <Bot size={12} style={{ color: "var(--emerald)" }} />
            </div>
            <div className="px-3 py-2.5 rounded-2xl" style={{ background: "var(--surface-2)", borderRadius: "16px 16px 16px 4px" }}>
              <Loader2 size={14} className="animate-spin" style={{ color: "var(--emerald)" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-medium mb-2" style={{ color: "var(--text-muted)" }}>Попробуйте:</p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-left px-3 py-2 rounded-xl text-xs transition-all"
                style={{ background: "var(--glass-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255, 255, 255, 0.3)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--glass-border)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--glass-border)" }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendMessage(input); }}
            placeholder="Опишите, что включить…"
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: "var(--text-primary)" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: input.trim() && !loading ? "var(--emerald)" : "var(--glass-hover)",
              color: input.trim() && !loading ? "var(--brand-on-accent)" : "var(--text-muted)",
            }}
          >
            <Send size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
