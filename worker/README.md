# Backend Cloudflare Worker

Il Worker espone:

- `GET /api/health`
- `POST /api/compare` con `{ "url": "...", "country": "IT", "postalCode": "00100" }`

Le chiavi dei provider restano nei secret Cloudflare. Il browser conosce solo l’URL pubblico del Worker.

## Protezione privata con Cloudflare Access

Il Worker rifiuta ogni richiesta a `/api/compare` e `/api/health` se non presenta un JWT Cloudflare Access valido. Inoltre controlla firma RS256, issuer, audience, scadenza e `email` contro `ALLOWED_EMAILS`. Se le variabili Access non sono configurate, il Worker risponde **503**: non è considerato privato finché non completi questa procedura.

### Configurazione una tantum Zero Trust

1. Nel dashboard Cloudflare apri **Zero Trust → Settings → Custom Pages** e verifica il team domain. Il valore da usare è, ad esempio, `https://nome-team.cloudflareaccess.com`.
2. Vai in **Zero Trust → Access → Applications → Add an application → Self-hosted**.
3. Inserisci come hostname il dominio pubblico del Worker, ad esempio `mercatochiaro-api.tuo-account.workers.dev`. Non proteggere solo GitHub Pages: l’API deve essere protetta direttamente.
4. Crea una policy **Allow** con il tuo identity provider (Google/GitHub/One-time PIN). Nel campo **Selector** aggiungi solo il tuo indirizzo email. Non usare una password condivisa.
5. Salva l’application e copia il suo **Application audience (AUD)** dalla sezione Access. È il valore per `CF_ACCESS_AUDIENCE`.
6. Imposta le variabili nel Worker:

```bash
wrangler secret put RAPIDAPI_KEY
wrangler secret put APIFY_TOKEN
```

Le tre variabili Access non sono segreti e vanno in `wrangler.toml` o nel pannello Variables:

```toml
CF_ACCESS_TEAM_DOMAIN = "https://nome-team.cloudflareaccess.com"
CF_ACCESS_AUDIENCE = "il-tuo-application-audience"
ALLOWED_EMAILS = "tuo.nome@example.com"
ALLOWED_ORIGIN = "https://tuo-account.github.io"
```

`ALLOWED_EMAILS` può contenere più indirizzi separati da virgola, ma per il requisito “solo il proprietario” inserisci una sola email. Dopo la modifica esegui `wrangler deploy`.

7. Imposta `api-config.js` con il solo URL pubblico del Worker e pubblica il frontend.
8. Testa in una finestra anonima: senza login il confronto deve rispondere 401/redirect Access; con un account non allowlisted deve rispondere 403; con la tua email deve passare la validazione JWT.

Il frontend usa `credentials: "include"` per inviare il cookie `CF_Authorization` al Worker. Per questo `ALLOWED_ORIGIN` deve essere l’origine esatta di GitHub Pages, senza slash finale, e il Worker deve avere CORS con credenziali. Non copiare JWT o cookie nel codice.

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
