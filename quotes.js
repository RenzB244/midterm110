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

// Small helper: fetch with timeout para dili mag-hang
function fetchWithTimeout(url, options = {}) {
  const { timeout = 7000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

// Show a random local quote (final fallback)
function showLocalFallback() {
  const i = Math.floor(Math.random() * FALLBACK_QUOTES.length);
  const q = FALLBACK_QUOTES[i];
  showQuote(q.text, q.author);
}

// If you want to use API only (no local fallback), set this to true
const REQUIRE_API = true;

function showApiError() {
  document.getElementById("quote-text").innerText =
    "⚠️ Unable to load a quote from the API right now. Please try again.";
  document.getElementById("quote-author").innerText = "";
}

// Try public APIs in order: Quotable -> ZenQuotes -> Type.fit (all no key). If all fail, show error or fallback.
async function getRandomQuote() {
  try {
    // 1) Quotable — no API key, friendly CORS
    let response = await fetchWithTimeout("https://api.quotable.io/random", { timeout: 7000 });
    if (response.ok) {
      const q = await response.json();
      return showQuote(q.content, q.author);
    }

    // 2) ZenQuotes — public endpoint, no key required (may rate-limit)
    response = await fetchWithTimeout("https://zenquotes.io/api/random", { timeout: 7000 });
    if (response.ok) {
      const data = await response.json();
      return showQuote(data[0]?.q || "", data[0]?.a || "");
    }

    // 3) Type.fit — returns a big list; pick a random one
    response = await fetchWithTimeout("https://type.fit/api/quotes", { timeout: 7000 });
    if (response.ok) {
      const list = await response.json();
      const idx = Math.floor(Math.random() * list.length);
      const item = list[idx] || {};
      return showQuote(item.text || "", item.author || "");
    }

    // 4) Local fallback or error depending on REQUIRE_API
    if (REQUIRE_API) return showApiError();
    showLocalFallback();
  } catch (error) {
    console.error("❌ Failed to fetch from APIs:", error);
    if (REQUIRE_API) return showApiError();
    showLocalFallback();
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
