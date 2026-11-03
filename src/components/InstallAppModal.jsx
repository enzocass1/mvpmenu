import React, { useState, useEffect } from 'react'
import { tokens } from '../styles/tokens'
import { canPromptInstall, promptInstall, isAppInstalled } from '../lib/installPrompt'

// Icone (SVG, niente emoji): loghi Android e Apple, scarica, condividi, menu, conferma
const AndroidIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path fillRule="evenodd" d="M2.6 18.6a9.4 8.9 0 0 1 18.8 0zM8.1 13.2a1.15 1.15 0 1 0 0 2.3a1.15 1.15 0 1 0 0-2.3zM15.9 13.2a1.15 1.15 0 1 0 0 2.3a1.15 1.15 0 1 0 0-2.3z" />
    <path d="M7.4 11.3 5.5 8.1M16.6 11.3l1.9-3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)
const AppleIcon = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
)
const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...line} aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
)
const ShareIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...line} aria-hidden="true" style={{ verticalAlign: '-2px' }}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v13" /></svg>
)
const DotsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: '-2px' }}><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
)
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...line} strokeWidth="2.4" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M20 6 9 17l-5-5" /></svg>
)

/**
 * Modal "Scarica app": spiega come aggiungere MVP Menu alla schermata home.
 * Due schede: Android (Chrome) e iPhone (Safari). Su Android, se il browser
 * lo permette, mostra anche il bottone che apre il popup nativo di installazione.
 */
function InstallAppModal({ isOpen, onClose }) {
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
  const [tab, setTab] = useState(isIOS ? 'ios' : 'android')
  const [nativeAvailable, setNativeAvailable] = useState(canPromptInstall())
  const [done, setDone] = useState(isAppInstalled())

  useEffect(() => {
    const onAvail = () => setNativeAvailable(true)
    const onInstalled = () => { setDone(true); setNativeAvailable(false) }
    window.addEventListener('pwa-install-available', onAvail)
    window.addEventListener('pwa-installed', onInstalled)
    return () => {
      window.removeEventListener('pwa-install-available', onAvail)
      window.removeEventListener('pwa-installed', onInstalled)
    }
  }, [])

  if (!isOpen) return null

  const handleNativeInstall = async () => {
    const ok = await promptInstall()
    if (ok) setDone(true)
    setNativeAvailable(canPromptInstall())
  }

  const Step = ({ n, children }) => (
    <div style={styles.step}>
      <span style={styles.stepNumber}>{n}</span>
      <span style={styles.stepText}>{children}</span>
    </div>
  )

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>Scarica app</h3>
          <button onClick={onClose} style={styles.closeButton} aria-label="Chiudi">×</button>
        </div>

        <p style={styles.subtitle}>
          Aggiungi MVP Menu alla schermata del telefono: si apre a tutto schermo come una vera app, con la sua icona.
        </p>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tabButton, ...(tab === 'android' ? styles.tabButtonActive : {}) }}
            onClick={() => setTab('android')}
          >
            <AndroidIcon /> Android
          </button>
          <button
            style={{ ...styles.tabButton, ...(tab === 'ios' ? styles.tabButtonActive : {}) }}
            onClick={() => setTab('ios')}
          >
            <AppleIcon /> iPhone (Safari)
          </button>
        </div>

        {/* Contenuto */}
        <div style={styles.body}>
          {done && (
            <div style={styles.successBox}><CheckIcon /> <span>Fatto! L'app è installata: cerca l'icona MVP Menu sul telefono.</span></div>
          )}

          {tab === 'android' ? (
            <>
              {nativeAvailable && !done && (
                <button style={styles.installNowButton} onClick={handleNativeInstall}>
                  <DownloadIcon /> Installa ora
                </button>
              )}
              {nativeAvailable && !done && <div style={styles.orDivider}>oppure manualmente:</div>}
              <Step n={1}>Apri questa pagina con <strong>Chrome</strong> sul telefono.</Step>
              <Step n={2}>Tocca il menu <strong><DotsIcon /></strong> in alto a destra.</Step>
              <Step n={3}>Tocca <strong>"Aggiungi a schermata Home"</strong> (o "Installa app").</Step>
              <Step n={4}>Conferma: l'icona <strong>MVP Menu</strong> appare sul telefono.</Step>
            </>
          ) : (
            <>
              <Step n={1}>Apri questa pagina con <strong>Safari</strong> su iPhone/iPad.</Step>
              <Step n={2}>Tocca il tasto <strong>Condividi</strong> <ShareIcon /> (quadrato con freccia, in basso).</Step>
              <Step n={3}>Scorri e tocca <strong>"Aggiungi alla schermata Home"</strong>.</Step>
              <Step n={4}>Tocca <strong>"Aggiungi"</strong>: l'icona <strong>MVP Menu</strong> appare sul telefono.</Step>
              <div style={styles.note}>Nota: da iPhone funziona solo con Safari (non da Chrome o altre app).</div>
            </>
          )}
        </div>

        <button style={styles.closeBottomButton} onClick={onClose}>Chiudi</button>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 11000,
    padding: '20px',
  },
  modal: {
    background: tokens.colors.white,
    borderRadius: '14px',
    width: '100%',
    maxWidth: '420px',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '20px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  title: {
    margin: 0,
    fontSize: '19px',
    fontWeight: 700,
    color: tokens.colors.black,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '26px',
    lineHeight: 1,
    cursor: 'pointer',
    color: tokens.colors.gray[500],
    padding: '2px 6px',
  },
  subtitle: {
    margin: '0 0 14px',
    fontSize: '13px',
    color: tokens.colors.gray[600],
    lineHeight: 1.45,
  },
  tabs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '16px',
  },
  tabButton: {
    padding: '10px 8px',
    fontSize: '14px',
    fontWeight: 600,
    border: `1px solid ${tokens.colors.gray[300]}`,
    borderRadius: '10px',
    background: tokens.colors.white,
    color: tokens.colors.gray[700],
    cursor: 'pointer',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  tabButtonActive: {
    background: tokens.colors.black,
    color: tokens.colors.white,
    borderColor: tokens.colors.black,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  stepNumber: {
    flexShrink: 0,
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: tokens.colors.gray[100],
    color: tokens.colors.black,
    fontSize: '13px',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: '14px',
    color: tokens.colors.gray[800],
    lineHeight: 1.5,
    paddingTop: '2px',
  },
  installNowButton: {
    width: '100%',
    padding: '13px',
    fontSize: '15px',
    fontWeight: 700,
    background: tokens.colors.black,
    color: tokens.colors.white,
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  orDivider: {
    textAlign: 'center',
    fontSize: '12px',
    color: tokens.colors.gray[500],
  },
  successBox: {
    padding: '10px 12px',
    borderRadius: '10px',
    background: '#e8f5e9',
    border: '1px solid #c8e6c9',
    color: '#1b5e20',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  note: {
    fontSize: '12px',
    color: tokens.colors.gray[500],
    fontStyle: 'italic',
  },
  closeBottomButton: {
    width: '100%',
    marginTop: '18px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    background: tokens.colors.white,
    color: tokens.colors.gray[700],
    border: `1px solid ${tokens.colors.gray[300]}`,
    borderRadius: '10px',
    cursor: 'pointer',
  },
}

export default InstallAppModal
