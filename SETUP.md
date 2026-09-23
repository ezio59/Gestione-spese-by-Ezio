# Attivare la versione condivisa

Questa versione conserva GitHub Pages come sito pubblico e usa un progetto Supabase separato per l'accesso, i dati e gli aggiornamenti in tempo reale. **Non sostituire la versione pubblicata finché non hai provato due account e salvato una copia delle vecchie spese.** Il file `config.js` non contiene ancora le credenziali pubbliche del progetto, quindi mostra la schermata di configurazione.

## 1. Prima salva le spese esistenti

Pubblica prima il piccolo aggiornamento preparato nel ramo **`feat/local-backup`**: aggiunge il pulsante **Scarica backup JSON** alla vecchia app, senza cambiarne il funzionamento. Su ogni telefono o computer che contiene spese locali, apri e aggiorna l'app nel browser in cui l'avevi usata e scarica il JSON. Se usavi l'app aggiunta alla schermata Home dell'iPhone, esegui il backup da quell'app installata: Safari potrebbe avere uno spazio dati separato. La nuova versione contiene anche `backup.html` come pagina di emergenza nello stesso sito e mostra il pulsante di backup. I vecchi dati restano in `localStorage` finché non vengono cancellati manualmente. Ogni dispositivo potrebbe avere dati diversi: raccogli i backup prima di scegliere quale importare. L'importazione di un file non fonde automaticamente spese simili provenienti da altri dispositivi.

## 2. Crea il progetto online

1. Crea un progetto su [Supabase](https://supabase.com/dashboard), scegliendo tu la regione e il piano.
2. Nel suo SQL Editor esegui **una volta** [`supabase/schema.sql`](supabase/schema.sql) su un progetto nuovo. Lo script crea tabelle private, regole di accesso, funzioni di modifica e cronologia, nonché le sottoscrizioni in tempo reale.
3. In Authentication → Providers attiva Google. Segui la [guida ufficiale](https://supabase.com/docs/guides/auth/social-login/auth-google) per creare le credenziali OAuth in Google Cloud. Se vuoi usare anche i link via email per persone senza account Google, configura un tuo provider SMTP: il servizio email predefinito è adatto soltanto alle prove e ha limiti severi.
4. In Authentication → URL Configuration imposta il Site URL del sito pubblicato e aggiungi il suo URL esatto tra i redirect consentiti. Usa l'URL del sito GitHub Pages finché non scegli un dominio diverso.
5. In Project Settings → API copia il **Project URL** e la **publishable key** in `config.js`. Non inserire mai la chiave `service_role` o una chiave segreta nel sito.

Per lo sviluppo locale usa un redirect locale distinto. Le regole di accesso sul database restano indispensabili: la publishable key sarà leggibile da chi visita il sito.

## 3. Verifica prima della pubblicazione

1. Esegui `python3 -m http.server 8000` nella cartella del progetto, poi apri `http://localhost:8000` sul PC.
2. Accedi con due account diversi. Il primo crea un gruppo e copia il link da **Partecipanti**. Il secondo chiede di partecipare con il link. Il primo controlla l'indirizzo email e approva la richiesta.
3. Inserisci una spesa da un account: l'altro deve vederla senza ricaricare. Verifica poi che il secondo non possa modificare o eliminare la spesa del primo. Prova modifica, eliminazione e ripristino dall'account autore.
4. Controlla importi, categorie, percentuali, bilanci, CSV, PNG e stampa/salvataggio PDF. Verifica la cronologia da entrambi gli account.
5. Solo dopo queste prove pubblica i file su GitHub Pages e ripeti la verifica su iPhone e PC. I file CSS/JS vengono aggiornati dal service worker con strategia prima rete per evitare che l'app installata continui a mostrare il vecchio codice.

## 4. Importa le vecchie spese

1. Crea il gruppo, invita e approva tutti i partecipanti cui intendi associare i nomi dei vecchi dati.
2. Nella sezione **Partecipanti**, l'amministratore seleziona il backup JSON, controlla l'associazione di ogni nome a un account e avvia l'importazione.
3. Le spese importate conservano data, importo, pagatore e persone che hanno condiviso la spesa. La categoria iniziale è **Altro**, perché la vecchia app non la registrava. Modificala per avere percentuali corrette.
4. L'app registra l'amministratore come **autore dell'importazione** nel momento reale dell'importazione; la vecchia app non conservava un'identità verificabile dell'autore originario. Il campo pagatore resta quello indicato nel vecchio file.
5. Conserva il JSON originale finché hai confrontato il numero di spese e i bilanci. Riprovare lo stesso backup non duplica le spese già importate. Evita invece di importare due backup diversi che contengono le stesse spese.

## Accesso e costi

L'accesso con un account personale e l'approvazione dell'amministratore impediscono a chi non è membro di vedere il gruppo. L'autore può correggere o eliminare le proprie spese; l'amministratore può intervenire su tutte. La cronologia viene scritta dal database nella stessa operazione della modifica, con l'identità autenticata. Le eliminazioni sono recuperabili.

Il piano gratuito Supabase può essere messo in pausa per scarsa attività e non include i backup giornalieri consultabili del piano Pro. Mantieni un'esportazione periodica dei dati e controlla le condizioni aggiornate del piano scelto. Il PDF usa la funzione di stampa del dispositivo: dal dialogo scegli **Salva come PDF**.
