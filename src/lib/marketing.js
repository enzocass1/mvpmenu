// Contenuti commerciali condivisi (home pubblica e pagina di accesso):
// prezzi, prova gratuita ed elenco funzioni. Tenerli allineati a src/lib/legalDocs.js.

export const PRICING = {
  monthly: 29,          // € al mese
  yearly: 290,          // € all'anno (2 mesi omaggio)
  yearlyFull: 348,      // 12 x 29
  trialDays: 30,
}

// Menu demo pubblico (ristorante "MVP - MENU DEMO")
export const DEMO_MENU_PATH = '/menu/prestige-test'

export const FEATURE_GROUPS = [
  { title: 'Menu digitale', items: [
    'Menu online con QR code, sempre aggiornato',
    '3 stili grafici, personalizzabili dall\'editor',
    'Foto, descrizioni, varianti e prezzi',
    'Allergeni a norma (Reg. UE 1169/2011)',
    'Vetrina "Più venduti" e "Novità"',
    'Ricerca e preferiti per i clienti',
  ] },
  { title: 'Ordini e tavoli', items: [
    'Ordini dal telefono del cliente, al tavolo',
    'Conferma degli ordini da parte dello staff',
    'Note e varianti su ogni prodotto',
    'Sale, tavoli e cambio tavolo',
    'Storico completo degli ordini',
  ] },
  { title: 'Cassa', items: [
    'Cassa al banco e ai tavoli',
    'Prodotti preferiti a portata di tocco',
    'Preconto e chiusura del conto',
  ] },
  { title: 'Staff', items: [
    'Accesso dedicato per camerieri',
    'Ruoli e permessi personalizzabili',
    'Ogni ordine registra chi l\'ha preso',
  ] },
  { title: 'Inventario', items: [
    'Scorte che si scalano a ogni vendita',
    'Carichi, scarti, conteggi e storico',
    'Avviso scorta bassa ed "Esaurito" automatico nel menu',
  ] },
  { title: 'Analytics', items: [
    'Fatturato e trend, confronto col periodo precedente',
    'Vendite per fascia oraria, giorno e mese',
    'Prodotti più e meno venduti',
    'Scontrino medio e margine sui costi',
  ] },
  { title: 'Ovunque tu sia', items: [
    'In tempo reale da telefono, tablet e PC',
    'Si installa come app, senza store',
    'Assistenza direttamente dall\'app',
  ] },
]
