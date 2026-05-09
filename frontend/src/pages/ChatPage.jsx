import { Send, X } from "lucide-react";
import { C } from "../constants";
import { ChatBubble } from "../components";

export default function ChatPage({
  messages, loading, input, setInput, historyOpen, setHistoryOpen,
  chatSessions, bottomRef, sendMessage, handleNewChat, loadChatSession,
}) {
  const fmtSessionDate = (ts) => {
    const d    = new Date(ts);
    const now  = new Date();
    const diff = now - d;
    if (diff < 86400000 && d.getDate() === now.getDate()) return "Today";
    if (diff < 172800000) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const grouped = chatSessions.reduce((acc, s) => {
    const label = fmtSessionDate(s.ts);
    (acc[label] = acc[label] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="chat-wrap" style={{ flexDirection: "row" }}>
      {/* History sidebar */}
      {historyOpen && (
        <div className="chat-history-panel">
          <div className="chat-history-header">
            <span>History</span>
            <button className="chat-history-close" onClick={() => setHistoryOpen(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="chat-history-list">
            {chatSessions.length === 0 ? (
              <div className="chat-history-empty">No previous chats</div>
            ) : (
              Object.entries(grouped).map(([label, sessions]) => (
                <div key={label}>
                  <div className="chat-history-group-label">{label}</div>
                  {sessions.map(s => (
                    <button key={s.id} className="chat-history-item" onClick={() => loadChatSession(s)}>
                      <div className="chat-history-preview">{s.preview}</div>
                      <div className="chat-history-time">
                        {new Date(s.ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ padding: "14px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="btn-ghost" style={{ padding: "5px 8px", fontSize: 12 }} onClick={() => setHistoryOpen(o => !o)} title="Chat history">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </button>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: C.text }}>Fintrest Advisor</div>
          </div>
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={handleNewChat} disabled={loading}>+ New conversation</button>
        </div>
        <div className="chat-messages">
          {messages.map((msg) => <ChatBubble key={msg._id} msg={msg} />)}
          {loading && (
            <div className="chat-bubble-assistant">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {[0.1, 0.2, 0.3].map(d => (
                  <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: C.textSec, animation: `fadeUp 0.8s ${d}s ease-in-out infinite alternate` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="chat-input-bar">
          <input className="chat-input-field" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Ask about any NSE/BSE stock or market trend…" />
          <button className="chat-send-btn" onClick={() => sendMessage(input)} disabled={loading}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
