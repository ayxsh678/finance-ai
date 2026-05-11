import { useState, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Bookmark, Bell, PieChart,
  Sparkles, ArrowRight, Activity, ChevronRight,
} from "lucide-react";
import { C } from "../constants";
import { currencySymbol, fmtInr, sentimentColor } from "../utils";

// ── Sub-components ─────────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, accent, onClick, empty }) {
  return (
    <button
      className={`ov-kpi-card${empty ? " ov-kpi-card--empty" : ""}`}
      onClick={onClick}
      style={{ "--kpi-accent": accent || "var(--text-sec)" }}
    >
      <div className="ov-kpi-top">
        <span className="ov-kpi-label">{label}</span>
        <div className="ov-kpi-icon">
          <Icon size={14} />
        </div>
      </div>
      <div className="ov-kpi-value">{value}</div>
      <div className="ov-kpi-sub">{sub}</div>
    </button>
  );
}

function MoverRow({ stock, onClick }) {
  const change = stock.change ?? 0;
  const pos = change >= 0;
  const pct = Math.abs(change).toFixed(2);
  const width = Math.min(Math.abs(change) * 10, 100);

  return (
    <button className="ov-mover-row" onClick={onClick}>
      <div className="ov-mover-left">
        <span className="ov-mover-ticker">{stock.ticker.replace(".NS", "").replace(".BO", "")}</span>
        <span className="ov-mover-name">{stock.name}</span>
      </div>
      <div className="ov-mover-right">
        <span className="ov-mover-price">
          {stock.price != null
            ? `${currencySymbol(stock.type)}${stock.price.toLocaleString("en-IN")}`
            : "—"}
        </span>
        <span className={`ov-mover-change${pos ? " pos" : " neg"}`}>
          {pos ? "▲" : "▼"} {pct}%
        </span>
        <div className="ov-mover-bar-wrap">
          <div
            className={`ov-mover-bar${pos ? " pos" : " neg"}`}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
    </button>
  );
}

function QuickKyra({ onAskKyra, loading, selectedStock }) {
  const [val, setVal] = useState("");
  const suggestions = [
    `Should I buy ${selectedStock?.ticker?.replace(".NS","") || "Reliance"} right now?`,
    "What are the top movers on NSE today?",
    "Summarize my portfolio risk",
  ];

  const handleSend = (q) => {
    const text = q || val.trim();
    if (!text) return;
    onAskKyra(text);
    if (!q) setVal("");
  };

  return (
    <div className="ov-quick-kyra">
      <div className="ov-quick-input-row">
        <input
          className="ov-quick-input"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask Kyra about any stock…"
          autoComplete="off"
        />
        <button
          className="ov-quick-send"
          onClick={() => handleSend()}
          disabled={!val.trim() || loading}
        >
          <ArrowRight size={14} />
        </button>
      </div>
      <div className="ov-quick-suggestions">
        {suggestions.map((s, i) => (
          <button key={i} className="ov-quick-suggestion" onClick={() => handleSend(s)}>
            <ChevronRight size={11} style={{ flexShrink: 0, opacity: 0.5 }} />
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function SentimentOverview({ watchlist, sentiments }) {
  const counts = useMemo(() => {
    const c = { Bullish: 0, Neutral: 0, Bearish: 0, Unknown: 0 };
    watchlist.forEach((s) => {
      const lbl = sentiments[s.ticker]?.label;
      if (lbl === "bullish" || lbl === "Bullish") c.Bullish++;
      else if (lbl === "bearish" || lbl === "Bearish") c.Bearish++;
      else if (lbl === "neutral" || lbl === "Neutral") c.Neutral++;
      else c.Unknown++;
    });
    return c;
  }, [watchlist, sentiments]);

  const total = watchlist.length || 1;

  return (
    <div className="ov-sentiment">
      {[
        { key: "Bullish",  color: C.pos },
        { key: "Neutral",  color: C.neutral },
        { key: "Bearish",  color: C.neg },
      ].map(({ key, color }) => (
        <div key={key} className="ov-sentiment-row">
          <span className="ov-sentiment-label" style={{ color }}>{key}</span>
          <div className="ov-sentiment-track">
            <div
              className="ov-sentiment-fill"
              style={{ width: `${(counts[key] / total) * 100}%`, background: color }}
            />
          </div>
          <span className="ov-sentiment-count">{counts[key]}</span>
        </div>
      ))}
      {counts.Unknown > 0 && (
        <div className="ov-sentiment-row">
          <span className="ov-sentiment-label" style={{ color: C.textTer }}>Loading</span>
          <div className="ov-sentiment-track">
            <div className="ov-sentiment-fill" style={{ width: `${(counts.Unknown / total) * 100}%`, background: C.border }} />
          </div>
          <span className="ov-sentiment-count">{counts.Unknown}</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

export default function OverviewPage({
  isMobile,
  watchlist,
  selectedStock,
  handleSelectStock,
  sentiments,
  activeAlerts,
  holdings,
  analysisResult,
  sendMessage,
  loading,
  setActiveSection,
  onAskKyra,
}) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const dateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Top movers — sorted by abs change, show 5
  const topMovers = useMemo(
    () =>
      [...watchlist]
        .filter((s) => s.change != null)
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 5),
    [watchlist]
  );

  const bestPerformer = useMemo(
    () =>
      watchlist
        .filter((s) => s.change != null && s.change > 0)
        .sort((a, b) => b.change - a.change)[0] ?? null,
    [watchlist]
  );

  const portfolioValue = analysisResult?.total_value_inr ?? null;

  return (
    <div style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
    <div className="ov-page">
      {/* Header */}
      <div className="ov-header">
        <div className="ov-header-left">
          <div className="ov-greeting">{greeting}</div>
          <div className="ov-date">{dateStr}</div>
        </div>
        <div className="ov-market-status">
          <span className="ov-status-dot" />
          NSE&nbsp;·&nbsp;Live
        </div>
      </div>

      {/* KPI row */}
      <div className="ov-kpi-grid">
        <KPICard
          label="Portfolio"
          value={portfolioValue != null ? `₹${fmtInr(portfolioValue)}` : "—"}
          sub={portfolioValue != null ? `${holdings.length} holdings tracked` : "Add holdings to analyse"}
          icon={PieChart}
          accent={portfolioValue != null ? C.accent : null}
          empty={portfolioValue == null}
          onClick={() => setActiveSection("portfolio")}
        />
        <KPICard
          label="Best Performer"
          value={bestPerformer ? bestPerformer.ticker.replace(".NS","").replace(".BO","") : "—"}
          sub={bestPerformer ? `▲ ${bestPerformer.change?.toFixed(2)}% today` : "Prices loading…"}
          icon={TrendingUp}
          accent={bestPerformer ? C.pos : null}
          onClick={() => {
            if (bestPerformer) { handleSelectStock(bestPerformer); setActiveSection("market"); }
          }}
        />
        <KPICard
          label="Watchlist"
          value={`${watchlist.length}`}
          sub="stocks · 60s auto-refresh"
          icon={Bookmark}
          accent={C.accent}
          onClick={() => setActiveSection("watchlist")}
        />
        <KPICard
          label="Active Alerts"
          value={`${activeAlerts.length}`}
          sub={activeAlerts.length ? `${activeAlerts.length} price trigger${activeAlerts.length !== 1 ? "s" : ""}` : "No triggers set"}
          icon={Bell}
          accent={activeAlerts.length ? C.accent : null}
          empty={activeAlerts.length === 0}
          onClick={() => setActiveSection("alerts")}
        />
      </div>

      {/* Main grid */}
      <div className="ov-main-grid">
        {/* Market pulse */}
        <div className="ov-section">
          <div className="ov-section-hd">
            <div className="ov-section-title">
              <Activity size={13} style={{ color: C.accent }} />
              Market Pulse
            </div>
            <button className="ov-link" onClick={() => setActiveSection("watchlist")}>
              All stocks <ArrowRight size={11} />
            </button>
          </div>

          {topMovers.length === 0 ? (
            <div className="ov-empty">Prices loading…</div>
          ) : (
            <div className="ov-movers-list">
              {topMovers.map((s) => (
                <MoverRow
                  key={s.ticker}
                  stock={s}
                  onClick={() => { handleSelectStock(s); setActiveSection("market"); }}
                />
              ))}
            </div>
          )}

          {/* Flat stocks (no change data yet) */}
          {watchlist.filter((s) => s.change == null).length > 0 && topMovers.length === 0 && (
            <div className="ov-empty">Fetching live prices…</div>
          )}
        </div>

        {/* Right column */}
        <div className="ov-right-col">
          {/* Quick Kyra */}
          <div className="ov-section">
            <div className="ov-section-hd">
              <div className="ov-section-title" style={{ color: C.accent }}>
                <Sparkles size={13} />
                Ask Kyra
              </div>
              <button className="ov-link" onClick={() => setActiveSection("chat")}>
                Full chat <ArrowRight size={11} />
              </button>
            </div>
            <QuickKyra
              onAskKyra={onAskKyra}
              loading={loading}
              selectedStock={selectedStock}
            />
          </div>

          {/* Watchlist Sentiment */}
          <div className="ov-section" style={{ marginTop: 16 }}>
            <div className="ov-section-hd">
              <div className="ov-section-title">
                <TrendingUp size={13} style={{ color: C.accent }} />
                Watchlist Sentiment
              </div>
            </div>
            <SentimentOverview watchlist={watchlist} sentiments={sentiments} />
          </div>

          {/* Compare shortcut */}
          <button className="ov-compare-cta" onClick={() => setActiveSection("compare")}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>Compare two stocks</div>
              <div style={{ fontSize: 12, color: C.textSec }}>Side-by-side AI analysis with Kyra's verdict</div>
            </div>
            <ArrowRight size={14} style={{ color: C.accent, flexShrink: 0 }} />
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
