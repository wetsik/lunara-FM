import { useState } from "react";
import { ArrowLeft, Check, Zap, Music2, Wifi, Download, Shield, Headphones, Star } from "lucide-react";

type Page = "home" | "search" | "library" | "favorites" | "albums" | "artists" | "podcasts" | "settings" | "album" | "artist" | "playlist" | "fullscreen" | "profile" | "premium";

interface PremiumPageProps {
  onNavigate: (page: Page) => void;
}

const PLAN_KEY = "lunaraSelectedPlan";

const plans = [
  {
    id: "individual",
    name: "Individual",
    price: "$9.99",
    period: "/ month",
    description: "Perfect for solo listening",
    popular: false,
    features: [
      "Ad-free music",
      "Offline downloads",
      "High quality audio (320kbps)",
      "AI playlist generation",
      "Unlimited skips",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$14.99",
    period: "/ month",
    description: "The ultimate music experience",
    popular: true,
    features: [
      "Everything in Individual",
      "Lossless & spatial audio",
      "Advanced AI recommendations",
      "Exclusive early access tracks",
      "Artist video sessions",
      "Priority support",
      "Cross-device sync",
    ],
  },
  {
    id: "family",
    name: "Family",
    price: "$17.99",
    period: "/ month",
    description: "Up to 6 accounts",
    popular: false,
    features: [
      "6 premium accounts",
      "Individual controls per user",
      "Family music mix",
      "Ad-free listening",
      "Offline downloads",
      "Parental controls",
    ],
  },
];

const perks = [
  { icon: Music2, title: "Lossless Audio", description: "Experience music as the artist intended with FLAC and 24-bit audio." },
  { icon: Wifi, title: "Spatial Audio", description: "Immersive 360° sound that puts you inside the music." },
  { icon: Download, title: "Offline Mode", description: "Download up to 10,000 songs and listen anywhere." },
  { icon: Shield, title: "No Ads, Ever", description: "Pure, uninterrupted listening from the first track." },
  { icon: Headphones, title: "AI DJ Mode", description: "Your personal AI disc jockey that knows your taste perfectly." },
  { icon: Star, title: "Exclusive Content", description: "Access artist sessions, live recordings, and unreleased tracks." },
];

export function PremiumPage({ onNavigate }: PremiumPageProps) {
  const [selected, setSelected] = useState<string | null>(() => {
    try { return localStorage.getItem(PLAN_KEY); } catch { return null; }
  });

  const choosePlan = (id: string) => {
    setSelected(id);
    try { localStorage.setItem(PLAN_KEY, id); } catch { /* ignore */ }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero */}
      <div
        className="relative px-4 pt-5 pb-12 text-center sm:px-6 lg:px-8 lg:pt-6 lg:pb-16"
        style={{
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, transparent 100%)",
        }}
      >
        <button
          onClick={() => onNavigate("home")}
          className="absolute left-4 top-5 flex items-center gap-2 text-sm transition-colors sm:left-6 lg:left-8 lg:top-6"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <div className="flex items-center justify-center gap-2 mb-4 mt-10 sm:mt-8">
          <div
            className="brand-glow w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--emerald)", boxShadow: "0 0 24px var(--emerald-glow)" }}
          >
            <Zap size={20} color="var(--brand-on-accent)" fill="var(--brand-on-accent)" />
          </div>
          <span className="brand-wordmark text-lg font-bold" style={{ color: "var(--text-primary)" }}>Lunara Pro</span>
        </div>

        <h1 className="text-3xl font-extrabold mb-4 sm:text-5xl" style={{ color: "var(--text-primary)", letterSpacing: "-0.04em" }}>
          Music Without Limits
        </h1>
        <p className="mx-auto max-w-lg text-sm sm:text-lg" style={{ color: "var(--text-secondary)" }}>
          Unlock the full Lunara experience. Lossless audio, AI recommendations, and exclusive content.
        </p>
      </div>

      {/* Plans */}
      <div className="px-4 mb-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-3">
          {plans.map(plan => (
            <div
              key={plan.id}
              className="relative rounded-3xl p-5 sm:p-6"
              style={{
                background: plan.popular ? "linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06))" : "var(--surface-1)",
                border: plan.popular ? "1px solid rgba(255, 255, 255, 0.35)" : "1px solid var(--glass-border)",
                boxShadow: plan.popular ? "0 0 40px rgba(255, 255, 255, 0.08)" : "none",
              }}
            >
              {plan.popular && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold"
                  style={{ background: "var(--emerald)", color: "var(--brand-on-accent)" }}
                >
                  MOST POPULAR
                </div>
              )}

              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: plan.popular ? "var(--emerald)" : "var(--text-muted)" }}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-extrabold lg:text-4xl" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>{plan.price}</span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>{plan.period}</span>
                </div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{plan.description}</p>
              </div>

              <button
                onClick={() => choosePlan(plan.id)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold mb-5 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                style={{
                  background: selected === plan.id ? "var(--emerald)" : plan.popular ? "var(--emerald)" : "var(--glass-bg)",
                  color: selected === plan.id || plan.popular ? "var(--brand-on-accent)" : "var(--text-secondary)",
                  border: plan.popular || selected === plan.id ? "none" : "1px solid var(--glass-border)",
                  boxShadow: plan.popular || selected === plan.id ? "0 4px 16px var(--emerald-glow)" : "none",
                }}
              >
                {selected === plan.id ? <><Check size={14} /> Текущий план</> : plan.popular ? "Get Pro" : "Choose Plan"}
              </button>

              <ul className="space-y-2.5">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: plan.popular ? "var(--emerald-dim)" : "var(--glass-bg)" }}
                    >
                      <Check size={9} style={{ color: plan.popular ? "var(--emerald)" : "var(--text-muted)" }} />
                    </div>
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          All plans include a 30-day free trial. Cancel anytime.
        </p>
      </div>

      {/* Perks */}
      <div className="px-4 pb-12 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold text-center mb-8" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Why Go Pro?
        </h2>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {perks.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="p-5 rounded-2xl"
              style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "var(--emerald-dim)" }}
              >
                <Icon size={18} style={{ color: "var(--emerald)" }} />
              </div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
