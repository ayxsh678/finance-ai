import logging
import math
import re
from datetime import datetime

import pandas as pd
import yfinance as yf

from .conviction import compute_conviction
from .portfolio import build_portfolio_context
from .retriever import (
    detect_asset_type,
    get_earnings_data,
    get_stock_data,
)
from .sentiment import get_sentiment, get_news_impact
from model.inference import generate_debate_case, generate_debate_moderator

logger = logging.getLogger(__name__)

_TIME_RANGE_MAP = {
    "24h": 1,
    "3d": 3,
    "7d": 7,
    "30d": 30,
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
}


def _round(value, digits=2):
    try:
        return round(float(value), digits)
    except Exception:
        return None


def _safe_div(a, b):
    try:
        return float(a) / float(b)
    except Exception:
        return None


def _crossover(series_a: pd.Series, series_b: pd.Series) -> bool:
    if len(series_a) < 2 or len(series_b) < 2:
        return False
    return series_a.iloc[-2] <= series_b.iloc[-2] and series_a.iloc[-1] > series_b.iloc[-1]


def _crossunder(series_a: pd.Series, series_b: pd.Series) -> bool:
    if len(series_a) < 2 or len(series_b) < 2:
        return False
    return series_a.iloc[-2] >= series_b.iloc[-2] and series_a.iloc[-1] < series_b.iloc[-1]


def _stochastic_rsi(series: pd.Series, window: int = 14) -> float | None:
    if len(series) < window * 2:
        return None
    rsi_delta = series.diff()
    gain = rsi_delta.clip(lower=0)
    loss = (-rsi_delta).clip(lower=0)
    avg_gain = gain.rolling(window).mean()
    avg_loss = loss.rolling(window).mean()
    rs = avg_gain / avg_loss.replace(0, pd.NA)
    rsi = 100 - 100 / (1 + rs)
    rsi_window = rsi.dropna().tail(window)
    if len(rsi_window) < window:
        return None
    min_rsi = rsi_window.min()
    max_rsi = rsi_window.max()
    if pd.isna(min_rsi) or pd.isna(max_rsi) or max_rsi == min_rsi:
        return None
    return _round((rsi.iloc[-1] - min_rsi) / (max_rsi - min_rsi) * 100)


def _identify_pattern_signals(hist: pd.DataFrame) -> dict:
    patterns = {
        "bullish_engulfing": False,
        "bearish_engulfing": False,
        "head_and_shoulders": False,
        "double_top": False,
        "double_bottom": False,
        "triangle": False,
        "cup_and_handle": False,
    }

    if len(hist) >= 2:
        last = hist.iloc[-1]
        prev = hist.iloc[-2]
        if last.Close > last.Open and prev.Close < prev.Open:
            if last.Close > prev.Open and last.Open < prev.Close:
                patterns["bullish_engulfing"] = True
        if last.Close < last.Open and prev.Close > prev.Open:
            if last.Close < prev.Open and last.Open > prev.Close:
                patterns["bearish_engulfing"] = True

    closes = hist["Close"].dropna()
    if len(closes) >= 30:
        peaks = closes.rolling(5, center=True).apply(lambda x: x[2] == x.max(), raw=True)
        troughs = closes.rolling(5, center=True).apply(lambda x: x[2] == x.min(), raw=True)
        recent_peaks = [i for i, v in enumerate(peaks.iloc[-30:], 0) if v == 1.0]
        recent_troughs = [i for i, v in enumerate(troughs.iloc[-30:], 0) if v == 1.0]
        if len(recent_peaks) >= 2:
            first, second = recent_peaks[0], recent_peaks[-1]
            height_diff = abs(closes.iloc[-30 + first] - closes.iloc[-30 + second])
            if height_diff <= closes.iloc[-30 + first] * 0.03:
                patterns["double_top"] = True
        if len(recent_troughs) >= 2:
            first, second = recent_troughs[0], recent_troughs[-1]
            depth_diff = abs(closes.iloc[-30 + first] - closes.iloc[-30 + second])
            if depth_diff <= closes.iloc[-30 + first] * 0.03:
                patterns["double_bottom"] = True
        width = closes.tail(20).max() - closes.tail(20).min()
        if width < closes.tail(20).mean() * 0.05:
            patterns["triangle"] = True
        lows = closes.tail(30)
        if lows.idxmin() < lows.idxmax() and lows.iloc[-1] > lows.iloc[0] and lows.iloc[-1] < lows.max():
            patterns["cup_and_handle"] = True

    if len(hist) >= 15:
        window = 15
        segment = closes.tail(window)
        left = segment.head(5)
        mid = segment.iloc[5:10]
        right = segment.tail(5)
        if mid.max() > left.max() and mid.max() > right.max() and abs(left.max() - right.max()) <= left.max() * 0.04:
            patterns["head_and_shoulders"] = True

    return patterns


def _fetch_technical_indicators(ticker: str) -> dict:
    result = {}
    try:
        hist = yf.Ticker(ticker).history(period="150d", interval="1d", timeout=12)
        if hist.empty or "Close" not in hist.columns:
            return result

        hist = hist.dropna(subset=["Close"])
        closes = hist["Close"].astype(float)
        if len(closes) < 20:
            return result

        ema9 = closes.ewm(span=9, adjust=False).mean()
        ema21 = closes.ewm(span=21, adjust=False).mean()
        sma20 = closes.rolling(window=20).mean()
        sma50 = closes.rolling(window=50).mean()
        sma200 = closes.rolling(window=200).mean()

        ema12 = closes.ewm(span=12, adjust=False).mean()
        ema26 = closes.ewm(span=26, adjust=False).mean()
        macd = ema12 - ema26
        macd_signal = macd.ewm(span=9, adjust=False).mean()

        diff = closes.diff()
        gains = diff.clip(lower=0)
        losses = (-diff).clip(lower=0)
        avg_gain = gains.rolling(14).mean()
        avg_loss = losses.rolling(14).mean()
        rs = avg_gain / avg_loss.replace(0, pd.NA)
        rsi = 100 - 100 / (1 + rs)
        stoch_rsi = _stochastic_rsi(closes, window=14)

        high = hist["High"].astype(float)
        low = hist["Low"].astype(float)
        prev_close = closes.shift(1)
        true_range = pd.concat([
            high - low,
            (high - prev_close).abs(),
            (low - prev_close).abs(),
        ], axis=1).max(axis=1)
        atr = true_range.rolling(14).mean().iloc[-1]

        volume = hist["Volume"].astype(float)
        avg_volume_20 = volume.tail(20).mean()
        last_volume = volume.iloc[-1]
        direction = closes.diff().fillna(0).apply(lambda x: 1 if x > 0 else (-1 if x < 0 else 0))
        obv = (direction * volume).cumsum().iloc[-1]
        obv_trend = "rising" if len(closes) > 1 and closes.iloc[-1] > closes.iloc[-2] else "flat"

        support_30d = closes.tail(30).min()
        resistance_30d = closes.tail(30).max()
        support_90d = closes.tail(90).min() if len(closes) >= 90 else support_30d
        resistance_90d = closes.tail(90).max() if len(closes) >= 90 else resistance_30d
        current_price = closes.iloc[-1]

        signals = []
        if rsi.iloc[-1] >= 70:
            signals.append("RSI is overbought")
        elif rsi.iloc[-1] <= 30:
            signals.append("RSI is oversold")
        if _crossover(macd, macd_signal):
            signals.append("MACD bullish crossover")
        elif _crossunder(macd, macd_signal):
            signals.append("MACD bearish crossover")
        if _crossover(sma50, sma200):
            signals.append("Golden cross developing")
        elif _crossunder(sma50, sma200):
            signals.append("Death cross risk")
        if current_price > sma200.iloc[-1]:
            signals.append("Price above 200-day moving average")
        elif current_price < sma200.iloc[-1]:
            signals.append("Price below 200-day moving average")
        if current_price > resistance_30d:
            signals.append("Breakout above 30-day resistance")
        elif current_price < support_30d:
            signals.append("Breakdown below 30-day support")
        if last_volume >= avg_volume_20 * 1.5:
            signals.append("Volume is elevated relative to the 20-day average")
        if current_price > sma20.iloc[-1] and current_price < sma50.iloc[-1]:
            signals.append("Price in short-term pullback above 20-day SMA")

        patterns = {k: bool(v) for k, v in _identify_pattern_signals(hist).items()}
        if patterns["bullish_engulfing"]:
            signals.append("Bullish engulfing candle formed")
        if patterns["bearish_engulfing"]:
            signals.append("Bearish engulfing candle formed")
        if patterns["head_and_shoulders"]:
            signals.append("Potential head and shoulders formation")
        if patterns["double_top"]:
            signals.append("Possible double top resistance")
        if patterns["double_bottom"]:
            signals.append("Possible double bottom support")
        if patterns["triangle"]:
            signals.append("Price action is tightening into a triangle")
        if patterns["cup_and_handle"]:
            signals.append("Cup-and-handle style consolidation detected")

        breakout = bool(current_price > resistance_30d and last_volume > avg_volume_20)
        breakdown = bool(current_price < support_30d and last_volume > avg_volume_20)

        trend_label = "Neutral consolidation"
        if current_price > ema21.iloc[-1] and ema21.iloc[-1] > ema9.iloc[-1] and current_price > sma50.iloc[-1]:
            trend_label = "Bullish trend"
        elif current_price < ema21.iloc[-1] and ema21.iloc[-1] < ema9.iloc[-1] and current_price < sma50.iloc[-1]:
            trend_label = "Bearish trend"

        summary = [
            f"Current price is {current_price:.2f}, trading {'above' if current_price > sma50.iloc[-1] else 'below'} the 50-day SMA.",
            f"Momentum shows {('strength' if _crossover(macd, macd_signal) else 'weakness')} with RSI at {rsi.iloc[-1]:.1f}.",
            f"Volatility is {('elevated' if last_volume > avg_volume_20 * 1.5 else 'normal')}, ATR at {_round(atr)}.",
        ]

        result = {
            "price_history": [
                {"date": idx.strftime("%Y-%m-%d"), "close": _round(val)}
                for idx, val in closes.tail(30).items()
            ],
            "current_price": _round(current_price),
            "rsi": _round(rsi.iloc[-1]),
            "stoch_rsi": stoch_rsi,
            "macd": _round(macd.iloc[-1]),
            "macd_signal": _round(macd_signal.iloc[-1]),
            "sma_20": _round(sma20.iloc[-1]),
            "sma_50": _round(sma50.iloc[-1]) if len(sma50.dropna()) else None,
            "sma_200": _round(sma200.iloc[-1]) if len(sma200.dropna()) else None,
            "ema_9": _round(ema9.iloc[-1]),
            "ema_21": _round(ema21.iloc[-1]),
            "atr": _round(atr),
            "bb_mid": _round(sma20.iloc[-1]),
            "bb_upper": _round(sma20.iloc[-1] + 2 * closes.tail(20).std()),
            "bb_lower": _round(sma20.iloc[-1] - 2 * closes.tail(20).std()),
            "support_30d": _round(support_30d),
            "resistance_30d": _round(resistance_30d),
            "support_90d": _round(support_90d),
            "resistance_90d": _round(resistance_90d),
            "volume_avg_20": _round(avg_volume_20),
            "last_volume": _round(last_volume),
            "obv": _round(obv),
            "obv_trend": obv_trend,
            "breakout": breakout,
            "breakdown": breakdown,
            "trend_label": trend_label,
            "signals": signals,
            "patterns": patterns,
            "summary": " ".join(summary),
        }
    except Exception as exc:
        logger.warning("[debate] technical indicators failed for %s: %s", ticker, exc)
    return result


def _format_news_items(news_items: list[dict]) -> list[str]:
    formatted = []
    for item in news_items[:6]:
        if not item:
            continue
        title = item.get("title") or item.get("headline") or ""
        source = item.get("source") or item.get("source_name") or "unknown"
        published = item.get("published_at") or item.get("publishedAt") or ""
        if published and len(published) >= 10:
            published = published[:10]
        formatted.append(f"{title} ({source}, {published})")
    return formatted


def _extract_confidence(text: str) -> int | None:
    if not text:
        return None
    match = re.search(r"CONFIDENCE[:\-]?\s*(\d{1,3})%?", text, re.I)
    if match:
        value = int(match.group(1))
        return max(0, min(100, value))
    match = re.search(r"PROBABILITY SPLIT[:\-]?\s*(\d{1,3})%?", text, re.I)
    if match:
        return max(0, min(100, int(match.group(1))))
    return None


def build_debate_context(ticker: str, company_name: str = "", time_range: str = "7d") -> dict:
    ticker = ticker.upper().strip()
    company_name = (company_name or "").strip()
    days = _TIME_RANGE_MAP.get(time_range, 7)
    asset_type = detect_asset_type(ticker)

    stock = get_stock_data(ticker)
    sentiment = get_sentiment(ticker, company_name)
    news_impact = get_news_impact(ticker, company_name, days=days)
    earnings = get_earnings_data(ticker)
    conviction = compute_conviction(ticker, company_name)
    technicals = _fetch_technical_indicators(ticker)

    price = stock.get("price")
    change = stock.get("change")
    mcap = stock.get("market_cap")
    pe = stock.get("pe_ratio")

    lines = [
        f"Asset: {ticker}{f' ({company_name})' if company_name else ''}",
        f"Asset type: {asset_type}",
        f"Price: {price or 'N/A'}",
        f"Price change: {change if change is not None else 'N/A'}%",
        f"Market cap: {mcap or 'N/A'}",
        f"Trailing P/E: {pe or 'N/A'}",
    ]

    if earnings and earnings.get("next_earnings_date"):
        lines.append(
            f"Next earnings date: {earnings.get('next_earnings_date')} | Forward P/E: {earnings.get('forward_pe') or 'N/A'}"
        )

    if sentiment:
        lines.append(
            f"News sentiment: {sentiment.get('overall_sentiment', sentiment.get('label', 'neutral'))} | Score: {sentiment.get('score') or 'N/A'}"
        )
        lines.append(
            f"Social sentiment: reddit {sentiment.get('reddit_posts', 0)} posts, twitter {sentiment.get('twitter_tweets', 0)} tweets"
        )

    if conviction:
        lines.append(
            f"Conviction: {conviction.get('label', 'N/A')} | Score: {conviction.get('score', 'N/A')}"
        )

    if technicals:
        lines.append(
            f"RSI: {technicals.get('rsi') or 'N/A'} | MACD: {technicals.get('macd') or 'N/A'} | MACD signal: {technicals.get('macd_signal') or 'N/A'}"
        )
        lines.append(
            f"SMA 20: {technicals.get('sma_20') or 'N/A'} | SMA 50: {technicals.get('sma_50') or 'N/A'} | SMA 100: {technicals.get('sma_100') or 'N/A'}"
        )
        lines.append(
            f"Support 30d: {technicals.get('support_30d') or 'N/A'} | Resistance 30d: {technicals.get('resistance_30d') or 'N/A'}"
        )

    formatted_news = _format_news_items(news_impact.get("news", []))
    if formatted_news:
        lines.append("Latest news headlines:")
        lines.extend(f"- {item}" for item in formatted_news)

    if technicals:
        lines.append("Technical overview:")
        lines.append(
            f"Price {technicals.get('current_price') or 'N/A'} | RSI {technicals.get('rsi') or 'N/A'} | MACD {technicals.get('macd') or 'N/A'} "
            f"| MACD signal {technicals.get('macd_signal') or 'N/A'}"
        )
        lines.append(
            f"SMA20 {technicals.get('sma_20') or 'N/A'} | EMA9 {technicals.get('ema_9') or 'N/A'} | EMA21 {technicals.get('ema_21') or 'N/A'} | SMA50 {technicals.get('sma_50') or 'N/A'}"
        )
        lines.append(
            f"Support 30d {technicals.get('support_30d') or 'N/A'} | Resistance 30d {technicals.get('resistance_30d') or 'N/A'} | Trend {technicals.get('trend_label') or 'N/A'}"
        )
        for signal in technicals.get('signals', [])[:4]:
            lines.append(f"- {signal}")

    context_text = "\n".join(lines)
    supporting_sources = []
    supporting_links = []
    for item in news_impact.get("news", [])[:6]:
        source = item.get("source") or item.get("source_name")
        if source:
            supporting_sources.append(source)
        url = item.get("url") or item.get("link")
        if url:
            supporting_links.append(url)

    return {
        "ticker": ticker,
        "company_name": company_name or ticker,
        "asset_type": asset_type,
        "stock": stock,
        "technical_indicators": technicals,
        "earnings": earnings,
        "sentiment": sentiment,
        "news_impact": news_impact,
        "conviction": conviction,
        "context": context_text,
        "supporting_sources": [s for s in supporting_sources if s],
        "supporting_links": [u for u in supporting_links if u],
    }


def run_asset_debate(ticker: str, company_name: str = "", time_range: str = "7d") -> dict:
    context = build_debate_context(ticker, company_name, time_range)
    bull_case = generate_debate_case(
        ticker=ticker,
        context=context["context"],
        role="bull",
        asset_type=context["asset_type"],
        followup=None,
    )
    bear_case = generate_debate_case(
        ticker=ticker,
        context=context["context"],
        role="bear",
        asset_type=context["asset_type"],
        followup=None,
    )
    moderator_verdict = generate_debate_moderator(
        ticker=ticker,
        context=context["context"],
        bull_case=bull_case,
        bear_case=bear_case,
        followup=None,
    )

    return {
        "ticker": ticker,
        "company_name": context["company_name"],
        "bull_case": bull_case,
        "bear_case": bear_case,
        "moderator_verdict": moderator_verdict,
        "technical_analysis": {
            "summary": context["technical_indicators"].get("summary"),
            "indicators": context["technical_indicators"],
        },
        "market_snapshot": {
            "price": context["stock"].get("price"),
            "change": context["stock"].get("change"),
            "market_cap": context["stock"].get("market_cap"),
            "pe_ratio": context["stock"].get("pe_ratio"),
            "volume": context["technical_indicators"].get("last_volume"),
            "trend": context["technical_indicators"].get("trend_label"),
        },
        "confidence_scores": {
            "bull": _extract_confidence(bull_case),
            "bear": _extract_confidence(bear_case),
            "moderator": _extract_confidence(moderator_verdict),
        },
        "source_links": list(dict.fromkeys(context.get("supporting_links", []))),
        "supporting_sources": list(dict.fromkeys(context.get("supporting_sources", []))),
        "timestamps": {
            "generated_at": datetime.utcnow().isoformat() + "Z",
        },
        "session_context": context,
    }


def build_portfolio_debate_context(holdings: list[dict], time_range: str = "7d") -> dict:
    tickers = [h["ticker"].upper().strip() for h in holdings if h.get("ticker")]
    if not tickers:
        return {"context": "No portfolio holdings provided.", "supporting_sources": []}

    portfolio_context = build_portfolio_context(tickers)
    summaries = []
    for h in holdings[:10]:
        summaries.append(f"{h.get('ticker').upper().strip()}: qty {h.get('quantity')} avg ₹{h.get('avg_buy_price')}")

    lines = [
        "Portfolio debate context:",
        f"Holdings: {', '.join(summaries)}",
        portfolio_context,
    ]

    return {
        "context": "\n".join(lines),
        "supporting_sources": ["Portfolio holdings"]
    }


def run_portfolio_debate(holdings: list[dict], time_range: str = "7d") -> dict:
    context = build_portfolio_debate_context(holdings, time_range)
    bull_case = generate_debate_case(
        ticker="PORTFOLIO",
        context=context["context"],
        role="bull",
        asset_type="portfolio",
        followup=None,
    )
    bear_case = generate_debate_case(
        ticker="PORTFOLIO",
        context=context["context"],
        role="bear",
        asset_type="portfolio",
        followup=None,
    )
    moderator_verdict = generate_debate_moderator(
        ticker="PORTFOLIO",
        context=context["context"],
        bull_case=bull_case,
        bear_case=bear_case,
        followup=None,
    )
    return {
        "ticker": "PORTFOLIO",
        "company_name": "Portfolio",
        "bull_case": bull_case,
        "bear_case": bear_case,
        "moderator_verdict": moderator_verdict,
        "technical_analysis": {
            "summary": "Portfolio-level debate uses aggregated holdings, market sentiment, and position sizing.",
            "indicators": {},
        },
        "market_snapshot": {
            "price": None,
            "change": None,
            "market_cap": None,
            "pe_ratio": None,
            "volume": None,
            "trend": None,
        },
        "confidence_scores": {
            "bull": _extract_confidence(bull_case),
            "bear": _extract_confidence(bear_case),
            "moderator": _extract_confidence(moderator_verdict),
        },
        "source_links": list(dict.fromkeys(context.get("supporting_links", []))),
        "supporting_sources": list(dict.fromkeys(context.get("supporting_sources", []))),
        "timestamps": {"generated_at": datetime.utcnow().isoformat() + "Z"},
        "session_context": context,
    }
