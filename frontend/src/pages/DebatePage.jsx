import { useState } from "react";
import { Scales, RefreshCcw } from "lucide-react";
import { API_URL, C } from "../constants";
import { TickerAutocomplete, LoadingLine } from "../components";

export default function DebatePage({ isMobile }) {
  const [ticker, setTicker] = useState("");
  const [company, setCompany] = useState("");
  const [timeRange, setTimeRange] = useState("7d");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runDebate = async () => {
    const tickerClean = ticker.toUpperCase().trim();
    if (!tickerClean) {
      setError("Enter a ticker symbol to start the debate.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/debate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: tickerClean, company_name: company.trim(), time_range: timeRange }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err?.message || "Could not load debate results.");
    } finally {
      setLoading(false);
    }
  };

  const renderCasePanel = (title, content, score, roleColor) => (
    <div className="card" style={{ padding: 22, minHeight: 360, display: "flex", flexDirection: "column", gap: 16, background: C.surface }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>{title}</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: C.text }}>{ticker.toUpperCase()}</div>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: roleColor.background, color: roleColor.text, fontSize: 12, fontWeight: 700 }}>
          {score != null ? `CONFIDENCE ${score}%` : "CONFIDENCE —"}
        </div>
      </div>
      <div style={{ flex: 1, whiteSpace: "pre-wrap", overflowY: "auto", color: C.textSec, lineHeight: 1.65, fontSize: 14 }}>
        {content || "No case available."}
      </div>
    </div>
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: isMobile ? 16 : 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: C.text, marginBottom: 6 }}>Bull vs Bear AI Debate</div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: C.textSec, maxWidth: 620 }}>Launch a debate on any ticker or portfolio. Bull and Bear present opposing theses, and a neutral moderator summarizes the balanced verdict.</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: C.accent, fontSize: 13, fontWeight: 700 }}><Scales size={16} /> Debate mode</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 14, marginBottom: 18 }}>
        <div className="card" style={{ padding: 20, background: C.surface }}>
          <div className="label" style={{ marginBottom: 12 }}>Asset</div>
          <TickerAutocomplete value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} onSelect={setTicker} placeholder="e.g. RELIANCE.NS or AAPL" className="input-box" />
          <div className="label" style={{ margin: "16px 0 8px" }}>Company name (optional)</div>
          <input className="input-box" value={company} onChange={e => setCompany(e.target.value)} placeholder="Reliance Industries" style={{ width: "100%" }} />
          <div className="label" style={{ margin: "16px 0 10px" }}>Time range</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["7d", "30d", "3m", "1y"].map(range => (
              <button key={range} className={`btn-ghost${timeRange === range ? " active" : ""}`} style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => setTimeRange(range)}>{range}</button>
            ))}
          </div>
          <button className="btn-gold" style={{ width: "100%", marginTop: 18 }} disabled={loading} onClick={runDebate}>
            {loading ? "Arguing the debate…" : "Run AI debate"}
          </button>
          {error && <div style={{ marginTop: 14, color: C.neg, fontSize: 13 }}>{error}</div>}
        </div>

        <div className="card" style={{ padding: 20, background: C.surface }}>
          <div className="label" style={{ marginBottom: 12 }}>How it works</div>
          <div style={{ color: C.textSec, lineHeight: 1.8, fontSize: 14 }}>
            The Bull agent makes the best upside case, the Bear agent makes the strongest downside case, and the Moderator compares them side by side. Use this page to see balanced scenario analysis without direct investment advice.
          </div>
          <div style={{ display: "grid", rowGap: 10, marginTop: 16 }}>
            <div className="pill-pill" style={{ padding: "10px 14px", background: C.surface2, borderRadius: 12, color: C.text }}><strong>Evidence-based</strong>: price, sentiment, news, and technicals are used.</div>
            <div className="pill-pill" style={{ padding: "10px 14px", background: C.surface2, borderRadius: 12, color: C.text }}><strong>Balanced</strong>: no bullish cheerleading or bearish fear.</div>
            <div className="pill-pill" style={{ padding: "10px 14px", background: C.surface2, borderRadius: 12, color: C.text }}><strong>Safe</strong>: the output avoids direct trade recommendations.</div>
          </div>
        </div>
      </div>

      {loading && <LoadingLine message="AI agents are debating the outlook…" />}

      {result && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 18 }}>
          {renderCasePanel("Bull Agent 🐂", result.bull_case, result.confidence_scores?.bull, { background: "rgba(62,187,110,0.12)", text: "#3DBB6E" })}
          {renderCasePanel("Bear Agent 🐻", result.bear_case, result.confidence_scores?.bear, { background: "rgba(217,95,90,0.14)", text: "#D95F5A" })}
        </div>
      )}

      {result && (
        <div className="card" style={{ padding: 24, background: C.surface }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Moderator verdict</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: C.text }}>Balanced take</div>
            </div>
            <button className="btn-ghost" style={{ padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={runDebate} disabled={loading}><RefreshCcw size={14} /> Re-run debate</button>
          </div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75, color: C.textSec, fontSize: 14 }}>{result.moderator_verdict}</div>
          {result.supporting_sources?.length > 0 && (
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {result.supporting_sources.map((source, idx) => (
                <span key={idx} className="pill-neutral" style={{ padding: "6px 10px", fontSize: 12 }}>{source}</span>
              ))}
            </div>
          )}
          <div style={{ marginTop: 18, fontSize: 12, color: C.textSec }}>*This is market intelligence only, not financial advice.</div>
        </div>
      )}
    </div>
  );
}
