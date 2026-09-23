# Gestione spese by Ezio

Web app per dividere spese di gruppo, conoscere i bilanci e vedere dove si è speso. È una PWA statica ospitabile su GitHub Pages, con dati condivisi in un progetto Supabase privato.

## Funzioni

- Accesso personale con Google o link email; partecipazione al gruppo su invito e approvazione dell'amministratore.
- Spese visibili in tempo reale ai membri approvati. Chi ha inserito una spesa può modificarla, eliminarla e ripristinarla; l'amministratore può intervenire su tutte.
- Cronologia di aggiunte, modifiche, eliminazioni e ripristini, con autore e orario del server. I cambi di importo, descrizione, data e categoria mostrano i valori precedenti.
- Ripartizione in centesimi tra i partecipanti scelti e bilanci del gruppo.
- Riepilogo per categoria con grafico ad anello, importi, percentuali e filtri per periodo e pagatore. Esportazione CSV e PNG; PDF tramite la stampa del browser.
- Backup dei vecchi dati locali e importazione guidata nel gruppo dopo l'approvazione dei partecipanti.

## Avvio

La configurazione online è descritta in [SETUP.md](SETUP.md). Servono il Project URL e la **publishable key** Supabase in `config.js` e lo schema in [`supabase/schema.sql`](supabase/schema.sql). Non caricare chiavi segrete nel sito.

Per provare in locale: `python3 -m http.server 8000`, poi apri `http://localhost:8000`. Le verifiche dei calcoli si eseguono con `node --test tests/finance.test.mjs`.

La versione precedente salvava soltanto in `localStorage`. La nuova versione non elimina quei dati; prima di pubblicarla scarica un backup da ogni dispositivo che contiene spese.
