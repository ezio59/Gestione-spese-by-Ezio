# Nuova app condivisa

La nuova app non importa le spese della versione locale. [Apri l'app](https://ezio59.github.io/Gestione-spese-by-Ezio/) e crea un gruppo indicando il tuo nome. GitHub Pages ospita l'interfaccia; il progetto Supabase `gestione-spese-ezio` a Francoforte conserva le spese, gestisce gli accessi e invia gli aggiornamenti in tempo reale. Lo schema in [`supabase/schema.sql`](supabase/schema.sql) e la [migrazione](supabase/migrations/20260924_invite_first.sql) vanno applicati in quest'ordine su un progetto nuovo. `config.js` contiene solo l'URL e la chiave pubblicabile; non salvare nel repository chiavi segrete.

## Identità e accesso

L'accesso senza account richiede **Authentication → Sign In / Providers → Anonymous Sign-Ins** attivo su Supabase. Ogni browser riceve un'identità privata: chi entra con il link e il proprio nome diventa membro del gruppo. Il link è un segreto da inviare solo agli invitati; l'amministratore può rinnovarlo. Cambiando browser o cancellando i dati del sito si perde l'identità anonima e, con essa, l'accesso ai propri gruppi. Non usare il pulsante di uscita di Supabase su quell'identità.

L'accesso GitHub resta disponibile nella voce **Hai già un gruppo collegato a GitHub?** per recuperare i gruppi creati in precedenza. L'app OAuth **Gestione spese by Ezio** ha homepage `https://ezio59.github.io/Gestione-spese-by-Ezio/` e callback `https://xgtreqiunwbiqihfxoiv.supabase.co/auth/v1/callback`. Il client secret resta soltanto nei servizi GitHub e Supabase.

Il Site URL e il redirect consentito sono impostati sul sito GitHub Pages. Le credenziali OAuth non devono essere copiate nel repository.

Per recuperare un'identità su più dispositivi in futuro servirà un metodo di accesso esplicito. La vecchia modalità GitHub è disponibile; per Google servono un progetto Google Cloud e le sue credenziali OAuth.

## Prima prova con un altro partecipante

1. Usa [l'app pubblicata](https://ezio59.github.io/Gestione-spese-by-Ezio/) da due browser separati. Il primo crea il gruppo e condivide il link dalla sezione **Partecipanti**; il secondo inserisce il proprio nome ed entra con l'invito.
2. Aggiungi una spesa da un account: l'altro deve vederla senza ricaricare. Prova un'aggiunta anche dal secondo account. Ognuno può modificare ed eliminare le proprie spese; l'amministratore può intervenire su tutte.
3. Controlla autore e orario nella cronologia, ripristino dopo eliminazione, bilanci, percentuali per categoria ed esportazioni CSV, PNG e PDF mediante stampa.

La versione precedente è stata provata con un account GitHub e due schede. La nuova modalità con identità anonime va provata da due browser separati prima di usarla per spese importanti.

Il piano gratuito consente di cominciare senza costi, ma Supabase può sospendere il progetto dopo una settimana di scarsa attività. Se questo causa interruzioni per il gruppo, valuta Pro (da 25 USD al mese) che evita la sospensione. Verifica sempre il prezzo corrente prima di un cambio di piano.
