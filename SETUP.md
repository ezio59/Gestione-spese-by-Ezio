# Nuova app condivisa

La nuova app parte con un gruppo vuoto. Le spese precedenti non vengono importate. GitHub Pages ospita l'interfaccia; il progetto Supabase `gestione-spese-ezio` a Francoforte conserva le spese, gestisce gli accessi e invia gli aggiornamenti in tempo reale. Lo schema in [`supabase/schema.sql`](supabase/schema.sql) è già stato applicato al progetto. `config.js` contiene solo il suo URL e la chiave pubblicabile; non salvare nel repository chiavi segrete.

## Accesso attivato

L'accesso GitHub usa l'app OAuth **Gestione spese by Ezio**, registrata nell'account GitHub del proprietario con homepage `https://ezio59.github.io/Gestione-spese-by-Ezio/` e callback `https://xgtreqiunwbiqihfxoiv.supabase.co/auth/v1/callback`. Il provider GitHub è stato abilitato su Supabase e verificato dopo un ricaricamento. Il client secret resta soltanto nei servizi GitHub e Supabase.

Il Site URL e il redirect consentito sono impostati sul sito GitHub Pages. Le credenziali OAuth non devono essere copiate nel repository.

Il servizio email predefinito di Supabase non consegna inviti a persone esterne al team del progetto: per questo la prima versione usa GitHub. Per aggiungere Google in futuro servono un progetto Google Cloud e le sue credenziali OAuth; per l'accesso via email serve un servizio SMTP esterno.

## Prova con due partecipanti

1. Prima della pubblicazione alla radice, usa la [pagina di prova](https://ezio59.github.io/Gestione-spese-by-Ezio/prova/) da due account GitHub personali. Il primo crea il gruppo e condivide il link dalla sezione **Partecipanti**; il secondo richiede l'accesso e il primo lo approva.
2. Aggiungi una spesa da un account: l'altro deve vederla senza ricaricare. Prova un'aggiunta anche dal secondo account. Ognuno può modificare ed eliminare le proprie spese; l'amministratore può intervenire su tutte.
3. Controlla autore e orario nella cronologia, ripristino dopo eliminazione, bilanci, percentuali per categoria ed esportazioni CSV, PNG e PDF mediante stampa.

Il piano gratuito consente di cominciare senza costi, ma Supabase può sospendere il progetto dopo una settimana di scarsa attività. Se questo causa interruzioni per il gruppo, valuta Pro (da 25 USD al mese) che evita la sospensione. Verifica sempre il prezzo corrente prima di un cambio di piano.
