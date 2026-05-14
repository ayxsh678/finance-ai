import logging
import os
import re
import json
import random
import threading
import time
import xml.etree.ElementTree as ET
from urllib.parse import quote as urlquote
import requests
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from datetime import datetime, timedelta
from cachetools import TTLCache

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_URL     = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
MAX_RETRIES    = 2
BASE_BACKOFF   = 1.0
MAX_BACKOFF    = 6.0
RETRY_STATUSES = {429, 500, 502, 503, 504}

# US ADR tickers for popular Indian companies — used for Finnhub lookup
INDIA_ADR_MAP = {
    "HDFCBANK": "HDB",
    "ICICIBANK": "IBN",
    "WIPRO":     "WIT",
    "TATAMOTORS":"TTM",
    "DRREDDY":   "RDY",
    "INFY":      "INFY",
}

# Canonical search names for NSE tickers — overrides abbreviated display names
INDIA_SEARCH_NAMES = {
    "RELIANCE":   "Reliance Industries",
    "HDFCBANK":   "HDFC Bank",
    "ICICIBANK":  "ICICI Bank",
    "TCS":        "Tata Consultancy Services",
    "INFY":       "Infosys",
    "SBIN":       "State Bank of India",
    "BAJFINANCE": "Bajaj Finance",
    "KOTAKBANK":  "Kotak Mahindra Bank",
    "HINDUNILVR": "Hindustan Unilever",
    "WIPRO":      "Wipro",
    "AXISBANK":   "Axis Bank",
    "MARUTI":     "Maruti Suzuki",
    "TITAN":      "Titan Company",
    "ASIANPAINT": "Asian Paints",
    "SUNPHARMA":  "Sun Pharma",
    "ZOMATO":     "Zomato",
    "ADANIENT":   "Adani Enterprises",
    "TATAMOTORS": "Tata Motors",
    "TATASTEEL":  "Tata Steel",
    "NTPC":       "NTPC",
    "ONGC":       "ONGC",
    "POWERGRID":  "Power Grid Corporation",
    "COALINDIA":  "Coal India",
    "BHARTIARTL": "Airtel",
    "HCLTECH":    "HCL Technologies",
    "LTIM":       "LTIMindtree",
    "CIPLA":      "Cipla",
    "IRCTC":      "IRCTC",
    "INDIGO":     "IndiGo",
    "PAYTM":      "Paytm",
    "FSN":        "Nykaa",
    "DELHIVERY":  "Delhivery",
    "BAJAJ-AUTO": "Bajaj Auto",
    "EICHERMOT":  "Eicher Motors",
    "DIVISLAB":   "Divis Laboratories",
    "ULTRACEMCO": "UltraTech Cement",
    "GRASIM":     "Grasim Industries",
    "ADANIPORTS": "Adani Ports",
    "ADANIGREEN": "Adani Green Energy",
    "TATAPOWER":  "Tata Power",
    "HINDALCO":   "Hindalco Industries",
    "JSWSTEEL":   "JSW Steel",
    "BHEL":       "BHEL",
    "BANKBARODA": "Bank of Baroda",
    "HEROMOTOCO": "Hero MotoCorp",
    "POLICYBZR":  "PB Fintech",
    "OLAMOBILITY":"Ola Electric",
    "ITC":        "ITC Limited",
    "LT":         "Larsen Toubro",
    "BAJAJFINSV": "Bajaj Finserv",
    "NESTLEIND":  "Nestle India",
    "TATACONSUM": "Tata Consumer Products",
    "PIDILITIND": "Pidilite Industries",
    "SBILIFE":    "SBI Life Insurance",
    "HDFCLIFE":   "HDFC Life Insurance",
    "ICICIPRULI": "ICICI Prudential",
    "SHREECEM":   "Shree Cement",
    "TECHM":      "Tech Mahindra",
    "INDUSINDBK": "IndusInd Bank",
    "APOLLOHOSP": "Apollo Hospitals",
    "BPCL":       "Bharat Petroleum",
    "VEDL":       "Vedanta",
    "PNB":        "Punjab National Bank",
    "CANBK":      "Canara Bank",
    "BANKBARODA": "Bank of Baroda",
    "MUTHOOTFIN": "Muthoot Finance",
    "HAL":        "Hindustan Aeronautics",
    "BEL":        "Bharat Electronics",
    "BHEL":       "BHEL",
    "M&M":        "Mahindra Mahindra",
    "IRFC":       "Indian Railway Finance",
    "RVNL":       "Rail Vikas Nigam",
    "DLF":        "DLF Limited",
    "GODREJPROP": "Godrej Properties",
    "TVSMOTOR":   "TVS Motor",
    "ASHOKLEY":   "Ashok Leyland",
    "AUROPHARMA": "Aurobindo Pharma",
    "LUPIN":      "Lupin",
    "TORNTPHARM": "Torrent Pharmaceuticals",
    "SRF":        "SRF Limited",
    "DEEPAKNTR":  "Deepak Nitrite",
    "TATACHEM":   "Tata Chemicals",
    "BRITANNIA":  "Britannia Industries",
    "VBL":        "Varun Beverages",
    "COFORGE":    "Coforge",
    "PERSISTENT": "Persistent Systems",
    "MPHASIS":    "Mphasis",
    "RECLTD":     "REC Limited",
    "PFC":        "Power Finance Corporation",
    "TATAPOWER":  "Tata Power",
    "INDIGO":     "IndiGo Airlines",
    "EASEMYTRIP": "EaseMyTrip",
    "CARTRADE":   "CarTrade Tech",
}

NOISE_PATTERNS = [
    "deals of the week", "best deals", "% off", "discount",
    "review:", "hands-on", "how to use", "tips and tricks",
    "gift guide", "buying guide", "unboxing",
]

FINANCIAL_SIGNALS = [
    "earnings", "revenue", "profit", "loss", "quarterly", "annual",
    "dividend", "buyback", "guidance", "analyst", "upgrade", "downgrade",
    "target price", "ipo", "results", "margin", "outlook", "forecast",
    "merger", "acquisition", "stake", "shares", "market cap", "q1", "q2",
    "q3", "q4", "nse", "bse", "sensex", "nifty", "crore", "sebi",
    "ebitda", "pat", "sales", "valuation", "debt", "cash flow", "growth",
    "stock", "share price", "investor", "fund", "rally", "decline", "fell",
    "surged", "dropped", "gained", "slipped", "beat", "missed", "raised",
]

# Social Media APIs
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
REDDIT_USER_AGENT = "FintrestSentiment/1.0"
REDDIT_PUBLIC_USER_AGENT = "FintrestNewsBot/1.0"
REDDIT_PUBLIC_SUBREDDITS = [
    "stocks",
    "investing",
    "finance",
    "economics",
    "IndiaInvestments",
    "SecurityAnalysis",
    "worldnews",
    "news",
    "business",
    "technology",
    "CryptoCurrency",
]

TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")

# Sentiment Analyzer
_vader_analyzer = SentimentIntensityAnalyzer()

# ── Caches ─────────────────────────────────────────────
_cache: TTLCache        = TTLCache(maxsize=200, ttl=2 * 60 * 60)  # 2 hours
_cache_lock             = threading.Lock()
_impact_cache: TTLCache = TTLCache(maxsize=200, ttl=2 * 60 * 60)  # 2 hours
_impact_lock            = threading.Lock()


# ── Helpers ────────────────────────────────────────────

def _sleep_backoff(attempt: int, retry_after: str | None = None) -> None:
    if retry_after:
        try:
            time.sleep(min(float(retry_after), MAX_BACKOFF))
            return
        except ValueError:
            pass
    delay = min(BASE_BACKOFF * (2 ** attempt), MAX_BACKOFF)
    time.sleep(delay + random.uniform(0, 0.25 * delay))


def _is_financial(title: str, description: str) -> bool:
    text = (title + " " + description).lower()
    if any(noise in text for noise in NOISE_PATTERNS):
        return False
    return any(signal in text for signal in FINANCIAL_SIGNALS)


def _mentions_company(text: str, company_name: str, base_ticker: str) -> bool:
    """
    Word-boundary match — prevents 'reliance on data' matching Reliance Industries.
    Also accepts the raw ticker symbol as a fallback.
    """
    text_lower = text.lower()

    # Exact ticker match (e.g. "RELIANCE", "TCS")
    if base_ticker.lower() in text_lower:
        # Must appear as a whole word or uppercase — not inside another word
        if re.search(r'\b' + re.escape(base_ticker.lower()) + r'\b', text_lower):
            return True

    # Company name whole-word match (e.g. "Reliance Industries" not "reliance on")
    if len(company_name) >= 5:  # skip very short names that are common words
        pattern = r'\b' + re.escape(company_name.lower()) + r'\b'
        if re.search(pattern, text_lower):
            return True

    return False


def _fetch_google_news_rss(search_term: str, base_ticker: str) -> list[dict]:
    """Google News RSS — free, no auth, no rate limit. Good Indian coverage."""
    query = urlquote(f"{search_term} stock")
    url   = f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
    try:
        resp = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
        root     = ET.fromstring(resp.content)
        articles = []
        for item in root.findall(".//item")[:20]:
            title = re.sub(r"<[^>]+>", "", item.findtext("title") or "").strip()
            desc  = re.sub(r"<[^>]+>", "", item.findtext("description") or "").strip()
            link  = (item.findtext("link") or "").strip()
            pub   = (item.findtext("pubDate") or "").strip()
            if not title or not _mentions_company(title + " " + desc, search_term, base_ticker):
                continue
            articles.append({
                "title":        title,
                "description":  desc,
                "source":       "Google News",
                "published_at": pub,
                "url":          link,
            })
        logger.debug("[sentiment] GoogleNewsRSS: %d articles for %s", len(articles), search_term)
        return articles
    except Exception as e:
        logger.warning("[GoogleNewsRSS] error for %s: %s", search_term, e)
        return []


def _gemini_post(payload: dict) -> dict | None:
    """Shared Gemini HTTP call with retry. Returns parsed JSON or None."""
    if not GEMINI_API_KEY:
        logger.error("[Gemini] GEMINI_API_KEY not configured")
        return None
    
    headers = {
        "Authorization": f"Bearer {GEMINI_API_KEY}",
        "Content-Type":  "application/json",
    }
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.post(GEMINI_URL, headers=headers, json=payload, timeout=30)
        except requests.RequestException as e:
            logger.warning("[Gemini] network error (attempt %d): %s", attempt + 1, e)
            if attempt < MAX_RETRIES - 1:
                _sleep_backoff(attempt)
                continue
            return None

        if resp.status_code == 200:
            try:
                raw = resp.json()["choices"][0]["message"]["content"].strip()
                raw = raw.replace("```json", "").replace("```", "").strip()
                return json.loads(raw)
            except Exception as e:
                logger.warning("[Gemini] parse error: %s", e)
                return None

        if resp.status_code in RETRY_STATUSES and attempt < MAX_RETRIES - 1:
            _sleep_backoff(attempt, resp.headers.get("Retry-After"))
            continue

        # Log detailed error info for 403 and other errors
        try:
            error_body = resp.text[:200]
        except:
            error_body = "No response body"
        logger.error("[Gemini] status %d (attempt %d/%d): %s. Response: %s", 
                     resp.status_code, attempt + 1, MAX_RETRIES, 
                     resp.reason or "Unknown", error_body)
        
        if resp.status_code == 403:
            logger.critical("[Gemini] 403 Forbidden - Check your GEMINI_API_KEY is valid and has necessary permissions")
            return None

    return None


# ── News fetching ──────────────────────────────────────

def _fetch_articles_detailed(
    ticker: str,
    company_name: str = "",
    days: int = 7
) -> list[dict]:
    articles    = []
    base_ticker = ticker.split(".")[0]  # RELIANCE.NS → RELIANCE
    is_indian   = ticker.endswith(".NS") or ticker.endswith(".BO")
    end_date    = datetime.utcnow().strftime("%Y-%m-%d")
    start_date  = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

    # Use canonical search name for Indian stocks (overrides abbreviated display names)
    if is_indian and base_ticker in INDIA_SEARCH_NAMES:
        search_term = INDIA_SEARCH_NAMES[base_ticker]
    else:
        search_term = company_name if company_name else base_ticker
    logger.debug("[sentiment] _fetch_articles_detailed: ticker=%s, is_indian=%s, search_term=%s", ticker, is_indian, search_term)

    # ── Source 1: Finnhub ──────────────────────────────
    # Map Indian tickers to their US ADR symbol where available
    finnhub_symbol = INDIA_ADR_MAP.get(base_ticker, base_ticker) if is_indian else base_ticker
    finnhub_key = os.getenv("FINNHUB_API_KEY", "")
    if finnhub_key:
        try:
            resp = requests.get(
                "https://finnhub.io/api/v1/company-news",
                params={
                    "symbol": finnhub_symbol,
                    "from":   start_date,
                    "to":     end_date,
                    "token":  finnhub_key,
                },
                timeout=8,
            )
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list):
                logger.debug("[sentiment] Finnhub: found %d articles for %s", len(data), ticker)
                for item in data[:15]:
                    title = (item.get("headline") or "").strip()
                    desc  = (item.get("summary") or "").strip()
                    if not title or title == "[Removed]":
                        continue
                    combined = (title + " " + desc).lower()
                    if not _mentions_company(combined, search_term, base_ticker):
                        continue
                    articles.append({
                        "title":        title,
                        "description":  desc,
                        "source":       item.get("source", "Finnhub"),
                        "published_at": datetime.fromtimestamp(
                            item.get("datetime", 0)
                        ).strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "url":          item.get("url", ""),
                    })
                logger.debug("[sentiment] Finnhub: after company filter, %d articles for %s", len(articles), ticker)
        except requests.Timeout:
            logger.warning("[Finnhub] timeout for %s", ticker)
        except Exception as e:
            logger.warning("[Finnhub] error for %s: %s", ticker, e)

    # ── Source 2: NewsAPI fallback ─────────────────────
    if not articles:
        api_key = os.getenv("NEWS_API_KEY", "")
        if api_key:
            # Tighter query for Indian stocks
            if is_indian:
                query = (
                    f'"{search_term}" '
                    f'(NSE OR BSE OR "quarterly results" OR earnings OR revenue OR '
                    f'profit OR crore OR "share price" OR Sensex OR Nifty OR PAT)'
                )
            else:
                query = (
                    f'"{search_term}" '
                    f'(earnings OR revenue OR profit OR stock OR shares OR '
                    f'quarterly OR results OR analyst OR guidance OR dividend)'
                )
            try:
                resp = requests.get(
                    "https://newsapi.org/v2/everything",
                    params={
                        "q":        query,
                        "from":     start_date,
                        "sortBy":   "publishedAt",
                        "language": "en",
                        "pageSize": 15,
                        "apiKey":   api_key,
                    },
                    timeout=8,
                )
                resp.raise_for_status()
                for a in resp.json().get("articles", []):
                    title = (a.get("title") or "").strip()
                    desc  = (a.get("description") or "").strip()
                    if not title or title == "[Removed]":
                        continue
                    combined = (title + " " + desc).lower()
                    # Word-boundary check — blocks "reliance on data" style false matches
                    if not _mentions_company(combined, search_term, base_ticker):
                        continue
                    articles.append({
                        "title":        title,
                        "description":  desc,
                        "source":       (a.get("source") or {}).get("name", "Unknown"),
                        "published_at": a.get("publishedAt", ""),
                        "url":          a.get("url", ""),
                    })
                logger.debug("[sentiment] NewsAPI: found %d articles for %s", len(articles), ticker)
            except requests.Timeout:
                logger.warning("[NewsAPI] timeout for %s", ticker)
            except Exception as e:
                logger.warning("[NewsAPI] error for %s: %s", ticker, e)

    # ── Source 3: Google News RSS (free, no auth, no rate limit) ──
    if not articles:
        articles = _fetch_google_news_rss(search_term, base_ticker)

    # ── Filter: keep only financial articles ───────────
    filtered = [
        a for a in articles
        if _is_financial(a["title"], a.get("description", ""))
    ]

    return filtered[:8] if filtered else articles[:5]


def _fetch_headlines(ticker: str, company_name: str = "") -> list[str]:
    articles = _fetch_articles_detailed(ticker, company_name, days=3)
    if not articles:
        logger.info("[sentiment] 0 articles with days=3 for %s; retrying with days=7", ticker)
        articles = _fetch_articles_detailed(ticker, company_name, days=7)
    logger.debug("[sentiment] _fetch_headlines: got %d articles for %s", len(articles), ticker)
    headlines = []
    for a in articles:
        title = a.get("title", "")
        desc  = a.get("description", "")
        headlines.append(f"{title}. {desc}" if desc else title)

    # Add social media posts
    reddit_posts = _fetch_reddit_posts(ticker, company_name, limit=10)
    twitter_tweets = _fetch_twitter_tweets(ticker, company_name, limit=10)
    headlines.extend(reddit_posts)
    headlines.extend(twitter_tweets)

    logger.debug("[sentiment] _fetch_headlines: converted to %d headlines + social for %s", len(headlines), ticker)
    return headlines


# ── Social Media Sentiment ─────────────────────────────

def _fetch_reddit_posts(ticker: str, company_name: str = "", limit: int = 25) -> list[str]:
    """Fetch recent Reddit posts mentioning the ticker or company."""
    search_term = (company_name or ticker).strip()

    # Prefer authenticated Reddit if credentials are configured.
    if REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET:
        try:
            import praw
            reddit = praw.Reddit(
                client_id=REDDIT_CLIENT_ID,
                client_secret=REDDIT_CLIENT_SECRET,
                user_agent=REDDIT_USER_AGENT,
            )

            subreddits = ["investing", "stocks", "wallstreetbets", "IndianStreetBets"]
            posts = []
            per_sub = max(1, limit // len(subreddits))

            for subreddit_name in subreddits:
                try:
                    subreddit = reddit.subreddit(subreddit_name)
                    for post in subreddit.search(search_term, sort="new", time_filter="week", limit=per_sub):
                        text = f"{post.title} {getattr(post, 'selftext', '')}".strip()
                        if text:
                            posts.append(text)
                except Exception as e:
                    logger.warning("[Reddit] Error searching r/%s: %s", subreddit_name, e)

            return posts[:limit]
        except ImportError:
            logger.warning("[Reddit] PRAW not installed, falling back to public JSON feeds")
        except Exception as e:
            logger.warning("[Reddit] Error fetching posts via PRAW: %s", e)

    return _fetch_reddit_posts_public(search_term=search_term, limit=limit)


def _fetch_reddit_posts_public(search_term: str = "", limit: int = 25) -> list[str]:
    """Fetch public Reddit posts from configured subreddits using JSON feeds."""
    headers = {
        "User-Agent": REDDIT_PUBLIC_USER_AGENT,
    }
    posts: list[str] = []
    per_sub = max(3, limit // len(REDDIT_PUBLIC_SUBREDDITS) + 1)

    for subreddit in REDDIT_PUBLIC_SUBREDDITS:
        if len(posts) >= limit:
            break

        for sort in ("new", "hot"):
            if len(posts) >= limit:
                break

            url = f"https://www.reddit.com/r/{subreddit}/{sort}.json"
            try:
                resp = requests.get(url, headers=headers, params={"limit": per_sub}, timeout=10)
                resp.raise_for_status()
                data = resp.json()
                children = data.get("data", {}).get("children", [])

                for child in children:
                    if len(posts) >= limit:
                        break
                    item = child.get("data", {})
                    title = item.get("title", "") or ""
                    selftext = item.get("selftext", "") or ""
                    text = f"{title} {selftext}".strip()
                    if not text:
                        continue

                    if search_term:
                        if re.search(re.escape(search_term), text, re.IGNORECASE):
                            posts.append(text)
                    else:
                        posts.append(text)
            except Exception as e:
                logger.warning("[Reddit] Error fetching public feed r/%s/%s: %s", subreddit, sort, e)

    return posts[:limit]


def _fetch_twitter_tweets(ticker: str, company_name: str = "", limit: int = 25) -> list[str]:
    """Fetch recent Twitter tweets mentioning the ticker or company."""
    if not TWITTER_BEARER_TOKEN:
        logger.warning("[Twitter] Bearer token not configured")
        return []

    try:
        # Use Twitter API v2 recent search
        headers = {"Authorization": f"Bearer {TWITTER_BEARER_TOKEN}"}
        query = f'("{company_name}" OR "{ticker}") -is:retweet lang:en'
        params = {
            "query": query,
            "max_results": limit,
            "tweet.fields": "text,created_at",
            "sort_order": "recency"
        }
        url = "https://api.twitter.com/2/tweets/search/recent"
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        tweets = [tweet["text"] for tweet in data.get("data", [])]
        return tweets
    except Exception as e:
        logger.warning("[Twitter] Error fetching tweets: %s", e)
        return []


def _analyze_social_sentiment(texts: list[str]) -> float:
    """Analyze sentiment of social media texts using VADER."""
    if not texts:
        return 0.0

    scores = []
    for text in texts:
        sentiment = _vader_analyzer.polarity_scores(text)
        scores.append(sentiment['compound'])

    return sum(scores) / len(scores) if scores else 0.0


# ── Aggregate sentiment scoring ────────────────────────

def _heuristic_score(headlines: list[str]) -> tuple[float, str]:
    """Enhanced heuristic sentiment scoring with better keyword detection."""
    positive_strong = {
        "beat", "beats", "earnings beat", "profit growth", "surge", "surged", 
        "rally", "rallied", "rises", "rise", "gain", "gains", "gained", "upgrade", "upgraded",
        "buyback", "dividend", "record high", "record", "milestone", "growth", "expands", 
        "wins", "contract", "deal", "partnership", "raises", "strong", "bullish",
        "expansion", "launch", "acquisition", "approval", "outperform", "positive",
    }
    positive_mild = {
        "optimism", "promising", "encouragement", "stability", 
        "recovery", "support", "boost", "increase", "advance", "strength",
    }
    negative_strong = {
        "miss", "misses", "earnings miss", "revenue decline", "loss", "losses",
        "falls", "fall", "fell", "decline", "declines", "declined", "downgrade", "downgraded",
        "cuts", "weak", "fraud", "probe", "crisis", "debt", "slip", "slips", "slipped",
        "drops", "drop", "dropped", "lower", "pressure", "weakness", "bearish", "negative",
        "volatility", "risk", "warning", "underperform", "sell-off", "collapse",
    }
    negative_mild = {
        "caution", "concern", "uncertainty", "challenge", "slowdown", "delay",
        "skepticism", "monitoring", "skeptical",
    }
    
    text = " ".join(headlines).lower()
    
    # Count keyword occurrences with weights
    pos_strong = sum(1 for word in positive_strong if re.search(r"\b" + re.escape(word) + r"\b", text))
    pos_mild = sum(1 for word in positive_mild if re.search(r"\b" + re.escape(word) + r"\b", text))
    neg_strong = sum(1 for word in negative_strong if re.search(r"\b" + re.escape(word) + r"\b", text))
    neg_mild = sum(1 for word in negative_mild if re.search(r"\b" + re.escape(word) + r"\b", text))
    
    # Weighted score calculation
    net_score = (pos_strong * 12.0) + (pos_mild * 4.0) - (neg_strong * 12.0) - (neg_mild * 4.0)
    
    # Map to 0-100 range with better distribution
    if net_score > 30:
        score = min(95.0, 50.0 + (net_score * 0.8))
    elif net_score < -30:
        score = max(5.0, 50.0 + (net_score * 0.8))
    else:
        score = 50.0 + (net_score * 0.6)
    
    score = max(0.0, min(100.0, score))
    
    # Determine label - lower thresholds for better sentiment variation
    if score >= 58:
        label = "Bullish"
    elif score <= 42:
        label = "Bearish"
    else:
        label = "Neutral"
    
    logger.debug("[sentiment] heuristic: pos_strong=%d pos_mild=%d neg_strong=%d neg_mild=%d → net=%s → score=%.1f label=%s",
                 pos_strong, pos_mild, neg_strong, neg_mild, net_score, score, label)
    
    return score, label


def _score_with_gemini(ticker: str, headlines: list[str]) -> tuple[float | None, str]:
    if not headlines:
        logger.info("[sentiment] no headlines for %s; returning insufficient data", ticker)
        return None, "Insufficient Data"
    if not GEMINI_API_KEY:
        score, label = _heuristic_score(headlines)
        logger.warning("[sentiment] ⚠️ GEMINI_API_KEY missing for %s; using heuristic score=%s label=%s", ticker, score, label)
        return score, label

    headlines_text = "\n".join(f"- {h}" for h in headlines[:15])

    prompt = f"""You are a financial sentiment analyst. Analyze these news headlines about {ticker}.

Headlines:
{headlines_text}

Score the OVERALL sentiment and return JSON with exactly these fields:
- "score": number 0-100 (0=extremely bearish, 50=neutral, 100=extremely bullish)
- "label": "Bearish" | "Neutral" | "Bullish"
- "reason": one sentence explaining the dominant sentiment signal

CALIBRATION:
- Multiple earnings misses, revenue declines → score 10-25
- Minor negative news, soft guidance → score 30-40
- Mixed or non-financial news → score 45-55
- Earnings beats, analyst upgrades → score 65-80
- Major beats, blockbuster deals, dividend hikes → score 80-95

Respond ONLY with the JSON object. No markdown."""

    logger.debug("[sentiment] calling Gemini for %s with %d headlines", ticker, len(headlines))
    data = _gemini_post({
        "model":       GEMINI_MODEL,
        "messages":    [{"role": "user", "content": prompt}],
        "max_tokens":  150,
        "temperature": 0.1,
    })

    if not data:
        score, label = _heuristic_score(headlines)
        logger.warning("[sentiment] Gemini unavailable/unparseable for %s; falling back to heuristic score=%s label=%s", ticker, score, label)
        return score, label

    try:
        score = max(0.0, min(100.0, float(data.get("score", 50))))
        label = data.get("label", "Neutral")
        if label not in ("Bearish", "Neutral", "Bullish"):
            label = "Bullish" if score >= 66 else ("Bearish" if score <= 34 else "Neutral")
        logger.info("[sentiment] Gemini analysis for %s: score=%s label=%s", ticker, score, label)
        return score, label
    except Exception as e:
        logger.error("[sentiment] parse error for %s from Gemini response %s: %s", ticker, data, e)
        score, label = _heuristic_score(headlines)
        logger.warning("[sentiment] falling back to heuristic score=%s label=%s", score, label)
        return score, label


# ── Per-article impact scoring ─────────────────────────

def _analyze_impact_with_gemini(
    company: str,
    ticker: str,
    articles: list[dict]
) -> dict:
    if not GEMINI_API_KEY or not articles:
        return {}

    articles_text = "\n".join(
        f"[Article {i+1}]\nTitle: {a['title']}\n"
        f"Source: {a['source']}\n"
        f"Summary: {a.get('description') or 'N/A'}"
        for i, a in enumerate(articles[:6])
    )

    prompt = f"""You are a senior equity analyst scoring news articles for {company} ({ticker}).

SCORING RULES — you MUST use the full 1-10 range across articles:
1-2 = Earnings miss, revenue decline, fraud, credit downgrade, major loss
3-4 = Soft guidance, cost pressures, leadership uncertainty, minor negative
5-6 = Product launches, general industry news, no clear P&L impact
7-8 = Earnings beat, new contract, analyst upgrade, margin expansion
9-10 = Major earnings beat, blockbuster deal, dividend hike, massive buyback

CALIBRATION EXAMPLES:
- "Reliance Q3 PAT up 18% YoY" → impact_score: 8, positive
- "Apple misses earnings, revenue down 8%" → impact_score: 2, negative
- "Company wins major government contract" → impact_score: 8, positive
- "CEO succession uncertainty" → impact_score: 4, negative
- "New product launch announced" → impact_score: 5, neutral

CRITICAL: Each article MUST get a DIFFERENT score based on its actual content.
CRITICAL: Do not cluster scores around 3. Use the full range.

Articles:
{articles_text}

Return ONLY this JSON (no markdown):
{{
  "articles": [
    {{
      "index": 1,
      "sentiment": "positive"|"negative"|"neutral",
      "impact_score": <integer 1-10>,
      "impact_explanation": "This news may... [1-2 sentences for a beginner investor]",
      "price_direction": "may increase"|"may decrease"|"likely neutral"
    }}
  ],
  "overall_sentiment": "positive"|"negative"|"neutral",
  "sentiment_summary": "<2 sentences summarizing what this means for the stock>"
}}"""

    data = _gemini_post({
        "model":       GEMINI_MODEL,
        "messages":    [{"role": "user", "content": prompt}],
        "max_tokens":  1500,
        "temperature": 0.2,
    })

    return data if data else {}


# ── Public API ─────────────────────────────────────────

def get_sentiment(ticker: str, company_name: str = "") -> dict:
    ticker = ticker.upper().strip()

    with _cache_lock:
        if ticker in _cache:
            logger.debug("[sentiment] cache hit for %s", ticker)
            return dict(_cache[ticker])

    logger.info("[sentiment] cache miss for %s; fetching headlines...", ticker)
    headlines    = _fetch_headlines(ticker, company_name)
    logger.info("[sentiment] %s fetched %d headline(s) for analysis", ticker, len(headlines))
    score, label = _score_with_gemini(ticker, headlines)

    # Separate social media sentiment
    reddit_posts = _fetch_reddit_posts(ticker, company_name, limit=10)
    twitter_tweets = _fetch_twitter_tweets(ticker, company_name, limit=10)
    social_texts = reddit_posts + twitter_tweets
    social_score = _analyze_social_sentiment(social_texts) * 100  # Convert to 0-100 scale

    # Combine news and social sentiment (weighted average: 70% news, 30% social)
    combined_score = (score * 0.7) + (social_score * 0.3) if score is not None else social_score

    result = {
        "ticker":         ticker,
        "score":          round(combined_score, 2) if combined_score is not None else None,
        "label":          label,
        "headline_count": len(headlines),
        "headlines":      headlines[:5],
        "social_score":   round(social_score, 2),
        "reddit_posts":   len(reddit_posts),
        "twitter_tweets": len(twitter_tweets),
    }

    with _cache_lock:
        _cache[ticker] = dict(result)
    return result


def get_news_impact(ticker: str, company_name: str = "", days: int = 7) -> dict:
    ticker    = ticker.upper().strip()
    cache_key = f"{ticker}:{days}"

    with _impact_lock:
        if cache_key in _impact_cache:
            return dict(_impact_cache[cache_key])

    articles = _fetch_articles_detailed(ticker, company_name, days=days)

    if not articles:
        result = {
            "ticker":            ticker,
            "company_name":      company_name or ticker,
            "overall_sentiment": "neutral",
            "sentiment_summary": f"No recent financial news found for {company_name or ticker}.",
            "news":              [],
        }
        with _impact_lock:
            _impact_cache[cache_key] = dict(result)
        return result

    analysis = _analyze_impact_with_gemini(company_name or ticker, ticker, articles)
    analyzed  = {
        a.get("index"): a
        for a in analysis.get("articles", [])
        if isinstance(a, dict)
    }

    news_items = []
    for i, art in enumerate(articles[:6], start=1):
        match = analyzed.get(i, {})
        news_items.append({
            "title":              art["title"],
            "source":             art["source"],
            "published_at":       art["published_at"],
            "url":                art["url"],
            "sentiment":          match.get("sentiment", "neutral"),
            "impact_score":       max(1, min(10, int(match.get("impact_score", 3) or 3))),
            "impact_explanation": match.get("impact_explanation", "Unable to analyze impact."),
            "price_direction":    match.get("price_direction", "likely neutral"),
        })

    result = {
        "ticker":            ticker,
        "company_name":      company_name or ticker,
        "overall_sentiment": analysis.get("overall_sentiment", "neutral"),
        "sentiment_summary": analysis.get(
            "sentiment_summary",
            f"Mixed signals for {company_name or ticker}."
        ),
        "news": news_items,
    }

    with _impact_lock:
        _impact_cache[cache_key] = dict(result)
    return result
