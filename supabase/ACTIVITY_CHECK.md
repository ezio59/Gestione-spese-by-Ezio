# Controllo periodico del database (piano gratuito)

Questo controllo è facoltativo e non garantisce che Supabase eviti la sospensione: la decisione dipende dalle regole di attività di Supabase. Non sostituisce il piano Pro per una disponibilità continua.

1. Nel progetto Supabase `gestione-spese-ezio`, eseguire una sola volta `supabase/healthcheck.sql` nel SQL Editor. La funzione restituisce sempre `1` e non legge le spese.
2. Inserire `.github/workflows/supabase-activity.yml` nel ramo predefinito di GitHub. Le esecuzioni programmate funzionano solo da lì.
3. Aprire la scheda Actions di GitHub ed eseguire manualmente `Controllo attività Supabase` una volta. Il risultato deve essere verde e registrare `Supabase database responded successfully.`
4. Abilitare le notifiche email GitHub Actions per essere avvisati degli errori. Verificare regolarmente la cronologia delle esecuzioni: GitHub può ritardare o disabilitare le esecuzioni programmate in certe condizioni.

Il workflow usa soltanto la chiave *publishable* già presente nell'app pubblica. Non contiene credenziali di amministrazione, non crea utenti e non accede a dati privati. Interroga la funzione quattro volte al giorno.
