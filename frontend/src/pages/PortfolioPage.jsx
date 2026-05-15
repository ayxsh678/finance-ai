import { useState } from "react";
import { BarChart3, CalendarClock, Plus, Scale, Stethoscope, Trash2, X, PieChart } from "lucide-react";
import { C, API_URL } from "../constants";
import { TickerAutocomplete, EmptyState } from "../components";

export default function PortfolioPage({
  isMobile, portMode, setPortMode,
  holdings, setHoldings, holdingInput, setHoldingInput, holdingError, setHoldingError,
  analysisResult, setAnalysisResult, analysisLoading, setAnalysisLoading,
  portfolio, portfolioData, portfolioLoading, portfolioInput, setPortfolioInput,
  runPortfolioAnalysis, addToPortfolio, removeFromPortfolio,
}) {
  const SEVERITY_COLOR = { high: C.neg, medium: C.neutral, low: C.pos };
  const SEVERITY_BG    = { high: "#2A1515", medium: "#1E1A0F", low: "#0F1E14" };
  const [earningsTicker, setEarningsTicker] = useState("");
  const [earningsBrief, setEarningsBrief] = useState(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError] = useState("");
  const [tradeInput, setTradeInput] = useState({ ticker: "", action: "buy", quantity: "", price: "", date: "" });
  const [tradeError, setTradeError] = useState("");
  const [trades, setTrades] = useState([]);
  const [autopsyResult, setAutopsyResult] = useState(null);
  const [autopsyLoading, setAutopsyLoading] = useState(false);

  const labelStyle = { fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: C.textSec, marginBottom: 6 };
  const metricLabelStyle = { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 };
  const modeOptions = [
    { id: "analyze", label: "Risk", Icon: Scale },
    { id: "earnings", label: "Earnings", Icon: CalendarClock },
    { id: "autopsy", label: "Autopsy", Icon: Stethoscope },
    { id: "simple", label: "Quick", Icon: BarChart3 },
  ];

  const addHolding = () => {
    const t = holdingInput.ticker.trim().toUpperCase();
    const q = parseInt(holdingInput.quantity, 10);
    const p = parseFloat(holdingInput.avgPrice);
    if (!t)            return setHoldingError("Ticker is required.");
    if (!q || q <= 0)  return setHoldingError("Quantity must be a positive number.");
    if (!p || p <= 0)  return setHoldingError("Avg buy price must be a positive number.");
    if (holdings.some(h => h.ticker === t)) return setHoldingError(`${t} already in holdings.`);
    setHoldingError("");
    setHoldings(prev => [...prev, { ticker: t, quantity: q, avg_buy_price: p }]);
    setHoldingInput({ ticker: "", quantity: "", avgPrice: "" });
  };

  const removeHolding = (ticker) => setHoldings(prev => prev.filter(h => h.ticker !== ticker));

  const runEarningsBrief = async (tickerOverride = null) => {
    const ticker = (tickerOverride || earningsTicker).trim().toUpperCase();
    if (!ticker) {
      setEarningsError("Enter a ticker to generate an earnings brief.");
      return;
    }
    setEarningsError("");
    setEarningsLoading(true);
    setEarningsBrief(null);
    try {
      const res = await fetch(`${API_URL}/earnings-brief/${encodeURIComponent(ticker)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
      setEarningsBrief(data);
      setEarningsTicker(ticker);
    } catch (err) {
      setEarningsError(`Earnings brief failed: ${err.message}`);
    }
    setEarningsLoading(false);
  };

  const addTrade = () => {
    const ticker = tradeInput.ticker.trim().toUpperCase();
    const quantity = parseInt(tradeInput.quantity, 10);
    const price = parseFloat(tradeInput.price);
    const date = tradeInput.date;
    if (!ticker) return setTradeError("Ticker is required.");
    if (!date) return setTradeError("Trade date is required.");
    if (!quantity || quantity <= 0) return setTradeError("Quantity must be a positive number.");
    if (!price || price <= 0) return setTradeError("Price must be a positive number.");
    setTradeError("");
    setTrades(prev => [...prev, { ticker, action: tradeInput.action, quantity, price, date }]);
    setTradeInput({ ticker: "", action: "buy", quantity: "", price: "", date });
  };

  const removeTrade = (idx) => setTrades(prev => prev.filter((_, i) => i !== idx));

  const runAutopsy = async () => {
    if (!trades.length) {
      setTradeError("Add at least one buy and one sell trade.");
      return;
    }
    setTradeError("");
    setAutopsyLoading(true);
    try {
      const res = await fetch(`${API_URL}/portfolio-autopsy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
      setAutopsyResult(data);
    } catch (err) {
      setAutopsyResult({ error: `Portfolio autopsy failed: ${err.message}` });
    }
    setAutopsyLoading(false);
  };

  const runAnalysis = async () => {
    if (!holdings.length) return;
    setAnalysisLoading(true);
    try {
      const res  = await fetch(`${API_URL}/analyze-portfolio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings, user_context: "" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      setAnalysisResult({ error: `Portfolio analysis failed: ${err.message}` });
    }
    setAnalysisLoading(false);
  };

  const sym = (ticker) => ticker && (ticker.endsWith(".NS") || ticker.endsWith(".BO")) ? "₹" : "$";
  const fmtVal = (v) => v >= 1e7 ? `₹${(v / 1e7).toFixed(2)}Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(2)}L` : `₹${v.toLocaleString()}`;

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: isMobile ? 16 : 24 }}>

      {/* Header + mode toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: C.text }}>Portfolio Intelligence</div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec, marginTop: 2 }}>Risk alerts, earnings briefs, FIFO trade autopsies, and quick ticker scans</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {modeOptions.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setPortMode(id)}
              style={{ minHeight: 34, padding: "0 12px", borderRadius: 8, border: `1px solid ${portMode === id ? C.accent : C.border}`, background: portMode === id ? `${C.accent}18` : "transparent", color: portMode === id ? C.accent : C.textSec, fontFamily: "'DM Sans',sans-serif", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── FULL ANALYSIS MODE ── */}
      {portMode === "analyze" && (
        <>
          {/* Holdings input form */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="label" style={{ marginBottom: 12 }}>Add Holding</div>
            <div className="port-holding-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
              <div>
                <div className="label" style={{ fontSize: 10, marginBottom: 6 }}>Ticker</div>
                <TickerAutocomplete className="input-box" value={holdingInput.ticker}
                  onChange={e => setHoldingInput(p => ({ ...p, ticker: e.target.value.toUpperCase() }))}
                  onSelect={t => setHoldingInput(p => ({ ...p, ticker: t }))}
                  onKeyDown={e => e.key === "Enter" && addHolding()}
                  placeholder="e.g. INFY.NS" />
              </div>
              <div>
                <div className="label" style={{ fontSize: 10, marginBottom: 6 }}>Quantity</div>
                <input className="input-box" type="number" min="1" value={holdingInput.quantity}
                  onChange={e => setHoldingInput(p => ({ ...p, quantity: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addHolding()}
                  placeholder="100" />
              </div>
              <div>
                <div className="label" style={{ fontSize: 10, marginBottom: 6 }}>Avg Buy Price</div>
                <input className="input-box" type="number" min="0.01" step="0.01" value={holdingInput.avgPrice}
                  onChange={e => setHoldingInput(p => ({ ...p, avgPrice: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addHolding()}
                  placeholder="1500.00" />
              </div>
              <button className="btn-gold" style={{ padding: "0 16px", height: 40 }} onClick={addHolding}>
                <Plus size={16} />
              </button>
            </div>
            {holdingError && (
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.neg, marginTop: 8 }}>
                {holdingError}
              </div>
            )}
          </div>

          {/* Holdings table */}
          {holdings.length > 0 && (
            <div className="card port-table-scroll" style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Ticker", "Qty", "Avg Price", ""].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: C.textSec, fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, i) => (
                    <tr key={h.ticker} style={{ borderBottom: i < holdings.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <td style={{ padding: "10px 16px", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.text }}>{h.ticker}</td>
                      <td style={{ padding: "10px 16px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec }}>{h.quantity.toLocaleString()}</td>
                      <td style={{ padding: "10px 16px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec }}>{sym(h.ticker)}{h.avg_buy_price.toLocaleString()}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right" }}>
                        <button onClick={() => removeHolding(h.ticker)} style={{ background: "none", border: "none", color: C.textTer, cursor: "pointer", padding: 4, display: "flex" }}
                          onMouseEnter={e => e.currentTarget.style.color = C.neg}
                          onMouseLeave={e => e.currentTarget.style.color = C.textTer}>
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {holdings.length > 0 && (
            <button className="btn-gold" style={{ width: "100%", marginBottom: 24 }}
              disabled={analysisLoading} onClick={runAnalysis}>
              {analysisLoading ? "Analyzing portfolio…" : `Analyze ${holdings.length} Holding${holdings.length > 1 ? "s" : ""}`}
            </button>
          )}

          {holdings.length === 0 && !analysisResult && (
            <EmptyState Icon={PieChart} title="No holdings added." subtitle="Enter ticker, quantity, and avg buy price above to get your AI portfolio brief." />
          )}

          {analysisResult?.error && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.neg }}>{analysisResult.error}</span>
              <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={runAnalysis}>Retry</button>
            </div>
          )}

          {/* Analysis results */}
          {analysisResult && !analysisResult.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Summary cards row */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10 }}>
                <div className="card" style={{ textAlign: "center" }}>
                  <div className="label" style={{ fontSize: 10, marginBottom: 6 }}>Total Value</div>
                  <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: C.text }}>
                    {fmtVal(analysisResult.total_value_inr)}
                  </div>
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                  <div className="label" style={{ fontSize: 10, marginBottom: 6 }}>Holdings</div>
                  <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: C.text }}>
                    {analysisResult.holdings_summary?.length ?? 0}
                  </div>
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                  <div className="label" style={{ fontSize: 10, marginBottom: 6 }}>Risk Flags</div>
                  <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: analysisResult.risk_flags?.length ? C.neg : C.pos }}>
                    {analysisResult.risk_flags?.length ?? 0}
                  </div>
                </div>
              </div>

              {/* Risk flags */}
              {analysisResult.risk_flags?.length > 0 && (
                <div>
                  <div className="label" style={{ marginBottom: 10 }}>Risk Flags</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {analysisResult.risk_flags.map((flag, i) => (
                      <div key={i} style={{ background: SEVERITY_BG[flag.severity] || C.surface, border: `1px solid ${SEVERITY_COLOR[flag.severity] || C.border}33`, borderRadius: 10, padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 600, color: SEVERITY_COLOR[flag.severity] || C.textSec, textTransform: "uppercase", letterSpacing: "0.06em" }}>{flag.severity}</span>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.text }}>{flag.flag}</span>
                        </div>
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.textSec }}>→ {flag.action}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Narrative Brief */}
              {analysisResult.narrative_brief && (
                <div className="card card-accent">
                  <div className="label" style={{ marginBottom: 10 }}>Weekly Intelligence Brief — Fintrest AI</div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: C.text, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                    {analysisResult.narrative_brief}
                  </div>
                  {analysisResult.response_time && (
                    <div style={{ marginTop: 10, fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: C.textTer }}>
                      Generated in {analysisResult.response_time}s
                    </div>
                  )}
                </div>
              )}

              {/* Holdings breakdown */}
              {analysisResult.holdings_summary?.length > 0 && (
                <>
                  <div className="label">Holdings Breakdown</div>
                  <div className="port-grid">
                    {analysisResult.holdings_summary.map((item, idx) => {
                      const isUp = (item.pnl_pct ?? 0) >= 0;
                      return (
                        <div key={item.ticker} className={`port-mini-card stagger-${Math.min(idx + 1, 6)}`}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.textSec }}>{item.ticker}</div>
                            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: C.textTer }}>{item.weight?.toFixed(1)}%</span>
                          </div>
                          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: C.text }}>
                            {sym(item.ticker)}{item.current_price?.toLocaleString() ?? "—"}
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                            <span className={isUp ? "pill-pos" : "pill-neg"} style={{ fontSize: 10, display: "inline-flex" }}>
                              {isUp ? "▲" : "▼"} {Math.abs(item.pnl_pct ?? 0).toFixed(2)}%
                            </span>
                            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: C.textTer }}>
                              {item.quantity?.toLocaleString()} shares
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── EARNINGS INTELLIGENCE MODE ── */}
      {portMode === "earnings" && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="label" style={{ marginBottom: 12 }}>Earnings Intelligence</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: 8, alignItems: "end" }}>
              <div>
                <div style={labelStyle}>Ticker</div>
                <TickerAutocomplete className="input-box" value={earningsTicker}
                  onChange={e => setEarningsTicker(e.target.value.toUpperCase())}
                  onSelect={t => { setEarningsTicker(t); runEarningsBrief(t); }}
                  onKeyDown={e => e.key === "Enter" && runEarningsBrief()}
                  placeholder="e.g. TCS.NS or AAPL" />
              </div>
              <button className="btn-gold" style={{ minHeight: 40, padding: "0 16px" }} disabled={earningsLoading} onClick={() => runEarningsBrief()}>
                {earningsLoading ? "Building brief..." : "Generate Brief"}
              </button>
            </div>
            {holdings.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {holdings.slice(0, 8).map(h => (
                  <button key={h.ticker} className="btn-ghost" style={{ fontSize: 11, padding: "5px 9px" }} onClick={() => runEarningsBrief(h.ticker)}>
                    {h.ticker}
                  </button>
                ))}
              </div>
            )}
            {earningsError && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.neg, marginTop: 8 }}>{earningsError}</div>}
          </div>

          {!earningsBrief && !earningsError && (
            <EmptyState Icon={CalendarClock} title="No earnings brief yet." subtitle="Choose a holding or enter a ticker to generate a sell-side style pre-earnings note." />
          )}

          {earningsBrief && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                {[
                  ["Ticker", earningsBrief.ticker],
                  ["Next Date", earningsBrief.next_earnings_date || "TBD"],
                  ["EPS Est.", earningsBrief.eps_estimate ?? "N/A"],
                  ["Last EPS", earningsBrief.eps_actual ?? "N/A"],
                  ["Forward P/E", earningsBrief.forward_pe ?? "N/A"],
                ].map(([label, value]) => (
                  <div key={label} className="card">
                    <div style={metricLabelStyle}>{label}</div>
                    <div style={{ fontFamily: label === "Ticker" ? "'JetBrains Mono',monospace" : "'DM Sans',sans-serif", fontSize: 16, color: C.text, overflowWrap: "anywhere" }}>{value}</div>
                  </div>
                ))}
              </div>
              <div className="card card-accent">
                <div className="label" style={{ marginBottom: 10 }}>Pre-earnings Research Note</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: C.text, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{earningsBrief.brief}</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PORTFOLIO AUTOPSY MODE ── */}
      {portMode === "autopsy" && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="label" style={{ marginBottom: 12 }}>Trade History</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1.5fr 0.8fr 0.8fr 0.9fr 1fr auto", gap: 8, alignItems: "end" }}>
              <div>
                <div style={labelStyle}>Ticker</div>
                <TickerAutocomplete className="input-box" value={tradeInput.ticker}
                  onChange={e => setTradeInput(p => ({ ...p, ticker: e.target.value.toUpperCase() }))}
                  onSelect={t => setTradeInput(p => ({ ...p, ticker: t }))}
                  placeholder="INFY.NS" />
              </div>
              <div>
                <div style={labelStyle}>Action</div>
                <select className="input-box" value={tradeInput.action} onChange={e => setTradeInput(p => ({ ...p, action: e.target.value }))}>
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <div>
                <div style={labelStyle}>Qty</div>
                <input className="input-box" type="number" min="1" value={tradeInput.quantity} onChange={e => setTradeInput(p => ({ ...p, quantity: e.target.value }))} placeholder="50" />
              </div>
              <div>
                <div style={labelStyle}>Price</div>
                <input className="input-box" type="number" min="0.01" step="0.01" value={tradeInput.price} onChange={e => setTradeInput(p => ({ ...p, price: e.target.value }))} placeholder="1500" />
              </div>
              <div>
                <div style={labelStyle}>Date</div>
                <input className="input-box" type="date" value={tradeInput.date} onChange={e => setTradeInput(p => ({ ...p, date: e.target.value }))} />
              </div>
              <button className="btn-gold" style={{ height: 40, padding: "0 14px" }} onClick={addTrade}>
                <Plus size={16} />
              </button>
            </div>
            {tradeError && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.neg, marginTop: 8 }}>{tradeError}</div>}
          </div>

          {trades.length > 0 && (
            <>
              <div className="card port-table-scroll" style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {["Date", "Ticker", "Side", "Qty", "Price", ""].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: C.textSec, fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...trades].sort((a, b) => a.date.localeCompare(b.date)).map((t, idx) => {
                      const originalIdx = trades.indexOf(t);
                      const isBuy = t.action === "buy";
                      return (
                        <tr key={`${t.ticker}-${t.date}-${idx}`} style={{ borderBottom: idx < trades.length - 1 ? `1px solid ${C.border}` : "none" }}>
                          <td style={{ padding: "10px 16px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec }}>{t.date}</td>
                          <td style={{ padding: "10px 16px", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.text }}>{t.ticker}</td>
                          <td style={{ padding: "10px 16px" }}><span className={isBuy ? "pill-pos" : "pill-neg"} style={{ fontSize: 10 }}>{t.action.toUpperCase()}</span></td>
                          <td style={{ padding: "10px 16px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec }}>{t.quantity.toLocaleString()}</td>
                          <td style={{ padding: "10px 16px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec }}>₹{t.price.toLocaleString()}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right" }}>
                            <button onClick={() => removeTrade(originalIdx)} title="Remove trade" style={{ background: "none", border: "none", color: C.textTer, cursor: "pointer", padding: 4, display: "inline-flex" }}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button className="btn-gold" style={{ width: "100%", marginBottom: 24 }} disabled={autopsyLoading} onClick={runAutopsy}>
                {autopsyLoading ? "Matching FIFO trades..." : `Run Autopsy on ${trades.length} Trade${trades.length > 1 ? "s" : ""}`}
              </button>
            </>
          )}

          {trades.length === 0 && !autopsyResult && (
            <EmptyState Icon={Stethoscope} title="No trades added." subtitle="Add buys and sells to reconstruct realized P&L and get an honest post-mortem." />
          )}

          {autopsyResult?.error && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.neg }}>{autopsyResult.error}</span>
              <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={runAutopsy}>Retry</button>
            </div>
          )}

          {autopsyResult && !autopsyResult.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
                {[
                  ["Realized P&L", `₹${autopsyResult.total_pnl?.toLocaleString() ?? 0}`],
                  ["Matched Trades", autopsyResult.trade_count ?? 0],
                  ["Winners", autopsyResult.winners ?? 0],
                  ["Losers", autopsyResult.losers ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="card">
                    <div style={metricLabelStyle}>{label}</div>
                    <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: label === "Realized P&L" ? ((autopsyResult.total_pnl ?? 0) >= 0 ? C.pos : C.neg) : C.text }}>{value}</div>
                  </div>
                ))}
              </div>
              {autopsyResult.narrative && (
                <div className="card card-accent">
                  <div className="label" style={{ marginBottom: 10 }}>Trade Post-mortem</div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: C.text, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{autopsyResult.narrative}</div>
                </div>
              )}
              {autopsyResult.realized_trades?.length > 0 && (
                <>
                  <div className="label">FIFO Matches</div>
                  <div className="port-grid">
                    {autopsyResult.realized_trades.slice(0, 12).map((r, idx) => {
                      const up = (r.pnl ?? 0) >= 0;
                      return (
                        <div key={`${r.ticker}-${idx}`} className={`port-mini-card stagger-${Math.min(idx + 1, 6)}`}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.textSec }}>{r.ticker}</div>
                            <span className={up ? "pill-pos" : "pill-neg"} style={{ fontSize: 10 }}>{up ? "+" : ""}{r.pnl_pct?.toFixed(2)}%</span>
                          </div>
                          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: up ? C.pos : C.neg, marginTop: 8 }}>
                            {up ? "+" : ""}₹{r.pnl?.toLocaleString()}
                          </div>
                          <div style={{ marginTop: 6, fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: C.textTer }}>
                            {r.buy_date} → {r.sell_date} · {r.quantity} shares
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── SIMPLE / QUICK MODE ── */}
      {portMode === "simple" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <TickerAutocomplete className="input-box" style={{ flex: 1 }} value={portfolioInput}
              onChange={e => setPortfolioInput(e.target.value)}
              onSelect={t => { addToPortfolio(t); setPortfolioInput(""); }}
              onKeyDown={e => { if (e.key === "Enter") { addToPortfolio(portfolioInput); setPortfolioInput(""); } }}
              placeholder="Add ticker — e.g. AAPL, BTC, INFY.NS" />
            <button className="btn-gold" style={{ padding: "0 18px" }} onClick={() => { addToPortfolio(portfolioInput); setPortfolioInput(""); }}>
              <Plus size={18} />
            </button>
          </div>
          {portfolio.length > 0 && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {portfolio.map(t => (
                  <div key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 12px 4px 14px", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.text }}>
                    {t}
                    <button onClick={() => removeFromPortfolio(t)} style={{ background: "none", border: "none", color: C.textSec, padding: 0, display: "flex", alignItems: "center", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.color = C.neg}
                      onMouseLeave={e => e.currentTarget.style.color = C.textSec}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn-gold" style={{ width: "100%", marginBottom: 24 }} disabled={portfolioLoading} onClick={() => runPortfolioAnalysis()}>
                {portfolioLoading ? "Analyzing portfolio…" : "Analyze Portfolio"}
              </button>
            </>
          )}
          {portfolio.length === 0 && !portfolioData && (
            <EmptyState Icon={PieChart} title="No tickers added." subtitle="Add tickers above to begin quick portfolio analysis." />
          )}
          {portfolioData?.error && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.neg }}>{portfolioData.error}</span>
              <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => runPortfolioAnalysis()}>Retry</button>
            </div>
          )}
          {portfolioData && !portfolioData.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {portfolioData.summary && (
                <div className="card card-accent">
                  <div className="label" style={{ marginBottom: 10 }}>AI Analysis</div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{portfolioData.summary}</div>
                </div>
              )}
              {portfolioData.breakdown && Object.keys(portfolioData.breakdown).length > 0 && (
                <>
                  <div className="label">Holdings</div>
                  <div className="port-grid">
                    {Object.entries(portfolioData.breakdown).map(([ticker, info], idx) => {
                      const price  = info?.stock?.price ?? info?.price ?? null;
                      const change = info?.stock?.five_day_change ?? info?.change ?? null;
                      const isUp   = (change ?? 0) >= 0;
                      return (
                        <div key={ticker} className={`port-mini-card stagger-${Math.min(idx + 1, 6)}`}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.textSec, marginBottom: 4 }}>{ticker}</div>
                          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: C.text }}>
                            {price != null ? `${sym(ticker)}${price.toLocaleString()}` : "—"}
                          </div>
                          {change != null && (
                            <span className={isUp ? "pill-pos" : "pill-neg"} style={{ fontSize: 10, marginTop: 6, display: "inline-flex" }}>
                              {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
