# MercatoChiaro

Comparatore statico e locale per prezzi e spedizioni di **AliExpress, SHEIN, Alibaba e Temu**, con un backend opzionale serverless. Il frontend GitHub Pages non contiene chiavi: invia URL, paese e CAP al Cloudflare Worker configurato. Se il backend o un provider non sono disponibili, l’interfaccia mostra uno stato esplicito e non inventa prezzi. L’estensione Chrome resta il fallback per catture manuali.

> **Trasparenza:** il prezzo finale al checkout è sempre la fonte di verità. Il progetto non elude CAPTCHA, sistemi anti-bot, login, paywall o termini d’uso dei marketplace.

## Architettura

- **Frontend:** `index.html`, `styles.css`, `app.js`, pubblicati su GitHub Pages.
- **Backend:** Cloudflare Worker in `worker/src/index.js`; le chiavi restano nei secret del Worker.
- **RapidAPI SHEIN:** adapter configurabile con endpoint e host scelti dal tuo account RapidAPI.
- **Apify Temu:** adapter configurabile con actor ID e input JSON dell’actor scelto.
- **AliExpress/Alibaba:** adapter volutamente disabilitati; usa l’estensione manuale finché non viene aggiunto un endpoint verificato.
- **Estensione:** `extension/`, Manifest V3, cattura manuale di dati già visibili/JSON-LD.

Il Worker normalizza solo campi prezzo riconoscibili. Una risposta provider senza prezzo verificabile diventa **Non disponibile**, non un valore demo.
Con un solo URL il Worker interroga il provider relativo a quel marketplace; le altre schede restano non disponibili. Per confrontare più vetrine servono URL separati e più richieste, oppure catture manuali dall’estensione.

## Avvio frontend locale

```bash
python -m http.server 8000
```

Apri <http://localhost:8000>. `api-config.js` è intenzionalmente vuoto nel repository:

```js
window.MPC_CONFIG = { apiBaseUrl: "" };
```

Per collegare un Worker locale o remoto, inserisci solo il suo URL pubblico, mai una chiave:

```js
window.MPC_CONFIG = {
  apiBaseUrl: "https://mercatochiaro-api.<account>.workers.dev"
};
```

La demo si attiva soltanto con **Usa un esempio**. In assenza di backend il pulsante **Confronta ora** non mostra risultati fittizi.

## Backend Cloudflare Worker

Cloudflare Workers ha un piano gratuito con limiti che possono cambiare: controlla sempre la pagina prezzi e i limiti del tuo account. Il progetto non richiede un database.

### 1. Account e CLI

1. Crea un account Cloudflare gratuito.
2. Installa Node.js LTS e Wrangler:

```bash
npm install -g wrangler
wrangler login
```

3. Entra nella cartella:

```bash
cd worker
copy wrangler.toml.example wrangler.toml
```

Su macOS/Linux usa `cp wrangler.toml.example wrangler.toml`.

### 2. Configura gli adapter

Modifica `worker/wrangler.toml`:

- `ALLOWED_ORIGIN`: l’origine GitHub Pages, per esempio `https://tuo-account.github.io`. Per test locali usa `http://localhost:8000`.
- `RAPIDAPI_SHEIN_URL`: endpoint esatto dell’API SHEIN scelto nel catalogo RapidAPI.
- `RAPIDAPI_HOST`: valore `X-RapidAPI-Host` indicato da RapidAPI.
- `APIFY_TEMU_ACTOR_ID`: ID dell’actor Temu che hai scelto.
- `APIFY_TEMU_INPUT_JSON`: input JSON base richiesto da quell’actor.

Gli endpoint RapidAPI e gli actor Apify non hanno tutti lo stesso schema. Per questo sono configurabili e il normalizzatore accetta soltanto `price`, `product.price`, `offers.price`, `data.price` o `result.price`. Se l’actor usa un altro schema, va aggiornato l’adapter dopo aver verificato la documentazione dell’actor; non va simulato il risultato.

### 3. Crea i secret

```bash
wrangler secret put RAPIDAPI_KEY
wrangler secret put APIFY_TOKEN
```

Incolla i valori solo nel prompt di Wrangler. Non inserirli in `wrangler.toml`, `.dev.vars`, `api-config.js`, HTML o issue/commit.

Per test locali:

```bash
copy .dev.vars.example .dev.vars
wrangler dev
```

`.dev.vars` è ignorato da Git tramite le regole locali del progetto? Se il repository non contiene ancora un `.gitignore`, non committarlo comunque e aggiungi una regola locale prima di lavorare in team.

### 4. Deploy

```bash
wrangler deploy
```

Il Worker espone:

- `GET /api/health`
- `POST /api/compare` con `{ "url": "...", "country": "IT", "postalCode": "00100" }`

Configura quindi `api-config.js` con l’URL `workers.dev`, fai commit del solo URL pubblico e pubblica di nuovo Pages.

## Account gratuiti e limiti provider

**RapidAPI:** crea un account, scegli un’API SHEIN con piano free attivo e copia endpoint/host dalla pagina dell’API. Il piano gratuito può avere richieste giornaliere o mensili limitate e può richiedere carta o verifica: non dipende dal codice. Quando la quota termina, la UI mostra l’errore HTTP del provider.

**Apify:** crea un account gratuito, scegli un actor Temu che dichiari chiaramente input, output e condizioni d’uso, poi copia actor ID e token. Gli actor consumano compute units e possono avere limiti del piano free. L’endpoint sincrono può scadere o rispondere con errore; in quel caso nessun prezzo viene inventato.

**Marketplace:** prezzi, disponibilità, IVA, coupon, dazi e spedizione possono dipendere da account, cookie, variante e destinazione. Verifica sempre il checkout. Non aumentare frequenza, non aggirare protezioni e non usare actor/provider contro i loro termini.

## Deploy GitHub Pages

1. In **Settings → Pages**, seleziona **GitHub Actions**.
2. Il workflow `.github/workflows/pages.yml` pubblica la root a ogni push su `main`.
3. Imposta `api-config.js` con il solo URL pubblico del Worker.
4. Verifica l’URL mostrato nell’environment `github-pages`.

Il workflow usa solo `GITHUB_TOKEN` temporaneo e non contiene segreti provider.

## Estensione browser fallback

1. Apri `chrome://extensions`.
2. Attiva **Modalità sviluppatore**.
3. Seleziona **Carica estensione non pacchettizzata** e scegli `extension/`.
4. Apri una pagina prodotto supportata.
5. Premi **Cattura per MercatoChiaro**, poi nel sito premi **Importa catture locali**.

La cattura è manuale e limitata a JSON-LD/selettori presenti nella pagina. I dati restano in `chrome.storage.local`; non vengono fatte richieste automatiche, login o azioni su CAPTCHA. AliExpress e Alibaba sono utilizzabili principalmente con questo fallback in questa versione.

## Privacy e sicurezza

- Le chiavi RapidAPI/Apify non arrivano mai al browser.
- Il frontend invia al Worker URL, paese e CAP; il Worker li inoltra al provider configurato.
- Il Worker non salva richieste o risultati in un database.
- `api-config.js` contiene solo un URL pubblico.
- Le catture dell’estensione restano nella memoria locale del browser.
- Limita `ALLOWED_ORIGIN` all’origine Pages reale in produzione.
- Non mettere token, cookie, URL firmati o dati personali in commit, log o screenshot.

## Troubleshooting

**“Backend non configurato”.** Imposta `apiBaseUrl` in `api-config.js` con il Worker pubblico.

**“Adapter disabilitato”.** Mancano variabili Worker. Controlla `wrangler.toml`, poi esegui `wrangler secret put` per i token.

**HTTP 401/403/429 dal provider.** Token, endpoint, piano o quota sono errati/esauriti. Controlla il pannello del provider; non inserire il token nel frontend.

**Risposta 200 ma prezzo non disponibile.** Lo schema dell’endpoint/actor non espone uno dei campi riconosciuti. Verifica la risposta del provider e aggiorna l’adapter in modo documentato.

**Il pulsante estensione non appare.** Ricarica l’estensione e la pagina; alcuni contenuti o policy del marketplace possono impedire l’iniezione.

**Pages non aggiorna.** Controlla il workflow `Deploy static site to GitHub Pages` e che Pages usi GitHub Actions.

## Struttura

```text
.
├── index.html
├── api-config.js
├── styles.css
├── app.js
├── extension/
│   ├── manifest.json
│   └── content.js
├── worker/
│   ├── src/index.js
│   ├── wrangler.toml.example
│   ├── .dev.vars.example
│   └── README.md
└── .github/workflows/pages.yml
```
