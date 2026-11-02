// Cattura l'evento nativo di installazione PWA (Chrome/Android).
// Va importato il prima possibile (main.jsx), perché l'evento scatta al caricamento.

let deferredPrompt = null
let installed = false

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // niente mini-banner automatico: lo mostriamo noi dal modal
    deferredPrompt = e
    window.dispatchEvent(new Event('pwa-install-available'))
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferredPrompt = null
    window.dispatchEvent(new Event('pwa-installed'))
  })
}

// true se possiamo aprire il popup nativo "Installa app" (Chrome/Android)
export const canPromptInstall = () => !!deferredPrompt

// true se l'app è già installata / aperta come app
export const isAppInstalled = () =>
  installed ||
  (typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true))

// Apre il popup nativo; ritorna true se l'utente accetta
export const promptInstall = async () => {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  return outcome === 'accepted'
}
