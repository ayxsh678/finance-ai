import { C } from "../constants";
import { TradingViewChart, CompareTable, TickerAutocomplete } from "../components";

export default function ComparePage({
  isMobile, compareA, compareB, setCompareA, setCompareB,
  compareData, compareLoading, runComparison, chartDays,
}) {
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: isMobile ? 16 : 24 }}>
      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: C.text, marginBottom: 20 }}>Compare</div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto 1fr", gap: 12, marginBottom: 16 }}>
        <TickerAutocomplete className="input-box" value={compareA}
          onChange={e => setCompareA(e.target.value.toUpperCase())}
          onSelect={t => setCompareA(t)}
          placeholder="TICKER A — e.g. RELIANCE.NS" />
        {!isMobile && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Serif Display',serif", fontSize: 20, color: C.border, padding: "0 4px" }}>VS</div>}
        <TickerAutocomplete className="input-box" value={compareB}
          onChange={e => setCompareB(e.target.value.toUpperCase())}
          onSelect={t => setCompareB(t)}
          placeholder="TICKER B — e.g. TCS.NS" />
      </div>

      <button className="btn-gold" style={{ width: "100%", marginBottom: 20 }} disabled={compareLoading || !compareA || !compareB} onClick={() => runComparison()}>
        {compareLoading ? "Fetching market data…" : "Compare"}
      </button>

      {/* Quick picks */}
      <div className="label" style={{ marginBottom: 10 }}>Quick picks</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
        {[
          { label: "Reliance vs TCS",    a: "RELIANCE.NS",  b: "TCS.NS"        },
          { label: "HDFC vs ICICI",      a: "HDFCBANK.NS",  b: "ICICIBANK.NS"  },
          { label: "Infosys vs Wipro",   a: "INFY.NS",      b: "WIPRO.NS"      },
          { label: "SBI vs Kotak",       a: "SBIN.NS",      b: "KOTAKBANK.NS"  },
          { label: "Bajaj vs M&M",       a: "BAJFINANCE.NS",b: "M&M.NS"        },
          { label: "Adani vs Tata",      a: "ADANIENT.NS",  b: "TATAMOTORS.NS" },
        ].map(pick => (
          <button key={pick.label} className="btn-ghost" style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20 }}
            disabled={compareLoading}
            onClick={() => { setCompareA(pick.a); setCompareB(pick.b); runComparison(pick.a, pick.b); }}>
            {pick.label}
          </button>
        ))}
      </div>

      {compareData?.error && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.neg }}>{compareData.error}</span>
          <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => runComparison()}>Retry</button>
        </div>
      )}

      {compareData && !compareData.error && compareData.ticker_a && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Charts side by side */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.textSec, marginBottom: 10 }}>{compareData.ticker_a}</div>
              <TradingViewChart ticker={compareData.ticker_a} height={180} days={chartDays} />
            </div>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.textSec, marginBottom: 10 }}>{compareData.ticker_b}</div>
              <TradingViewChart ticker={compareData.ticker_b} height={180} days={chartDays} />
            </div>
          </div>
          {/* Comparison table */}
          <CompareTable data={compareData} ticker_a={compareData.ticker_a} ticker_b={compareData.ticker_b} />
          {/* Verdict */}
          {compareData.verdict && (
            <div className="card card-accent">
              <div className="label" style={{ marginBottom: 10 }}>Verdict</div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{compareData.verdict}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
