import { Bell, X } from "lucide-react";
import { C } from "../constants";
import { TickerAutocomplete, EmptyState } from "../components";

export default function AlertsPage({
  isMobile, activeAlerts, triggeredAlerts,
  alertTicker, setAlertTicker, alertThreshold, setAlertThreshold,
  alertDirection, setAlertDirection, alertError, alertCreating,
  createAlert, deleteAlert,
}) {
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: isMobile ? 16 : 24 }}>
      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: C.text, marginBottom: 20 }}>Price Alerts</div>

      {/* Create form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 16 }}>New Alert</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div className="label" style={{ marginBottom: 8, fontSize: 10 }}>Ticker</div>
            <TickerAutocomplete className="input-box" value={alertTicker}
              onChange={e => setAlertTicker(e.target.value.toUpperCase())}
              onSelect={t => setAlertTicker(t)}
              placeholder="e.g. RELIANCE.NS" />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8, fontSize: 10 }}>Price Threshold</div>
            <input className="input-box" value={alertThreshold} onChange={e => setAlertThreshold(e.target.value)} placeholder="0.00" type="number" min="0" step="any" />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8, fontSize: 10 }}>Direction</div>
            <div className="dir-toggle">
              {["above", "below"].map(dir => (
                <button key={dir} className={`dir-toggle-btn${alertDirection === dir ? " active" : ""}`} onClick={() => setAlertDirection(dir)}>{dir}</button>
              ))}
            </div>
          </div>
          {alertError && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.neg }}>{alertError}</div>}
          <button className="btn-gold" onClick={createAlert} disabled={alertCreating}>
            {alertCreating ? "Creating…" : "+ Add Alert"}
          </button>
        </div>
      </div>

      {/* Active alerts */}
      {activeAlerts.length > 0 ? (
        <>
          <div className="label" style={{ marginBottom: 10 }}>Active Alerts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {activeAlerts.map(a => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
                <div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.text }}>{a.ticker}</span>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.textSec, marginLeft: 10 }}>
                    price {a.direction} {a.threshold}
                  </span>
                </div>
                <button onClick={() => deleteAlert(a.id)} style={{ background: "none", border: "none", color: C.textTer, cursor: "pointer", padding: 4, display: "flex", transition: "color 150ms" }}
                  onMouseEnter={e => e.currentTarget.style.color = C.neg}
                  onMouseLeave={e => e.currentTarget.style.color = C.textTer}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState Icon={Bell} title="No alerts set." subtitle="Set a price threshold above to get notified." />
      )}

      {/* Triggered alerts */}
      {triggeredAlerts.length > 0 && (
        <>
          <div className="label" style={{ marginBottom: 10 }}>Triggered</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {triggeredAlerts.map(a => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", opacity: 0.65 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.text, textDecoration: "line-through" }}>{a.ticker}</span>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.textSec }}>triggered at {a.threshold}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
