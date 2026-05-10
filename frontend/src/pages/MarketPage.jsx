import { C, TIME_RANGES, SUGGESTIONS } from "../constants";
import { currencySymbol } from "../utils";
import { StockCard, TradingViewChart, SentimentGauge, ConvictionScore, NewsFeed } from "../components";

export default function MarketPage({
  isMobile, watchlist, selectedStock, sentiments, sentimentLoading,
  convictions, convictionLoading,
  newsData, newsLoading, chartDays, setChartDays, handleSelectStock, sendMessage,
}) {
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
        {/* Stock header */}
        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {selectedStock.ticker} · {selectedStock.type}
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: C.text, marginBottom: 8 }}>{selectedStock.name}</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 36, color: C.text, lineHeight: 1 }}>
                {selectedStock.price == null ? "—" : `${currencySymbol(selectedStock.type)}${selectedStock.price.toLocaleString()}`}
              </div>
            </div>
            <div style={{ textAlign: "right", paddingTop: 4 }}>
              {selectedStock.change != null && (
                <span className={(selectedStock.change ?? 0) >= 0 ? "pill-pos" : "pill-neg"}>
                  {(selectedStock.change ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(selectedStock.change ?? 0).toFixed(2)}%
                </span>
              )}
            </div>
          </div>

          {/* Time range pills */}
          <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>
            {TIME_RANGES.map(tr => (
              <button key={tr.label} className={`time-range-pill${chartDays === tr.days ? " active" : ""}`}
                onClick={() => setChartDays(tr.days)}>
                {tr.label}
              </button>
            ))}
          </div>

          <TradingViewChart ticker={selectedStock.ticker} height={isMobile ? 180 : 240} days={chartDays} />
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
