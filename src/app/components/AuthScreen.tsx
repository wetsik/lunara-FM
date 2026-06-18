import { useState } from "react";
import { Music2, Mail, Lock, User, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export function AuthScreen() {
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    const res = isSignup
      ? await signUp(name, email, password)
      : await signIn(email, password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Что-то пошло не так");
    // On success the AuthGate swaps this screen out automatically.
  };

  const inputWrap: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10,
    background: "var(--surface-1)", border: "1px solid var(--glass-border)",
    borderRadius: 14, padding: "12px 14px",
  };
  const inputStyle: React.CSSProperties = {
    flex: 1, background: "transparent", outline: "none", border: "none",
    color: "var(--text-primary)", fontSize: 14,
  };

  return (
    <div
      className="flex h-dvh w-screen items-center justify-center px-4"
      style={{
        background: "var(--background)",
        backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,255,255,0.12) 0%, transparent 70%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="brand-glow w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--emerald)", boxShadow: "0 8px 28px var(--emerald-glow)" }}
          >
            <Music2 size={26} color="var(--brand-on-accent)" />
          </div>
          <h1 className="brand-wordmark text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Lunara
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Discover your sound.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {isSignup && (
            <div style={inputWrap}>
              <User size={16} style={{ color: "var(--text-muted)" }} />
              <input
                style={inputStyle}
                type="text"
                placeholder="Имя"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}
          <div style={inputWrap}>
            <Mail size={16} style={{ color: "var(--text-muted)" }} />
            <input
              style={inputStyle}
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div style={inputWrap}>
            <Lock size={16} style={{ color: "var(--text-muted)" }} />
            <input
              style={inputStyle}
              type={showPass ? "text" : "password"}
              placeholder="Пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
            <button type="button" onClick={() => setShowPass(s => !s)} style={{ color: "var(--text-muted)" }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-xs px-1" style={{ color: "#ef4444" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-60"
            style={{ background: "var(--emerald)", color: "var(--brand-on-accent)", boxShadow: "0 4px 20px var(--emerald-glow)" }}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {isSignup ? "Зарегистрироваться" : "Войти"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
          {isSignup ? "Уже есть аккаунт?" : "Нет аккаунта?"}{" "}
          <button
            onClick={() => { setMode(isSignup ? "signin" : "signup"); setError(null); }}
            className="font-semibold"
            style={{ color: "var(--emerald)" }}
          >
            {isSignup ? "Войти" : "Создать"}
          </button>
        </p>

        <p className="text-center text-[11px] mt-6" style={{ color: "var(--text-muted)" }}>
          Аккаунт хранится на этом устройстве
        </p>
      </div>
    </div>
  );
}
