import logging
import threading
from cachetools import TTLCache

logger = logging.getLogger(__name__)

_conv_cache: TTLCache = TTLCache(maxsize=100, ttl=3600)  # 1h
_conv_lock = threading.Lock()


def _safe_float(v, default=None):
    try:
        f = float(v)
        return f if f == f else default
    except (TypeError, ValueError):
        return default


# ── Technical helpers ──────────────────────────────────

def _compute_rsi(closes, period=14):
    if len(closes) < period + 1:
        return None
    deltas    = [closes[i] - closes[i-1] for i in range(1, len(closes))]
    gains     = [max(d, 0) for d in deltas[-period:]]
    losses    = [max(-d, 0) for d in deltas[-period:]]
    avg_gain  = sum(gains) / period
    avg_loss  = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 1)


def _compute_sma(closes, period):
    if len(closes) < period:
        return None
    return sum(closes[-period:]) / period


# ── Indicator scoring functions (each → (subscore 0–10, display string)) ──

def _score_momentum(change_1d):
    if change_1d is None:
        return 5, "—"
    v = _safe_float(change_1d, 0)
    if v > 3:   return 10, f"+{v:.2f}%"
    if v > 1:   return 8,  f"+{v:.2f}%"
    if v > 0:   return 6,  f"+{v:.2f}%"
    if v > -1:  return 4,  f"{v:.2f}%"
    if v > -3:  return 2,  f"{v:.2f}%"
    return 0, f"{v:.2f}%"


def _score_5d_trend(change_5d):
    if change_5d is None:
        return 5, "—"
    v = _safe_float(change_5d, 0)
    if v > 8:   return 10, f"+{v:.2f}%"
    if v > 3:   return 8,  f"+{v:.2f}%"
    if v > 0:   return 6,  f"+{v:.2f}%"
    if v > -3:  return 4,  f"{v:.2f}%"
    if v > -8:  return 2,  f"{v:.2f}%"
    return 0, f"{v:.2f}%"


def _score_52w_position(price, low52, high52):
    if price is None or low52 is None or high52 is None or high52 == low52:
        return 5, "—"
    pos = (price - low52) / (high52 - low52)
    pct = round(pos * 100, 1)
    if 55 <= pct <= 80:  return 10, f"{pct:.0f}% of 52W range"
    if 40 <= pct < 55:   return 8,  f"{pct:.0f}% of 52W range"
    if 80 < pct <= 90:   return 7,  f"{pct:.0f}% of 52W range"
    if 25 <= pct < 40:   return 5,  f"{pct:.0f}% of 52W range"
    if 90 < pct:         return 5,  f"{pct:.0f}% of 52W range"  # near high, priced in
    return 2, f"{pct:.0f}% of 52W range"


def _score_rel_volume(rel_vol, price_change):
    if rel_vol is None:
        return 5, "—"
    v  = _safe_float(rel_vol, 1.0)
    up = (price_change or 0) >= 0
    if v > 2.0:  return (10 if up else 2), f"{v:.2f}× avg"
    if v > 1.5:  return (8  if up else 3), f"{v:.2f}× avg"
    if v > 0.8:  return 5,                 f"{v:.2f}× avg"
    return 3, f"{v:.2f}× avg"


def _score_rsi(rsi):
    if rsi is None:
        return 5, "—"
    if 50 <= rsi <= 60:  return 10, f"{rsi:.0f}"
    if 40 <= rsi < 50:   return 8,  f"{rsi:.0f}"
    if 60 < rsi <= 70:   return 7,  f"{rsi:.0f}"
    if 30 <= rsi < 40:   return 5,  f"{rsi:.0f}"
    if 70 < rsi <= 80:   return 3,  f"{rsi:.0f} (overbought)"
    if rsi > 80:         return 1,  f"{rsi:.0f} (overbought)"
    return 2, f"{rsi:.0f} (oversold)"


def _score_sma20(price, sma20, prev_sma20):
    if price is None or sma20 is None:
        return 5, "—"
    above  = price > sma20
    rising = prev_sma20 is not None and sma20 > prev_sma20
    if above and rising:       return 10, f"{sma20:.1f} (above ↑)"
    if above:                  return 7,  f"{sma20:.1f} (above)"
    if not above and not rising: return 1, f"{sma20:.1f} (below ↓)"
    return 3, f"{sma20:.1f} (below)"


def _score_sma50(price, sma50):
    if price is None or sma50 is None:
        return 5, "—"
    if price > sma50:  return 9, f"{sma50:.1f} (above)"
    return 2, f"{sma50:.1f} (below)"


def _score_trend_consistency(closes):
    if len(closes) < 20:
        return 5, "—"
    recent  = closes[-20:]
    up_days = sum(1 for i in range(1, len(recent)) if recent[i] > recent[i-1])
    if up_days >= 14:  return 10, f"{up_days}/19 up days"
    if up_days >= 11:  return 8,  f"{up_days}/19 up days"
    if up_days >= 9:   return 6,  f"{up_days}/19 up days"
    if up_days >= 7:   return 4,  f"{up_days}/19 up days"
    if up_days >= 5:   return 2,  f"{up_days}/19 up days"
    return 0, f"{up_days}/19 up days"


def _score_sentiment(sentiment_score):
    if sentiment_score is None:
        return 5, "—"
    v = _safe_float(sentiment_score, 50)
    return round(v / 10, 1), f"{v:.0f}/100"


def _score_pe(pe):
    if pe is None:
        return 5, "—"
    v = _safe_float(pe)
    if v is None:      return 5, "—"
    if v <= 0:         return 5, "N/A"
    if v < 12:         return 9,  f"PE {v:.1f} (deep value)"
    if v < 18:         return 10, f"PE {v:.1f} (fair)"
    if v < 28:         return 7,  f"PE {v:.1f} (market rate)"
    if v < 40:         return 4,  f"PE {v:.1f} (growth premium)"
    if v < 60:         return 2,  f"PE {v:.1f} (expensive)"
    return 0, f"PE {v:.1f} (stretched)"


def _score_earnings_trajectory(trailing_pe, forward_pe):
    t = _safe_float(trailing_pe)
    f = _safe_float(forward_pe)
    if t is None or f is None or t <= 0 or f <= 0:
        return 5, "—"
    ratio = f / t
    if ratio < 0.80:   return 10, f"FWD {f:.1f} vs TTM {t:.1f} (compressing fast)"
    if ratio < 0.95:   return 8,  f"FWD {f:.1f} vs TTM {t:.1f} (compressing)"
    if ratio < 1.05:   return 5,  f"FWD {f:.1f} vs TTM {t:.1f} (stable)"
    if ratio < 1.20:   return 3,  f"FWD {f:.1f} vs TTM {t:.1f} (expanding)"
    return 1, f"FWD {f:.1f} vs TTM {t:.1f} (deteriorating)"


def _conviction_label(score):
    if score >= 75:  return "Strong"
    if score >= 60:  return "Confident"
    if score >= 45:  return "Moderate"
    if score >= 30:  return "Cautious"
    return "Weak"


# ── Public API ─────────────────────────────────────────

def compute_conviction(ticker: str, company_name: str = "") -> dict:
    cache_key = ticker.upper()
    with _conv_lock:
        if cache_key in _conv_cache:
            return dict(_conv_cache[cache_key])

    try:
        import yfinance as yf
        from rag.retriever import get_stock_data
        from rag.sentiment import get_sentiment

        stock          = get_stock_data(ticker)
        sentiment_data = get_sentiment(ticker, company_name)

        closes     = []
        forward_pe = None
        try:
            t    = yf.Ticker(ticker)
            hist = t.history(period="90d", interval="1d", timeout=12)
            if not hist.empty:
                closes = list(hist["Close"].values)
            info       = t.info or {}
            forward_pe = info.get("forwardPE")
        except Exception as e:
            logger.warning("[conviction] yfinance OHLC error for %s: %s", ticker, e)

        price     = _safe_float(stock.get("price"))
        change_1d = _safe_float(stock.get("change"))
        change_5d = _safe_float(stock.get("five_day_change"))
        week52_h  = _safe_float(stock.get("week52_high"))
        week52_l  = _safe_float(stock.get("week52_low"))
        rel_vol   = _safe_float(stock.get("rel_volume"))
        pe        = _safe_float(stock.get("pe_ratio"))
        sent_sc   = _safe_float((sentiment_data or {}).get("score"))

        rsi        = _compute_rsi(closes) if len(closes) > 15 else None
        sma20      = _compute_sma(closes, 20)
        sma50      = _compute_sma(closes, 50)
        prev_sma20 = _compute_sma(closes[:-1], 20) if len(closes) > 21 else None

        INDICATORS = [
            ("Price Momentum (1D)",    _score_momentum(change_1d),                        1.0),
            ("5-Day Trend",            _score_5d_trend(change_5d),                        1.0),
            ("52-Week Position",       _score_52w_position(price, week52_l, week52_h),    1.0),
            ("Relative Volume",        _score_rel_volume(rel_vol, change_1d),             1.0),
            ("RSI (14)",               _score_rsi(rsi),                                   1.2),
            ("SMA-20 Signal",          _score_sma20(price, sma20, prev_sma20),            1.0),
            ("SMA-50 Signal",          _score_sma50(price, sma50),                        1.0),
            ("Trend Consistency",      _score_trend_consistency(closes),                  0.8),
            ("News Sentiment",         _score_sentiment(sent_sc),                         1.2),
            ("Valuation (PE)",         _score_pe(pe),                                     1.0),
            ("Earnings Trajectory",    _score_earnings_trajectory(pe, forward_pe),        0.8),
        ]

        breakdown       = []
        total_weighted  = 0.0
        total_weight    = 0.0

        for name, (subscore, value), weight in INDICATORS:
            total_weighted += subscore * weight
            total_weight   += 10 * weight
            breakdown.append({
                "name":     name,
                "subscore": round(float(subscore), 1),
                "value":    value,
                "label":    "BULLISH" if subscore >= 7 else ("BEARISH" if subscore <= 3 else "NEUTRAL"),
                "weight":   weight,
            })

        raw   = (total_weighted / total_weight * 100) if total_weight > 0 else 50
        score = round(max(0.0, min(100.0, raw)), 1)

        result = {
            "ticker":    ticker,
            "score":     score,
            "label":     _conviction_label(score),
            "breakdown": breakdown,
        }
        with _conv_lock:
            _conv_cache[cache_key] = dict(result)
        return result

    except Exception as e:
        logger.error("[conviction] error for %s: %s", ticker, e)
        return {"ticker": ticker, "score": 50.0, "label": "Moderate", "breakdown": [], "error": str(e)}
