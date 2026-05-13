import { useState } from "react";
import { Plus, X } from "lucide-react";
import { C } from "../constants";
import { WatchlistTable } from "../components";

export default function WatchlistPage({ watchlist, sentiments, sentimentLoading, handleSelectStock, onAdd, onRemove }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTicker, setAddTicker] = useState("");
  const [addName, setAddName] = useState("");
  const [addError, setAddError] = useState("");

  const handleAddTicker = async () => {
    if (!addTicker.trim()) {
      setAddError("Enter a ticker symbol");
      return;
    }
    const ticker = addTicker.toUpperCase().trim();
    if (watchlist.some(s => s.ticker === ticker)) {
      setAddError("Already in watchlist");
      return;
    }
    await onAdd(ticker, addName.trim() || ticker);
    setAddTicker("");
    setAddName("");
    setAddError("");
    setShowAddModal(false);
  };

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div className="wl-page-header" style={{ padding: "20px 24px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: C.text }}>Watchlist</div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec, marginTop: 4 }}>Live prices refresh every 60 seconds.</div>
        </div>
        <button className="btn-ghost" style={{ padding: "5px 8px", fontSize: 12 }} onClick={() => setShowAddModal(true)} title="Add ticker">
          <Plus size={16} />
        </button>
      </div>
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, maxWidth: 300, width: "90%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: C.text }}>Add Ticker</div>
              <button className="btn-ghost" style={{ padding: "2px 4px", fontSize: 14 }} onClick={() => { setShowAddModal(false); setAddError(""); }}>
                <X size={14} />
              </button>
            </div>
            <input className="chat-input-field" type="text" placeholder="TICKER.NS" value={addTicker} onChange={e => { setAddTicker(e.target.value); setAddError(""); }} onKeyDown={e => e.key === "Enter" && handleAddTicker()} style={{ marginBottom: 12, width: "100%" }} />
            <input className="chat-input-field" type="text" placeholder="Company name (optional)" value={addName} onChange={e => setAddName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddTicker()} style={{ marginBottom: 12, width: "100%" }} />
            {addError && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.neg, marginBottom: 12 }}>{addError}</div>}
            <button className="chat-send-btn" onClick={handleAddTicker} style={{ width: "100%" }}>Add to Watchlist</button>
          </div>
        </div>
      )}
      <WatchlistTable watchlist={watchlist} sentiments={sentiments} sentimentLoading={sentimentLoading} onSelect={handleSelectStock} onRemove={onRemove} />
    </div>
  );
}
