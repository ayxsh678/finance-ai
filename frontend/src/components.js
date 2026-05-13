import { useState, useRef, useEffect } from "react";
import { AreaChart, Area, YAxis, ResponsiveContainer } from "recharts";
import { Bookmark, Copy, Check } from "lucide-react";
import Aperture from "./Aperture";
import { C, METRIC_EXPLANATIONS, CHART_VALID_TICKER, TICKER_LIST, API_URL } from "./constants";
import { generateSparkline, sentimentColor, currencySymbol, maybeTitle, fmt, fmtPct, tvSymbolUrl } from "./utils";
import { auth, googleProvider, firebaseInitError, db } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// ── Loading line ──────────────────────────────────────────
export function LoadingLine({ message = "Fetching market data…" }) {
  return (
    <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec }}>{message}</span>
      <div className="progress-line-wrap" style={{ width: 200 }}>
        <div className="progress-line" />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────
export function EmptyState({ Icon: Icon_, title, subtitle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 12, textAlign: "center" }}>
      {Icon_ && <Icon_ size={28} color={C.textTer} />}
      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: C.text }}>{title}</div>
      {subtitle && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: C.textSec }}>{subtitle}</div>}
    </div>
  );
}

// ── Sentiment bar (watchlist row) ─────────────────────────
export function SentimentBar({ score }) {
  const color = sentimentColor(score);
  return (
    <div style={{ width: 64 }}>
      <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
        {score != null && (
          <div style={{ height: "100%", width: `${score}%`, background: `linear-gradient(90deg,${color}66,${color})`, borderRadius: 2, transition: "width 0.6s ease" }} />
        )}
      </div>
    </div>
  );
}

// ── Sentiment gauge (SVG arc) ─────────────────────────────
export function SentimentGauge({ ticker, sentiment, loading }) {
  const score     = sentiment?.score ?? null;
  const label     = sentiment?.label ?? "—";
  const headlines = sentiment?.headlines ?? [];
  const count     = sentiment?.headline_count ?? 0;

  const cx = 100, cy = 100, r = 78;
  const safeScore = score ?? 0;
  const angle     = Math.PI * (1 - safeScore / 100);
  const nx        = cx + r * Math.cos(angle);
  const ny        = cy - r * Math.sin(angle);
  const largeArc  = 0;
  const arcLen    = Math.PI * r * safeScore / 100;

  return (
    <div className="card" style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>News Sentiment</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.textSec, fontWeight: 500 }}>{ticker}</div>
        </div>
        {!loading && score != null && (
          <div className={score >= 62 ? "pill-pos" : score <= 38 ? "pill-neg" : "pill-neutral"} style={{ fontSize: 11, padding: "3px 10px" }}>
            {label}
          </div>
        )}
      </div>

      {loading || sentiment === undefined ? (
        <LoadingLine message="Analyzing headlines…" />
      ) : score != null ? (
        <>
          <div style={{ display: "flex", justifyContent: "center", minHeight: 112 }}>
            <svg viewBox="0 0 200 108" width="200" height="108" style={{ overflow: "visible", display: "block" }}>
              <defs>
                <linearGradient id="sg-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#E05C5C" />
                  <stop offset="38%"  stopColor="#C8813A" />
                  <stop offset="62%"  stopColor="#C8A96E" />
                  <stop offset="100%" stopColor="#4CAF7D" />
                </linearGradient>
              </defs>
              <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
                fill="none" stroke={C.border} strokeWidth="10" strokeLinecap="round" />
              {safeScore > 0 && (
                <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${nx} ${ny}`}
                  fill="none" stroke="url(#sg-grad)" strokeWidth="10" strokeLinecap="round"
                  style={{ "--arc-len": arcLen, strokeDasharray: arcLen, strokeDashoffset: arcLen, animation: "drawGauge 0.8s ease-in-out forwards" }} />
              )}
              <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={C.text} strokeWidth="2" strokeLinecap="round" />
              <circle cx={nx} cy={ny} r="4" fill={C.text} />
              <circle cx={cx} cy={cy} r="4.5" fill={C.surface2} stroke={C.text} strokeWidth="1.5" />
              <text x={cx-r} y={cy+14} textAnchor="middle" fontSize="9" fill={C.textTer} fontFamily="DM Sans">0</text>
              <text x={cx+r} y={cy+14} textAnchor="middle" fontSize="9" fill={C.textTer} fontFamily="DM Sans">100</text>
            </svg>
          </div>

          <div style={{ textAlign: "center", marginTop: -4, marginBottom: 16, minHeight: 64 }}>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, color: C.text, lineHeight: 1 }}>{score}</div>
            <div className="label" style={{ marginTop: 6 }}>{label}</div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: C.textTer, marginTop: 4 }}>
              {count} headline{count !== 1 ? "s" : ""} analyzed
            </div>
          </div>

          {headlines.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
              {headlines.slice(0, 5).map((h, i) => (
                <div key={i} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec, lineHeight: 1.4, padding: "8px 12px", background: C.surface2, borderRadius: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={h}>
                  {h}
                </div>
              ))}
            </div>
          )}
        </>
      ) : sentiment === null ? (
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec }}>Unable to fetch sentiment data.</div>
      ) : (
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec }}>No sentiment data available for this ticker.</div>
      )}
    </div>
  );
}

// ── Conviction score ──────────────────────────────────────
export function ConvictionScore({ ticker, conviction, loading }) {
  const [expanded, setExpanded] = useState(false);
  const score     = conviction?.score ?? null;
  const label     = conviction?.label ?? "—";
  const breakdown = conviction?.breakdown ?? [];

  const barColor = (s) => s >= 7 ? C.pos : s <= 3 ? C.neg : C.neutral;
  const labelColor = (lbl) => lbl === "BULLISH" ? C.pos : lbl === "BEARISH" ? C.neg : C.neutral;
  const scoreRing = score == null ? C.border : score >= 60 ? C.pos : score >= 40 ? C.neutral : C.neg;

  return (
    <div className="card" style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>Conviction Score</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.textSec, fontWeight: 500 }}>{ticker}</div>
        </div>
        {!loading && score != null && (
          <div className={score >= 60 ? "pill-pos" : score <= 40 ? "pill-neg" : "pill-neutral"} style={{ fontSize: 11, padding: "3px 10px" }}>
            {label}
          </div>
        )}
      </div>

      {loading || conviction === undefined ? (
        <LoadingLine message="Computing conviction…" />
      ) : score != null ? (
        <>
          {/* Score ring */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
            <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
              <svg viewBox="0 0 80 80" width="80" height="80">
                <circle cx="40" cy="40" r="34" fill="none" stroke={C.border} strokeWidth="7" />
                <circle cx="40" cy="40" r="34" fill="none" stroke={scoreRing} strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * (2 * Math.PI * 34)} ${2 * Math.PI * 34}`}
                  strokeDashoffset={2 * Math.PI * 34 * 0.25}
                  style={{ transition: "stroke-dasharray 0.8s ease" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: C.text, lineHeight: 1 }}>{Math.round(score)}</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: C.text, marginBottom: 4 }}>{label} Conviction</div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.textSec, lineHeight: 1.5 }}>
                Based on {breakdown.length} indicators across price, technicals, volume, and sentiment.
              </div>
            </div>
          </div>

          {/* Breakdown toggle */}
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, color: C.textSec, fontFamily: "'DM Sans',sans-serif", cursor: "pointer", marginBottom: expanded ? 12 : 0, width: "100%", textAlign: "center" }}>
            {expanded ? "Hide breakdown ↑" : `See all ${breakdown.length} indicators ↓`}
          </button>

          {expanded && breakdown.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {breakdown.map((ind, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < breakdown.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  {/* Name */}
                  <div style={{ width: 150, fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.textSec, flexShrink: 0 }}>{ind.name}</div>
                  {/* Bar */}
                  <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(ind.subscore / 10) * 100}%`, background: barColor(ind.subscore), borderRadius: 2, transition: "width 0.5s ease" }} />
                  </div>
                  {/* Value */}
                  <div style={{ width: 140, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: labelColor(ind.label), textAlign: "right", flexShrink: 0 }}>{ind.value}</div>
                  {/* Subscore */}
                  <div style={{ width: 24, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.textTer, textAlign: "right", flexShrink: 0 }}>{ind.subscore}</div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : conviction === null ? (
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec }}>Unable to compute conviction score.</div>
      ) : (
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec }}>No conviction data available.</div>
      )}
    </div>
  );
}

// ── News feed ─────────────────────────────────────────────
export function NewsFeed({ ticker, news, loading }) {
  const [openIdx, setOpenIdx] = useState(null);
  const items   = news?.news ?? [];
  const summary = news?.sentiment_summary;
  const overall = news?.overall_sentiment;

  const dirColor = (d) => d === "may increase" ? C.pos : d === "may decrease" ? C.neg : C.neutral;
  const dirArrow = (d) => d === "may increase" ? "▲" : d === "may decrease" ? "▼" : "▬";
  const timeAgo  = (iso) => {
    if (!iso) return "";
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 3600)  return `${Math.max(1, Math.floor(diff / 60))}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>Smart News</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.textSec }}>{ticker}</div>
        </div>
        {overall && (
          <span className={overall === "positive" ? "pill-pos" : overall === "negative" ? "pill-neg" : "pill-neutral"} style={{ fontSize: 11 }}>
            {overall}
          </span>
        )}
      </div>

      {loading ? (
        <LoadingLine message="Analyzing news impact…" />
      ) : items.length === 0 ? (
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec }}>{summary || "No recent news found."}</div>
      ) : (
        <>
          {summary && (
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 14, padding: "10px 14px", background: C.surface2, borderRadius: 8 }}>
              {summary}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((n, i) => {
              const isOpen = openIdx === i;
              const color  = dirColor(n.price_direction);
              return (
                <div key={i} style={{ background: C.surface2, borderRadius: 10, borderLeft: `3px solid ${color}`, padding: "10px 14px", cursor: "pointer", transition: "background 150ms" }}
                  onClick={() => setOpenIdx(isOpen ? null : i)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ flex: 1, fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.text, lineHeight: 1.4, fontWeight: 500 }}>{n.title}</div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 12, padding: "2px 8px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color, fontWeight: 500, flexShrink: 0 }}>
                      <span>{dirArrow(n.price_direction)}</span><span>{n.impact_score}/10</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: C.textSec }}>
                    <span>{n.source}{n.published_at && ` · ${timeAgo(n.published_at)}`}</span>
                    <span style={{ color }}>{n.price_direction} {isOpen ? "▾" : "▸"}</span>
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: 8, padding: "8px 10px", background: C.bg, borderRadius: 6, fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>
                      {n.impact_explanation}
                      {n.url && (
                        <a href={n.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          style={{ display: "block", marginTop: 6, color: C.accent, fontSize: 11, textDecoration: "none" }}>
                          Read full article ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Compare table ─────────────────────────────────────────
export function CompareTable({ data, ticker_a, ticker_b }) {
  const [expanded, setExpanded] = useState(null);
  const stockA = data?.data_a?.stock || {};
  const stockB = data?.data_b?.stock || {};
  const earnA  = data?.data_a?.earnings || {};
  const earnB  = data?.data_b?.earnings || {};

  const rows = [
    { label: "Price",     a: fmt(stockA.price),            b: fmt(stockB.price)            },
    { label: "5D Change", a: fmtPct(stockA.five_day_change),b: fmtPct(stockB.five_day_change)},
    { label: "Mkt Cap",   a: fmt(stockA.market_cap),       b: fmt(stockB.market_cap)       },
    { label: "P/E",       a: fmt(stockA.pe_ratio),         b: fmt(stockB.pe_ratio)         },
    { label: "EPS",       a: fmt(stockA.eps_actual ?? earnA.eps_actual), b: fmt(stockB.eps_actual ?? earnB.eps_actual) },
    { label: "52W High",  a: fmt(stockA.week52_high),      b: fmt(stockB.week52_high)      },
    { label: "52W Low",   a: fmt(stockA.week52_low),       b: fmt(stockB.week52_low)       },
    { label: "Rel Vol",   a: fmt(stockA.rel_volume),       b: fmt(stockB.rel_volume)       },
  ];
  const hasAnyData = rows.some(row => row.a !== "—" || row.b !== "—");
  const isDown = (v) => typeof v === "string" && v.startsWith("-");

  if (!hasAnyData) {
    return (
      <div className="card" style={{ padding: 16, fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec }}>
        No comparison metrics returned for these tickers. Check the symbols and try again.
      </div>
    );
  }

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ padding: "10px 14px" }} />
        {[ticker_a, ticker_b].map(t => (
          <div key={t} title={maybeTitle(t)} style={{ padding: "10px 8px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</div>
        ))}
      </div>
      {rows.map((row, i) => {
        const isOpen = expanded === row.label;
        const exp    = METRIC_EXPLANATIONS[row.label];
        return (
          <div key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div onClick={() => setExpanded(isOpen ? null : row.label)}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: i % 2 === 0 ? C.surface : C.bg, cursor: exp ? "pointer" : "default" }}>
              <div style={{ padding: "8px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: isOpen ? C.accent : C.textSec, display: "flex", alignItems: "center", gap: 4 }}>
                {row.label}
                {exp && <span style={{ fontSize: 9, opacity: 0.5 }}>{isOpen ? "▾" : "ⓘ"}</span>}
              </div>
              {[row.a, row.b].map((val, j) => (
                <div key={j} title={maybeTitle(val)} style={{ padding: "8px 8px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: row.label === "5D Change" ? (isDown(val) ? C.neg : val === "—" ? C.textSec : C.pos) : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val}</div>
              ))}
            </div>
            {isOpen && exp && (
              <div style={{ padding: "10px 14px", background: C.surface2, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.accent, fontWeight: 600, marginBottom: 4 }}>{exp.short}</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>{exp.detail}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Stock card (market tab list) ──────────────────────────
export function StockCard({ stock, isSelected, onClick, sentiment, sentimentLoading }) {
  const data  = Array.isArray(stock.sparkline) && stock.sparkline.length > 1
    ? stock.sparkline.map((p, i) => ({ i, v: p }))
    : generateSparkline(stock.base);
  const isUp  = (stock.change ?? 0) >= 0;
  const color = isUp ? C.pos : C.neg;
  const sym   = currencySymbol(stock.type);
  return (
    <div className={`stock-card${isSelected ? " selected" : ""}`} onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={maybeTitle(stock.ticker)}>
            {stock.ticker}
          </div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: C.text, fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={maybeTitle(stock.name, 20)}>
            {stock.name}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, paddingLeft: 12 }}>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: C.text, lineHeight: 1.1 }}>
            {stock.price == null ? "—" : `${sym}${stock.price.toLocaleString()}`}
          </div>
          <div style={{ marginTop: 4 }}>
            <span className={isUp ? "pill-pos" : "pill-neg"} style={{ fontSize: 11 }}>
              {isUp ? "▲" : "▼"} {Math.abs(stock.change ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
      <div style={{ height: 44, marginBottom: 10 }}>
        <ResponsiveContainer width="100%" height={44}>
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
            <defs>
              <linearGradient id={`spark-${stock.ticker}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0}    />
              </linearGradient>
            </defs>
            <YAxis domain={["auto","auto"]} hide />
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${stock.ticker})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 16 }}>
        <div className="label" style={{ fontSize: 10 }}>Sentiment</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 94, justifyContent: "flex-end" }}>
          {sentimentLoading ? (
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: C.textTer }}>…</span>
          ) : sentiment?.score != null ? (
            <>
              <SentimentBar score={sentiment.score} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: sentimentColor(sentiment.score), minWidth: 28, textAlign: "right" }}>{sentiment.score}</span>
            </>
          ) : (
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: C.textTer }}>—</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Watchlist table ───────────────────────────────────────
export function WatchlistTable({ watchlist, sentiments, sentimentLoading, onSelect, onRemove }) {
  const { X } = require("lucide-react");
  if (!watchlist.length) return <EmptyState Icon={Bookmark} title="No stocks." subtitle="Add tickers to your watchlist." />;
  return (
    <div style={{ width: "100%" }}>
      <div className="wl-header" style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px 90px 96px 32px", gap: 12, alignItems: "center", padding: "0 16px" }}>
        {["Ticker", "Name", "Price", "Change", "Sentiment", ""].map(h => (
          <div key={h} className="label" style={{ fontSize: 10 }}>{h}</div>
        ))}
      </div>
      {watchlist.map((s) => {
        const isUp  = (s.change ?? 0) >= 0;
        const sent  = sentiments[s.ticker];
        const sLoad = sentimentLoading[s.ticker];
        const sym   = currencySymbol(s.type);
        return (
          <div key={s.ticker} className="wl-row" style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px 90px 96px 32px", gap: 12, alignItems: "center", padding: "0 16px", cursor: "pointer" }} onClick={() => onSelect(s)}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.ticker}</div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.name}>{s.name}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.text }}>
              {s.price == null ? "—" : `${sym}${s.price.toLocaleString()}`}
            </div>
            <div>
              {s.change == null ? <span style={{ color: C.textSec }}>—</span> : (
                <span className={isUp ? "pill-pos" : "pill-neg"} style={{ fontSize: 11 }}>
                  {isUp ? "▲" : "▼"} {Math.abs(s.change).toFixed(2)}%
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {sLoad ? (
                <span style={{ fontSize: 11, color: C.textTer }}>…</span>
              ) : sent?.score != null ? (
                <>
                  <SentimentBar score={sent.score} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: sentimentColor(sent.score), minWidth: 28, textAlign: "right" }}>{sent.score}</span>
                </>
              ) : <span style={{ fontSize: 11, color: C.textTer }}>—</span>}
            </div>
            <button className="btn-ghost" style={{ padding: "4px 6px", fontSize: 12, color: C.textTer, justifySelf: "center" }} onClick={e => { e.stopPropagation(); onRemove(s.ticker); }} title="Remove from watchlist">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Chart fallback ────────────────────────────────────────
function ChartFallback({ ticker, height, reason }) {
  return (
    <div style={{ height, width: "100%", background: C.surface2, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.textSec }}>{ticker}</div>
      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: C.textTer }}>{reason}</div>
    </div>
  );
}

// ── TradingView chart (lightweight-charts) ────────────────
export function TradingViewChart({ ticker, height = 220, days = 180, compact = false }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const [state, setState] = useState({ status: "loading" });
  const isValid = typeof ticker === "string" && CHART_VALID_TICKER.test(ticker);

  useEffect(() => {
    if (!isValid) { setState({ status: "error", reason: "Invalid symbol" }); return; }
    let cancelled = false;
    let resizeObserver;

    setState({ status: "loading" });
    (async () => {
      try {
        const { createChart, ColorType, LineStyle } = await import("lightweight-charts");
        const requestedDays = compact ? Math.min(days, 90) : days;
        const res = await fetch(`${API_URL}/chart/${encodeURIComponent(ticker)}?days=${requestedDays}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        if (cancelled) return;
        if (!payload.ok || !Array.isArray(payload.rows) || !payload.rows.length) {
          await new Promise(r => setTimeout(r, 4000));
          if (cancelled) return;
          const res2 = await fetch(`${API_URL}/chart/${encodeURIComponent(ticker)}?days=${requestedDays}`);
          if (!res2.ok) { setState({ status: "error", reason: "No chart data available" }); return; }
          const payload2 = await res2.json();
          if (cancelled) return;
          if (!payload2.ok || !Array.isArray(payload2.rows) || !payload2.rows.length) {
            setState({ status: "error", reason: "No chart data available" }); return;
          }
          Object.assign(payload, payload2);
        }
        const el = containerRef.current;
        if (!el) return;
        if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

        const chart = createChart(el, {
          width:  el.clientWidth,
          height,
          layout: {
            background: { type: ColorType.Solid, color: C.surface },
            textColor: C.textSec,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
          },
          grid: compact
            ? { vertLines: { visible: false }, horzLines: { color: C.border, style: LineStyle.Dashed } }
            : {
                vertLines: { color: C.border, style: LineStyle.Dashed },
                horzLines: { color: C.border, style: LineStyle.Dashed },
              },
          rightPriceScale: { borderColor: C.border },
          timeScale:       { borderColor: C.border, timeVisible: false, secondsVisible: false },
          crosshair: {
            mode: 1,
            vertLine: { color: C.textTer, style: LineStyle.Dotted },
            horzLine: { color: C.textTer, style: LineStyle.Dotted },
          },
        });
        chartRef.current = chart;

        const candles = chart.addCandlestickSeries({
          upColor: C.pos, downColor: C.neg,
          borderUpColor: C.pos, borderDownColor: C.neg,
          wickUpColor: C.pos, wickDownColor: C.neg,
        });
        const rows = payload.rows.map(r => ({ time: r.time, open: r.open, high: r.high, low: r.low, close: r.close }));
        candles.setData(rows);

        if (!compact && payload.rows[0]?.volume != null) {
          const volSeries = chart.addHistogramSeries({
            priceFormat: { type: "volume" },
            priceScaleId: "vol",
          });
          chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
          volSeries.setData(payload.rows.map(r => ({
            time: r.time,
            value: r.volume,
            color: r.close >= r.open ? "rgba(76,175,125,0.30)" : "rgba(224,92,92,0.30)",
          })));
        }

        chart.timeScale().fitContent();
        setState({ status: "ok" });

        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(entries => {
            const w = entries[0]?.contentRect?.width;
            if (w && chartRef.current) chartRef.current.applyOptions({ width: w });
          });
          resizeObserver.observe(el);
        }
      } catch {
        if (!cancelled) setState({ status: "error", reason: "Chart unavailable" });
      }
    })();

    return () => {
      cancelled = true;
      if (resizeObserver) resizeObserver.disconnect();
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    };
  }, [ticker, height, days, compact, isValid]);

  if (state.status === "error") return <ChartFallback ticker={ticker} height={height} reason={state.reason} />;

  const tvHref = tvSymbolUrl(ticker);
  return (
    <div style={{ position: "relative", height, width: "100%", borderRadius: 10, overflow: "hidden", background: C.surface }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {tvHref && (
        <a href={tvHref} target="_blank" rel="noopener noreferrer"
          title={`Open ${ticker} on TradingView`}
          className="chart-tv-badge"
          style={{ position: "absolute", top: 8, left: 10, zIndex: 2, fontSize: 11, padding: "2px 6px", borderRadius: 5, background: "rgba(23,23,26,0.7)", textDecoration: "none" }}>
          {ticker} <span style={{ opacity: 0.5 }}>↗</span>
        </a>
      )}
      {state.status === "loading" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center", background: C.surface }}>
          <LoadingLine message="Loading chart…" />
        </div>
      )}
    </div>
  );
}

// ── Ticker autocomplete ───────────────────────────────────
export function TickerAutocomplete({ value, onChange, onSelect, onKeyDown, placeholder, className, style }) {
  const [open, setOpen]               = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const containerRef                  = useRef(null);

  useEffect(() => {
    if (!value) { setSuggestions([]); setOpen(false); return; }
    const q = value.toUpperCase();
    const filtered = TICKER_LIST.filter(t =>
      t.ticker.startsWith(q) || t.name.toUpperCase().includes(q)
    ).slice(0, 8);
    setSuggestions(filtered);
    setOpen(filtered.length > 0);
  }, [value]);

  useEffect(() => {
    const handler = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (ticker) => {
    if (onSelect) onSelect(ticker);
    else onChange({ target: { value: ticker } });
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", ...style }}>
      <input className={className} value={value} onChange={onChange} onKeyDown={onKeyDown}
        placeholder={placeholder} style={{ width: "100%" }} autoComplete="off" />
      {open && (
        <div className="ticker-dropdown">
          {suggestions.map(s => (
            <button key={s.ticker} className="ticker-dropdown-item"
              onMouseDown={e => { e.preventDefault(); handleSelect(s.ticker); }}>
              <span className="ticker-dropdown-symbol">{s.ticker}</span>
              <span className="ticker-dropdown-name">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chat bubble ───────────────────────────────────────────
const SECTION_LABELS = new Set([
  "WHAT",
  "DECISION",
  "WHY",
  "CONTEXT",
  "SIGNAL",
  "AVOID",
  "SETUP",
  "VALUATION",
  "TECHNICALS",
  "SENTIMENT",
  "BOTTOM LINE",
  "PORTFOLIO HEALTH",
  "CONCENTRATION",
  "SECTOR EXPOSURE",
  "RISK FLAGS",
  "DIVERSIFICATION",
  "WATCHLIST",
  "HEADLINE",
  "TRACK RECORD",
  "KEY METRICS TO WATCH",
  "RISK",
  "ANALYST CONSENSUS",
  "TRADE SETUP",
  "SUMMARY",
  "BEST TRADE",
  "WORST TRADE",
  "PATTERN",
  "LESSONS",
]);

function cleanMarkdownLine(line) {
  return line
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s+/, "")
    .trim();
}

function parseKyraContent(content = "") {
  const lines = String(content).split(/\r?\n/);
  const blocks = [];

  lines.forEach((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const line = cleanMarkdownLine(trimmed);
    const sectionMatch = line.match(/^(?:\d+[.)]\s*)?([A-Z][A-Z /&-]{2,35}):\s*(.*)$/);
    if (sectionMatch && SECTION_LABELS.has(sectionMatch[1])) {
      blocks.push({ type: "section", label: sectionMatch[1], text: sectionMatch[2] });
      return;
    }

    const bulletMatch = line.match(/^[-•]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({ type: "bullet", text: bulletMatch[1] });
      return;
    }

    const numberedMatch = line.match(/^\d+[.)]\s+(.*)$/);
    if (numberedMatch) {
      blocks.push({ type: "paragraph", text: numberedMatch[1] });
      return;
    }

    blocks.push({ type: "paragraph", text: line });
  });

  return blocks.length ? blocks : [{ type: "paragraph", text: content }];
}

export function MessageBody({ content }) {
  const blocks = parseKyraContent(content);

  return (
    <div className="message-body">
      {blocks.map((block, i) => {
        if (block.type === "section") {
          return (
            <div key={i} className="message-section">
              <div className="message-section-label">{block.label}</div>
              {block.text && <div className="message-section-text">{block.text}</div>}
            </div>
          );
        }

        if (block.type === "bullet") {
          return (
            <div key={i} className="message-bullet">
              <span aria-hidden="true" />
              <div>{block.text}</div>
            </div>
          );
        }

        return <p key={i}>{block.text}</p>;
      })}
    </div>
  );
}

export function ChatBubble({ msg }) {
  const isUser  = msg.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className={isUser ? "chat-bubble-user" : "chat-bubble-assistant"} style={{ position: "relative" }}>
      <div>
        {isUser ? msg.content : <MessageBody content={msg.content} />}
        {!isUser && (
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
            {msg.sources?.map((s, i) => (
              <span key={i} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 20, padding: "2px 10px", fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: C.textSec }}>
                {s}
              </span>
            ))}
            {msg.responseTime && (
              <span style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 20, padding: "2px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.textTer }}>
                {msg.responseTime}s
              </span>
            )}
            <button
              onClick={handleCopy}
              title="Copy response"
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: copied ? C.pos : C.textTer, padding: "2px 4px", display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontFamily: "'DM Sans',sans-serif", transition: "color 150ms" }}
            >
              {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Auth modal ────────────────────────────────────────────
function firebaseErrorMsg(code) {
  const map = {
    "auth/user-not-found":       "No account found with this email.",
    "auth/wrong-password":       "Incorrect password.",
    "auth/email-already-in-use": "Email already registered.",
    "auth/weak-password":        "Password must be at least 6 characters.",
    "auth/invalid-email":        "Invalid email address.",
    "auth/invalid-credential":   "Invalid email or password.",
    "auth/too-many-requests":    "Too many attempts. Try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return map[code] || "Authentication failed. Please try again.";
}

export function AuthModal({ onSuccess }) {
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError]       = useState("");
  const [info, setInfo]         = useState("");
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    if (!email || !password) return;
    if (!auth) {
      setError(firebaseInitError || "Authentication is not configured.");
      return;
    }
    setLoading(true); setError(""); setInfo("");
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!username.trim()) {
          throw { code: "auth/username-required" };
        }
        const usernameValue = username.trim();
        const usernameKey = usernameValue.toLowerCase();
        const usernameRef = doc(db, "usernames", usernameKey);
        const existing = await getDoc(usernameRef);
        if (existing.exists()) {
          throw { code: "auth/username-already-in-use" };
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: usernameValue });
        await setDoc(usernameRef, { uid: user.uid, email, created: serverTimestamp() });
        await setDoc(doc(db, "users", user.uid), { username: usernameValue, created: serverTimestamp() }, { merge: true });
      }
      onSuccess?.();
    } catch (err) {
      console.error("[auth] code:", err.code || err, "msg:", err.message || err);
      if (err.code === "auth/username-already-in-use") {
        setError("Username already taken. Pick another.");
      } else if (err.code === "auth/username-required") {
        setError("Choose a username.");
      } else {
        setError(firebaseErrorMsg(err.code));
      }
    }
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    if (!auth) {
      setError(firebaseInitError || "Authentication is not configured.");
      return;
    }
    setLoading(true); setError(""); setInfo("");
    try {
      await signInWithPopup(auth, googleProvider);
      onSuccess?.();
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(firebaseErrorMsg(err.code));
      }
    }
    setLoading(false);
  };

  const resetPassword = async () => {
    if (!email) {
      setError("Enter your email to reset password.");
      setInfo("");
      return;
    }
    if (!auth) {
      setError(firebaseInitError || "Authentication is not configured.");
      return;
    }
    setLoading(true); setError(""); setInfo("");
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo("Password reset sent. Check your inbox.");
    } catch (err) {
      console.error("[auth] reset code:", err.code, "msg:", err.message);
      setError(firebaseErrorMsg(err.code));
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-up">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: C.surface2, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}`, marginBottom: 12 }}>
            <Aperture size={28} color={C.text} />
          </div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: C.accent }}>Fintrest</div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.textSec, marginTop: 4 }}>Money, made clear.</div>
        </div>

        <div className="auth-tabs">
          {[ ["login","Sign In"], ["register","Create Account"] ].map(([m, lbl]) => (
            <button key={m} className={`auth-tab${mode === m ? " active" : ""}`}
              onClick={() => {
                setMode(m);
                setError("");
                setInfo("");
                if (m === "login") setUsername("");
              }}>
              {lbl}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mode === "register" && (
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Username</div>
              <input className="input-line" value={username} onChange={e => setUsername(e.target.value)} placeholder="choose a unique username" type="text" />
            </div>
          )}
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Email</div>
            <input className="input-line" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Password</div>
            <input className="input-line" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password"
              onKeyDown={e => e.key === "Enter" && submit()} />
            {mode === "login" && (
              <button type="button" className="auth-link" onClick={resetPassword} disabled={!email || loading}
                style={{ marginTop: 8, border: "none", background: "none", color: C.accent, cursor: !email || loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 12, padding: 0 }}>
                Forgot password?
              </button>
            )}
          </div>
          {error && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.neg }}>{error}</div>}
          {info && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: C.pos }}>{info}</div>}
          <button className="auth-submit" onClick={submit} disabled={loading || !email || !password || !auth || (mode === "register" && !username.trim())}>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.textTer }}>or</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <button
            onClick={signInWithGoogle}
            disabled={loading || !auth}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.surface2, color: C.text, cursor: loading || !auth ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500,
              opacity: loading || !auth ? 0.6 : 1, transition: "border-color 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.borderA}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
