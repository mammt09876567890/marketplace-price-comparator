# MercatoChiaro

Comparatore statico e locale per prezzi e spedizioni di **AliExpress, SHEIN, Alibaba e Temu**, pensato per una destinazione in Italia. Il progetto parte senza API a pagamento: l’interfaccia funziona subito con dati demo e può importare, tramite un’estensione Chrome opzionale, informazioni già visibili nelle pagine aperte nel browser.

> **Trasparenza:** questo progetto non promette un prezzo reale o completo. Il totale al checkout resta la fonte di verità. Non elude CAPTCHA, sistemi anti-bot, login, paywall o termini d’uso dei marketplace.

## Funzionalità

- Frontend vanilla HTML/CSS/JavaScript, senza build e senza dipendenze.
- Input per URL prodotto, paese e CAP italiano.
- Quattro schede di confronto con prezzo prodotto, spedizione, consegna e stato del dato.
- Dati demo inclusi per provare l’esperienza immediatamente.
- Connettore Chrome Manifest V3 opzionale per una cattura **manuale** della pagina corrente.
- Dati del connettore salvati in `chrome.storage.local`; nessun backend e nessuna chiave segreta.
- Workflow GitHub Actions per pubblicare il sito su GitHub Pages.

## Avvio locale

È sufficiente servire la cartella con un server statico. Ad esempio, con Python:

```bash
python -m http.server 8000
```

Apri <http://localhost:8000>. È preferibile un server rispetto a `file://` perché i browser applicano restrizioni diverse ai file locali.

## Pubblicazione su GitHub Pages

1. Crea o usa un repository GitHub e porta il contenuto sul branch `main`.
2. In **Settings → Pages**, seleziona **GitHub Actions** come source.
3. Il workflow `.github/workflows/pages.yml` pubblica la root del repository a ogni push su `main`.
4. Attendi il completamento dell’azione e apri l’URL indicato nell’environment `github-pages`.

Il workflow non usa segreti applicativi. Il token `GITHUB_TOKEN` è quello temporaneo gestito da GitHub Actions.

## Caricamento dell’estensione Chrome

1. Apri `chrome://extensions`.
2. Attiva **Modalità sviluppatore**.
3. Seleziona **Carica estensione non pacchettizzata**.
4. Scegli la cartella `extension/`.
5. Apri una pagina prodotto supportata su AliExpress, SHEIN, Alibaba o Temu.
6. Premi **Cattura per MercatoChiaro** nel pulsante visualizzato in basso a destra.
7. Torna al sito del comparatore e premi **Importa catture locali**.

L’estensione dichiara permessi limitati ai quattro marketplace e alle origini GitHub Pages/localhost per il ponte locale. Non effettua navigazione automatica, richieste in background, login, click su CAPTCHA o tentativi di aggirare protezioni. Legge solo JSON-LD e selettori di testo presenti nella pagina; un sito può quindi restituire dati incompleti o nessun dato.

## Utilizzo

1. Inserisci un URL pubblico e un CAP italiano di cinque cifre.
2. Premi **Confronta ora**. Un URL riconosciuto cambia solo il messaggio informativo: senza cattura locale le schede rimangono demo/stimate.
3. Usa **Usa un esempio** per vedere il flusso senza navigare su un marketplace.
4. Con l’estensione, importa le catture e controlla l’etichetta **Letto dalla pagina**.
5. Apri sempre il marketplace e verifica prezzo, valuta, disponibilità, IVA, dazi, coupon e spedizione al checkout.

## Limiti tecnici e dati mancanti

- I prezzi possono essere regionali, dinamici, personalizzati o visibili solo dopo interazioni.
- Il CAP non viene inviato automaticamente ai marketplace: serve a documentare la destinazione del confronto, non calcola da solo la spedizione.
- Alibaba spesso richiede una quotazione o una trattativa: il risultato può essere “Non disponibile”.
- La spedizione gratuita mostrata da una pagina non garantisce tempi o condizioni.
- Se il marketplace cambia HTML, selettori o dati strutturati, l’adapter può smettere di leggere il valore.
- Nessun confronto viene eseguito lato server e non esiste sincronizzazione tra dispositivi.

## Privacy

Il frontend non invia il CAP o l’URL a un server controllato dal progetto. Le catture dell’estensione sono memorizzate nell’area locale dell’estensione (`chrome.storage.local`). Il browser e il marketplace visitato possono applicare le proprie politiche di rete, cookie e privacy: consultale separatamente. Usa **Svuota catture** o rimuovi l’estensione per cancellare i dati locali.

## Troubleshooting

**Vedo solo dati demo.** È il comportamento normale finché non catturi una pagina supportata e premi **Importa catture locali**.

**Il pulsante dell’estensione non appare.** Controlla che l’estensione sia caricata, che l’URL sia uno dei quattro marketplace e che la pagina sia stata ricaricata dopo l’installazione. Alcune pagine possono impedire l’iniezione dei content script.

**Il prezzo è vuoto o sbagliato.** Il connettore non interpreta varianti, coupon o contenuti protetti. Verifica il valore visibile e il checkout; non cercare di bypassare la protezione.

**GitHub Pages mostra una pagina vuota.** Controlla il log di `.github/workflows/pages.yml`, che Pages usi **GitHub Actions**, e che `index.html` sia nella root pubblicata.

## Struttura

```text
.
├── index.html
├── styles.css
├── app.js
├── extension/
│   ├── manifest.json
│   └── content.js
└── .github/workflows/pages.yml
```

## Licenza e contributi

Il repository è una base iniziale. Prima di aggiungere adapter o automazioni, verifica sempre i termini del sito interessato, minimizza i permessi e mantieni esplicita l’incertezza del dato. Non aggiungere chiavi API, cookie, credenziali o dati personali al repository.
