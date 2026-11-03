// Registro aggiornamenti dell'app (changelog interno).
// L'elemento in cima all'array è il più recente: la sua `id` determina il badge "NOVITÀ".
// Ogni voce: data, titolo, tipo, descrizione e istruzioni passo-passo.

export const APP_UPDATES = [
  {
    id: '2026-11-03-editor-bozza',
    date: '2026-11-03',
    type: 'novita',
    title: 'Editor del menu: "I più visti", foto delle sezioni, bozze da far approvare',
    description:
      "Nell'Editor dal vivo della home componibile ci sono tre novità. 1) Nuova sezione \"I più visti\": si riempie da sola con i prodotti che i clienti aprono di più nel menu, con i numeri 1, 2, 3… Scegli quanti mostrarne, quanti al massimo per categoria e il periodo. 2) Ogni sezione può avere una foto in testa, con il titolo sopra: quella della categoria, quella di un'altra categoria o una foto che carichi tu. Puoi anche numerare i prodotti di qualsiasi sezione. 3) Bozze: quando premi Salva scegli se pubblicare subito o salvare come bozza. La bozza non cambia il menu dei clienti e ti dà un link di anteprima da mandare (le visite all'anteprima non contano nelle statistiche). Quando va bene, la pubblichi con un tocco. In più, \"Ordina per popolarità\" mette le categorie dalla più aperta alla meno aperta, anche nei badge in alto. In Prodotti → Categorie → Ordina trovi la stessa scelta (\"Più visti nel menu\"), anche per i prodotti di una categoria. I prodotti senza foto ora appaiono come schede di testo eleganti, senza riquadri vuoti.",
    steps: [
      'Apri Impostazioni → Temi e Stile → Apri Editor dal vivo.',
      'Tocca "+ Aggiungi carosello" e scegli "I più visti": la sezione si riempie da sola con i prodotti più aperti.',
      'In "Stile della sezione" attiva "Numera i prodotti" e "Foto in testa alla sezione", poi scegli la foto.',
      'In fondo, "Ordina per popolarità" mette prima le categorie più aperte dai clienti.',
      'Premi Salva → "Salva come bozza": copia il link dell\'anteprima e mandalo. Il menu dei clienti non cambia.',
      'Quando la bozza va bene, riapri l\'editor e premi Salva → "Pubblica sul menu". Con "Elimina" nella barra gialla la scarti.'
    ]
  },
  {
    id: '2026-11-03-ritocchi-menu',
    date: '2026-11-03',
    type: 'miglioramento',
    title: 'Finestra prodotto più fluida, allergeni solo testo, icone Android e Apple',
    description:
      "Aprendo un prodotto senza varianti la finestra non mostra più per un attimo \"Caricamento varianti...\" e non cambia più dimensione: si apre subito, già pronta. I badge degli allergeni, nel menu online e nella scheda prodotto della dashboard, mostrano solo il nome (Glutine, Latte e lattosio...), senza emoji. Nella finestra \"Scarica app\" ci sono i loghi di Android e Apple e icone pulite al posto delle emoji.",
    steps: [
      'Apri il tuo menu e tocca un prodotto: la finestra si apre subito, senza scatti.',
      'Tocca "Contiene allergeni*" su un prodotto: vedi i nomi degli allergeni, senza emoji.',
      'Nel menu laterale tocca "Scarica app" per vedere le nuove icone.'
    ]
  },
  {
    id: '2026-11-03-esplora-dati',
    date: '2026-11-03',
    type: 'novita',
    title: 'Esplora dati: le tue analisi personalizzate, come su Shopify',
    description:
      "Nuova pagina Analytics → Esplora dati. Scegli i dati (vendite, prodotti venduti, menu online, visite al menu, servizio, comande), cosa mostrare (incasso, ordini, scontrino medio, margine, pezzi, visualizzazioni, aperture, tempi di preparazione e molto altro), come raggruppare (canale, prodotto, categoria, tavolo, persona dello staff, fascia oraria, giorno della settimana...), il periodo e il confronto. Ottieni subito totali con le variazioni, grafico e tabella, che puoi scaricare in CSV. Chi preferisce può scrivere la query nello stile di Shopify (FROM sales SHOW total_sales TIMESERIES hour DURING today COMPARE TO yesterday) e salvare le proprie analisi. Ci sono già 21 analisi pronte da cui partire.",
    steps: [
      'Apri Analytics → Esplora dati.',
      "A sinistra scegli un'analisi pronta, per esempio \"Incasso per canale\" o \"Prodotti più venduti\".",
      'Cambia con i menu cosa vedere: dati, raggruppamento, andamento nel tempo, periodo e confronto. Tocca le metriche per aggiungerle o toglierle.',
      'Se vuoi, modifica direttamente la query e premi "Esegui" (o Ctrl + Invio). "Guida e campi" mostra tutto quello che puoi usare.',
      'Premi "Salva analisi" per ritrovarla in alto a sinistra, oppure "Scarica CSV" per aprirla in Excel.'
    ]
  },
  {
    id: '2026-11-03-analytics-categorie',
    date: '2026-11-03',
    type: 'miglioramento',
    title: 'Analytics riorganizzate, con i numeri più importanti in evidenza',
    description:
      "La pagina Analytics ora si apre su \"Tutte\": in alto trovi i numeri più interessanti degli ultimi 30 giorni (incasso, ordini, scontrino medio, margine, prodotto più venduto, ora di punta, canale principale, visite al menu, tempi di preparazione e di approvazione), ognuno con il confronto e un tocco per approfondire. Sotto, le analisi divise per categoria: Vendite, Prodotti, Menu e clienti, Staff e servizio, Esplora dati. Tutte le analisi sono disponibili per tutti, senza abbonamenti speciali, e in \"Menu e clienti\" ora trovi anche tempo sul menu, prodotti e categorie aperte e preferiti.",
    steps: [
      'Apri Analytics: la scheda "Tutte" mostra i numeri in evidenza.',
      'Tocca un numero per vedere il dettaglio.',
      'Usa le schede in alto per vedere solo le analisi di una categoria e le relative analisi pronte.'
    ]
  },
  {
    id: '2026-11-03-staff-servizio',
    date: '2026-11-03',
    type: 'novita',
    title: 'Staff e Servizio: chi prende, approva, prepara e chiude ogni ordine, con i tempi',
    description:
      "Nuova pagina Analytics → Staff e Servizio. Per ogni persona vedi quanti ordini ha preso (dall'app staff, in cassa o al banco) e quanto hanno incassato, quanti ordini dei clienti dal QR ha approvato e in quanto tempo, quante comande ha aggiunto e segnato come preparate, quanti tavoli ha chiuso, i rifiutati e i non pagati. Vedi anche da dove arrivano gli ordini (menu QR, app staff, cassa, banco) con incasso, scontrino medio e pezzi per ordine di ogni canale, e i tempi del servizio: quanto aspetta il cliente prima che l'ordine venga approvato, quanto ci mette una comanda a essere pronta e quanto resta un tavolo aperto. Tutto anche per fascia oraria e giorno della settimana, con le comande più lente. Cliccando una persona vedi le sue ore di lavoro.",
    steps: [
      'Apri Analytics → Staff e Servizio e scegli il periodo.',
      'In alto trovi ordini, incasso, pezzi per ordine e i tempi (attesa approvazione, preparazione, permanenza al tavolo), con il confronto col periodo precedente.',
      'In "Da dove arrivano gli ordini" confronti menu QR, app staff, cassa e banco.',
      'Nella tabella "Staff" vedi cosa ha fatto ogni persona: cliccala per vedere le sue ore.',
      'In "Per fascia oraria" capisci in quali ore i clienti aspettano di più e serve una persona in più.'
    ]
  },
  {
    id: '2026-11-03-cassa-operatore',
    date: '2026-11-03',
    type: 'novita',
    title: 'In cassa: scegli chi sta lavorando',
    description:
      "Nella Cassa, sotto il titolo, c'è la voce \"In cassa\": scegli chi sta usando la cassa (tu oppure una persona dello staff). Da quel momento ogni scontrino, vendita al banco, tavolo aperto, approvazione e comanda preparata viene registrata a nome di quella persona, anche nello storico dell'ordine. La scelta vale per la giornata su quel dispositivo: ogni nuovo giorno la cassa riparte da te. Anche il cambio tavolo viene registrato a nome della persona scelta. Nell'app staff invece conta sempre il cameriere collegato.",
    steps: [
      'Apri la Cassa.',
      'Sotto il titolo, in "In cassa", scegli il tuo nome o quello della persona dello staff che sta lavorando.',
      'Lavora come sempre: ogni azione viene attribuita alla persona scelta.',
      'A fine turno cambia la persona: i dati per persona li trovi in Analytics → Staff e Servizio.'
    ]
  },
  {
    id: '2026-11-03-staff-storico',
    date: '2026-11-03',
    type: 'miglioramento',
    title: 'Staff: il lavoro di ogni persona resta sempre suo',
    description:
      "Se elimini dagli Utenti una persona dello staff che ha già lavorato su degli ordini, ora viene disattivata invece che cancellata: non può più accedere, ma ordini, scontrini e statistiche restano a suo nome (prima passavano a te). Chi non ha mai lavorato viene eliminato come sempre. Inoltre i tempi di servizio non contano più le comande segnate \"pronte\" all'istante, i rifiutati non includono gli ordini annullati per un errore tecnico, e nei grafici giorno per giorno ogni giornata compare una sola volta anche al cambio dell'ora legale.",
    steps: [
      'Apri Utenti → Membri.',
      'Premi "Elimina" su una persona: se ha già lavorato, ti viene chiesto di disattivarla per conservare il suo storico.',
      'La trovi sempre nella lista come "Disattivato" e puoi riattivarla in qualsiasi momento.'
    ]
  },
  {
    id: '2026-11-03-scontrino-banco',
    date: '2026-11-03',
    type: 'correzione',
    title: 'Scontrino al banco: ora si salva e si stampa sempre',
    description:
      "Lo \"Scontrino Fiscale\" nella modalità Al Banco poteva dare errore e non registrare la vendita, oppure registrarla ma mostrare comunque un errore (con il rischio di batterla due volte). Ora la vendita al banco viene salvata, lo scontrino si stampa e il carrello si svuota. Inoltre il preconto ora compare nello storico dell'ordine, e nel menu classico il pulsante \"Vieni a trovarci\" in basso si legge con tutti i temi.",
    steps: [
      'Apri la Cassa → Al Banco.',
      'Aggiungi i prodotti e premi "Scontrino Fiscale": compare la conferma con il numero dello scontrino.'
    ]
  },
  {
    id: '2026-11-03-conversion-funnel',
    date: '2026-11-03',
    type: 'novita',
    title: 'Conversion Funnel: quanti clienti vedono, aprono e ordinano ogni prodotto, ora per ora',
    description:
      "Nuova pagina Analytics → Conversion Funnel. Per ogni prodotto del menu online vedi quante volte la scheda è stata vista nella lista (almeno 1 secondo a schermo), quante volte è stata aperta, quante volte è stata aggiunta al carrello e quanti pezzi sono stati ordinati. Tutto anche per fascia oraria (mattina, pranzo, pomeriggio, aperitivo, sera, notte) e per giorno della settimana; cliccando un prodotto vedi le sue fasce orarie, per esempio a che ora viene aperto di più. Funziona allo stesso modo in tutti e tre gli stili del menu. La pagina ti segnala da sola i prodotti \"visti ma poco aperti\" (da rivedere foto, nome o posizione) e quelli \"aperti ma poco aggiunti\" (da rivedere prezzo o descrizione). Le tue visite da titolare e le anteprime dell'editor non vengono contate.",
    steps: [
      'Apri Analytics → Conversion Funnel e scegli il periodo.',
      'In alto trovi i 4 passaggi: visualizzazioni, aperture, aggiunte al carrello, pezzi ordinati, con il confronto col periodo precedente.',
      'In "Per fascia oraria" vedi a che ora i clienti guardano e aprono i prodotti, con le percentuali di ogni fascia.',
      'Guarda i riquadri "Visti ma poco aperti" e "Aperti ma poco aggiunti": sono i prodotti su cui intervenire.',
      'Nella tabella "Tutti i prodotti" clicca sul nome di una colonna per ordinare, oppure su un prodotto per vedere le sue fasce orarie.'
    ]
  },
  {
    id: '2026-11-03-analytics-precise',
    date: '2026-11-03',
    type: 'miglioramento',
    title: 'Analytics più precise con tante vendite',
    description:
      "Le statistiche ora leggono tutte le vendite del periodo: prima, oltre una certa quantità di articoli, i prodotti più venduti e il margine netto risultavano incompleti. Ora quantità, incassi e margine corrispondono esattamente alle vendite registrate. Inoltre, quando un valore non cambia rispetto al periodo precedente, viene mostrato neutro (→ 0%) invece che come un calo.",
    steps: [
      'Apri Analytics e scegli una pagina (fatturato, prodotti, fasce orarie...).',
      'Seleziona il periodo: i numeri includono tutte le vendite, anche nei periodi lunghi.'
    ]
  },
  {
    id: '2026-11-02-assistenza',
    date: '2026-11-02',
    type: 'novita',
    title: 'Assistenza direttamente dall\'app',
    description:
      "Nuova voce \"Assistenza\" nel menu laterale: puoi segnalarci un problema o proporci un miglioramento senza uscire dall'app. La risposta arriva nella stessa pagina e, quando ti rispondiamo, la voce \"Assistenza\" mostra l'avviso \"RISPOSTA\". L'assistenza è sempre raggiungibile, anche se il tuo account ha sezioni limitate.",
    steps: [
      'Apri "Assistenza" dal menu laterale.',
      'Scegli "Segnala un problema" o "Proponi un miglioramento", scrivi oggetto e descrizione e premi "Invia richiesta".',
      'In "Le tue richieste" vedi lo stato (Ricevuta, In lavorazione, Risolta) e la nostra risposta.',
      'Quando arriva una risposta, nel menu laterale compare l\'avviso "RISPOSTA".'
    ]
  },
  {
    id: '2026-11-02-abbonamento',
    date: '2026-11-02',
    type: 'novita',
    title: 'Abbonamento: scadenza sempre visibile e avviso 10 giorni prima',
    description:
      "In Impostazioni → Abbonamento trovi lo stato del tuo abbonamento (o della prova gratuita), la data di scadenza e lo storico dei pagamenti. Il rinnovo si paga con bonifico o in contanti: appena registriamo il pagamento, la nuova scadenza compare lì. 10 giorni prima della scadenza ricevi un avviso in cima all'app. Se non rinnovi, l'app resta attiva per altri 15 giorni; poi l'accesso viene limitato alle Impostazioni e il menu online sospeso, finché non rinnovi.",
    steps: [
      'Apri Impostazioni → Abbonamento per vedere stato, scadenza e pagamenti.',
      'Per rinnovare paga con bonifico o contanti: per coordinate e importi scrivici dalla sezione Assistenza.',
      '10 giorni prima della scadenza compare un avviso giallo in cima all\'app, con il pulsante "Vedi abbonamento".',
      'Dopo la scadenza hai 15 giorni di tolleranza con tutte le funzioni attive.'
    ]
  },
  {
    id: '2026-11-02-pulsanti-tema',
    date: '2026-11-02',
    type: 'miglioramento',
    title: 'Pulsanti del menu sempre leggibili',
    description:
      "I pulsanti del carrello (\"Procedi all'Ordine\", \"Conferma Ordine\"), della conferma ordine (\"Torna al Menu\"), delle varianti e del menu ora usano i colori \"Sfondo pulsanti\" e \"Testo pulsanti\" scelti nell'editor: niente più pulsanti scuri su sfondo scuro. Nell'editor, sotto i colori, trovi l'anteprima dei pulsanti con un avviso se il testo si legge poco e il tasto \"Correggi\".",
    steps: [
      'Apri Impostazioni → Temi e Stile.',
      'Scegli "Sfondo pulsanti" e "Testo pulsanti" tra i colori.',
      'Controlla l\'"Anteprima pulsanti": se compare l\'avviso, premi "Correggi" per un testo leggibile.',
      'Salva: menu, carrello e conferma ordine useranno questi colori.'
    ]
  },
  {
    id: '2026-11-02-scarica-app',
    date: '2026-11-02',
    type: 'novita',
    title: 'Scarica app: MVP Menu sulla schermata del telefono',
    description:
      "Nuova voce \"Scarica app\" nel menu laterale (sopra \"Esci\"): ti guida ad aggiungere MVP Menu alla schermata home del telefono, con la sua icona. Da quel momento l'app si apre a tutto schermo, come una vera app, senza barra del browser. Istruzioni dedicate per Android (Chrome) e iPhone (Safari); su Android, quando il telefono lo permette, basta un tocco su \"Installa ora\". Ricorda: la prima volta devi aprire il sito dal link e fare l'accesso con la tua email e password — poi aprirai sempre tutto dall'icona.",
    steps: [
      "Apri il sito dal telefono (Chrome su Android, Safari su iPhone) e fai l'accesso con email e password.",
      'Apri il menu laterale ☰ e tocca "Scarica app" (sopra "Esci").',
      'Segui i passaggi mostrati: su Android spesso basta "Installa ora".',
      "Finito: apri MVP Menu dall'icona sul telefono, a tutto schermo."
    ]
  },
  {
    id: '2026-11-02-allergeni',
    date: '2026-11-02',
    type: 'novita',
    title: 'Allergeni sui prodotti (obbligo di legge)',
    description:
      "Ora puoi indicare gli allergeni di ogni prodotto, scegliendo tra i 14 previsti dalla legge (Reg. UE 1169/2011): glutine, latte, uova, frutta a guscio, crostacei e così via. Nel menu online i prodotti con allergeni mostrano la scritta \"Contiene allergeni*\": aprendo il prodotto (o toccando la scritta) il cliente vede l'elenco completo con i badge. Gli allergeni compaiono anche nella finestra di aggiunta al carrello.",
    steps: [
      'Apri "Prodotti" e premi Modifica su un prodotto.',
      'Nella sezione "Allergeni" tocca i badge degli allergeni contenuti (si colorano di nero) e salva.',
      'Nel menu online il prodotto mostra la scritta "Contiene allergeni*".',
      'Il cliente apre il prodotto ("Scopri di più" o tocco sulla scritta) e vede l\'elenco completo degli allergeni.'
    ]
  },
  {
    id: '2026-11-02-inventario',
    date: '2026-11-02',
    type: 'novita',
    title: 'Inventario: gestisci le scorte dei prodotti',
    description:
      "Nuova sezione Inventario. Per ogni prodotto puoi attivare le scorte e vedere a colpo d'occhio Giacenza, Impegnato e Disponibile. Le vendite da Cassa, banco, tavolo o staff scalano la scorta in automatico. Puoi fare carichi merce, conteggi e scarti con lo storico di ogni movimento, e impostare una soglia di scorta bassa. Nel menu i prodotti esauriti vengono segnalati come \"Esaurito\" e non sono ordinabili dal cliente.",
    steps: [
      'Apri "Inventario" dal menu laterale.',
      'Attiva "Traccia" sul prodotto e imposta la quantità con "Rettifica → Conteggio".',
      'Imposta la soglia minima per gli avvisi di scorta bassa.',
      'Le vendite scalano da sole; con "Storico" vedi tutti i movimenti (carico, vendita, scarto...).',
      'Nel menu pubblico i prodotti esauriti risultano "Esaurito" e non ordinabili.'
    ]
  },
  {
    id: '2026-11-01-schede-menu',
    date: '2026-11-01',
    type: 'miglioramento',
    title: 'Schede prodotto del menu più chiare',
    description:
      "Nel menu online le schede dei prodotti sono più compatte e ordinate: il nome resta su una riga, e sotto trovi prezzo, pulsante per ordinare e cuore sempre alla stessa altezza (anche con nomi lunghi). Il prezzo mostra \"Da X €\" quando ci sono varianti a prezzi diversi. Con \"Scopri di più\" apri foto e descrizione, e toccando la foto la vedi ingrandita a schermo intero.",
    steps: [
      'Apri il menu e scegli una categoria.',
      'Ogni prodotto mostra nome, prezzo e un pulsante tondo "+" per aggiungerlo, con il cuore per i preferiti.',
      'Tocca "Scopri di più" per vedere foto e descrizione del prodotto.',
      'Tocca la foto per ingrandirla a schermo intero; chiudi con la X.'
    ]
  },
  {
    id: '2026-11-01-ordini-tabella',
    date: '2026-11-01',
    type: 'novita',
    title: 'Ordini in tabella (stile e-commerce)',
    description:
      "La pagina Ordini è ora una tabella chiara e ordinata con tutte le colonne utili a colpo d'occhio: numero ordine, data, origine (tavolo o banco), totale, stato del pagamento, stato di evasione, numero di articoli e numero di portate. Mostra tutti gli ordini, inclusi quelli al banco.",
    steps: [
      'Apri "Ordini" dal menu laterale.',
      'Usa le schede in alto (Tutti, Attivi, In Attesa, In Preparazione, Completati, Eliminati) per filtrare.',
      'Guarda la colonna "Portate" per sapere in quante comande è diviso un ordine, e "Articoli" per i pezzi totali.',
      'Clicca una riga per aprire il dettaglio dell\'ordine; su desktop usa le caselle per le azioni multiple.'
    ]
  },
  {
    id: '2026-11-01-preferiti-cassa',
    date: '2026-11-01',
    type: 'novita',
    title: 'Preferiti alla Cassa (al banco)',
    description:
      "Al banco hai una scheda 'Preferiti' sempre come prima a sinistra: ci metti i prodotti che usi più spesso, nell'ordine che vuoi, per servirli in un tocco.",
    steps: [
      'Vai su "Cassa" → "Al Banco".',
      'La prima scheda è "Preferiti".',
      'Premi "Scegli preferiti" e seleziona i prodotti (da qualsiasi categoria, con ricerca).',
      'Premi "Ordina" per trascinarli nell\'ordine che preferisci.',
      'I preferiti restano salvati e pronti all\'uso.'
    ]
  },
  {
    id: '2026-11-01-cassa-compatta',
    date: '2026-11-01',
    type: 'miglioramento',
    title: 'Cassa al banco più compatta e veloce',
    description:
      "I prodotti al banco sono ora in una griglia a due righe che scorre in orizzontale, con riquadri più compatti: ne vedi di più in meno spazio. Puoi scorrere categorie e prodotti con la rotellina del mouse (oltre al tocco), comodo anche su schermi touch.",
    steps: [
      'Vai su "Cassa" → "Al Banco".',
      'Scorri i prodotti in orizzontale con la rotellina del mouse o col dito.',
      'Scorri allo stesso modo la barra delle categorie in alto.'
    ]
  },
  {
    id: '2026-11-01-ricerca-prodotti',
    date: '2026-11-01',
    type: 'novita',
    title: 'Ricerca rapida in Prodotti e Categorie',
    description:
      "Nelle pagine Prodotti e Categorie c'è un campo di ricerca in alto: scrivendo, l'elenco si filtra all'istante mostrando solo ciò che cerchi.",
    steps: [
      'Vai su "Prodotti" (o la scheda "Categorie").',
      'Scrivi nel campo di ricerca in alto.',
      'L\'elenco si aggiorna mentre scrivi.'
    ]
  },
  {
    id: '2026-11-01-coerenza-ux',
    date: '2026-11-01',
    type: 'miglioramento',
    title: 'Grafica più coerente in tutta l\'app',
    description:
      "Abbiamo uniformato intestazioni, schede, spazi e colori in tutta l'app, così ogni pagina ha lo stesso stile pulito e ordinato. Corretti anche alcuni dettagli (spaziature delle schede, pulsanti, colori).",
    steps: [
      'Naviga tra le pagine (Home, Ordini, Prodotti, Analytics, Impostazioni…): troverai intestazioni e schede uniformi.',
      'Le schede di navigazione hanno ora lo stesso stile ovunque.'
    ]
  },
  {
    id: '2026-11-01-correzioni',
    date: '2026-11-01',
    type: 'correzione',
    title: 'Correzioni importanti',
    description:
      "Risolti alcuni problemi: alla cassa i prodotti con varianti ora si selezionano correttamente (prima restava una schermata bianca); le schede non hanno più contenuti attaccati ai bordi; e scegliere un tema pronto non cancella più la home personalizzata.",
    steps: [
      'Cassa → Al Banco: clicca un prodotto con varianti e selezionala senza problemi.',
      'Le schede (ordini, ecc.) hanno ora il giusto spazio interno.',
      'Nei temi, applicare un tema pronto mantiene la tua Home componibile.'
    ]
  },
  {
    id: '2026-11-01-live-editor',
    date: '2026-11-01',
    type: 'novita',
    title: 'Nuovo Editor Home dal vivo',
    description:
      "Ora puoi costruire la home del tuo menu con un editor dal vivo: in alto vedi l'anteprima reale del menu che si aggiorna all'istante mentre modifichi, sotto hai i controlli. Componi la home con caroselli di prodotti (scelti a mano o da categoria), riordina tutto col trascinamento e regola colori, font e dimensioni a livello generale. Quando sei soddisfatto, salvi.",
    steps: [
      'Apri il menu laterale e vai su "Impostazioni".',
      'Scegli la scheda "Temi e Stile".',
      'Alla voce "Layout menu" seleziona "Builder".',
      'Premi "Apri Editor Home": si apre l\'editor con l\'anteprima live in alto.',
      'Scheda "Contenuto": premi "+ Aggiungi carosello", scegli "Da categoria" (con "Guarda tutti") oppure "Prodotti scelti" a mano, dai un titolo e salva con "Fatto".',
      'Trascina i caroselli dalla maniglia (⠿) per cambiarne l\'ordine.',
      'Scheda "Aspetto": cambia colori, font, dimensione testi e card, spazio tra i caroselli, forma degli angoli e i badge delle categorie. Vedi tutto aggiornarsi subito nell\'anteprima.',
      'Usa il pulsante "Anteprima/Modifica" in alto a destra dell\'anteprima per ingrandirla a tutto schermo.',
      'Premi "Salva": la home del menu pubblico viene aggiornata.'
    ]
  },
  {
    id: '2026-11-01-portate',
    date: '2026-11-01',
    type: 'novita',
    title: 'Portate: invio delle comande a scaglioni',
    description:
      "Un ordine può essere diviso in più portate (batch). Puoi inviarle in cucina una alla volta, manualmente o con invio programmato, e modificare/rimuovere le portate non ancora preparate. Funziona da Cassa, dagli Ordini dello staff e dalla pagina ordini.",
    steps: [
      'Apri un ordine (da Cassa, da "Ordini" o dalla pagina dell\'ordine).',
      'Crea una nuova portata e aggiungi i prodotti che vuoi mandare insieme.',
      'Invia la portata in cucina subito, oppure imposta un orario di invio programmato.',
      'Finché una portata non è stata preparata, puoi modificarla o rimuoverla.',
      'Lo staff segna la portata come "preparata" quando è pronta.'
    ]
  },
  {
    id: '2026-11-01-stato-ordini',
    date: '2026-11-01',
    type: 'miglioramento',
    title: 'Nuovo modello di stato di ordini e tavoli',
    description:
      "Gli stati dell'ordine sono stati resi coerenti su tutta l'app (Cassa, menu cliente, staff, manager). Un ordine in attesa va approvato dallo staff prima di entrare in preparazione (così si evitano ordini falsi). Un tavolo occupato non è più ordinabile dal cliente ed è chiudibile solo dalla Cassa. È stata aggiunta una timeline che traccia ogni evento dell'ordine: chi, cosa e quando.",
    steps: [
      'Il cliente invia l\'ordine: resta "in attesa di approvazione".',
      'Lo staff approva l\'ordine, che passa "in preparazione".',
      'Ogni portata viene segnata come preparata quando pronta.',
      'Solo la Cassa può chiudere/completare l\'ordine del tavolo.',
      'Apri il dettaglio di un ordine per vedere la timeline completa degli eventi (con orario, autore e prodotti).'
    ]
  },
  {
    id: '2026-11-01-chiudi-non-pagato',
    date: '2026-11-01',
    type: 'novita',
    title: 'Chiudi tavolo come "non pagato" (incasso perso)',
    description:
      "Quando un cliente va via senza pagare, puoi chiudere il tavolo contrassegnando l'incasso come perso. L'ordine NON viene eliminato: resta nei dati e viene conteggiato correttamente nelle analisi (incasso perso), così la contabilità resta veritiera.",
    steps: [
      'Apri il tavolo/ordine dalla Cassa.',
      'Scegli "Chiudi non pagato".',
      'Il tavolo si libera, l\'ordine resta registrato e l\'incasso risulta perso nelle Analytics.'
    ]
  },
  {
    id: '2026-11-01-margini',
    date: '2026-11-01',
    type: 'novita',
    title: 'Costi prodotto e margine netto nelle Analytics',
    description:
      "Puoi inserire il costo di ogni prodotto (IVA inclusa). L'app calcola il margine netto su ordini, tavoli, bancone e giorno. Sia il costo sia il prezzo di vendita sono indicati come 'IVA inclusa'.",
    steps: [
      'Vai su "Prodotti" e imposta per ogni prodotto il costo (IVA inclusa).',
      'Il prezzo di vendita è già IVA inclusa.',
      'Apri "Analytics": troverai il margine netto calcolato (ricavi − costi) per ordine, tavolo, bancone e giornata.'
    ]
  },
  {
    id: '2026-11-01-riordino',
    date: '2026-11-01',
    type: 'miglioramento',
    title: 'Riordino e ordinamento di prodotti e categorie',
    description:
      "Puoi riordinare i prodotti dentro una categoria e le categorie tra loro trascinandoli (col mouse o col dito). In più, ordinamento rapido per nome (A→Z, Z→A), prezzo (crescente/decrescente), più recenti o più venduti.",
    steps: [
      'Vai su "Prodotti".',
      'Per i prodotti di una categoria premi "Ordina prodotti" e trascina per cambiarne l\'ordine, oppure scegli un ordinamento automatico.',
      'Per le categorie premi "Ordina categorie" e trascina.',
      'Salva: il nuovo ordine si riflette nel menu.'
    ]
  },
  {
    id: '2026-11-01-temi-layout',
    date: '2026-11-01',
    type: 'novita',
    title: 'Nuovi temi e layout del menu (Builder, Store, header fisso)',
    description:
      "Aggiunti nuovi temi (Elegante, Neon) e due nuovi layout del menu: 'Store' in stile e-commerce e 'Builder' componibile a caroselli. L'intestazione del menu è ora sempre visibile (fissa) e la ricerca è un'icona che apre il campo di ricerca sotto.",
    steps: [
      'Vai su "Impostazioni" → "Temi e Stile".',
      'Scegli un tema predefinito oppure personalizza colori e font.',
      'Alla voce "Layout menu" scegli tra Classico, Store o Builder.',
      'Con "Builder" usa l\'Editor Home live per comporre la pagina.'
    ]
  }
]

// Immagine/GIF di esempio per ogni aggiornamento (in public/updates/)
export const EXAMPLE_IMAGE = {
  '2026-11-03-editor-bozza': '/updates/editor-bozza.gif',
  '2026-11-03-ritocchi-menu': '/updates/scarica-app-icone.png',
  '2026-11-03-esplora-dati': '/updates/esplora-dati.gif',
  '2026-11-03-analytics-categorie': '/updates/analytics-categorie.gif',
  '2026-11-03-staff-servizio': '/updates/staff-servizio.gif',
  '2026-11-03-cassa-operatore': '/updates/cassa-operatore.gif',
  '2026-11-03-staff-storico': '/updates/staff-storico.png',
  '2026-11-03-scontrino-banco': '/updates/scontrino-banco.png',
  '2026-11-03-conversion-funnel': '/updates/conversion-funnel.gif',
  '2026-11-03-analytics-precise': '/updates/analytics-precise.gif',
  '2026-11-02-assistenza': '/updates/assistenza.gif',
  '2026-11-02-abbonamento': '/updates/abbonamento.gif',
  '2026-11-02-pulsanti-tema': '/updates/pulsanti-tema.gif',
  '2026-11-02-scarica-app': '/updates/scarica-app.gif',
  '2026-11-02-allergeni': '/updates/allergeni.gif',
  '2026-11-02-inventario': '/updates/inventario.gif',
  '2026-11-01-schede-menu': '/updates/schede-menu.gif',
  '2026-11-01-ordini-tabella': '/updates/ordini-tabella.gif',
  '2026-11-01-preferiti-cassa': '/updates/preferiti-cassa.gif',
  '2026-11-01-cassa-compatta': '/updates/cassa-compatta.png',
  '2026-11-01-ricerca-prodotti': '/updates/ricerca-prodotti.gif',
  '2026-11-01-coerenza-ux': '/updates/coerenza-ux.png',
  '2026-11-01-correzioni': '/updates/correzioni.png',
  '2026-11-01-live-editor': '/updates/live-editor.gif',
  '2026-11-01-portate': '/updates/cassa.png',
  '2026-11-01-stato-ordini': '/updates/ordini.png',
  '2026-11-01-chiudi-non-pagato': '/updates/cassa.png',
  '2026-11-01-margini': '/updates/analytics.png',
  '2026-11-01-riordino': '/updates/riordino.gif',
  '2026-11-01-temi-layout': '/updates/temi-layout.gif'
}

export const getUpdateById = (id) => APP_UPDATES.find((u) => u.id === id) || null

export const LATEST_UPDATE_ID = APP_UPDATES[0].id
const SEEN_KEY = 'app_updates_seen_id'

export function hasUnreadUpdates() {
  try {
    return localStorage.getItem(SEEN_KEY) !== LATEST_UPDATE_ID
  } catch {
    return false
  }
}

export function markUpdatesSeen() {
  try {
    localStorage.setItem(SEEN_KEY, LATEST_UPDATE_ID)
    // Avvisa la UI (es. la sidebar) che il badge va nascosto, senza ricaricare
    window.dispatchEvent(new Event('app-updates-seen'))
  } catch {
    // storage non disponibile: ignora
  }
}

export const UPDATE_TYPE_LABEL = {
  novita: { label: 'Novità', color: '#dc2626', bg: '#fee2e2' },
  miglioramento: { label: 'Miglioramento', color: '#2563eb', bg: '#dbeafe' },
  correzione: { label: 'Correzione', color: '#16a34a', bg: '#dcfce7' }
}
