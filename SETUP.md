# Attivare la nuova app condivisa

La nuova app parte con un gruppo vuoto. Le spese precedenti non vengono importate e non serve scaricarle. GitHub Pages ospita l'interfaccia; un progetto Supabase conserva le spese, gestisce gli accessi e invia gli aggiornamenti in tempo reale. Finché `config.js` è vuoto, la nuova interfaccia mostra una schermata di configurazione.

## 1. Crea il progetto online

1. Crea un progetto su [Supabase](https://supabase.com/dashboard), scegliendo regione e piano.
2. Nel suo SQL Editor esegui [`supabase/schema.sql`](supabase/schema.sql) su un progetto nuovo. Lo script crea tabelle, regole di accesso, cronologia e sottoscrizioni in tempo reale.
3. In Authentication → Providers attiva Google e configura le credenziali OAuth seguendo la [guida ufficiale](https://supabase.com/docs/guides/auth/social-login/auth-google). Per usare anche il link via email con altri partecipanti, configura un tuo provider SMTP: quello predefinito è adatto solo alle prove.
4. In Authentication → URL Configuration imposta il Site URL su `https://ezio59.github.io/Gestione-spese-by-Ezio/` e aggiungi lo stesso indirizzo ai redirect consentiti. Per le prove locali aggiungi anche l'URL locale.
5. In Project Settings → API copia il **Project URL** e la **publishable key** in `config.js`. Non mettere mai chiavi segrete o `service_role` nel sito.

La publishable key è visibile nel browser. La protezione dei dati dipende dalle regole del database e dall'accesso personale.

## 2. Prova con due account

1. Avvia `python3 -m http.server 8000` nella cartella del progetto e apri `http://localhost:8000`.
2. Accedi con due account diversi. Il primo crea un gruppo nuovo e copia il link di invito dalla sezione **Partecipanti**. Il secondo chiede di partecipare. Il primo verifica l'email e approva la richiesta.
3. Il primo aggiunge una spesa: il secondo deve vederla senza ricaricare. Prova anche l'inserimento da parte del secondo. Ognuno può modificare ed eliminare le spese che ha creato; l'amministratore può intervenire su tutte.
4. Controlla le voci di cronologia con autore e orario, il ripristino di una spesa eliminata, i bilanci e le percentuali per categoria. Verifica CSV, PNG e PDF tramite la funzione **Stampa / salva PDF**.
5. Quando le prove riescono, pubblica i file su GitHub Pages e ripeti il controllo su telefono e computer.

## Uso del gruppo

Ogni persona accede con il proprio account e sceglie il suo nome nel gruppo. L'approvazione impedisce agli estranei di leggere le spese. Una spesa registra automaticamente chi l'ha inserita, modificata, eliminata o ripristinata, con l'orario del server. Il pagatore della nuova spesa è l'account che la inserisce; può includere altri partecipanti nella divisione.

Il progetto Supabase richiede manutenzione secondo il piano scelto. Il CSV esporta le spese visibili nel filtro corrente; il PNG esporta il riepilogo per categoria. Per ottenere il PDF, seleziona **Salva come PDF** nella finestra di stampa del dispositivo.
