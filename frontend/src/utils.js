import { API_URL, C } from "./constants";

// ── Auth helpers ─────────────────────────────────────────
export const getToken    = () => localStorage.getItem("fintrest_token");
export const setToken    = (t) => localStorage.setItem("fintrest_token", t);
export const removeToken = () => localStorage.removeItem("fintrest_token");
export const getUser     = () => { try { return JSON.parse(localStorage.getItem("fintrest_user")); } catch { return null; } };
export const setUser     = (u) => localStorage.setItem("fintrest_user", JSON.stringify(u));
export const removeUser  = () => localStorage.removeItem("fintrest_user");

// ── Session helpers ──────────────────────────────────────
export const getSessionId    = () => { const id = localStorage.getItem("fintrest_session_id"); return id && id !== "undefined" ? id : null; };
export const setSessionId    = (id) => { if (id && id !== "undefined") localStorage.setItem("fintrest_session_id", id); };
export const removeSessionId = () => localStorage.removeItem("fintrest_session_id");
export const startSession    = async () => {
  try {
    const res  = await fetch(`${API_URL}/session/new`, { method: "POST" });
    const data = await res.json();
    setSessionId(data.session_id);
    return data.session_id;
  } catch { return null; }
};
export const clearSession = async () => {
  const sid = getSessionId();
  if (sid) { try { await fetch(`${API_URL}/session/${sid}`, { method: "DELETE" }); } catch {} }
  removeSessionId();
  return startSession();
};

// ── Data helpers ─────────────────────────────────────────
// Seeded RNG — same ticker always produces same sparkline shape, no re-render flicker
export function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}
export const generateSparkline = (base, points = 30, seed = 42) => {
  const rng = seededRng(seed);
  let price = base;
  return Array.from({ length: points }, (_, i) => {
    price += (rng() - 0.48) * (base * 0.008);
    return { i, v: parseFloat(price.toFixed(2)) };
  });
};

let _msgSeq = 0;
export const mkMsg = (role, content, extras = {}) => ({ _id: ++_msgSeq, role, content, ...extras });

// ── Utilities ────────────────────────────────────────────
export const sentimentColor = (s) => {
  if (s == null) return C.textSec;
  if (s >= 62)  return C.pos;
  if (s <= 38)  return C.neg;
  return C.neutral;
};
export const sentimentLabel = (s) => {
  if (s == null) return "—";
  if (s >= 62)  return "Bullish";
  if (s <= 38)  return "Bearish";
  return "Neutral";
};
export const currencySymbol = (type) => type === "India" ? "₹" : type === "Crypto" ? "" : "$";
export const maybeTitle      = (v, t = 8) => { const s = String(v ?? ""); return s.length > t ? s : undefined; };

// Indian notation: ₹2000 Cr, ₹45 L, etc.
export const fmtInr = (v) => {
  if (v == null || v === "") return "—";
  if (typeof v !== "number") return String(v);
  if (v >= 1e11) return (v / 1e7).toFixed(0) + " Cr";
  if (v >= 1e7)  return (v / 1e7).toFixed(2) + " Cr";
  if (v >= 1e5)  return (v / 1e5).toFixed(2) + " L";
  return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};
export const fmt = (v) => {
  if (v == null || v === "") return "—";
  if (typeof v === "number") {
    if (v > 1e12) return (v / 1e12).toFixed(2) + "T";
    if (v > 1e9)  return (v / 1e9).toFixed(2) + "B";
    if (v > 1e6)  return (v / 1e6).toFixed(2) + "M";
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(v);
};
export const fmtPct = (v) => v != null && v !== "" ? fmt(v) + "%" : "—";

// ── Chart helpers ─────────────────────────────────────────
export function tvSymbolUrl(ticker) {
  if (!ticker) return null;
  // Import CHART_VALID_TICKER inline to avoid circular dep; regex is simple enough to duplicate
  const CHART_VALID_TICKER = /^[A-Za-z0-9._:&\-]{1,20}$/;
  if (!CHART_VALID_TICKER.test(ticker)) return null;
  const t = ticker.toUpperCase();
  if (t.endsWith(".NS")) return `https://www.tradingview.com/symbols/NSE-${t.slice(0,-3)}/`;
  if (t.endsWith(".BO")) return `https://www.tradingview.com/symbols/BSE-${t.slice(0,-3)}/`;
  if (t.includes(":"))  return `https://www.tradingview.com/symbols/${t.replace(":","-")}/`;
  // Bare tickers without exchange suffix are US stocks by default
  return `https://www.tradingview.com/symbols/NASDAQ-${t}/`;
}

export function normalizeSentimentPayload(data) {
  if (!data || data.error) return null;
  if (data.sentiment && typeof data.sentiment === "object") {
    return {
      ticker: data.ticker,
      score: data.sentiment.score ?? null,
      label: data.sentiment.label ?? "—",
      headline_count: data.sentiment.headline_count ?? data.sentiment.article_count ?? 0,
      headlines: data.headlines ?? data.articles?.map(a => a.title).filter(Boolean) ?? [],
    };
  }
  return {
    ...data,
    score: data.score ?? null,
    label: data.label ?? (data.score == null ? "Insufficient Data" : sentimentLabel(data.score)),
    headline_count: data.headline_count ?? 0,
    headlines: Array.isArray(data.headlines) ? data.headlines : [],
  };
}

export function normalizeComparePayload(data, fallbackA, fallbackB) {
  if (!data || data.error) return data;
  if (data.data_a || data.data_b) return data;
  const stockA = data.ticker_a && typeof data.ticker_a === "object" ? data.ticker_a : {};
  const stockB = data.ticker_b && typeof data.ticker_b === "object" ? data.ticker_b : {};
  return {
    ticker_a: stockA.ticker || fallbackA,
    ticker_b: stockB.ticker || fallbackB,
    data_a: { stock: stockA, earnings: {} },
    data_b: { stock: stockB, earnings: {} },
    verdict: data.verdict || data.answer || "",
    session_id: data.session_id,
  };
}
