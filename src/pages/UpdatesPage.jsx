import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import DashboardLayout from '../components/ui/DashboardLayout'
import { Card, Badge, Button, Modal, PageHeader } from '../components/ui'
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

// Tipo aggiornamento → variante Badge del design system
const TYPE_TO_BADGE = { novita: 'error', miglioramento: 'info', correzione: 'success' }

/**
 * Pagina "Aggiornamenti": elenco cronologico degli upgrade con data,
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
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <PageHeader title="Aggiornamenti" subtitle="Tutte le novità e i miglioramenti, con le istruzioni per usarli." />

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
          {APP_UPDATES.map((u) => {
            const label = (UPDATE_TYPE_LABEL[u.type] || UPDATE_TYPE_LABEL.novita).label
            return (
              <Card key={u.id} padding={isMobile ? 'md' : 'lg'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, flexWrap: 'wrap', marginBottom: tokens.spacing.sm }}>
                    <Badge variant={TYPE_TO_BADGE[u.type] || 'default'}>{label}</Badge>
                    <span style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[500] }}>{formatDate(u.date)}</span>
                  </div>
                  <h2 style={{
                    margin: `0 0 ${tokens.spacing.sm}`,
                    fontSize: isMobile ? tokens.typography.fontSize.lg : tokens.typography.fontSize.xl,
                    fontWeight: tokens.typography.fontWeight.bold,
                    color: tokens.colors.black,
                  }}>{u.title}</h2>
                  <p style={{
                    margin: `0 0 ${tokens.spacing.md}`,
                    fontSize: tokens.typography.fontSize.base,
                    lineHeight: tokens.typography.lineHeight.relaxed,
                    color: tokens.colors.gray[700],
                  }}>{u.description}</p>

                  {u.steps?.length > 0 && (
                    <div>
                      <div style={{
                        fontSize: tokens.typography.fontSize.sm,
                        fontWeight: tokens.typography.fontWeight.bold,
                        color: tokens.colors.black,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        marginBottom: tokens.spacing.sm,
                      }}>Come si usa</div>
                      <ol style={{ margin: 0, paddingLeft: tokens.spacing.lg, display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
                        {u.steps.map((s, i) => (
                          <li key={i} style={{ fontSize: tokens.typography.fontSize.base, lineHeight: tokens.typography.lineHeight.normal, color: tokens.colors.gray[800] }}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {EXAMPLE_IMAGE[u.id] && (
                    <div style={{ marginTop: tokens.spacing.md }}>
                      <Button variant="primary" size="sm" onClick={() => setExample({ src: EXAMPLE_IMAGE[u.id], title: u.title })}>
                        Guarda un esempio
                      </Button>
                    </div>
                  )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Modal esempio (immagine/GIF) */}
      <Modal isOpen={!!example} onClose={() => setExample(null)} size="lg">
        {example && (
          <>
            <div style={{
              padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
              paddingRight: tokens.spacing['2xl'],
              borderBottom: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
              fontSize: tokens.typography.fontSize.base,
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.black,
            }}>
              {example.title}
            </div>
            <div style={{ padding: tokens.spacing.md, overflow: 'auto', background: tokens.colors.gray[50] }}>
              <img src={example.src} alt={example.title} style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '72vh',
                margin: '0 auto',
                borderRadius: tokens.borderRadius.md,
                boxShadow: tokens.shadows.lg,
              }} />
            </div>
          </>
        )}
      </Modal>
    </DashboardLayout>
  )
}

export default UpdatesPage
