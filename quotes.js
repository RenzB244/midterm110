// quotes.js (no API key required — uses public endpoints with graceful fallback)

// Local fallback quotes to guarantee output even when offline or APIs fail
const FALLBACK_QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Life is what happens to you while you're busy making other plans.", author: "John Lennon" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" }
];

// Show quote on the page
function showQuote(text, author) {
  document.getElementById("quote-text").innerText = `"${text}"`;
  document.getElementById("quote-author").innerText = author ? `— ${author}` : "";
}

// Simple loading state for the primary button
function setLoading(isLoading) {
  const btn = document.querySelector('button.btn.primary');
  if (!btn) return;
  if (isLoading) {
    btn.dataset.prevText = btn.textContent;
    btn.textContent = 'Loading…';
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.prevText || 'Get New Quote';
    btn.disabled = false;
  }
}

// Small helper: fetch with timeout para dili mag-hang
function fetchWithTimeout(url, options = {}) {
  const { timeout = 12000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

// Multi-proxy fallback
function getAppConfig() {
  return (typeof window !== 'undefined' && window.APP_CONFIG) ? window.APP_CONFIG : {};
}

function buildProxyUrl(provider, url) {
  if (provider === 'allorigins') return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  if (provider === 'jina') return `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;
  return url;
}

async function fetchViaMultiProxy(url, options = {}) {
  const { forceProxy } = getAppConfig();
  const providers = forceProxy ? ['allorigins', 'jina'] : ['direct', 'allorigins', 'jina'];
  const sanitized = { cache: 'no-store', ...options };
  // Proxies won't accept custom headers reliably; strip them for proxies
  const proxyOptions = (() => { const { headers, ...rest } = sanitized; return rest; })();

  let lastError;
  for (const provider of providers) {
    const targetUrl = provider === 'direct' ? url : buildProxyUrl(provider, url);
    const opts = provider === 'direct' ? sanitized : proxyOptions;
    try {
      const res = await fetchWithTimeout(targetUrl, opts);
      if (res.ok) return res;
      lastError = new Error(`${provider} status ${res.status} ${res.statusText}`);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('All fetch attempts failed');
}

// Parse JSON robustly: try response.json(); if it fails, try text() then JSON.parse
async function parseJsonFlexible(response) {
  try {
    return await response.json();
  } catch (e) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e2) {
      throw new Error(`Invalid JSON: ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`);
    }
  }
}

// Show a random local quote (final fallback)
function showLocalFallback() {
  const i = Math.floor(Math.random() * FALLBACK_QUOTES.length);
  const q = FALLBACK_QUOTES[i];
  showQuote(q.text, q.author);
}

// If you want to use API only (no local fallback), set this to true
const REQUIRE_API = true;

function showApiError(details) {
  const base = "⚠️ Unable to load a quote from the API right now.";
  const extra = details ? `\n${details}` : "\nPlease try again.";
  document.getElementById("quote-text").innerText = `${base} ${extra}`;
  document.getElementById("quote-author").innerText = "";
}

// Try API Ninjas (requires X-Api-Key in window.APP_CONFIG.apiNinjasKey)
async function tryApiNinjasFirst() {
  try {
    const apiKey = window.APP_CONFIG && window.APP_CONFIG.apiNinjasKey;
    if (!apiKey) return false;

    console.log("Fetching from API Ninjas...");
    const response = await fetchWithTimeout("https://api.api-ninjas.com/v1/quotes", {
      timeout: 12000,
      headers: { "X-Api-Key": apiKey }
    });
    if (!response.ok) {
      console.warn("API Ninjas failed:", response.status, response.statusText);
      return false;
    }
    const data = await response.json();
    const item = Array.isArray(data) ? data[0] : data;
    if (!item || (!item.quote && !item.text)) return false;
    const text = item.quote || item.text || "";
    const author = item.author || item.source || "";
    showQuote(text, author);
    console.log("API Ninjas OK");
    return true;
  } catch (e) {
    console.warn("API Ninjas error:", e);
    return false;
  }
}

// Try public APIs in order: Quotable -> ZenQuotes -> Type.fit (all no key). If all fail, show error or fallback.
async function getRandomQuote() {
  try {
    setLoading(true);
    const filterEl = document.getElementById("filter");
    const keyword = filterEl ? filterEl.value.trim() : "";
    if (keyword && keyword.length < 2) {
      // basic validation feedback is handled in app.html; stop fetch if invalid
      return;
    }

    // 0) If API key is provided, try API Ninjas first
    const usedNinjas = await tryApiNinjasFirst();
    if (usedNinjas) return;

    // 1) Quotable — no API key, friendly CORS
    console.log("Fetching from Quotable...");
    const ts = Date.now();
    let url = `https://api.quotable.io/random?ts=${ts}`;
    if (keyword) {
      // Quotable supports tags/author/contains via search endpoint; use a simple contains search
      url = `https://api.quotable.io/search/quotes?query=${encodeURIComponent(keyword)}&limit=50&ts=${ts}`;
    }
    let response = await fetchViaMultiProxy(url, { timeout: 12000 });
    if (response.ok) {
      if (keyword) {
        let search;
        try { search = await parseJsonFlexible(response); } catch (e) { console.warn('Quotable search parse failed', e); search = null; }
        console.log("Quotable Search OK", search);
        const results = Array.isArray(search.results) ? search.results : [];
        if (results.length > 0) {
          const idx = Math.floor(Math.random() * results.length);
          const item = results[idx];
          return showQuote(item.content || "", item.author || "");
        }
      } else {
        let q;
        try { q = await parseJsonFlexible(response); } catch (e) { console.warn('Quotable parse failed', e); q = null; }
        console.log("Quotable OK", q);
        if (q && (q.content || q.author)) return showQuote(q.content || "", q.author || "");
      }
    }
    console.warn("Quotable failed:", response.status, response.statusText);

    // 2) DummyJSON — public endpoint, no key required, CORS-friendly
    console.log("Fetching from DummyJSON...");
    response = await fetchViaMultiProxy(`https://dummyjson.com/quotes/random?ts=${Date.now()}`, { timeout: 12000 });
    if (response.ok) {
      let dj;
      try { dj = await parseJsonFlexible(response); } catch (e) { console.warn('DummyJSON parse failed', e); dj = null; }
      if (dj && (dj.quote || dj.text)) {
        const text = dj.quote || dj.text || "";
        const author = dj.author || "";
        if (!keyword || (text + " " + author).toLowerCase().includes(keyword.toLowerCase())) {
          return showQuote(text, author);
        }
      }
    }
    console.warn("DummyJSON failed:", response.status, response.statusText);

    // 3) ZenQuotes — public endpoint, no key required (may rate-limit)
    console.log("Fetching from ZenQuotes...");
    response = await fetchViaMultiProxy(`https://zenquotes.io/api/random?ts=${Date.now()}`, { timeout: 12000 });
    if (response.ok) {
      let data;
      try { data = await parseJsonFlexible(response); } catch (e) { console.warn('ZenQuotes parse failed', e); data = null; }
      console.log("ZenQuotes OK", data);
      const first = Array.isArray(data) ? data[0] : undefined;
      const text = (first && first.q) ? first.q : "";
      const author = (first && first.a) ? first.a : "";
      // Detect rate limit messages and treat as failure so we can try next provider
      const looksRateLimited = /too many requests/i.test(text) || /zenquotes\.io/i.test(author || "");
      if (!looksRateLimited) {
        if (!keyword || (text + " " + author).toLowerCase().includes(keyword.toLowerCase())) {
          return showQuote(text, author);
        }
      } else {
        console.warn('ZenQuotes rate-limited, skipping to next provider');
      }
    }
    console.warn("ZenQuotes failed:", response.status, response.statusText);

    // 4) Type.fit — returns a big list; pick a random one
    console.log("Fetching from Type.fit...");
    response = await fetchViaMultiProxy("https://type.fit/api/quotes", { timeout: 12000 });
    if (response.ok) {
      let list;
      try { list = await parseJsonFlexible(response); } catch (e) { console.warn('Type.fit parse failed', e); list = null; }
      const arr = Array.isArray(list) ? list : [];
      const pool = keyword
        ? arr.filter(i => ((i.text || "") + " " + (i.author || "")).toLowerCase().includes(keyword.toLowerCase()))
        : arr;
      if (pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        const item = pool[idx] || {};
        console.log("Type.fit OK (picked index)", idx);
        return showQuote(item.text || "", item.author || "");
      }
    }
    console.warn("Type.fit failed:", response.status, response.statusText);

    // 5) Local fallback or error depending on REQUIRE_API
    if (REQUIRE_API) return showApiError("All providers failed (Quotable, DummyJSON, ZenQuotes, Type.fit).");
    showLocalFallback();
  } catch (error) {
    console.error("❌ Failed to fetch from APIs:", error);
    if (REQUIRE_API) return showApiError(error && error.message ? error.message : String(error));
    showLocalFallback();
  } finally {
    setLoading(false);
  }
}

// Share the current quote
function shareQuote() {
  const quote = document.getElementById("quote-text").innerText;
  const author = document.getElementById("quote-author").innerText;
  const fullQuote = `${quote} ${author}`;

  if (navigator.share) {
    navigator
      .share({
        title: "Inspirational Quote",
        text: fullQuote,
      })
      .then(() => console.log("Quote shared successfully"))
      .catch((error) => console.error("Error sharing:", error));
  } else {
    navigator.clipboard.writeText(fullQuote).then(() => {
      alert("Quote copied to clipboard!");
    });
  }
}

// Load an initial quote when the page loads
document.addEventListener("DOMContentLoaded", () => {
  getRandomQuote();
});