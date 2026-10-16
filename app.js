const EMPTY_RESULTS = [
  { key: "aliexpress", name: "AliExpress", short: "AE", logoClass: "ali", price: null, shipping: null, delivery: "Adapter non configurato", state: "unavailable", stateLabel: "Non disponibile", source: "Adapter opzionale" },
  { key: "shein", name: "SHEIN", short: "SH", logoClass: "shein", price: null, shipping: null, delivery: "Configura RapidAPI", state: "unavailable", stateLabel: "Backend non configurato", source: "RapidAPI SHEIN" },
  { key: "alibaba", name: "Alibaba", short: "AB", logoClass: "alibaba", price: null, shipping: null, delivery: "Adapter non configurato", state: "unavailable", stateLabel: "Non disponibile", source: "Adapter opzionale" },
  { key: "temu", name: "Temu", short: "T", logoClass: "temu", price: null, shipping: null, delivery: "Configura Apify", state: "unavailable", stateLabel: "Backend non configurato", source: "Apify Temu" }
];
const DEMO_RESULTS = [
  { key: "aliexpress", name: "AliExpress", short: "AE", logoClass: "ali", price: 12.48, shipping: 0, delivery: "7–15 giorni", state: "estimated", stateLabel: "Demo", source: "Demo esplicita" },
  { key: "shein", name: "SHEIN", short: "SH", logoClass: "shein", price: 14.9, shipping: 3.99, delivery: "6–12 giorni", state: "estimated", stateLabel: "Demo", source: "Demo esplicita" },
  { key: "alibaba", name: "Alibaba", short: "AB", logoClass: "alibaba", price: null, shipping: null, delivery: "Da definire", state: "unavailable", stateLabel: "Demo: non disponibile", source: "Demo esplicita" },
  { key: "temu", name: "Temu", short: "T", logoClass: "temu", price: 16.75, shipping: 0, delivery: "5–10 giorni", state: "estimated", stateLabel: "Demo", source: "Demo esplicita" }
];
const marketplaceHosts = {
  aliexpress: ["aliexpress."],
  shein: ["shein."],
  alibaba: ["alibaba."],
  temu: ["temu."]
};
const money = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const elements = {
  form: document.querySelector("#compareForm"),
  url: document.querySelector("#productUrl"),
  country: document.querySelector("#country"),
  postalCode: document.querySelector("#postalCode"),
  resultsGrid: document.querySelector("#resultsGrid"),
  formMessage: document.querySelector("#formMessage"),
  captureMessage: document.querySelector("#captureMessage"),
  lastUpdated: document.querySelector("#lastUpdated")
};

function formatMoney(value) {
  return value === null || value === undefined ? "—" : money.format(value);
}

function detectMarketplace(url) {
  const hostname = (() => {
    try { return new URL(url).hostname; } catch { return ""; }
  })();
  return Object.keys(marketplaceHosts).find((key) => marketplaceHosts[key].some((fragment) => new RegExp(`(^|\\.)${fragment.replace(".", "\\.")}`).test(hostname))) || null;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}

function safeHref(value, fallback) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : fallback;
  } catch {
    return fallback;
  }
}

function resultCard(result, bestKey) {
  const total = result.price === null ? null : result.price + (result.shipping || 0);
  const isBest = result.key === bestKey;
  const fallbackHref = result.key === "aliexpress" ? "https://www.aliexpress.com" : `https://www.${result.key}.com`;
  const href = safeHref(result.url, fallbackHref);
  return `<article class="result-card ${isBest ? "best" : ""}">
    ${isBest ? '<span class="best-label">Migliore dato</span>' : ""}
    <div class="marketplace"><span>${escapeHtml(result.name)}</span><span class="marketplace-logo ${escapeHtml(result.logoClass)}">${escapeHtml(result.short)}</span></div>
    <div class="price">${formatMoney(total)}</div>
    <span class="price-caption">${escapeHtml(result.source || "Provider")} · ${result.state === "live" ? "dato restituito" : "stato informativo"}</span>
    <div class="result-lines">
      <div class="result-line"><span>Prodotto</span><strong>${formatMoney(result.price)}</strong></div>
      <div class="result-line"><span>Spedizione</span><strong>${result.shipping === null ? "Non disponibile" : result.shipping === 0 ? "Gratuita" : formatMoney(result.shipping)}</strong></div>
      <div class="result-line"><span>Consegna</span><strong>${escapeHtml(result.delivery || "Non disponibile")}</strong></div>
    </div>
    <span class="tag tag-${escapeHtml(result.state)}">${escapeHtml(result.stateLabel)}</span>
    ${result.message ? `<p class="card-message">${escapeHtml(result.message)}</p>` : ""}
    <a class="result-link" href="${href}" target="_blank" rel="noreferrer">Apri marketplace ↗</a>
  </article>`;
}

function renderResults(results = EMPTY_RESULTS) {
  const available = results.filter((item) => Number.isFinite(item.price));
  const best = available.length ? available.reduce((min, item) => (item.price + (item.shipping || 0) < min.price + (min.shipping || 0) ? item : min)).key : null;
  elements.resultsGrid.innerHTML = results.map((item) => resultCard(item, best)).join("");
}

function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function setDemo() {
  elements.url.value = "https://www.aliexpress.com/item/demo-smart-lamp.html";
  elements.postalCode.value = "00100";
  renderResults(DEMO_RESULTS);
  elements.lastUpdated.textContent = "Demo esplicita";
  showMessage(elements.formMessage, "Demo caricata su richiesta: questi valori non provengono da marketplace reali.");
}

function isValidUrl(value) {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

function apiUrl(path) {
  const base = (window.MPC_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
  return `${base}${path}`;
}

function normalizeApiResults(payload) {
  return Array.isArray(payload?.results) ? payload.results.map((item) => ({
    ...EMPTY_RESULTS.find((empty) => empty.key === item.key),
    ...item,
    state: item.state || (Number.isFinite(item.price) ? "live" : "unavailable"),
    stateLabel: item.stateLabel || (Number.isFinite(item.price) ? "Dato provider" : "Non disponibile")
  })) : EMPTY_RESULTS;
}

async function compare() {
  const url = elements.url.value.trim();
  const country = elements.country.value;
  const postalCode = elements.postalCode.value.trim();
  if (!isValidUrl(url)) {
    showMessage(elements.formMessage, "Inserisci un URL http(s) valido.", true);
    elements.url.focus();
    return;
  }
  if (!/^\d{5}$/.test(postalCode)) {
    showMessage(elements.formMessage, "Inserisci un CAP italiano di 5 cifre.", true);
    elements.postalCode.focus();
    return;
  }
  if (!window.MPC_CONFIG?.apiBaseUrl) {
    showMessage(elements.formMessage, "Backend non configurato. Usa la demo esplicita oppure l’estensione browser come fallback.", true);
    renderResults(EMPTY_RESULTS);
    return;
  }
  showMessage(elements.formMessage, "Richiesta al backend in corso…");
  renderResults(EMPTY_RESULTS.map((item) => ({ ...item, stateLabel: "In attesa", message: "Interrogazione provider…" })));
  try {
    const response = await fetch(apiUrl("/api/compare"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ url, country, postalCode })
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Accesso richiesto: apri il sito protetto da Cloudflare Access e autenticati.");
    if (response.status === 403) throw new Error("Accesso negato: il tuo account non è nella allowlist privata.");
    if (response.status === 503) throw new Error("Privacy non attiva: il proprietario deve configurare Cloudflare Access e la allowlist.");
    if (!response.ok) throw new Error(payload.error || "Il backend ha rifiutato la richiesta.");
    renderResults(normalizeApiResults(payload));
    elements.lastUpdated.textContent = `Risposta backend · CAP ${postalCode}`;
    showMessage(elements.formMessage, payload.message || "Confronto completato. Verifica il checkout sul marketplace.");
  } catch (error) {
    renderResults(EMPTY_RESULTS.map((item) => ({ ...item, stateLabel: "Errore provider", message: "Nessun dato reale restituito." })));
    showMessage(elements.formMessage, error.message || "Backend non raggiungibile.", true);
  }
  document.querySelector("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}

function importCaptures(requestExtension = true) {
  if (requestExtension) window.postMessage({ type: "MPC_REQUEST_CAPTURES" }, "*");
  const captures = JSON.parse(localStorage.getItem("mpc-captures") || "[]");
  if (!captures.length) {
    showMessage(elements.captureMessage, "Nessuna cattura locale. Carica l’estensione e cattura una pagina marketplace.", true);
    return;
  }
  const merged = EMPTY_RESULTS.map((empty) => {
    const capture = captures.find((item) => item.marketplace === empty.key);
    if (!capture) return empty;
    return {
      ...empty,
      price: Number.isFinite(capture.price) ? capture.price : null,
      shipping: Number.isFinite(capture.shipping) ? capture.shipping : null,
      delivery: capture.delivery || "Non disponibile",
      source: "Cattura browser",
      state: "live",
      stateLabel: "Letto dalla pagina",
      message: capture.price === null ? "La pagina non esponeva un prezzo leggibile." : ""
    };
  });
  renderResults(merged);
  showMessage(elements.captureMessage, `${captures.length} cattura/e importata/e dal browser. Verifica sempre il checkout.`);
  elements.lastUpdated.textContent = "Dati locali importati";
}

elements.form.addEventListener("submit", (event) => { event.preventDefault(); compare(); });
document.querySelector("#demoButton").addEventListener("click", setDemo);
document.querySelector("#refreshButton").addEventListener("click", () => {
  renderResults(EMPTY_RESULTS);
  showMessage(elements.formMessage, "Risultati azzerati. Avvia un confronto o usa la demo esplicita.");
});
document.querySelector("#importButton").addEventListener("click", importCaptures);
document.querySelector("#clearButton").addEventListener("click", () => {
  localStorage.removeItem("mpc-captures");
  window.postMessage({ type: "MPC_CLEAR_CAPTURES" }, "*");
  showMessage(elements.captureMessage, "Catture locali rimosse.");
});
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type === "MPC_CAPTURE_DATA") {
    localStorage.setItem("mpc-captures", JSON.stringify(event.data.captures || []));
    importCaptures(false);
  } else if (event.data?.type === "MPC_CAPTURE_AVAILABLE") {
    showMessage(elements.captureMessage, "Nuova cattura locale disponibile: premi Importa catture locali.");
  }
});

renderResults();
