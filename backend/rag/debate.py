import logging
import re
from datetime import datetime

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


def _fetch_technical_indicators(ticker: str) -> dict:
    result = {}
    try:
        hist = yf.Ticker(ticker).history(period="150d", interval="1d", timeout=12)
        closes = hist["Close"].dropna()
        if len(closes) < 10:
            return result

        ema12 = closes.ewm(span=12, adjust=False).mean()
        ema26 = closes.ewm(span=26, adjust=False).mean()
        macd_series = ema12 - ema26
        signal_line = macd_series.ewm(span=9, adjust=False).mean()

        diff = closes.diff().dropna()
        gain = diff.clip(lower=0)
        loss = (-diff).clip(lower=0)
        avg_gain = gain.rolling(14).mean().iloc[-1] if len(gain) >= 14 else gain.mean()
        avg_loss = loss.rolling(14).mean().iloc[-1] if len(loss) >= 14 else loss.mean()
        rsi = 100 - 100 / (1 + (avg_gain / avg_loss)) if avg_loss and avg_loss != 0 else 100.0

        result = {
            "rsi": _round(rsi),
            "macd": _round(macd_series.iloc[-1]),
            "macd_signal": _round(signal_line.iloc[-1]),
            "sma_20": _round(closes.tail(20).mean()),
            "sma_50": _round(closes.tail(50).mean()) if len(closes) >= 50 else None,
            "sma_100": _round(closes.tail(100).mean()) if len(closes) >= 100 else None,
            "support_30d": _round(closes.tail(30).min()),
            "resistance_30d": _round(closes.tail(30).max()),
            "52w_high": _round(closes.tail(252).max()) if len(closes) >= 252 else _round(closes.max()),
            "52w_low": _round(closes.tail(252).min()) if len(closes) >= 252 else _round(closes.min()),
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

    context_text = "\n".join(lines)
    supporting_sources = [item.get("source") or "unknown" for item in news_impact.get("news", [])][:6]

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
        "confidence_scores": {
            "bull": _extract_confidence(bull_case),
            "bear": _extract_confidence(bear_case),
            "moderator": _extract_confidence(moderator_verdict),
        },
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
        "confidence_scores": {
            "bull": _extract_confidence(bull_case),
            "bear": _extract_confidence(bear_case),
            "moderator": _extract_confidence(moderator_verdict),
        },
        "supporting_sources": list(dict.fromkeys(context.get("supporting_sources", []))),
        "timestamps": {"generated_at": datetime.utcnow().isoformat() + "Z"},
        "session_context": context,
    }
