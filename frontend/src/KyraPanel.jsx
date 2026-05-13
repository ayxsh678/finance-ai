import { useRef, useEffect } from "react";
import { Sparkles, X, Maximize2, Send, ChevronRight } from "lucide-react";
import { MessageBody } from "./components";

const SUGGESTIONS = {
  market: (ctx) => [
    `Should I buy ${ctx.name || "this stock"} right now?`,
    `What's the conviction score for ${ctx.ticker || "it"}?`,
    `Summarize recent news for ${ctx.name || "this stock"}`,
  ],
  portfolio: () => [
    "What are my biggest concentration risks?",
    "Which holding has the strongest momentum?",
    "Should I rebalance my portfolio?",
  ],
  watchlist: (ctx) => [
    `Tell me about ${ctx.name || "a stock"} in my watchlist`,
    "Which watchlist stock has the best sentiment?",
    "Compare my top two watchlist stocks",
  ],
  compare: (ctx) => [
    ctx.label && ctx.label !== "Compare"
      ? `Which is better long-term — ${ctx.label}?`
      : "Which stock is better for long-term?",
    "Explain the key valuation differences",
    "Which has better risk-adjusted returns?",
  ],
  alerts: () => [
    "Which stocks should I be watching closely?",
    "What price levels matter for Nifty 50?",
    "Explain how to set an effective price alert",
  ],
  default: () => [
    "What's moving the Indian market today?",
    "Recommend a large-cap stock to research",
    "Explain the difference between PE and PB ratio",
  ],
};

function getSuggestions(section, ctx) {
  const fn = SUGGESTIONS[section] || SUGGESTIONS.default;
  return fn(ctx || {});
}

export default function KyraPanel({
  isOpen,
  onToggle,
  onExpand,
  messages,
  sendMessage,
  loading,
  kyraInput,
  setKyraInput,
  context,
  activeSection,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = (text) => {
    const q = (text ?? kyraInput).trim();
    if (!q || loading) return;
    sendMessage(q, { noRedirect: true, context });
    if (!text) setKyraInput("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = getSuggestions(activeSection, context);
  const hasConversation = messages.some((m) => m.role === "user");

  const contextLabel = context?.label
    ? context.label + (context.price ? ` · ₹${Number(context.price).toLocaleString("en-IN")}` : "")
    : null;

  return (
    <>
      {!isOpen && activeSection !== "chat" && (
        <button className="kyra-fab" onClick={onToggle} title="Ask Kyra">
          <Sparkles size={20} />
        </button>
      )}

      {isOpen && (
        <div className="kyra-panel">
          <div className="kyra-panel-header">
            <div className="kyra-panel-title">
              <Sparkles size={14} />
              Kyra
            </div>

            {contextLabel && (
              <div className="kyra-context-pill" title={contextLabel}>
                {contextLabel}
              </div>
            )}

            <div className="kyra-panel-actions">
              <button onClick={onExpand} title="Full conversation">
                <Maximize2 size={13} />
              </button>
              <button onClick={onToggle} title="Close">
                <X size={13} />
              </button>
            </div>
          </div>

          <div className="kyra-messages">
            {messages.map((m, i) => (
              <div key={i} className={`kyra-bubble kyra-bubble-${m.role}`}>
                <div>{m.role === "assistant" ? <MessageBody content={m.content} /> : m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="kyra-bubble kyra-bubble-assistant">
                <div>
                  <div className="kyra-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {!hasConversation && (
            <div className="kyra-suggestions">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="kyra-suggestion"
                  onClick={() => handleSend(s)}
                >
                  <span>{s}</span>
                  <ChevronRight size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
                </button>
              ))}
            </div>
          )}

          <div className="kyra-input-bar">
            <input
              className="kyra-input"
              value={kyraInput}
              onChange={(e) => setKyraInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Kyra anything…"
              autoComplete="off"
            />
            <button
              className="kyra-send"
              onClick={() => handleSend()}
              disabled={!kyraInput.trim() || loading}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
