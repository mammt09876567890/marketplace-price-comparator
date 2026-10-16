const DEMO_RESULTS = [
  { key: "aliexpress", name: "AliExpress", short: "AE", logoClass: "ali", price: 12.48, shipping: 0, delivery: "7–15 giorni", state: "estimated", stateLabel: "Stimato", source: "Demo locale" },
  { key: "shein", name: "SHEIN", short: "SH", logoClass: "shein", price: 14.9, shipping: 3.99, delivery: "6–12 giorni", state: "estimated", stateLabel: "Stimato", source: "Demo locale" },
  { key: "alibaba", name: "Alibaba", short: "AB", logoClass: "alibaba", price: null, shipping: null, delivery: "Da definire", state: "unavailable", stateLabel: "Non disponibile", source: "Richiede quotazione" },
  { key: "temu", name: "Temu", short: "T", logoClass: "temu", price: 16.75, shipping: 0, delivery: "5–10 giorni", state: "estimated", stateLabel: "Stimato", source: "Demo locale" }
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
  return Object.keys(marketplaceHosts).find((key) => marketplaceHosts[key].some((fragment) => hostname.includes(fragment))) || null;
}

function resultCard(result, bestKey) {
  const total = result.price === null ? null : result.price + (result.shipping || 0);
  const isBest = result.key === bestKey;
  return `<article class="result-card ${isBest ? "best" : ""}">
    ${isBest ? '<span class="best-label">Migliore stima</span>' : ""}
    <div class="marketplace"><span>${result.name}</span><span class="marketplace-logo ${result.logoClass}">${result.short}</span></div>
    <div class="price">${formatMoney(total)}</div>
    <span class="price-caption">${result.source} · totale indicativo</span>
    <div class="result-lines">
      <div class="result-line"><span>Prodotto</span><strong>${formatMoney(result.price)}</strong></div>
      <div class="result-line"><span>Spedizione</span><strong>${result.shipping === null ? "Da verificare" : result.shipping === 0 ? "Gratuita" : formatMoney(result.shipping)}</strong></div>
      <div class="result-line"><span>Consegna</span><strong>${result.delivery}</strong></div>
    </div>
    <span class="tag tag-${result.state}">${result.stateLabel}</span>
    <a class="result-link" href="${result.key === "aliexpress" ? "https://www.aliexpress.com" : `https://www.${result.key}.com`}" target="_blank" rel="noreferrer">Apri marketplace ↗</a>
  </article>`;
}

function renderResults(results = DEMO_RESULTS) {
  const available = results.filter((item) => item.price !== null);
  const best = available.length ? available.reduce((min, item) => (item.price + item.shipping < min.price + min.shipping ? item : min)).key : null;
  elements.resultsGrid.innerHTML = results.map((item) => resultCard(item, best)).join("");
}

function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function setDemo() {
  elements.url.value = "https://www.aliexpress.com/item/demo-smart-lamp.html";
  elements.postalCode.value = "00100";
  showMessage(elements.formMessage, "Esempio caricato: puoi confrontare subito o sostituire il link.");
}

function isValidUrl(value) {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

function compare() {
  const url = elements.url.value.trim();
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
  const marketplace = detectMarketplace(url);
  const note = marketplace
    ? `Link riconosciuto come ${DEMO_RESULTS.find((item) => item.key === marketplace).name}. I valori mostrati restano dimostrativi finché non importi una cattura locale.`
    : "Marketplace non riconosciuto: mostro una stima demo per farti vedere il flusso.";
  showMessage(elements.formMessage, `${note} Destinazione: ${postalCode}, Italia.`);
  elements.lastUpdated.textContent = `Aggiornato per CAP ${postalCode}`;
  document.querySelector("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}

function importCaptures(requestExtension = true) {
  if (requestExtension) window.postMessage({ type: "MPC_REQUEST_CAPTURES" }, "*");
  const captures = JSON.parse(localStorage.getItem("mpc-captures") || "[]");
  if (!captures.length) {
    showMessage(elements.captureMessage, "Nessuna cattura locale. Carica l’estensione e cattura una pagina marketplace.", true);
    return;
  }
  const merged = DEMO_RESULTS.map((demo) => {
    const capture = captures.find((item) => item.marketplace === demo.key);
    if (!capture) return demo;
    return {
      ...demo,
      price: Number.isFinite(capture.price) ? capture.price : demo.price,
      shipping: Number.isFinite(capture.shipping) ? capture.shipping : demo.shipping,
      delivery: capture.delivery || demo.delivery,
      source: "Cattura browser",
      state: "live",
      stateLabel: "Letto dalla pagina"
    };
  });
  renderResults(merged);
  showMessage(elements.captureMessage, `${captures.length} cattura/e importata/e dal browser. Verifica sempre il checkout.`);
  elements.lastUpdated.textContent = "Dati locali importati";
}

elements.form.addEventListener("submit", (event) => { event.preventDefault(); compare(); });
document.querySelector("#demoButton").addEventListener("click", setDemo);
document.querySelector("#refreshButton").addEventListener("click", () => { renderResults(); showMessage(elements.formMessage, "Demo aggiornata. Per dati reali importa una cattura locale."); });
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
