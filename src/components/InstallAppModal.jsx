import React, { useState, useEffect } from 'react'
import { tokens } from '../styles/tokens'
import { canPromptInstall, promptInstall, isAppInstalled } from '../lib/installPrompt'

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
            🤖 Android
          </button>
          <button
            style={{ ...styles.tabButton, ...(tab === 'ios' ? styles.tabButtonActive : {}) }}
            onClick={() => setTab('ios')}
          >
            🍎 iPhone (Safari)
          </button>
        </div>

        {/* Contenuto */}
        <div style={styles.body}>
          {done && (
            <div style={styles.successBox}>✅ Fatto! L'app è installata: cerca l'icona MVP Menu sul telefono.</div>
          )}

          {tab === 'android' ? (
            <>
              {nativeAvailable && !done && (
                <button style={styles.installNowButton} onClick={handleNativeInstall}>
                  ⬇️ Installa ora
                </button>
              )}
              {nativeAvailable && !done && <div style={styles.orDivider}>oppure manualmente:</div>}
              <Step n={1}>Apri questa pagina con <strong>Chrome</strong> sul telefono.</Step>
              <Step n={2}>Tocca il menu <strong>⋮</strong> in alto a destra.</Step>
              <Step n={3}>Tocca <strong>"Aggiungi a schermata Home"</strong> (o "Installa app").</Step>
              <Step n={4}>Conferma: l'icona <strong>MVP Menu</strong> appare sul telefono.</Step>
            </>
          ) : (
            <>
              <Step n={1}>Apri questa pagina con <strong>Safari</strong> su iPhone/iPad.</Step>
              <Step n={2}>Tocca il tasto <strong>Condividi</strong> <span style={styles.shareIcon}>⬆︎</span> (quadrato con freccia, in basso).</Step>
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
  shareIcon: {
    display: 'inline-block',
    border: `1.5px solid ${tokens.colors.gray[700]}`,
    borderRadius: '5px',
    padding: '0 5px',
    fontSize: '12px',
    lineHeight: '18px',
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
