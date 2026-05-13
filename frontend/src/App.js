import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { TrendingUp, MessageSquare, Bookmark, ArrowLeftRight, PieChart, Bell, LogOut, X, MoreHorizontal, User } from "lucide-react";
import Aperture from "./Aperture";
import FintrestMark from "./FintrestMark";
import KyraPanel from "./KyraPanel";
import "./App.css";

import { API_URL, C, WATCHLIST_DEFAULT, NAV_ITEMS, MOBILE_TABS, MORE_SECTIONS } from "./constants";
import {
  getSessionId, setSessionId, removeSessionId, startSession, clearSession,
  mkMsg, normalizeSentimentPayload, normalizeComparePayload,
} from "./utils";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, setDoc, deleteDoc, getDoc, onSnapshot } from "firebase/firestore";
import { AuthModal } from "./components";
import LandingPage   from "./LandingPage";

import OverviewPage  from "./pages/OverviewPage";
import MarketPage    from "./pages/MarketPage";
import ChatPage      from "./pages/ChatPage";
import WatchlistPage from "./pages/WatchlistPage";
import ComparePage   from "./pages/ComparePage";
import PortfolioPage from "./pages/PortfolioPage";
import AlertsPage    from "./pages/AlertsPage";

export default function App() {
  const [windowW, setWindowW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWindowW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMobile = windowW < 640;
  const isTablet = windowW >= 640 && windowW < 1024;

  // Splash
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1850);
    return () => clearTimeout(t);
  }, []);

  // Section state
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileTab, setMobileTab]         = useState("overview");

  // Auth
  const devBypass = process.env.REACT_APP_DEV_BYPASS === "1";
  const [userState, setUserState]     = useState(devBypass ? { email: "dev@local", uid: "dev" } : null);
  const [authLoading, setAuthLoading] = useState(!devBypass);
  const [showAuth, setShowAuth]       = useState(false);
  const [allowedStatus, setAllowedStatus] = useState(null); // null=checking, true=ok, false=blocked

  useEffect(() => {
    if (devBypass) return;
    return onAuthStateChanged(auth, async (user) => {
      setUserState(user);
      if (user) {
        const snap = await getDoc(doc(db, "allowList", user.email));
        setAllowedStatus(snap.exists());
      } else {
        setAllowedStatus(null);
      }
      setAuthLoading(false);
    });
  }, [devBypass]);

  const handleAuthSuccess = () => {};
  const handleLogout      = () => signOut(auth);

  // Watchlist & market
  const [watchlist, setWatchlist]         = useState(WATCHLIST_DEFAULT);
  const [selectedStock, setSelectedStock] = useState(WATCHLIST_DEFAULT[0]);
  const [stockQuote, setStockQuote]       = useState(null);
  const [stockQuoteLoading, setStockQuoteLoading] = useState(false);

  // Firestore watchlist sync
  useEffect(() => {
    const uid = userState?.uid;
    if (!uid || devBypass) return;
    const userDocRef = doc(db, "users", uid);
    const ref = collection(db, "users", uid, "watchlist");
    const unsub = onSnapshot(ref, async (snap) => {
      if (snap.empty) {
        // Only seed defaults on first login — check flag to avoid re-seeding after user clears watchlist
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists() && userSnap.data().watchlistSeeded) return;
        await Promise.all([
          setDoc(userDocRef, { watchlistSeeded: true }, { merge: true }),
          ...WATCHLIST_DEFAULT.map(s =>
            setDoc(doc(db, "users", uid, "watchlist", s.ticker), { name: s.name, base: s.base, type: s.type })
          ),
        ]);
        return;
      }
      const items = snap.docs.map(d => ({
        ticker: d.id,
        name:   d.data().name ?? d.id,
        base:   d.data().base ?? 0,
        type:   d.data().type ?? "India",
        price: null, change: null,
      }));
      setWatchlist(items);
      setSelectedStock(prev => items.find(s => s.ticker === prev.ticker) ?? items[0]);
    });
    return unsub;
  }, [userState?.uid, devBypass]);
  const [chartDays, setChartDays]         = useState(180);

  // Kyra panel
  const [kyraOpen, setKyraOpen]     = useState(false);
  const [kyraInput, setKyraInput]   = useState("");

  // Chat
  const [messages, setMessages]     = useState([mkMsg("assistant", "Hi, I'm Kyra. Ask me about NSE/BSE stocks, mutual funds, SIPs, or anything else about investing in India — and I'll tell you what the numbers actually say.", { sources: [] })]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [timeRange, setTimeRange]   = useState("7d");
  const bottomRef                   = useRef(null);
  const [historyOpen, setHistoryOpen]   = useState(false);
  const [chatSessions, setChatSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fintrest_sessions") || "[]"); } catch { return []; }
  });

  // Portfolio (simple — ticker-only, used by chat flow)
  const [portfolio, setPortfolio]           = useState([]);
  const [portfolioInput, setPortfolioInput] = useState("");
  const [portfolioData, setPortfolioData]   = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  // Portfolio (full analysis — holdings with qty + avg price)
  const [holdings, setHoldings]               = useState([]);
  const [holdingInput, setHoldingInput]       = useState({ ticker: "", quantity: "", avgPrice: "" });
  const [holdingError, setHoldingError]       = useState("");
  const [analysisResult, setAnalysisResult]   = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [portMode, setPortMode]               = useState("analyze");

  // Compare
  const [compareA, setCompareA]         = useState("");
  const [compareB, setCompareB]         = useState("");
  const [compareData, setCompareData]   = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Alerts
  const [alerts, setAlerts]                   = useState([]);
  const [alertTicker, setAlertTicker]         = useState("");
  const [alertThreshold, setAlertThreshold]   = useState("");
  const [alertDirection, setAlertDirection]   = useState("above");
  const [alertCreating, setAlertCreating]     = useState(false);
  const [alertError, setAlertError]           = useState("");
  const [triggeredNotifs, setTriggeredNotifs] = useState([]);

  // Sentiment
  const [sentiments, setSentiments]             = useState({});
  const [sentimentLoading, setSentimentLoading] = useState({});
  const fetchedSentiments                       = useRef(new Set());

  // Conviction
  const [convictions, setConvictions]             = useState({});
  const [convictionLoading, setConvictionLoading] = useState({});
  const fetchedConvictions                        = useRef(new Set());

  // News
  const [newsData, setNewsData]       = useState({});
  const [newsLoading, setNewsLoading] = useState({});
  const fetchedNews                   = useRef(new Set());
  const fetchedNewsOrder              = useRef([]);

  // ── Effects ────────────────────────────────────────────
  useEffect(() => { if (!getSessionId()) startSession(); }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isMobile ? "auto" : "smooth" });
  }, [messages, isMobile]);

  useEffect(() => {
    const sid = getSessionId();
    if (!sid) return;
    (async () => {
      try {
        const res  = await fetch(`${API_URL}/session/${sid}/history`);
        if (!res.ok) return;
        const data = await res.json();
        const hist = (data.messages || []).map(m => mkMsg(m.role, m.content, { sources: [] }));
        if (hist.length) setMessages([mkMsg("assistant", "Welcome back. Resuming your previous conversation.", { sources: [] }), ...hist]);
      } catch {}
    })();
  }, []);

  // Enrich watchlist prices — skip refresh when tab hidden
  useEffect(() => {
    const fetchPrices = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`${API_URL}/watchlist/enrich`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tickers: WATCHLIST_DEFAULT.map(s => s.ticker) }),
        });
        if (!res.ok) return;
        const { items } = await res.json();
        const byTicker = Object.fromEntries(items.map(i => [i.ticker, i]));
        const updated = WATCHLIST_DEFAULT.map(stock => {
          const live = byTicker[stock.ticker];
          if (!live || live.error || live.price == null) return stock;
          return { ...stock, price: live.price, change: live.change_5d_pct ?? null, base: live.price, sparkline: live.sparkline ?? null };
        });
        setWatchlist(updated);
        setSelectedStock(prev => updated.find(s => s.ticker === prev.ticker) ?? prev);
        items.forEach(item => {
          if (item.sentiment_score != null) {
            fetchedSentiments.current.add(item.ticker);
            setSentiments(prev => ({ ...prev, [item.ticker]: { ticker: item.ticker, score: item.sentiment_score, label: item.sentiment_label, headline_count: 0, headlines: [] } }));
          }
        });
      } catch {}
    };
    fetchPrices();
    const t = setInterval(fetchPrices, 60_000);
    return () => clearInterval(t);
  }, []);

  const fetchSentiment = useCallback(async (ticker, name = "") => {
    if (fetchedSentiments.current.has(ticker)) return;
    fetchedSentiments.current.add(ticker);
    setSentimentLoading(prev => ({ ...prev, [ticker]: true }));
    try {
      const res  = await fetch(`${API_URL}/sentiment/${ticker}?company=${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSentiments(prev => ({ ...prev, [ticker]: normalizeSentimentPayload(data) }));
    } catch {
      fetchedSentiments.current.delete(ticker);
      setSentiments(prev => ({ ...prev, [ticker]: null }));
    }
    setSentimentLoading(prev => ({ ...prev, [ticker]: false }));
  }, []);

  const fetchConviction = useCallback(async (ticker, name = "") => {
    if (fetchedConvictions.current.has(ticker)) return;
    fetchedConvictions.current.add(ticker);
    setConvictionLoading(prev => ({ ...prev, [ticker]: true }));
    try {
      const res  = await fetch(`${API_URL}/conviction/${ticker}?company=${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConvictions(prev => ({ ...prev, [ticker]: data }));
    } catch {
      fetchedConvictions.current.delete(ticker);
      setConvictions(prev => ({ ...prev, [ticker]: null }));
    }
    setConvictionLoading(prev => ({ ...prev, [ticker]: false }));
  }, []);

  const fetchNews = useCallback(async (ticker, name = "") => {
    if (fetchedNews.current.has(ticker)) return;
    if (fetchedNewsOrder.current.length >= 50) {
      const evict = fetchedNewsOrder.current.shift();
      fetchedNews.current.delete(evict);
    }
    fetchedNews.current.add(ticker);
    fetchedNewsOrder.current.push(ticker);
    setNewsLoading(prev => ({ ...prev, [ticker]: true }));
    try {
      const res  = await fetch(`${API_URL}/news/${ticker}?company=${encodeURIComponent(name)}`);
      const data = await res.json();
      setNewsData(prev => ({ ...prev, [ticker]: data }));
    } catch {
      fetchedNews.current.delete(ticker);
      fetchedNewsOrder.current = fetchedNewsOrder.current.filter(t => t !== ticker);
      setNewsData(prev => ({ ...prev, [ticker]: null }));
    }
    setNewsLoading(prev => ({ ...prev, [ticker]: false }));
  }, []);

  const fetchQuote = useCallback(async (ticker) => {
    setStockQuoteLoading(true);
    setStockQuote(null);
    try {
      const res = await fetch(`${API_URL}/quote/${encodeURIComponent(ticker)}`);
      if (res.ok) {
        const { quote } = await res.json();
        setStockQuote(quote);
      }
    } catch {}
    finally { setStockQuoteLoading(false); }
  }, []);

  useEffect(() => {
    if (isMobile && activeSection !== "watchlist") return;
    watchlist.forEach(s => fetchSentiment(s.ticker, s.name));
  }, [watchlist, fetchSentiment, isMobile, activeSection]);

  useEffect(() => {
    fetchSentiment(selectedStock.ticker, selectedStock.name);
    fetchConviction(selectedStock.ticker, selectedStock.name);
    fetchQuote(selectedStock.ticker);
  }, [selectedStock.ticker, selectedStock.name, fetchSentiment, fetchConviction, fetchQuote]);

  useEffect(() => {
    if (isMobile && activeSection !== "market") return;
    if (!isMobile && activeSection !== "market" && activeSection !== "overview") return;
    const delay = isMobile ? 1800 : 0;
    const timer = setTimeout(() => {
      fetchNews(selectedStock.ticker, selectedStock.name);
    }, delay);
    return () => clearTimeout(timer);
  }, [selectedStock.ticker, selectedStock.name, fetchNews, isMobile, activeSection]);

  useEffect(() => {
    if (activeSection === "alerts") {
      fetchAlerts();
      setAlertError("");
    }
  }, [activeSection]);

  // Alert polling
  useEffect(() => {
    const poll = async () => {
      if (document.hidden) return;
      const sid = getSessionId();
      if (!sid) return;
      try {
        const res  = await fetch(`${API_URL}/check_alerts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sid }) });
        if (!res.ok) return;
        const data = await res.json();
        if (data.triggered?.length) { setTriggeredNotifs(prev => [...prev, ...data.triggered]); fetchAlerts(); }
      } catch {}
    };
    poll();
    const t = setInterval(poll, 300_000);
    return () => clearInterval(t);
  }, []);

  // ── Handlers ───────────────────────────────────────────
  const fetchAlerts = async () => {
    const sid = getSessionId();
    if (!sid) return;
    try {
      const res  = await fetch(`${API_URL}/get_alerts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sid }) });
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch {}
  };

  const createAlert = async () => {
    const ticker    = alertTicker.toUpperCase().trim();
    const threshold = parseFloat(alertThreshold);
    if (!ticker || !Number.isFinite(threshold) || threshold <= 0) { setAlertError("Enter a valid ticker and positive price threshold."); return; }
    setAlertError(""); setAlertCreating(true);
    try {
      const sid = getSessionId() || await startSession();
      const res = await fetch(`${API_URL}/create_alert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sid, ticker, threshold, direction: alertDirection }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAlertTicker(""); setAlertThreshold(""); await fetchAlerts();
    } catch { setAlertError("Failed to create alert. Please try again."); }
    setAlertCreating(false);
  };

  const deleteAlert = async (id) => {
    const sid = getSessionId();
    if (!sid) return;
    try {
      await fetch(`${API_URL}/delete_alert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sid, alert_id: id }) });
      await fetchAlerts();
    } catch {}
  };

  // Firestore watchlist CRUD
  const addToFirestoreWatchlist = async (ticker, name = ticker, base = 0, type = "India") => {
    const uid = userState?.uid;
    if (!uid || devBypass) return;
    const tickerUpper = ticker.toUpperCase();
    // Add to local state immediately
    if (!watchlist.some(s => s.ticker === tickerUpper)) {
      setWatchlist(prev => [...prev, { ticker: tickerUpper, name, price: null, change: null, base, type }]);
    }
    await setDoc(doc(db, "users", uid, "watchlist", tickerUpper), { name, base, type });
  };
  const removeFromFirestoreWatchlist = async (ticker) => {
    const uid = userState?.uid;
    if (!uid || devBypass) return;
    const tickerUpper = ticker.toUpperCase();
    // Remove from local state immediately
    setWatchlist(prev => prev.filter(s => s.ticker !== tickerUpper));
    await deleteDoc(doc(db, "users", uid, "watchlist", tickerUpper));
  };

  const addToPortfolio      = (t) => { const v = t.trim().toUpperCase(); if (v) setPortfolio(prev => prev.includes(v) ? prev : [...prev, v]); };
  const removeFromPortfolio = (t) => setPortfolio(prev => prev.filter(x => x !== t));

  const runPortfolioAnalysis = async (over = null) => {
    const tickers = over || portfolio;
    if (!tickers.length) return;
    setPortfolioLoading(true);
    try {
      const sid  = getSessionId() || await startSession();
      const res  = await fetch(`${API_URL}/portfolio`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tickers, session_id: sid }) });
      const data = await res.json();
      if (data.session_id) setSessionId(data.session_id);
      setPortfolioData(data);
    } catch { setPortfolioData({ error: "Portfolio analysis failed." }); }
    setPortfolioLoading(false);
  };

  const runComparison = async (a = null, b = null) => {
    const ta = (a || compareA).trim().toUpperCase();
    const tb = (b || compareB).trim().toUpperCase();
    if (!ta || !tb) return;
    setCompareLoading(true);
    try {
      const sid  = getSessionId() || await startSession();
      const res  = await fetch(`${API_URL}/compare`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker_a: ta, ticker_b: tb, session_id: sid }) });
      const raw = await res.json();
      if (process.env.NODE_ENV !== "production") console.debug("[compare]", ta, tb, raw);
      const data = normalizeComparePayload(raw, ta, tb);
      if (data.session_id) setSessionId(data.session_id);
      setCompareData(data);
      fetchSentiment(ta); fetchSentiment(tb);
    } catch { setCompareData({ error: "Comparison failed." }); }
    setCompareLoading(false);
  };

  const buildContextualQuestion = (question, context) => {
    if (!context?.ticker) return question;

    const ticker = context.ticker;
    const label = context.label || context.name || ticker;
    const lowerQuestion = question.toLowerCase();
    const alreadyMentionsTicker = lowerQuestion.includes(ticker.toLowerCase());
    const alreadyMentionsName = label && lowerQuestion.includes(label.toLowerCase());

    if (alreadyMentionsTicker || alreadyMentionsName) return question;

    const contextLines = [
      `Selected stock: ${label} (${ticker})`,
      context.price != null ? `Displayed price: ₹${Number(context.price).toLocaleString("en-IN")}` : null,
      context.change != null ? `Displayed 5D change: ${Number(context.change).toFixed(2)}%` : null,
      context.pe != null ? `P/E: ${Number(context.pe).toFixed(1)}` : null,
      context.marketCap != null ? `Market cap: ₹${Number(context.marketCap).toLocaleString("en-IN")}` : null,
      context.week52High != null ? `52-week high: ₹${Number(context.week52High).toLocaleString("en-IN")}` : null,
      context.week52Low != null ? `52-week low: ₹${Number(context.week52Low).toLocaleString("en-IN")}` : null,
      context.relVol != null ? `Relative volume: ${context.relVol}x` : null,
      context.sentimentScore != null ? `News sentiment: ${context.sentimentScore}/100 (${context.sentimentLabel || "unknown"})` : null,
      context.convictionScore != null ? `Fintrest conviction: ${context.convictionScore}/100 (${context.convictionLabel || "unknown"})` : null,
    ].filter(Boolean);

    return `${question}

Current app context:
${contextLines.join("\n")}

Treat references like "this stock", "it", "this company", or "the current stock" as ${ticker}. For buy/hold/sell questions, use the displayed Fintrest context above as first-party product context.`;
  };

  const sendMessage = async (question, { noRedirect = false, context = null } = {}) => {
    if (!question.trim() || loading) return;
    const inferredContext = context || (activeSection === "market"
      ? kyraContext
      : null);
    const apiQuestion = buildContextualQuestion(question, inferredContext);
    const lower       = apiQuestion.toLowerCase();
    const isCompare   = lower.includes(" vs ") || lower.includes("compare ");
    const isPortfolio = lower.includes("portfolio") || lower.includes("analyze my");
    const isForex     = /\b(usd|eur|gbp|jpy|inr|cny|forex|currency|exchange rate|rupee|dollar|euro|pound)\b/.test(lower) && lower.includes("rate");
    setLoading(true);
    setMessages(prev => { const next = [...prev, mkMsg("user", question)]; return next.length > 100 ? next.slice(-100) : next; });
    setInput("");
    if (!noRedirect) {
      setMobileTab("chat");
      setActiveSection("chat");
    }

    const sid    = getSessionId() || await startSession();
    let endpoint = "/ask";
    if (isCompare)        endpoint = "/compare/from-chat";
    else if (isPortfolio) endpoint = holdings.length > 0 ? "/portfolio" : "/portfolio/from-chat";
    else if (isForex)     endpoint = "/forex/from-chat";

    // Portfolio with loaded holdings: send tickers directly, no extraction needed
    const body = (isPortfolio && holdings.length > 0)
      ? { tickers: holdings.map(h => h.ticker), session_id: sid }
      : { question: apiQuestion, query: apiQuestion, session_id: sid, time_range: timeRange };

    try {
      const res  = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages(prev => [...prev, mkMsg("assistant", data?.detail || data?.error || `Request failed (${res.status}).`, { sources: [] })]);
      } else {
        if (data.session_id) setSessionId(data.session_id);
        if (isCompare && data.ticker_a) {
          const normalized = normalizeComparePayload(data, data.ticker_a, data.ticker_b);
          setCompareA(normalized.ticker_a); setCompareB(normalized.ticker_b); setCompareData(normalized);
          setMessages(prev => [...prev, mkMsg("assistant", normalized.verdict || "Comparison data loaded.", { sources: ["Yahoo Finance"] })]);
        } else if (isPortfolio && data.tickers) {
          setPortfolio(data.tickers); setPortfolioData(data);
          setMessages(prev => [...prev, mkMsg("assistant", data.summary, { sources: ["Yahoo Finance"] })]);
        } else {
          const answer = typeof data.answer === "string" ? data.answer : data.detail || data.error || "No response received.";
          setMessages(prev => [...prev, mkMsg("assistant", answer, { sources: data.sources || [], responseTime: data.response_time })]);
        }
      }
    } catch {
      setMessages(prev => [...prev, mkMsg("assistant", "Connection error.", { sources: [] })]);
    }
    setLoading(false);
  };

  const saveChatSession = (msgs, sid) => {
    const userMsgs = msgs.filter(m => m.role === "user");
    if (!userMsgs.length) return;
    const entry = {
      id:       sid || getSessionId() || Date.now().toString(),
      ts:       Date.now(),
      preview:  userMsgs[0].content.slice(0, 80),
      messages: msgs,
    };
    setChatSessions(prev => {
      const deduped = prev.filter(s => s.id !== entry.id);
      const next    = [entry, ...deduped].slice(0, 20);
      localStorage.setItem("fintrest_sessions", JSON.stringify(next));
      return next;
    });
  };

  const loadChatSession = async (session) => {
    const sid = session.id;
    let msgs   = session.messages || [];
    try {
      const res  = await fetch(`${API_URL}/session/${sid}/history`);
      if (res.ok) {
        const data = await res.json();
        const hist = (data.messages || []).map(m => mkMsg(m.role, m.content, { sources: [] }));
        if (hist.length) msgs = hist;
      }
    } catch {}
    setSessionId(sid);
    setMessages(msgs.length ? msgs : session.messages);
    setHistoryOpen(false);
  };

  const handleNewChat = async () => {
    saveChatSession(messages, getSessionId());
    await clearSession();
    setMessages([mkMsg("assistant", "New conversation started. What would you like to know?", { sources: [] })]);
  };

  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
    setActiveSection("market");
    if (isMobile) setMobileTab("market");  // market tab when stock selected
    fetchQuote(stock.ticker);
  };

  const activeAlerts    = alerts.filter(a => !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);
  const userEmail   = userState?.email || userState?.displayName || "";
  const userInitial = userEmail.length > 0 ? userEmail[0].toUpperCase() : "?";
  const accountProvider = userState?.providerData?.[0]?.providerId?.replace(".com", "") || (devBypass ? "dev" : "email");
  const accountCreated = userState?.metadata?.creationTime
    ? new Date(userState.metadata.creationTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";

  // ── Kyra context (injected per active section) ────────
  const kyraContext = useMemo(() => {
    switch (activeSection) {
      case "market": {
        const sentiment = sentiments[selectedStock.ticker];
        const conviction = convictions[selectedStock.ticker];
        return {
          label: selectedStock.name,
          ticker: selectedStock.ticker,
          price: selectedStock.price,
          change: selectedStock.change,
          pe: stockQuote?.pe_ratio,
          marketCap: stockQuote?.market_cap,
          week52High: stockQuote?.week52_high,
          week52Low: stockQuote?.week52_low,
          relVol: stockQuote?.rel_volume,
          sentimentScore: sentiment?.score,
          sentimentLabel: sentiment?.label,
          convictionScore: conviction?.score,
          convictionLabel: conviction?.label,
        };
      }
      case "watchlist": return { label: "Watchlist", name: `${watchlist.length} stocks` };
      case "portfolio": return { label: "Portfolio", name: holdings.length ? `${holdings.length} holdings` : null };
      case "compare":   return { label: compareA && compareB ? `${compareA} vs ${compareB}` : "Compare", name: null };
      case "alerts":    return { label: "Alerts", name: `${activeAlerts.length} active` };
      case "profile":   return { label: "Profile", name: userEmail };
      default:          return { label: null };
    }
  }, [activeSection, selectedStock, stockQuote, sentiments, convictions, watchlist.length, holdings.length, compareA, compareB, activeAlerts.length, userEmail]);

  // ── Sidebar ────────────────────────────────────────────
  const sidebarCollapsed = isTablet;

  function Sidebar() {
    return (
      <div className={`sidebar${sidebarCollapsed ? " collapsed" : ""}`}>
        <div className="sidebar-brand">
          <FintrestMark variant="appnav" size={24} color={C.text} />
          <span className="sidebar-brand-name">Fintrest</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ id, label, Icon: Icon_ }) => (
            <button key={id}
              className={`nav-item${activeSection === id ? " active" : ""}`}
              onClick={() => { setActiveSection(id); if (MORE_SECTIONS.includes(id) && isMobile) setMobileTab("more"); }}
              title={sidebarCollapsed ? label : undefined}>
              <Icon_ size={18} />
              <span className="nav-item-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className={`sidebar-footer${activeSection === "profile" ? " active" : ""}`}>
          <button
            className="sidebar-profile-btn"
            onClick={() => setActiveSection("profile")}
            title={sidebarCollapsed ? "Profile" : undefined}
          >
            <div className="sidebar-avatar">{userInitial}</div>
            <div className="sidebar-email">{userEmail}</div>
          </button>
          <button className="sidebar-logout" onClick={handleLogout} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── Mobile bottom nav ─────────────────────────────────
  function MobileNav() {
    return (
      <div className="mobile-nav">
        {MOBILE_TABS.map(({ id, label, Icon: Icon_ }) => (
          <button key={id} className={`mobile-nav-btn${mobileTab === id ? " active" : ""}`}
            onClick={() => {
              setMobileTab(id);
              if (id === "more") {
                if (!MORE_SECTIONS.includes(activeSection)) setActiveSection("watchlist");
              } else {
                setActiveSection(id);
              }
              if (id === "alerts" || (id === "more" && activeSection === "alerts")) fetchAlerts();
            }}>
            <Icon_ size={20} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    );
  }

  // ── Mobile "More" sub-nav ─────────────────────────────
  function MobileMoreNav() {
    const sections = [{ id: "watchlist", label: "Watchlist" }, { id: "compare", label: "Compare" }, { id: "portfolio", label: "Portfolio" }, { id: "alerts", label: "Alerts" }, { id: "profile", label: "Profile" }];
    return (
      <div style={{ display: "flex", gap: 6, padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: C.bg }}>
        {sections.map(({ id, label }) => (
          <button key={id} className={`btn-ghost${activeSection === id ? " active" : ""}`}
            style={{ flex: 1, padding: "8px 0", fontSize: 13, textAlign: "center", background: activeSection === id ? C.surface2 : "transparent", color: activeSection === id ? C.text : C.textSec, borderColor: activeSection === id ? C.borderA : C.border }}
            onClick={() => { setActiveSection(id); if (id === "alerts") fetchAlerts(); }}>
            {label}
          </button>
        ))}
      </div>
    );
  }

  function onAskKyra(text) {
    sendMessage(text);
  }

  function renderSection() {
    switch (activeSection) {
      case "overview":
        return <OverviewPage isMobile={isMobile} watchlist={watchlist} selectedStock={selectedStock} handleSelectStock={handleSelectStock} sentiments={sentiments} activeAlerts={activeAlerts} holdings={holdings} analysisResult={analysisResult} sendMessage={sendMessage} loading={loading} setActiveSection={setActiveSection} onAskKyra={onAskKyra} />;
      case "market":
        return <MarketPage isMobile={isMobile} watchlist={watchlist} selectedStock={selectedStock} sentiments={sentiments} sentimentLoading={sentimentLoading} convictions={convictions} convictionLoading={convictionLoading} newsData={newsData} newsLoading={newsLoading} chartDays={chartDays} setChartDays={setChartDays} handleSelectStock={handleSelectStock} sendMessage={sendMessage} stockQuote={stockQuote} stockQuoteLoading={stockQuoteLoading} setActiveSection={setActiveSection} />;
      case "chat":
        return <ChatPage messages={messages} loading={loading} input={input} setInput={setInput} historyOpen={historyOpen} setHistoryOpen={setHistoryOpen} chatSessions={chatSessions} bottomRef={bottomRef} sendMessage={sendMessage} handleNewChat={handleNewChat} loadChatSession={loadChatSession} />;
      case "watchlist":
        return <WatchlistPage watchlist={watchlist} sentiments={sentiments} sentimentLoading={sentimentLoading} handleSelectStock={handleSelectStock} onAdd={addToFirestoreWatchlist} onRemove={removeFromFirestoreWatchlist} />;
      case "compare":
        return <ComparePage isMobile={isMobile} compareA={compareA} compareB={compareB} setCompareA={setCompareA} setCompareB={setCompareB} compareData={compareData} compareLoading={compareLoading} runComparison={runComparison} chartDays={chartDays} />;
      case "portfolio":
        return <PortfolioPage isMobile={isMobile} portMode={portMode} setPortMode={setPortMode} holdings={holdings} setHoldings={setHoldings} holdingInput={holdingInput} setHoldingInput={setHoldingInput} holdingError={holdingError} setHoldingError={setHoldingError} analysisResult={analysisResult} setAnalysisResult={setAnalysisResult} analysisLoading={analysisLoading} setAnalysisLoading={setAnalysisLoading} portfolio={portfolio} portfolioData={portfolioData} portfolioLoading={portfolioLoading} portfolioInput={portfolioInput} setPortfolioInput={setPortfolioInput} runPortfolioAnalysis={runPortfolioAnalysis} addToPortfolio={addToPortfolio} removeFromPortfolio={removeFromPortfolio} />;
      case "alerts":
        return <AlertsPage isMobile={isMobile} activeAlerts={activeAlerts} triggeredAlerts={triggeredAlerts} alertTicker={alertTicker} setAlertTicker={setAlertTicker} alertThreshold={alertThreshold} setAlertThreshold={setAlertThreshold} alertDirection={alertDirection} setAlertDirection={setAlertDirection} alertError={alertError} alertCreating={alertCreating} createAlert={createAlert} deleteAlert={deleteAlert} />;
      case "profile":
        return (
          <div className="profile-page">
            <div className="profile-header">
              <div className="profile-avatar">{userInitial}</div>
              <div>
                <div className="profile-kicker">Account</div>
                <div className="profile-title">{userState?.displayName || userEmail || "Fintrest user"}</div>
                <div className="profile-subtitle">{userEmail}</div>
              </div>
            </div>

            <div className="profile-grid">
              <div className="profile-card">
                <div className="profile-card-label">Sign-in method</div>
                <div className="profile-card-value">{accountProvider}</div>
              </div>
              <div className="profile-card">
                <div className="profile-card-label">Member since</div>
                <div className="profile-card-value">{accountCreated}</div>
              </div>
              <div className="profile-card">
                <div className="profile-card-label">Watchlist</div>
                <div className="profile-card-value">{watchlist.length} stocks</div>
              </div>
              <div className="profile-card">
                <div className="profile-card-label">Portfolio</div>
                <div className="profile-card-value">{holdings.length || portfolio.length} items</div>
              </div>
            </div>

            <div className="profile-actions">
              <button className="profile-action" onClick={() => { setActiveSection("chat"); if (isMobile) setMobileTab("chat"); }}>
                <User size={16} />
                Open Kyra chat
              </button>
              <button className="profile-action" onClick={() => { setActiveSection("watchlist"); if (isMobile) setMobileTab("more"); }}>
                <Bookmark size={16} />
                Manage watchlist
              </button>
              <button className="profile-action" onClick={() => { setActiveSection("portfolio"); if (isMobile) setMobileTab("more"); }}>
                <PieChart size={16} />
                View portfolio
              </button>
              <button className="profile-action danger" onClick={handleLogout}>
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        );
      default:
        return <OverviewPage isMobile={isMobile} watchlist={watchlist} selectedStock={selectedStock} handleSelectStock={handleSelectStock} sentiments={sentiments} activeAlerts={activeAlerts} holdings={holdings} analysisResult={analysisResult} sendMessage={sendMessage} loading={loading} setActiveSection={setActiveSection} onAskKyra={onAskKyra} />;
    }
  }

  // ── Root render ────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="splash-screen">
        <FintrestMark variant="loop" size={72} color={C.text} />
      </div>
    );
  }

  // Unauthenticated → landing page with auth modal overlay
  if (!userState) {
    return (
      <>
        <LandingPage onSignIn={() => setShowAuth(true)} />
        {showAuth && <AuthModal onSuccess={() => setShowAuth(false)} />}
      </>
    );
  }

  // Firestore allowlist check
  if (!devBypass && allowedStatus === null) {
    return <div style={{ position: "fixed", inset: 0, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "var(--text-sec)", fontFamily: "var(--font-ui)", fontSize: 14 }}>Verifying access…</div></div>;
  }
  if (!devBypass && allowedStatus === false) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 32 }}>🔒</div>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: "var(--text)" }}>Closed Beta</div>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "var(--text-sec)", maxWidth: 320 }}>
          Fintrest is currently invite-only. Your account <strong style={{ color: "var(--text)" }}>{userState.email}</strong> is not on the access list.
        </div>
        <button onClick={() => signOut(auth)} style={{ marginTop: 8, padding: "10px 24px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-sec)", fontFamily: "'DM Sans',sans-serif", fontSize: 13, cursor: "pointer" }}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Splash — loop mark fades out after ~1.8 s */}
      {showSplash && (
        <div className="splash-screen">
          <FintrestMark variant="loop" size={72} color={C.text} />
        </div>
      )}

      {showAuth && <AuthModal onSuccess={handleAuthSuccess} />}

      {/* Triggered notifications */}
      {triggeredNotifs.length > 0 && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
          {triggeredNotifs.map((n) => (
            <div key={n.id || `${n.ticker}-${n.threshold}`} className="card fade-up" style={{ borderColor: C.accent, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.accent, marginBottom: 2 }}>{n.ticker}</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: C.textSec }}>Alert triggered at {n.threshold}</div>
              </div>
              <button onClick={() => setTriggeredNotifs(prev => prev.filter(x => (x.id || `${x.ticker}-${x.threshold}`) !== (n.id || `${n.ticker}-${n.threshold}`)))} style={{ background: "none", border: "none", color: C.textTer, cursor: "pointer", padding: 2 }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", height: "100dvh", background: C.bg, color: C.text, overflow: "hidden" }}>
        {/* Sidebar (non-mobile) */}
        {!isMobile && Sidebar()}

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* Mobile "more" sub-nav */}
          {isMobile && mobileTab === "more" && MobileMoreNav()}

          {/* Content */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {renderSection()}
          </div>

          {/* Mobile bottom nav */}
          {isMobile && MobileNav()}
        </div>
      </div>

      {/* Kyra — global floating AI panel */}
      {!showAuth && (
        <KyraPanel
          isOpen={kyraOpen}
          onToggle={() => setKyraOpen(o => !o)}
          onExpand={() => { setKyraOpen(false); setActiveSection("chat"); if (isMobile) setMobileTab("chat"); }}
          messages={messages}
          sendMessage={sendMessage}
          loading={loading}
          kyraInput={kyraInput}
          setKyraInput={setKyraInput}
          context={kyraContext}
          activeSection={activeSection}
        />
      )}
    </>
  );
}
