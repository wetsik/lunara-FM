import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";

export interface Account {
  id: string;
  name: string;
  email: string;
  avatar?: string; // optional data URL / image URL; UI falls back to initials
  createdAt: string;
}

// Stored shape keeps the credential material; never exposed through the context.
interface StoredAccount extends Account {
  salt: string;
  passwordHash: string;
}

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AuthState {
  user: Account | null;
  ready: boolean;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => void;
  updateProfile: (patch: Partial<Pick<Account, "name" | "avatar">>) => void;
  deleteAccount: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const ACCOUNTS_KEY = "lunaraAccounts";
const SESSION_KEY = "lunaraSession";

function randomSalt(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, "0")).join("");
}

// SHA-256(salt:password) via Web Crypto (available in the WebView secure ctx).
async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function loadAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

function publicView(a: StoredAccount): Account {
  const { salt: _s, passwordHash: _h, ...rest } = a;
  return rest;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAccounts(loadAccounts());
    setCurrentId(localStorage.getItem(SESSION_KEY));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); } catch { /* quota */ }
  }, [accounts, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      if (currentId) localStorage.setItem(SESSION_KEY, currentId);
      else localStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  }, [currentId, ready]);

  const user = useMemo(() => {
    const found = accounts.find(a => a.id === currentId);
    return found ? publicView(found) : null;
  }, [accounts, currentId]);

  const signUp = async (name: string, email: string, password: string): Promise<AuthResult> => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2) return { ok: false, error: "Введите имя" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, error: "Неверный email" };
    if (password.length < 6) return { ok: false, error: "Пароль не короче 6 символов" };
    if (accounts.some(a => a.email === cleanEmail)) return { ok: false, error: "Этот email уже зарегистрирован" };

    const salt = randomSalt();
    const passwordHash = await hashPassword(password, salt);
    const account: StoredAccount = {
      id: `u-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      createdAt: new Date().toISOString(),
      salt,
      passwordHash,
    };
    setAccounts(prev => [...prev, account]);
    setCurrentId(account.id);
    return { ok: true };
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const account = accounts.find(a => a.email === cleanEmail);
    if (!account) return { ok: false, error: "Аккаунт не найден" };
    const hash = await hashPassword(password, account.salt);
    if (hash !== account.passwordHash) return { ok: false, error: "Неверный пароль" };
    setCurrentId(account.id);
    return { ok: true };
  };

  const signOut = () => setCurrentId(null);

  const updateProfile = (patch: Partial<Pick<Account, "name" | "avatar">>) => {
    if (!currentId) return;
    setAccounts(prev => prev.map(a => (a.id === currentId ? { ...a, ...patch } : a)));
  };

  const deleteAccount = () => {
    if (!currentId) return;
    setAccounts(prev => prev.filter(a => a.id !== currentId));
    setCurrentId(null);
  };

  const value = useMemo<AuthState>(
    () => ({ user, ready, signUp, signIn, signOut, updateProfile, deleteAccount }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, ready, accounts, currentId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
