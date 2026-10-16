# Backend Cloudflare Worker

Il Worker espone:

- `GET /api/health`
- `POST /api/compare` con `{ "url": "...", "country": "IT", "postalCode": "00100" }`

Le chiavi dei provider restano nei secret Cloudflare. Il browser conosce solo l’URL pubblico del Worker.

## Setup rapido

```bash
npm install -g wrangler
cd worker
wrangler login
copy wrangler.toml.example wrangler.toml
wrangler secret put RAPIDAPI_KEY
wrangler secret put APIFY_TOKEN
wrangler deploy
```

Imposta poi `api-config.js` nella root con:

```js
window.MPC_CONFIG = { apiBaseUrl: "https://mercatochiaro-api.<account>.workers.dev" };
```

Non committare `wrangler.toml`, `.dev.vars` o valori secret.

## Adapter

### RapidAPI SHEIN

Configura `RAPIDAPI_SHEIN_URL` con l’endpoint del prodotto SHEIN scelto nel tuo account RapidAPI e `RAPIDAPI_HOST` con l’host indicato dalla pagina dell’API. Il Worker invia `url`, `country` e `postal_code` come query parameter. La risposta viene normalizzata solo se contiene campi prezzo riconoscibili (`price`, `product.price`, `offers.price`, `data.price` o `result.price`); altrimenti la UI mostra “Non disponibile”.

### Apify Temu

Scegli un actor Apify Temu che rispetti i termini del servizio, imposta il suo ID in `APIFY_TEMU_ACTOR_ID` e il JSON di input base in `APIFY_TEMU_INPUT_JSON`. Il Worker usa l’endpoint ufficiale `run-sync-get-dataset-items` e aggiunge URL, paese e CAP. Poiché ogni actor ha uno schema diverso, non viene simulato alcun risultato se il dataset non espone campi prezzo riconoscibili.

AliExpress e Alibaba sono volutamente disabilitati in questa versione: usa l’estensione browser per la cattura manuale. Non vengono chiamati endpoint inventati.

## Test locale

```bash
copy .dev.vars.example .dev.vars
wrangler dev
```

Esempio:

```bash
curl -X POST http://localhost:8787/api/compare ^
  -H "content-type: application/json" ^
  -d "{\"url\":\"https://www.temu.com/example.html\",\"country\":\"IT\",\"postalCode\":\"00100\"}"
```
