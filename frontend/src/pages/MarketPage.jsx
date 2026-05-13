import { MessageSquare, ArrowLeftRight, Bell, TrendingUp, TrendingDown } from "lucide-react";
import { C, TIME_RANGES, SUGGESTIONS } from "../constants";
import { currencySymbol, fmtInr } from "../utils";
import { StockCard, TradingViewChart, SentimentGauge, ConvictionScore, NewsFeed } from "../components";

function StatChip({ label, value, highlight }) {
  return (
    <div className="mkt-stat-chip">
      <span className="mkt-stat-label">{label}</span>
      <span className="mkt-stat-value" style={highlight ? { color: highlight } : undefined}>{value}</span>
    </div>
  );
}

function ExchangeBadge({ ticker, type }) {
  const exchange = ticker.endsWith(".NS") ? "NSE" : ticker.endsWith(".BO") ? "BSE" : type === "crypto" ? "CRYPTO" : "NYSE";
  return <span className="mkt-badge mkt-badge--exchange">{exchange}</span>;
}

function fmtMarketCap(v) {
  if (v == null) return "—";
  if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `₹${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e7)  return `₹${(v / 1e7).toFixed(2)}Cr`;
  return `₹${v.toLocaleString("en-IN")}`;
}

function week52Bar(price, low, high) {
  if (price == null || low == null || high == null || high === low) return null;
  return Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100));
}

export default function MarketPage({
  isMobile, watchlist, selectedStock, sentiments, sentimentLoading,
  convictions, convictionLoading,
  newsData, newsLoading, chartDays, setChartDays, handleSelectStock, sendMessage,
  stockQuote, stockQuoteLoading, setActiveSection,
}) {
  const sym    = currencySymbol(selectedStock.type);
  const change = selectedStock.change ?? 0;
  const pos    = change >= 0;

  // Prefer live quote data over watchlist price for abs change calc
  const price      = selectedStock.price;
  const prevClose  = stockQuote?.prev_close ?? null;
  const absChange  = price != null && prevClose != null ? price - prevClose : null;

  const week52H = stockQuote?.week52_high ?? null;
  const week52L = stockQuote?.week52_low  ?? null;
  const mktCap  = stockQuote?.market_cap  ?? null;
  const pe      = stockQuote?.pe_ratio    ?? null;
  const relVol  = stockQuote?.rel_volume ?? stockQuote?.rel_vol ?? null;

  const w52pct  = week52Bar(price, week52L, week52H);

  const displayTicker = selectedStock.ticker.replace(".NS", "").replace(".BO", "");

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Stock list */}
      {!isMobile && (
        <div style={{ width: 280, minWidth: 280, borderRight: `1px solid ${C.border}`, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {watchlist.map((s) => (
            <StockCard key={s.ticker} stock={s}
              isSelected={selectedStock.ticker === s.ticker}
              onClick={() => handleSelectStock(s)}
              sentiment={sentiments[s.ticker] ?? null}
              sentimentLoading={sentimentLoading[s.ticker] ?? false}
            />
          ))}
        </div>
      )}

      {/* Chart + detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? 16 : 24, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Polished Stock Header ─────────────────────── */}
        <div className="card mkt-header-card">

          {/* Row 1: badges + actions */}
          <div className="mkt-header-top">
            <div className="mkt-badges">
              <ExchangeBadge ticker={selectedStock.ticker} type={selectedStock.type} />
              <span className="mkt-badge mkt-badge--type">{selectedStock.type}</span>
            </div>
            <div className="mkt-actions">
              <button
                className="mkt-action-btn"
                onClick={() => sendMessage(`Give me a quick Kyra analysis of ${selectedStock.ticker} — should I buy, hold, or sell?`)}
                title="Ask Kyra"
              >
                <MessageSquare size={13} />
                Ask Kyra
              </button>
              <button
                className="mkt-action-btn"
                onClick={() => setActiveSection("compare")}
                title="Compare"
              >
                <ArrowLeftRight size={13} />
                Compare
              </button>
              <button
                className="mkt-action-btn"
                onClick={() => setActiveSection("alerts")}
                title="Set Alert"
              >
                <Bell size={13} />
                Alert
              </button>
            </div>
          </div>

          {/* Row 2: ticker + name + price */}
          <div className="mkt-header-main">
            <div className="mkt-header-left">
              <div className="mkt-ticker-row">
                <span className="mkt-ticker">{displayTicker}</span>
                <span className="mkt-name">{selectedStock.name}</span>
              </div>
              <div className="mkt-price-row">
                <span className="mkt-price">
                  {price == null ? "—" : `${sym}${price.toLocaleString("en-IN")}`}
                </span>
                {price != null && (
                  <div className="mkt-change-group">
                    <span className={`mkt-change-pct${pos ? " pos" : " neg"}`}>
                      {pos ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
                      {pos ? "+" : ""}{change.toFixed(2)}%
                    </span>
                    {absChange != null && (
                      <span className={`mkt-change-abs${pos ? " pos" : " neg"}`}>
                        {pos ? "+" : ""}{sym}{Math.abs(absChange).toFixed(2)}
                      </span>
                    )}
                    <span className="mkt-change-period">5D</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: stats strip */}
          <div className="mkt-stats-strip">
            <StatChip label="52W High" value={week52H != null ? `${sym}${week52H.toLocaleString("en-IN")}` : "—"} highlight={C.pos} />
            <StatChip label="52W Low"  value={week52L != null ? `${sym}${week52L.toLocaleString("en-IN")}` : "—"} highlight={C.neg} />
            <StatChip label="Mkt Cap"  value={fmtMarketCap(mktCap)} />
            <StatChip label="P/E"      value={pe != null ? pe.toFixed(1) : "—"} />
            <StatChip label="Rel Vol"  value={relVol != null ? `${relVol}x` : "—"}
              highlight={relVol != null && relVol > 1.5 ? C.gold : undefined}
            />
          </div>

          {/* 52W range bar */}
          {w52pct != null && (
            <div className="mkt-52w-bar-wrap">
              <span className="mkt-52w-end-label">{sym}{week52L?.toLocaleString("en-IN")}</span>
              <div className="mkt-52w-track">
                <div className="mkt-52w-fill" style={{ width: `${w52pct}%` }} />
                <div className="mkt-52w-thumb" style={{ left: `${w52pct}%` }} />
              </div>
              <span className="mkt-52w-end-label">{sym}{week52H?.toLocaleString("en-IN")}</span>
            </div>
          )}

          {/* Time range pills */}
          <div className="mkt-time-pills">
            {TIME_RANGES.map(tr => (
              <button key={tr.label} className={`time-range-pill${chartDays === tr.days ? " active" : ""}`}
                onClick={() => setChartDays(tr.days)}>
                {tr.label}
              </button>
            ))}
          </div>

          <TradingViewChart ticker={selectedStock.ticker} height={isMobile ? 180 : 240} days={chartDays} compact={isMobile} />
        </div>

        <ConvictionScore ticker={selectedStock.ticker} conviction={convictions[selectedStock.ticker]} loading={convictionLoading[selectedStock.ticker] ?? false} />
        <SentimentGauge ticker={selectedStock.ticker} sentiment={sentiments[selectedStock.ticker]} loading={sentimentLoading[selectedStock.ticker] ?? false} />
        <NewsFeed ticker={selectedStock.ticker} news={newsData[selectedStock.ticker] ?? null} loading={newsLoading[selectedStock.ticker] ?? false} />

        {/* Suggestions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className="btn-ghost" style={{ fontSize: 12, padding: "6px 12px", borderRadius: 20 }} onClick={() => sendMessage(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
