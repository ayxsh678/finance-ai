import { C } from "../constants";
import { WatchlistTable } from "../components";

export default function WatchlistPage({ watchlist, sentiments, sentimentLoading, handleSelectStock }) {
  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ padding: "20px 24px 12px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: C.text }}>Watchlist</div>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec, marginTop: 4 }}>Live prices refresh every 60 seconds.</div>
      </div>
      <WatchlistTable watchlist={watchlist} sentiments={sentiments} sentimentLoading={sentimentLoading} onSelect={handleSelectStock} />
    </div>
  );
}
