# Gestione spese by Ezio

Web app per dividere spese di gruppo, conoscere i bilanci e vedere dove si è speso. È una PWA statica ospitabile su GitHub Pages, con dati condivisi in un progetto Supabase.

## Funzioni

- Accesso automatico senza account: ogni dispositivo ha un'identità privata. Con il link d'invito e il nome si entra nel gruppo; chi crea il gruppo può rinnovare il link. Google è disponibile come accesso facoltativo dopo la configurazione OAuth.
- Spese visibili in tempo reale ai membri del gruppo. Ogni partecipante inserisce e modifica le proprie spese; l'amministratore può intervenire su tutte.
- Chi ha creato il gruppo può eliminarlo dalla scheda Partecipanti digitandone il nome. La cancellazione rimuove definitivamente spese, partecipanti e cronologia.
- Cronologia di aggiunte, modifiche, eliminazioni e ripristini con autore e orario del server.
- Divisione delle spese tra i partecipanti scelti e calcolo dei bilanci.
- Grafico ad anello con importi e percentuali per categoria, comprese le voci personalizzate di "Altro", filtri per periodo e pagatore, esportazione CSV e PNG e stampa PDF.

## Avvio

Una volta attivato l'accesso anonimo e applicata la [migrazione](supabase/migrations/20260924_invite_first.sql) su Supabase, apri [l'app pubblicata](https://ezio59.github.io/Gestione-spese-by-Ezio/), crea un gruppo e condividi il link d'invito con gli altri partecipanti. Non serve un account GitHub. Google può essere attivato separatamente, seguendo [SETUP.md](SETUP.md); per i gruppi creati con la versione precedente resta il recupero tramite GitHub. La configurazione pubblica è in `config.js`; [`supabase/schema.sql`](supabase/schema.sql) serve per un nuovo progetto, non va riapplicato al progetto esistente. Non caricare chiavi segrete nel sito.

Per provare in locale: `python3 -m http.server 8000`, poi apri `http://localhost:8000`. Per verificare i calcoli: `node --test tests/finance.test.mjs`.

La nuova app inizia con zero spese. I dati della precedente versione locale non vengono trasferiti.
