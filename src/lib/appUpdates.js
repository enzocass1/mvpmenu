// Registro aggiornamenti dell'app (changelog interno).
// L'elemento in cima all'array è il più recente: la sua `id` determina il badge "NOVITÀ".
// Ogni voce: data, titolo, tipo, descrizione e istruzioni passo-passo.

export const APP_UPDATES = [
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
