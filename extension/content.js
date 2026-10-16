(() => {
  "use strict";

  const host = window.location.hostname;
  const isComparator = host.endsWith(".github.io") || host === "localhost" || host === "127.0.0.1";
  const marketplace = host.includes("aliexpress.") ? "aliexpress"
    : host.includes("shein.") ? "shein"
      : host.includes("alibaba.") ? "alibaba"
        : host.includes("temu.") ? "temu" : null;

  const textFrom = (selectors) => {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (node?.textContent?.trim()) return node.textContent.trim();
    }
    return null;
  };
  const numberFrom = (value) => {
    if (!value) return null;
    const normalized = value.replace(/\s/g, "").replace(/[^\d,.]/g, "");
    if (!normalized) return null;
    const comma = normalized.lastIndexOf(",");
    const dot = normalized.lastIndexOf(".");
    const decimal = comma > dot ? "," : ".";
    const clean = normalized.includes(decimal)
      ? normalized.replace(decimal === "," ? /\./g : /,/g, "").replace(decimal, ".")
      : normalized;
    const parsed = Number.parseFloat(clean);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const jsonLdProduct = () => [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => {
    try { return JSON.parse(node.textContent); } catch { return null; }
  }).flatMap((item) => Array.isArray(item) ? item : [item]).find((item) => item?.["@type"] === "Product");

  const readPage = () => {
    const product = jsonLdProduct();
    const title = product?.name || document.title;
    const price = numberFrom(product?.offers?.price) || numberFrom(textFrom([
      '[itemprop="price"]', '[class*="price"]', '[class*="Price"]', '[data-testid*="price"]'
    ]));
    const shipping = numberFrom(textFrom(['[class*="shipping"]', '[class*="Shipping"]', '[data-testid*="shipping"]']));
    const delivery = textFrom(['[class*="delivery"]', '[class*="Delivery"]', '[data-testid*="delivery"]']);
    return { marketplace, title: title.slice(0, 180), url: location.href, price, shipping, delivery, capturedAt: new Date().toISOString() };
  };

  const saveCapture = () => {
    if (!marketplace) return;
    const capture = readPage();
    chrome.storage.local.get({ captures: [] }, ({ captures }) => {
      const next = [...captures.filter((item) => item.marketplace !== marketplace), capture].slice(-10);
      chrome.storage.local.set({ captures: next }, () => {
        window.dispatchEvent(new CustomEvent("mpc-capture-saved"));
        alert("MercatoChiaro: cattura salvata localmente. Torna al comparatore e importa i dati.");
      });
    });
  };

  if (marketplace) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Cattura per MercatoChiaro";
    Object.assign(button.style, {
      position: "fixed", right: "16px", bottom: "16px", zIndex: "2147483647",
      border: "0", borderRadius: "10px", padding: "12px 15px", color: "#fff",
      background: "#17212b", boxShadow: "0 5px 20px rgba(0,0,0,.2)", cursor: "pointer",
      font: "600 13px system-ui, sans-serif"
    });
    button.addEventListener("click", saveCapture);
    document.documentElement.appendChild(button);
  }

  if (isComparator) {
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      if (event.data?.type === "MPC_REQUEST_CAPTURES") {
        chrome.storage.local.get({ captures: [] }, ({ captures }) => {
          window.postMessage({ type: "MPC_CAPTURE_DATA", captures }, "*");
        });
      }
      if (event.data?.type === "MPC_CLEAR_CAPTURES") chrome.storage.local.remove("captures");
    });
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.captures) window.postMessage({ type: "MPC_CAPTURE_AVAILABLE" }, "*");
    });
  }
})();
