# Gestione spese by Ezio

Web app per dividere spese di gruppo, conoscere i bilanci e vedere dove si è speso. È una PWA statica ospitabile su GitHub Pages, con dati condivisi in un progetto Supabase.

## Funzioni

- Accesso personale con GitHub; partecipazione al gruppo su invito e approvazione dell'amministratore.
- Spese visibili in tempo reale ai membri approvati. Ogni partecipante inserisce e modifica le proprie spese; l'amministratore può intervenire su tutte.
- Cronologia di aggiunte, modifiche, eliminazioni e ripristini con autore e orario del server.
- Divisione delle spese tra i partecipanti scelti e calcolo dei bilanci.
- Grafico ad anello con importi e percentuali per categoria, filtri per periodo e pagatore, esportazione CSV e PNG e stampa PDF.

## Avvio

Apri [l'app pubblicata](https://ezio59.github.io/Gestione-spese-by-Ezio/) e accedi con GitHub. Il collegamento OAuth è già attivo. Crea un gruppo, poi condividi il suo link d'invito con gli altri partecipanti e approva le loro richieste. Per dettagli e controlli consulta [SETUP.md](SETUP.md). La configurazione pubblica è in `config.js`; lo schema [`supabase/schema.sql`](supabase/schema.sql) è già applicato. Non caricare chiavi segrete nel sito.

Per provare in locale: `python3 -m http.server 8000`, poi apri `http://localhost:8000`. Per verificare i calcoli: `node --test tests/finance.test.mjs`.

La nuova app inizia con zero spese. I dati della precedente versione locale non vengono trasferiti.
