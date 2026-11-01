import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import DashboardLayout from '../components/ui/DashboardLayout'
import { APP_UPDATES, UPDATE_TYPE_LABEL, markUpdatesSeen } from '../lib/appUpdates'

// Immagine/esempio associato a ogni aggiornamento (screenshot in public/updates/)
const EXAMPLE_IMAGE = {
  '2026-11-01-live-editor': '/updates/live-editor.gif',
  '2026-11-01-portate': '/updates/cassa.png',
  '2026-11-01-stato-ordini': '/updates/ordini.png',
  '2026-11-01-chiudi-non-pagato': '/updates/cassa.png',
  '2026-11-01-margini': '/updates/analytics.png',
  '2026-11-01-riordino': '/updates/riordino.gif',
  '2026-11-01-temi-layout': '/updates/temi-layout.gif'
}

/**
 * Pagina "Aggiornamenti app": elenco cronologico degli upgrade con data,
 * descrizione e istruzioni passo-passo. All'apertura segna gli aggiornamenti
 * come letti, così il badge "NOVITÀ" nella sidebar scompare.
 */
function UpdatesPage({ session }) {
  const [restaurant, setRestaurant] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [example, setExample] = useState(null) // { src, title } dell'esempio aperto nel modal

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Segna come letti appena la pagina viene aperta
  useEffect(() => { markUpdatesSeen() }, [])

  useEffect(() => {
    if (!session) return
    supabase.from('restaurants').select('name, subscription_tier').eq('user_id', session.user.id).single()
      .then(({ data }) => setRestaurant(data || null))
  }, [session])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/#/'
      window.location.reload()
    } catch (error) {
      console.error('Errore logout:', error)
    }
  }

  const formatDate = (iso) => {
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return iso }
  }

  return (
    <DashboardLayout
      restaurantName={restaurant?.name}
      userName={session?.user?.email}
      isPremium={restaurant?.subscription_tier === 'premium'}
      permissions={['*']}
      onLogout={handleLogout}
    >
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ marginBottom: isMobile ? tokens.spacing.lg : tokens.spacing.xl }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? tokens.typography.fontSize['2xl'] : tokens.typography.fontSize['3xl'], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.black, marginBottom: tokens.spacing.sm }}>
            Aggiornamenti
          </h1>
          <p style={{ margin: 0, fontSize: tokens.typography.fontSize.base, color: tokens.colors.gray[600] }}>
            Tutte le novità e i miglioramenti, con le istruzioni per usarli.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {APP_UPDATES.map((u) => {
            const t = UPDATE_TYPE_LABEL[u.type] || UPDATE_TYPE_LABEL.novita
            return (
              <div key={u.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ ...tagStyle, color: t.color, background: t.bg }}>{t.label}</span>
                  <span style={{ fontSize: 13, color: tokens.colors.gray[500] }}>{formatDate(u.date)}</span>
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: isMobile ? 18 : 20, fontWeight: 700, color: tokens.colors.black }}>{u.title}</h2>
                <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.6, color: tokens.colors.gray[700] }}>{u.description}</p>
                {u.steps?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: tokens.colors.black, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Come si usa</div>
                    <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {u.steps.map((s, i) => (
                        <li key={i} style={{ fontSize: 14, lineHeight: 1.55, color: tokens.colors.gray[800] }}>{s}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {EXAMPLE_IMAGE[u.id] && (
                  <button
                    onClick={() => setExample({ src: EXAMPLE_IMAGE[u.id], title: u.title })}
                    style={ctaStyle}
                  >
                    <span aria-hidden="true">👁</span> Guarda un esempio
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal esempio (immagine) */}
      {example && (
        <div style={lightbox.overlay} onClick={() => setExample(null)}>
          <div style={lightbox.inner} onClick={(e) => e.stopPropagation()}>
            <div style={lightbox.head}>
              <span style={lightbox.title}>{example.title}</span>
              <button style={lightbox.close} onClick={() => setExample(null)} aria-label="Chiudi">×</button>
            </div>
            <div style={lightbox.body}>
              <img src={example.src} alt={example.title} style={lightbox.img} />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

const ctaStyle = {
  marginTop: 14,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  borderRadius: 10,
  border: 'none',
  background: tokens.colors.black,
  color: tokens.colors.white,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer'
}

const lightbox = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  inner: { background: '#fff', borderRadius: 14, maxWidth: 'min(960px, 96vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 16px', borderBottom: '1px solid #eee' },
  title: { fontSize: 15, fontWeight: 700, color: '#111' },
  close: { border: 'none', background: 'transparent', fontSize: 26, lineHeight: 1, cursor: 'pointer', color: '#555' },
  body: { padding: 12, overflow: 'auto', background: '#f3f4f6' },
  img: { display: 'block', maxWidth: '100%', maxHeight: '78vh', margin: '0 auto', borderRadius: 8, boxShadow: '0 4px 18px rgba(0,0,0,0.15)' }
}

const cardStyle = {
  background: tokens.colors.white,
  border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
  borderRadius: tokens.borderRadius.lg,
  padding: '18px 20px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
}

const tagStyle = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.3px'
}

export default UpdatesPage
