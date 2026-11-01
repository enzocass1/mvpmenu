import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import DashboardLayout from '../components/ui/DashboardLayout'
import { Card, Badge, Button } from '../components/ui'
import { getUpdateById, UPDATE_TYPE_LABEL, EXAMPLE_IMAGE, markUpdatesSeen } from '../lib/appUpdates'

const TYPE_TO_BADGE = { novita: 'error', miglioramento: 'info', correzione: 'success' }

/**
 * Pagina di un SINGOLO aggiornamento, con URL dedicato (/aggiornamenti/:id).
 * Mostra il contenuto completo in sezioni (descrizione, come si usa, esempio)
 * e un pulsante per copiare il link — utile per inviarlo nelle email ai clienti.
 */
function UpdateDetailPage({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [copied, setCopied] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const update = getUpdateById(id)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => { markUpdatesSeen() }, [])

  useEffect(() => {
    if (!session) return
    supabase.from('restaurants').select('name, subscription_tier').eq('user_id', session.user.id).single()
      .then(({ data }) => setRestaurant(data || null))
  }, [session])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.clear(); sessionStorage.clear()
      window.location.href = '/#/'; window.location.reload()
    } catch (error) { console.error('Errore logout:', error) }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const formatDate = (iso) => {
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return iso }
  }

  const layoutProps = {
    restaurantName: restaurant?.name,
    userName: session?.user?.email,
    isPremium: restaurant?.subscription_tier === 'premium',
    permissions: ['*'],
    onLogout: handleLogout,
  }

  if (!update) {
    return (
      <DashboardLayout {...layoutProps}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <BackLink navigate={navigate} />
          <Card><p style={{ margin: 0, color: tokens.colors.gray[600] }}>Aggiornamento non trovato.</p></Card>
        </div>
      </DashboardLayout>
    )
  }

  const t = UPDATE_TYPE_LABEL[update.type] || UPDATE_TYPE_LABEL.novita
  const image = EXAMPLE_IMAGE[update.id]
  const sectionTitle = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    marginBottom: tokens.spacing.md,
  }

  return (
    <DashboardLayout {...layoutProps}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <BackLink navigate={navigate} />

        {/* Intestazione */}
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, flexWrap: 'wrap', marginBottom: tokens.spacing.sm }}>
          <Badge variant={TYPE_TO_BADGE[update.type] || 'default'}>{t.label}</Badge>
          <span style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[500] }}>{formatDate(update.date)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacing.md, flexWrap: 'wrap', marginBottom: tokens.spacing.lg }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? tokens.typography.fontSize['2xl'] : tokens.typography.fontSize['3xl'], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.black, lineHeight: tokens.typography.lineHeight.tight }}>
            {update.title}
          </h1>
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? 'Link copiato' : 'Copia link'}
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
          {/* Sezione: Descrizione */}
          <Card padding={isMobile ? 'md' : 'lg'}>
            <div style={sectionTitle}>Cos'è</div>
            <p style={{ margin: 0, fontSize: tokens.typography.fontSize.base, lineHeight: tokens.typography.lineHeight.relaxed, color: tokens.colors.gray[700] }}>
              {update.description}
            </p>
          </Card>

          {/* Sezione: Come si usa */}
          {update.steps?.length > 0 && (
            <Card padding={isMobile ? 'md' : 'lg'}>
              <div style={sectionTitle}>Come si usa</div>
              <ol style={{ margin: 0, paddingLeft: tokens.spacing.lg, display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
                {update.steps.map((s, i) => (
                  <li key={i} style={{ fontSize: tokens.typography.fontSize.base, lineHeight: tokens.typography.lineHeight.normal, color: tokens.colors.gray[800] }}>{s}</li>
                ))}
              </ol>
            </Card>
          )}

          {/* Sezione: Esempio (immagine/GIF) */}
          {image && (
            <Card padding={isMobile ? 'md' : 'lg'}>
              <div style={sectionTitle}>Esempio</div>
              <img src={image} alt={update.title} style={{ display: 'block', width: '100%', borderRadius: tokens.borderRadius.md, border: `1px solid ${tokens.colors.gray[200]}` }} />
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function BackLink({ navigate }) {
  return (
    <button
      onClick={() => navigate('/aggiornamenti')}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: tokens.spacing.xs,
        background: 'none', border: 'none', padding: 0, marginBottom: tokens.spacing.md,
        color: tokens.colors.gray[600], fontSize: tokens.typography.fontSize.sm,
        fontWeight: tokens.typography.fontWeight.medium, cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = tokens.colors.black }}
      onMouseLeave={(e) => { e.currentTarget.style.color = tokens.colors.gray[600] }}
    >
      <span aria-hidden="true">←</span> Aggiornamenti
    </button>
  )
}

export default UpdateDetailPage
