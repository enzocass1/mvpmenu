// Notifiche email al team MVP Menu (nuovi ticket, richieste demo).
// Usa FormSubmit (formsubmit.co): inoltra il messaggio alla casella indicata, senza server email.
// La prima volta FormSubmit invia a questa casella un'email di attivazione da confermare.
// La notifica è "in più": i dati sono sempre salvati anche nel database (super-admin).

export const ADMIN_EMAIL = 'mvpmenudigital@gmail.com'

export async function notifyAdmin(subject, fields) {
  try {
    await fetch(`https://formsubmit.co/ajax/${ADMIN_EMAIL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ _subject: subject, _template: 'table', _captcha: 'false', ...fields }),
    })
  } catch {
    // Non bloccante: la richiesta è comunque salvata nel database
  }
}
