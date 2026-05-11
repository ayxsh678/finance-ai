import { useEffect, useState } from "react";
import {
  TrendingUp, Sparkles, PieChart, Target, Newspaper,
  Bell, ShieldCheck, Zap, ArrowRight, ChevronRight,
  BarChart2, Lock, RefreshCw,
} from "lucide-react";
import FintrestMark from "./FintrestMark";

// ── Mock hero UI data ──────────────────────────────────────
const MOCK_INDICATORS = [
  { label: "RSI",         value: 62,  pos: true  },
  { label: "MACD",        value: 71,  pos: true  },
  { label: "Vol Surge",   value: 84,  pos: true  },
  { label: "52W Range",   value: 58,  pos: true  },
  { label: "Inst. Flow",  value: 79,  pos: true  },
];

const MOCK_CHAT = [
  { role: "user",  text: "Should I buy Reliance now?" },
  { role: "kyra",  text: "Conviction 78/100 — strong. Inst. buying ↑ 3 sessions. MACD bullish crossover Friday. Watch ₹2,900 resistance. Risk: crude volatility." },
];

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Live Market Intelligence",
    desc: "Real-time prices for 200+ NSE/BSE stocks with sparklines, 52W range, and 60-second auto-refresh.",
  },
  {
    icon: Sparkles,
    title: "Kyra AI Co-pilot",
    desc: "Ask anything about Indian equities in plain English. Kyra pulls live data and delivers research-grade answers instantly.",
  },
  {
    icon: PieChart,
    title: "Portfolio Risk Analysis",
    desc: "Add holdings with quantity and avg price. Get sector concentration flags, P&L breakdown, and an AI narrative on your exposure.",
  },
  {
    icon: Target,
    title: "Conviction Scoring",
    desc: "11-indicator proprietary scoring system — RSI, MACD, institutional flow, volume surge, and more — distilled into one number.",
  },
  {
    icon: Newspaper,
    title: "Sentiment Analysis",
    desc: "News-backed sentiment scoring per ticker. Bullish / neutral / bearish with per-article impact weighting.",
  },
  {
    icon: Bell,
    title: "Price Alerts",
    desc: "Set above/below price triggers for any NSE/BSE stock. Get notified the moment a threshold is crossed.",
  },
];

const TRUST_ITEMS = [
  { icon: Lock,      label: "Read-only data",    desc: "No trading. No custody. Your money stays at your broker." },
  { icon: ShieldCheck, label: "Firebase Auth",   desc: "Google-grade authentication. Email + Google OAuth." },
  { icon: RefreshCw, label: "Live data sources", desc: "yfinance · EODHD · Finnhub · NewsAPI. Always fresh." },
  { icon: Zap,       label: "AI-native speed",   desc: "Groq-powered inference. Answers in under 2 seconds." },
];

// ── Subcomponents ──────────────────────────────────────────
function Nav({ onSignIn }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav className={`ln-nav${scrolled ? " ln-nav--scrolled" : ""}`}>
      <div className="ln-container ln-nav-inner">
        <div className="ln-brand">
          <FintrestMark variant="appnav" size={22} color="#F0EEE8" />
          <span className="ln-brand-name">Fintrest</span>
        </div>
        <div className="ln-nav-links">
          <a href="#features">Features</a>
          <a href="#kyra">Kyra AI</a>
          <a href="#trust">Security</a>
        </div>
        <div className="ln-nav-ctas">
          <button className="ln-btn-ghost" onClick={onSignIn}>Sign in</button>
          <button className="ln-btn-primary" onClick={onSignIn}>
            Get started free
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </nav>
  );
}

function MockHeroUI() {
  return (
    <div className="ln-mock-card">
      {/* Stock header */}
      <div className="ln-mock-header">
        <div>
          <div className="ln-mock-ticker">RELIANCE.NS</div>
          <div className="ln-mock-name">Reliance Industries</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="ln-mock-price">₹2,847.50</div>
          <div className="ln-mock-change ln-pos">▲ +2.14%</div>
        </div>
      </div>

      {/* Conviction score */}
      <div className="ln-mock-section">
        <div className="ln-mock-label">Conviction Score</div>
        <div className="ln-mock-score-row">
          <div className="ln-mock-score-bar">
            <div className="ln-mock-score-fill" style={{ width: "78%" }} />
          </div>
          <span className="ln-mock-score-num">78</span>
          <span className="ln-mock-badge">Bullish</span>
        </div>
        <div className="ln-mock-indicators">
          {MOCK_INDICATORS.map((ind) => (
            <div key={ind.label} className="ln-mock-ind">
              <span className="ln-mock-ind-label">{ind.label}</span>
              <div className="ln-mock-ind-bar">
                <div
                  className="ln-mock-ind-fill"
                  style={{ width: `${ind.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kyra mini chat */}
      <div className="ln-mock-chat">
        <div className="ln-mock-chat-label">
          <Sparkles size={10} style={{ color: "var(--accent)" }} />
          Kyra
        </div>
        {MOCK_CHAT.map((m, i) => (
          <div key={i} className={`ln-mock-bubble ln-mock-bubble-${m.role}`}>
            {m.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero({ onSignIn }) {
  return (
    <section className="ln-hero">
      <div className="ln-hero-glow" />
      <div className="ln-container ln-hero-grid">
        <div className="ln-hero-left">
          <div className="ln-eyebrow">
            <span className="ln-eyebrow-dot" />
            AI-native Indian equity platform
          </div>
          <h1 className="ln-h1">
            Make smarter<br />
            <em>investment decisions.</em>
          </h1>
          <p className="ln-hero-sub">
            Kyra analyzes NSE&nbsp;&amp;&nbsp;BSE stocks in real-time — conviction
            scores, sentiment, portfolio risk, earnings intel. Research-grade
            answers in seconds.
          </p>
          <div className="ln-hero-ctas">
            <button className="ln-btn-primary ln-btn-lg" onClick={onSignIn}>
              Start for free
              <ArrowRight size={16} />
            </button>
            <a href="#features" className="ln-btn-ghost ln-btn-lg">
              See what's inside
              <ChevronRight size={15} />
            </a>
          </div>
          <p className="ln-hero-note">No credit card required · NSE &amp; BSE coverage</p>
        </div>
        <div className="ln-hero-right">
          <MockHeroUI />
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  const stats = [
    { value: "200+",  label: "NSE/BSE stocks" },
    { value: "11",    label: "conviction indicators" },
    { value: "60s",   label: "live price refresh" },
    { value: "< 2s",  label: "AI response time" },
  ];
  return (
    <div className="ln-stats-bar">
      <div className="ln-container ln-stats-inner">
        {stats.map((s, i) => (
          <div key={i} className="ln-stat">
            <span className="ln-stat-value">{s.value}</span>
            <span className="ln-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="ln-section">
      <div className="ln-container">
        <div className="ln-section-label">Platform capabilities</div>
        <h2 className="ln-h2">
          Everything you need to<br />
          <em>invest with conviction.</em>
        </h2>
        <p className="ln-section-sub">
          Six research tools. One unified platform. Built for Indian retail investors
          who want institutional-quality intelligence without the noise.
        </p>
        <div className="ln-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="ln-feature-card">
              <div className="ln-feature-icon">
                <f.icon size={18} />
              </div>
              <h3 className="ln-feature-title">{f.title}</h3>
              <p className="ln-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function KyraShowcase() {
  return (
    <section id="kyra" className="ln-section ln-kyra-section">
      <div className="ln-kyra-glow" />
      <div className="ln-container ln-kyra-grid">
        <div className="ln-kyra-left">
          <div className="ln-kyra-chat-window">
            <div className="ln-kyra-chat-header">
              <Sparkles size={14} style={{ color: "var(--accent)" }} />
              <span>Kyra</span>
              <span className="ln-kyra-status">● Live</span>
            </div>
            <div className="ln-kyra-messages">
              {[
                { role: "user", text: "Compare HDFCBANK vs ICICIBANK" },
                { role: "kyra", text: "ICICIBANK edges ahead — higher ROE (18.2% vs 16.8%), better NIM trajectory, and stronger retail loan growth this quarter. HDFCBANK has lower NPA but is still integrating HDFC Ltd. For 12M horizon: ICICI." },
                { role: "user", text: "What about Reliance earnings risk?" },
                { role: "kyra", text: "Earnings on Aug 18. Street expects ₹19.4 EPS (+8% YoY). Jio ARPU and O2C margins are the swing factors. Conviction holds at 78 — but reduce position size 20% before the print if you're risk-averse." },
              ].map((m, i) => (
                <div key={i} className={`ln-kyra-msg ln-kyra-msg-${m.role}`}>
                  <div className="ln-kyra-msg-text">{m.text}</div>
                </div>
              ))}
              <div className="ln-kyra-typing-row">
                <Sparkles size={11} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <div className="ln-kyra-typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
            <div className="ln-kyra-input-mock">
              <span>Ask about any NSE/BSE stock…</span>
              <div className="ln-kyra-send-mock">
                <ArrowRight size={12} />
              </div>
            </div>
          </div>
        </div>

        <div className="ln-kyra-right">
          <div className="ln-section-label">Meet Kyra</div>
          <h2 className="ln-h2" style={{ maxWidth: 460 }}>
            Your AI analyst,<br />
            <em>always on call.</em>
          </h2>
          <p className="ln-section-sub" style={{ maxWidth: 420 }}>
            Kyra isn't a chatbot with canned answers. She pulls live market
            data, runs real analysis, and gives you actionable intelligence —
            contextually aware of what you're currently viewing.
          </p>
          <ul className="ln-kyra-bullets">
            {[
              "Context-aware — knows which stock you're viewing",
              "Live data grounding — no hallucinated prices",
              "Comparison, portfolio, forex — all in one chat",
              "Available on every screen, instantly",
            ].map((b) => (
              <li key={b}>
                <ChevronRight size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section id="trust" className="ln-section">
      <div className="ln-container">
        <div className="ln-section-label">Built with trust</div>
        <h2 className="ln-h2">
          Your data stays<br />
          <em>where it belongs.</em>
        </h2>
        <div className="ln-trust-grid">
          {TRUST_ITEMS.map((t) => (
            <div key={t.label} className="ln-trust-card">
              <div className="ln-trust-icon">
                <t.icon size={16} />
              </div>
              <div>
                <div className="ln-trust-title">{t.label}</div>
                <div className="ln-trust-desc">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="ln-sources-row">
          <span className="ln-sources-label">Data powered by</span>
          {["yfinance", "EODHD", "Finnhub", "NewsAPI", "CoinGecko"].map((s) => (
            <span key={s} className="ln-source-chip">{s}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onSignIn }) {
  return (
    <section className="ln-cta-section">
      <div className="ln-cta-glow" />
      <div className="ln-container ln-cta-inner">
        <div className="ln-eyebrow">
          <span className="ln-eyebrow-dot" />
          Free to start
        </div>
        <h2 className="ln-h2" style={{ maxWidth: 600, margin: "16px auto 20px" }}>
          Stop guessing.<br />
          <em>Start investing with conviction.</em>
        </h2>
        <p style={{ color: "var(--text-sec)", maxWidth: 460, margin: "0 auto 36px", lineHeight: 1.6 }}>
          Join investors who use Fintrest to cut through market noise and make
          decisions backed by real data.
        </p>
        <button className="ln-btn-primary ln-btn-xl" onClick={onSignIn}>
          Get started — it's free
          <ArrowRight size={16} />
        </button>
        <p className="ln-cta-note">No credit card · No trading · Read-only market intelligence</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="ln-footer">
      <div className="ln-container ln-footer-inner">
        <div className="ln-brand" style={{ gap: 10 }}>
          <FintrestMark variant="appnav" size={18} color="var(--text-ter)" />
          <span style={{ color: "var(--text-ter)", fontSize: 13 }}>
            © 2026 Fintrest
          </span>
        </div>
        <div className="ln-footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Security</a>
          <a href="mailto:hello@fintrest.com">Contact</a>
        </div>
      </div>
    </footer>
  );
}

// ── Main export ────────────────────────────────────────────
export default function LandingPage({ onSignIn }) {
  // Allow page to scroll (app sets overflow: hidden on root)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlHeight:   html.style.height,
      bodyOverflow: body.style.overflow,
      bodyHeight:   body.style.height,
      rootOverflow: root?.style.overflow,
      rootHeight:   root?.style.height,
    };
    html.style.overflow = "auto";
    html.style.height   = "auto";
    body.style.overflow = "auto";
    body.style.height   = "auto";
    if (root) { root.style.overflow = "auto"; root.style.height = "auto"; }
    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.height   = prev.htmlHeight;
      body.style.overflow = prev.bodyOverflow;
      body.style.height   = prev.bodyHeight;
      if (root) { root.style.overflow = prev.rootOverflow; root.style.height = prev.rootHeight; }
    };
  }, []);

  return (
    <div className="ln-root">
      <Nav onSignIn={onSignIn} />
      <Hero onSignIn={onSignIn} />
      <StatsBar />
      <Features />
      <KyraShowcase />
      <Trust />
      <FinalCTA onSignIn={onSignIn} />
      <Footer />
    </div>
  );
}
