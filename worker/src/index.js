const MARKETPLACES = {
  shein: { name: "SHEIN", short: "SH", logoClass: "shein" },
  temu: { name: "Temu", short: "T", logoClass: "temu" },
  aliexpress: { name: "AliExpress", short: "AE", logoClass: "ali" },
  alibaba: { name: "Alibaba", short: "AB", logoClass: "alibaba" }
};

const corsHeaders = (env) => ({
  "access-control-allow-origin": env.ALLOWED_ORIGIN || "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400"
});

const json = (data, status, env) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders(env), "content-type": "application/json; charset=utf-8" }
});

function marketplaceFromUrl(value) {
  let hostname;
  try { hostname = new URL(value).hostname.toLowerCase(); } catch { return null; }
  return Object.keys(MARKETPLACES).find((key) => new RegExp(`(^|\\.)${key}\\.`).test(hostname)) || null;
}

function numberFrom(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s/g, "").replace(/[^\d,.]/g, "");
  if (!normalized) return null;
  const comma = normalized.lastIndexOf(",");
  const dot = normalized.lastIndexOf(".");
  const decimal = comma > dot ? "," : ".";
  const clean = normalized.includes(decimal)
    ? normalized.replace(decimal === "," ? /\./g : /,/g, "").replace(decimal, ".")
    : normalized;
  const result = Number.parseFloat(clean);
  return Number.isFinite(result) ? result : null;
}

function pick(object, paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], object);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function normalizeResult(key, raw, source, url) {
  const item = MARKETPLACES[key];
  const price = numberFrom(pick(raw, ["price", "product.price", "offers.price", "data.price", "result.price"]));
  const shipping = numberFrom(pick(raw, ["shipping", "shippingPrice", "delivery.price", "data.shipping", "result.shipping"]));
  const delivery = pick(raw, ["delivery", "deliveryTime", "shippingTime", "data.delivery", "result.delivery"]);
  return {
    key, ...item, url, price, shipping, delivery: delivery || "Non disponibile",
    source, state: Number.isFinite(price) ? "live" : "unavailable",
    stateLabel: Number.isFinite(price) ? "Dato provider" : "Non disponibile",
    message: Number.isFinite(price) ? "" : "Il provider non ha restituito un prezzo verificabile."
  };
}

function baseResults() {
  return Object.entries(MARKETPLACES).map(([key, item]) => ({
    key, ...item, url: "", price: null, shipping: null, delivery: "Adapter non configurato",
    source: "Backend", state: "unavailable", stateLabel: "Non disponibile",
    message: key === "shein" ? "Configura RapidAPI SHEIN." : key === "temu" ? "Configura Apify Temu." : "Adapter opzionale non configurato."
  }));
}

async function rapidApiShein(input, env) {
  if (!env.RAPIDAPI_SHEIN_URL || !env.RAPIDAPI_KEY || !env.RAPIDAPI_HOST) {
    return { result: null, message: "Adapter SHEIN disabilitato: mancano RAPIDAPI_SHEIN_URL, RAPIDAPI_KEY o RAPIDAPI_HOST." };
  }
  const endpoint = new URL(env.RAPIDAPI_SHEIN_URL);
  endpoint.searchParams.set("url", input.url);
  endpoint.searchParams.set("country", input.country);
  endpoint.searchParams.set("postal_code", input.postalCode);
  const response = await fetch(endpoint, {
    headers: { "x-rapidapi-key": env.RAPIDAPI_KEY, "x-rapidapi-host": env.RAPIDAPI_HOST, accept: "application/json" }
  });
  if (!response.ok) return { result: null, message: `RapidAPI SHEIN ha risposto HTTP ${response.status}.` };
  const raw = await response.json();
  return { result: normalizeResult("shein", raw, "RapidAPI SHEIN", input.url), message: "" };
}

async function apifyTemu(input, env) {
  if (!env.APIFY_TEMU_ACTOR_ID || !env.APIFY_TOKEN) {
    return { result: null, message: "Adapter Temu disabilitato: mancano APIFY_TEMU_ACTOR_ID o APIFY_TOKEN." };
  }
  let actorInput = {};
  try { actorInput = env.APIFY_TEMU_INPUT_JSON ? JSON.parse(env.APIFY_TEMU_INPUT_JSON) : {}; } catch {
    return { result: null, message: "APIFY_TEMU_INPUT_JSON non è JSON valido." };
  }
  const endpoint = `${env.APIFY_API_BASE_URL || "https://api.apify.com"}/v2/acts/${encodeURIComponent(env.APIFY_TEMU_ACTOR_ID)}/run-sync-get-dataset-items`;
  const response = await fetch(`${endpoint}?token=${encodeURIComponent(env.APIFY_TOKEN)}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ ...actorInput, url: input.url, country: input.country, postalCode: input.postalCode })
  });
  if (!response.ok) return { result: null, message: `Apify Temu ha risposto HTTP ${response.status}.` };
  const raw = await response.json();
  const first = Array.isArray(raw) ? raw[0] : raw;
  return { result: normalizeResult("temu", first || {}, "Apify Temu", input.url), message: "" };
}

async function compare(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.url !== "string" || typeof body.country !== "string" || typeof body.postalCode !== "string") {
    return json({ error: "Richiesta non valida: servono url, country e postalCode." }, 400, env);
  }
  const marketplace = marketplaceFromUrl(body.url);
  if (!marketplace) return json({ error: "URL non appartenente a un marketplace supportato." }, 422, env);
  if (body.country !== "IT" || !/^\d{5}$/.test(body.postalCode)) {
    return json({ error: "Sono supportati paese IT e CAP italiano di cinque cifre." }, 422, env);
  }
  const input = { url: body.url, country: body.country, postalCode: body.postalCode };
  const results = baseResults();
  let providerMessage = "";
  try {
    const response = marketplace === "shein" ? await rapidApiShein(input, env)
      : marketplace === "temu" ? await apifyTemu(input, env)
        : { result: null, message: `Adapter ${MARKETPLACES[marketplace].name} non configurato: usa l'estensione browser come fallback.` };
    const index = results.findIndex((item) => item.key === marketplace);
    if (response.result) results[index] = response.result;
    else results[index].message = response.message;
    providerMessage = response.message || "";
  } catch (error) {
    const index = results.findIndex((item) => item.key === marketplace);
    results[index].message = `Errore provider: ${error.message || "richiesta fallita"}`;
    providerMessage = results[index].message;
  }
  return json({
    results,
    message: providerMessage || "Il provider ha restituito un risultato. Verifica il prezzo al checkout.",
    meta: { marketplace, country: body.country, postalCode: body.postalCode, generatedAt: new Date().toISOString() }
  }, 200, env);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(env) });
    const url = new URL(request.url);
    if (url.pathname === "/api/health" && request.method === "GET") return json({ ok: true, service: "markettochiaro-worker" }, 200, env);
    if (url.pathname === "/api/compare" && request.method === "POST") return compare(request, env);
    return json({ error: "Not found" }, 404, env);
  }
};
