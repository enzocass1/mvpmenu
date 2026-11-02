// Registro aggiornamenti dell'app (changelog interno).
// L'elemento in cima all'array è il più recente: la sua `id` determina il badge "NOVITÀ".
// Ogni voce: data, titolo, tipo, descrizione e istruzioni passo-passo.

export const APP_UPDATES = [
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
