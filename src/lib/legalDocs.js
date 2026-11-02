// Testi legali di MVP Menu (Privacy Policy e Condizioni generali di vendita e di servizio).
// BOZZA da far verificare a un professionista prima dell'uso con clienti paganti.
// Per modificarli basta cambiare questo file: le pagine /#/privacy e /#/termini si aggiornano da sole.

export const LEGAL_CONTACT_EMAIL = 'mvpmenudigital@gmail.com'
export const LEGAL_LAST_UPDATE = '2 novembre 2026'

// Blocchi: { h: titolo } oppure { p: paragrafo } oppure { list: [voci] }
export const LEGAL_DOCS = {
  privacy: {
    title: 'Informativa sulla privacy',
    intro: 'Come MVP Menu tratta i dati personali di chi usa l\'app (ristoratori, staff e clienti dei locali) e di chi richiede una demo, ai sensi del Regolamento UE 2016/679 (GDPR).',
    blocks: [
      { h: '1. Chi siamo (Titolare del trattamento)' },
      { p: `MVP Menu è un servizio in fase di avvio, gestito da una persona fisica. Per qualsiasi richiesta sulla privacy puoi scrivere a ${LEGAL_CONTACT_EMAIL}. I dati identificativi completi del titolare (nome, indirizzo ed eventuale partita IVA) saranno indicati in questa pagina all'apertura della posizione fiscale e sono comunque comunicati su richiesta.` },

      { h: '2. Due ruoli diversi' },
      { list: [
        'Titolare: per i dati dei ristoratori e del loro staff (account, abbonamento, pagamenti, assistenza) e per i dati di chi richiede una demo.',
        'Responsabile del trattamento (art. 28 GDPR): per i dati che il locale raccoglie dai propri clienti tramite il menu e gli ordini (es. nome facoltativo, note, tavolo, contenuto degli ordini). Per questi dati il titolare è il locale; MVP Menu li tratta per suo conto, secondo le Condizioni generali di servizio.',
      ] },

      { h: '3. Quali dati trattiamo' },
      { list: [
        'Account del ristoratore: email, password (conservata cifrata), nome e dati del locale (indirizzo, telefono, eventuali dati fiscali).',
        'Staff del locale: nome, email e password dei membri (conservata cifrata con bcrypt), ruoli e permessi, azioni svolte negli ordini.',
        'Abbonamento e pagamenti: scadenza, importi, mesi coperti, modalità (bonifico o contanti), note di pagamento.',
        'Contenuti del locale: menu, prodotti, prezzi, foto, allergeni, scorte, ordini, incassi e statistiche di vendita.',
        'Clienti dei locali: dati inseriti volontariamente negli ordini (es. nome, note), tavolo, prodotti ordinati, interazioni anonime con il menu (visualizzazioni, preferiti, carrello).',
        'Assistenza: testo delle richieste inviate dall\'app e relative risposte.',
        'Richieste demo: nome, nome del locale, email, telefono, città e messaggio.',
        'Dati tecnici: indirizzo IP, tipo di dispositivo e browser, log di accesso e di errore.',
      ] },

      { h: '4. Perché li trattiamo e su quale base' },
      { list: [
        'Fornire il servizio (menu, ordini, cassa, staff, inventario, statistiche) e gestire l\'abbonamento: esecuzione del contratto (art. 6.1.b).',
        'Rispondere alle richieste di assistenza e alle richieste di demo: esecuzione del contratto o di misure precontrattuali richieste dall\'interessato (art. 6.1.b).',
        'Inviare comunicazioni di servizio nell\'app (es. avviso di scadenza, novità e modifiche del servizio): esecuzione del contratto (art. 6.1.b).',
        'Adempiere a obblighi di legge, ad esempio fiscali e contabili: obbligo legale (art. 6.1.c).',
        'Sicurezza, prevenzione di abusi e frodi, manutenzione: legittimo interesse (art. 6.1.f).',
        'Migliorare l\'app e fornire suggerimenti utili al locale (es. prodotti più performanti, fasce orarie, idee per il menu), anche analizzando i dati di utilizzo e di vendita: legittimo interesse (art. 6.1.f). Puoi opporti in qualsiasi momento scrivendoci.',
        'Statistiche e sviluppo di nuove funzioni: usiamo dati aggregati e resi anonimi, che non identificano né il locale né i suoi clienti.',
      ] },

      { h: '5. Chi può accedere ai dati' },
      { p: 'L\'amministratore della piattaforma MVP Menu può accedere a tutti i dati presenti nel servizio, esclusivamente per assistenza, manutenzione, sicurezza, verifica dei pagamenti ed elaborazione di suggerimenti e miglioramenti. Non vendiamo i dati e non li cediamo a terzi per finalità di marketing.' },
      { p: 'Per far funzionare il servizio ci avvaliamo di fornitori che agiscono come responsabili o sub-responsabili del trattamento:' },
      { list: [
        'Supabase Inc. — database, autenticazione e archiviazione delle immagini (server negli Stati Uniti).',
        'Vercel Inc. — hosting dell\'applicazione (infrastruttura negli Stati Uniti e rete globale).',
        'FormSubmit — inoltro via email delle notifiche di nuove richieste (assistenza e demo) alla nostra casella.',
        'Google LLC — casella email del servizio (Gmail).',
        'Eventuale fornitore del servizio di scontrino elettronico, solo per i locali che attivano questa funzione.',
      ] },
      { p: 'I trasferimenti di dati verso gli Stati Uniti avvengono sulla base delle garanzie previste dal GDPR: clausole contrattuali standard della Commissione europea e, ove applicabile, adesione del fornitore all\'EU-U.S. Data Privacy Framework.' },

      { h: '6. Per quanto tempo li conserviamo' },
      { list: [
        'Dati dell\'account e del locale: per tutta la durata del rapporto e fino a 12 mesi dalla sua fine, salvo richiesta di cancellazione anticipata.',
        'Documenti relativi ai pagamenti: per il tempo previsto dalla normativa fiscale (di norma 10 anni).',
        'Richieste di assistenza: fino a 24 mesi dalla chiusura.',
        'Richieste di demo non seguite da attivazione: fino a 12 mesi.',
        'Log tecnici: fino a 12 mesi.',
      ] },

      { h: '7. Come proteggiamo i dati' },
      { p: 'Connessioni cifrate (HTTPS), password conservate in forma cifrata, regole di accesso a livello di database (ogni locale vede solo i propri dati), accesso amministrativo riservato e tracciato.' },

      { h: '8. Cookie e memorizzazione sul dispositivo' },
      { p: 'L\'app non usa cookie di profilazione né pubblicità di terze parti. Usa solo la memoria tecnica del browser (es. sessione di accesso, carrello, preferiti, preferenze di visualizzazione), necessaria al funzionamento: per questo non serve un banner di consenso.' },

      { h: '9. I tuoi diritti' },
      { p: `Puoi chiedere in qualsiasi momento accesso, rettifica, cancellazione, limitazione del trattamento, portabilità dei dati e opposizione, scrivendo a ${LEGAL_CONTACT_EMAIL}. Hai anche diritto di proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it). I clienti dei locali possono rivolgersi direttamente al locale, titolare dei loro dati: noi lo aiuteremo a rispondere.` },

      { h: '10. Minori' },
      { p: 'Il servizio è destinato a esercenti e professionisti e non è rivolto a minori di 18 anni come utenti dell\'app gestionale.' },

      { h: '11. Modifiche a questa informativa' },
      { p: 'Possiamo aggiornare questa informativa. Le modifiche rilevanti sono comunicate con un avviso nell\'app; la data dell\'ultimo aggiornamento è indicata in fondo alla pagina.' },
    ],
  },

  termini: {
    title: 'Condizioni generali di vendita e di servizio',
    intro: 'Le regole del servizio MVP Menu: cosa offre, quanto costa, come si paga, cosa succede alla scadenza e come possono cambiare prezzi e funzioni.',
    blocks: [
      { h: '1. Il servizio' },
      { p: 'MVP Menu è un\'applicazione online (software as a service) per bar e ristoranti che comprende: menu digitale con QR code, ordini dal tavolo, cassa gestionale al banco e ai tavoli, gestione dello staff, inventario, statistiche di vendita e accesso da qualsiasi dispositivo. Le funzioni disponibili sono quelle presenti nell\'app in ogni momento.' },
      { p: 'La cassa di MVP Menu è uno strumento gestionale e non sostituisce il registratore telematico: l\'emissione dello scontrino o del documento commerciale fiscale resta a carico del locale, salvo attivazione di un eventuale modulo dedicato quando disponibile.' },

      { h: '2. A chi si rivolge' },
      { p: 'Il servizio è riservato a esercenti e professionisti che lo usano per la propria attività. Non è un servizio per consumatori: non si applicano quindi le norme del Codice del Consumo sulla vendita ai consumatori.' },

      { h: '3. Registrazione e prova gratuita' },
      { p: 'Alla registrazione il locale riceve 30 giorni di prova gratuita con tutte le funzioni, senza alcun obbligo di acquisto. Al termine della prova, per continuare a usare il servizio occorre attivare l\'abbonamento.' },

      { h: '4. Prezzi' },
      { list: [
        'Canone unico con tutte le funzioni incluse: 29 € al mese.',
        'Abbonamento annuale: 290 € (equivale a 2 mesi omaggio rispetto al prezzo mensile).',
        'Il canone mensile si paga per periodi di più mesi (ad esempio trimestrale o semestrale); il cliente sceglie quanti mesi coprire.',
        'Il trattamento fiscale applicato (es. IVA, se dovuta) è indicato nel documento rilasciato per il pagamento.',
      ] },

      { h: '5. Pagamento' },
      { p: 'Il pagamento avviene con bonifico bancario (le coordinate sono comunicate tramite la sezione Assistenza dell\'app) oppure in contanti, nei limiti previsti dalla legge. Una volta registrato il pagamento, la nuova scadenza è visibile in Impostazioni → Abbonamento. Il rinnovo non è automatico: non vengono effettuati addebiti senza un pagamento esplicito del cliente.' },

      { h: '6. Avviso di scadenza' },
      { p: 'Il locale riceve una notifica nell\'app 10 giorni prima della scadenza dell\'abbonamento o della prova gratuita, visibile anche in Impostazioni → Abbonamento.' },

      { h: '7. Mancato rinnovo e sospensione' },
      { list: [
        'Se l\'abbonamento non viene rinnovato entro la scadenza, il servizio resta attivo con tutte le funzioni per altri 15 giorni di tolleranza.',
        'Trascorsi i 15 giorni, l\'accesso è sospeso: il locale può entrare solo nelle Impostazioni e nell\'Assistenza, e il menu online non è più visibile ai clienti.',
        'I dati del locale non vengono cancellati con la sospensione: al pagamento, l\'accesso e il menu si riattivano subito.',
        'Dopo 6 mesi di sospensione, MVP Menu può cancellare i dati del locale, previo avviso inviato con almeno 30 giorni di anticipo.',
      ] },

      { h: '8. Durata e recesso' },
      { p: 'L\'abbonamento dura per il periodo pagato. Il cliente può smettere di rinnovare in qualsiasi momento, senza penali. Gli importi già pagati non sono rimborsabili, salvo malfunzionamenti gravi imputabili a MVP Menu. MVP Menu può recedere dal contratto con almeno 30 giorni di preavviso, rimborsando la parte di abbonamento già pagata e non goduta.' },

      { h: '9. Modifiche a prezzi, funzioni e condizioni' },
      { list: [
        'MVP Menu sviluppa il servizio in modo continuo e può modificare in qualsiasi momento, anche in corso d\'opera, funzioni, caratteristiche e aspetto dell\'app, per migliorarla o adeguarla.',
        'I prezzi possono essere modificati: le variazioni si applicano dal rinnovo successivo e sono comunicate con una notifica nell\'app con almeno 30 giorni di preavviso. I periodi già pagati restano al prezzo pagato.',
        'Anche queste condizioni possono essere aggiornate, con avviso nell\'app. Se il cliente non accetta le modifiche può non rinnovare l\'abbonamento.',
      ] },

      { h: '10. Responsabilità del locale' },
      { list: [
        'Custodire le proprie credenziali e quelle dello staff, e gestire correttamente ruoli e permessi.',
        'Inserire contenuti corretti e aggiornati: prezzi, descrizioni e in particolare gli allergeni dei prodotti sono responsabilità del locale.',
        'Avere i diritti sulle foto e sui testi caricati.',
        'Usare il servizio nel rispetto della legge, compresi gli obblighi fiscali e quelli verso i propri clienti in materia di privacy.',
      ] },

      { h: '11. Configurazione del menu' },
      { p: 'Su richiesta, MVP Menu configura il menu del locale a partire dalle foto o dai documenti forniti, di norma entro 24 ore lavorative. Il locale verifica e approva i contenuti prima di pubblicarli. Le immagini di repertorio eventualmente fornite da MVP Menu sono utilizzate con licenza d\'uso.' },

      { h: '12. Disponibilità del servizio e limiti di responsabilità' },
      { p: 'MVP Menu si impegna a mantenere il servizio disponibile e funzionante, ma non garantisce l\'assenza di interruzioni (ad esempio per manutenzione, aggiornamenti o problemi dei fornitori di infrastruttura). Salvo dolo o colpa grave, la responsabilità di MVP Menu è limitata all\'importo pagato dal cliente nei 12 mesi precedenti ed è esclusa per danni indiretti, come mancati guadagni.' },

      { h: '13. Dati personali' },
      { p: 'Il trattamento dei dati è descritto nell\'Informativa sulla privacy. Accettando queste condizioni, il locale nomina MVP Menu responsabile del trattamento (art. 28 GDPR) per i dati dei propri clienti trattati tramite l\'app, e autorizza l\'uso dei fornitori indicati nell\'informativa. MVP Menu tratta questi dati solo per fornire il servizio, li protegge con misure adeguate e, al termine del rapporto, li restituisce su richiesta o li cancella. MVP Menu può usare dati aggregati e resi anonimi per statistiche, suggerimenti e miglioramento del servizio.' },

      { h: '14. Assistenza' },
      { p: `L'assistenza si richiede dalla sezione Assistenza dell'app: la risposta arriva nella stessa sezione. È anche possibile scrivere a ${LEGAL_CONTACT_EMAIL}.` },

      { h: '15. Proprietà intellettuale' },
      { p: 'Il software, il marchio e i contenuti di MVP Menu restano di proprietà del titolare del servizio. I contenuti del locale (menu, foto, dati) restano del locale.' },

      { h: '16. Legge applicabile' },
      { p: 'Queste condizioni sono regolate dalla legge italiana. Per ogni controversia è competente il foro del luogo di residenza o di sede del fornitore del servizio.' },

      { h: '17. Accettazione' },
      { p: 'Le condizioni si accettano al momento della registrazione e valgono per tutta la durata del rapporto, nella versione di volta in volta pubblicata in questa pagina.' },
    ],
  },
}
