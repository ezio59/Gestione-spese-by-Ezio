# Nuova app condivisa

La nuova app non importa le spese della versione locale. [Apri l'app](https://ezio59.github.io/Gestione-spese-by-Ezio/) e crea un gruppo indicando il tuo nome. GitHub Pages ospita l'interfaccia; il progetto Supabase `gestione-spese-ezio` a Francoforte conserva le spese, gestisce gli accessi e invia gli aggiornamenti in tempo reale. Lo schema in [`supabase/schema.sql`](supabase/schema.sql) e la [migrazione](supabase/migrations/20260924_invite_first.sql) vanno applicati in quest'ordine su un progetto nuovo. `config.js` contiene solo l'URL e la chiave pubblicabile; non salvare nel repository chiavi segrete.

## Identità e accesso

L'accesso senza account richiede **Authentication → Sign In / Providers → Anonymous Sign-Ins** attivo su Supabase. Ogni browser riceve un'identità privata: chi entra con il link e il proprio nome diventa membro del gruppo. Il link è un segreto da inviare solo agli invitati; l'amministratore può rinnovarlo. Cambiando browser o cancellando i dati del sito si perde l'identità anonima e, con essa, l'accesso ai propri gruppi. Non usare il pulsante di uscita di Supabase su quell'identità.

L'accesso GitHub resta disponibile nella voce **Hai già un gruppo collegato a GitHub?** per recuperare i gruppi creati in precedenza. L'app OAuth **Gestione spese by Ezio** ha homepage `https://ezio59.github.io/Gestione-spese-by-Ezio/` e callback `https://xgtreqiunwbiqihfxoiv.supabase.co/auth/v1/callback`. Il client secret resta soltanto nei servizi GitHub e Supabase.

Il Site URL e il redirect consentito sono impostati sul sito GitHub Pages. Le credenziali OAuth non devono essere copiate nel repository.

L'accesso Google è facoltativo. Per attivarlo servono un progetto Google Cloud e un client OAuth **Applicazione web**: aggiungi `https://ezio59.github.io` alle origini JavaScript autorizzate e `https://xgtreqiunwbiqihfxoiv.supabase.co/auth/v1/callback` agli URI di reindirizzamento autorizzati. Nella schermata di consenso configura gli utenti ammessi secondo le opzioni di Google. Copia **Client ID e Client Secret soltanto** in **Supabase Authentication → Sign In / Providers → Google** e abilita il provider. Attiva anche **Allow manual linking** in **Sign In / Providers**, necessario per collegare Google a un gruppo già creato senza account. Infine imposta `googleEnabled: true` in `config.js`; non inserire il secret in quel file o su GitHub.

Da un browser che ha già un gruppo, scegli **Collega Google a questi gruppi** per conservare l'identità e i dati: Supabase collega Google allo stesso utente. Da un altro browser scegli **Accedi con Google** per ritrovare i gruppi collegati. Se l'account Google era già in uso, il collegamento può non riuscire: il pulsante di recupero consente di entrare nell'account esistente, ma non sposta automaticamente i gruppi dell'identità anonima. La vecchia modalità GitHub resta disponibile per recuperare i gruppi creati in precedenza.

## Prima prova con un altro partecipante

1. Usa [l'app pubblicata](https://ezio59.github.io/Gestione-spese-by-Ezio/) da due browser separati. Il primo crea il gruppo e condivide il link dalla sezione **Partecipanti**; il secondo inserisce il proprio nome ed entra con l'invito.
2. Aggiungi una spesa da un account: l'altro deve vederla senza ricaricare. Prova un'aggiunta anche dal secondo account. Ognuno può modificare ed eliminare le proprie spese; l'amministratore può intervenire su tutte.
3. Controlla autore e orario nella cronologia, ripristino dopo eliminazione, bilanci, percentuali per categoria ed esportazioni CSV, PNG e PDF mediante stampa.

La versione precedente è stata provata con un account GitHub e due schede. La nuova modalità con identità anonime va provata da due browser separati prima di usarla per spese importanti.

Il piano gratuito consente di cominciare senza costi, ma Supabase può sospendere il progetto dopo una settimana di scarsa attività. Se questo causa interruzioni per il gruppo, valuta Pro (da 25 USD al mese) che evita la sospensione. Verifica sempre il prezzo corrente prima di un cambio di piano.
