import { useState } from "react";
import { Plus, X } from "lucide-react";
import { C } from "../constants";
import { WatchlistTable } from "../components";
import AddTickerModal from "../AddTickerModal";

export default function WatchlistPage({ watchlist, sentiments, sentimentLoading, handleSelectStock, onAdd, onRemove }) {
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAdd = async (ticker, name) => {
    await onAdd(ticker, name || ticker);
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
      <AddTickerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
        watchlist={watchlist}
      />
      <WatchlistTable watchlist={watchlist} sentiments={sentiments} sentimentLoading={sentimentLoading} onSelect={handleSelectStock} onRemove={onRemove} />
    </div>
  );
}
