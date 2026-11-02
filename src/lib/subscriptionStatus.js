// Stato abbonamento (pagamento via bonifico, scadenza impostata dal super admin).
// Regola: scaduto da 0-15 giorni = tolleranza (tutto funziona, con avviso);
// oltre 15 giorni = bloccato (solo Impostazioni; menu pubblico spento).

export const GRACE_DAYS = 15

// Prezzo mensile di listino (precompilato nel form pagamenti del super admin)
export const MONTHLY_PRICE = 29

const MS_DAY = 24 * 60 * 60 * 1000

/**
 * Stato abbonamento di un ristorante.
 * @returns {{state: 'none'|'active'|'grace'|'blocked', expiresAt: string|null, daysLeft: number|null, graceDaysLeft: number|null}}
 *  - none: nessuna scadenza impostata (nessun limite)
 *  - active: pagato, con daysLeft giorni rimanenti
 *  - grace: scaduto da meno di 15 giorni (graceDaysLeft = giorni prima del blocco)
 *  - blocked: scaduto da oltre 15 giorni
 */
export function getSubscriptionState(restaurant) {
  const exp = restaurant?.subscription_expires_at
  if (!exp) return { state: 'none', expiresAt: null, daysLeft: null, graceDaysLeft: null }

  const now = Date.now()
  const end = new Date(exp).getTime()
  if (Number.isNaN(end)) return { state: 'none', expiresAt: null, daysLeft: null, graceDaysLeft: null }

  if (now <= end) {
    return { state: 'active', expiresAt: exp, daysLeft: Math.ceil((end - now) / MS_DAY), graceDaysLeft: null }
  }
  const blockAt = end + GRACE_DAYS * MS_DAY
  if (now <= blockAt) {
    return { state: 'grace', expiresAt: exp, daysLeft: null, graceDaysLeft: Math.ceil((blockAt - now) / MS_DAY) }
  }
  return { state: 'blocked', expiresAt: exp, daysLeft: null, graceDaysLeft: null }
}

export const isSubscriptionBlocked = (restaurant) => getSubscriptionState(restaurant).state === 'blocked'

export const formatDateIt = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return '—' }
}
