import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import DashboardLayout from '../components/ui/DashboardLayout'
import { Card, Badge, Button } from '../components/ui'
import { APP_UPDATES, getUpdateById, UPDATE_TYPE_LABEL, EXAMPLE_IMAGE, markUpdatesSeen } from '../lib/appUpdates'

const TYPE_TO_BADGE = { novita: 'error', miglioramento: 'info', correzione: 'success' }

/**
 * Pagina di un giorno di aggiornamenti, con URL dedicato (/aggiornamenti/:id).
 * In alto ci sono le TAB (una per ogni aggiornamento dello stesso giorno);
 * ogni aggiornamento ha il suo link condivisibile. Sotto, il contenuto in
 * sezioni (Cos'è, Come si usa, Esempio) e un pulsante "Copia link".
 */
function UpdateDetailPage({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [copied, setCopied] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const tabsRef = useRef(null)

  const update = getUpdateById(id)
  // Tutti gli aggiornamenti dello stesso giorno (le "tab")
  const sameDay = update ? APP_UPDATES.filter((u) => u.date === update.date) : []

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

  // Rotellina = scroll orizzontale sulla barra delle tab
  useEffect(() => {
    const el = tabsRef.current
    if (!el) return
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { el.scrollLeft += e.deltaY; e.preventDefault() }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [sameDay.length])

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
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { setCopied(false) }
  }

  const formatDate = (iso) => {
    try { return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) }
    catch { return iso }
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
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
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
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <BackLink navigate={navigate} />

        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? tokens.typography.fontSize.xl : tokens.typography.fontSize['2xl'], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.black }}>
            Aggiornamenti del {formatDate(update.date)}
          </h1>
        </div>

        {/* Tab: una per aggiornamento del giorno */}
        {sameDay.length > 1 && (
          <div ref={tabsRef} style={{ display: 'flex', gap: tokens.spacing.sm, overflowX: 'auto', paddingBottom: tokens.spacing.sm, marginBottom: tokens.spacing.lg, scrollbarWidth: 'none' }}>
            {sameDay.map((u) => {
              const active = u.id === update.id
              return (
                <button
                  key={u.id}
                  onClick={() => navigate(`/aggiornamenti/${u.id}`)}
                  style={{
                    flexShrink: 0,
                    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                    borderRadius: tokens.borderRadius.full,
                    border: `1px solid ${active ? tokens.colors.black : tokens.colors.gray[300]}`,
                    background: active ? tokens.colors.black : tokens.colors.white,
                    color: active ? tokens.colors.white : tokens.colors.gray[700],
                    fontSize: tokens.typography.fontSize.sm,
                    fontWeight: tokens.typography.fontWeight.medium,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {u.title}
                </button>
              )
            })}
          </div>
        )}

        {/* Intestazione dell'aggiornamento attivo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, flexWrap: 'wrap', marginBottom: tokens.spacing.sm }}>
          <Badge variant={TYPE_TO_BADGE[update.type] || 'default'}>{t.label}</Badge>
          <span style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[500] }}>{formatDate(update.date)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacing.md, flexWrap: 'wrap', marginBottom: tokens.spacing.lg }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? tokens.typography.fontSize.xl : tokens.typography.fontSize['2xl'], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.black, lineHeight: tokens.typography.lineHeight.tight }}>
            {update.title}
          </h2>
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? 'Link copiato' : 'Copia link'}
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
          <Card padding={isMobile ? 'md' : 'lg'}>
            <div style={sectionTitle}>Cos'è</div>
            <p style={{ margin: 0, fontSize: tokens.typography.fontSize.base, lineHeight: tokens.typography.lineHeight.relaxed, color: tokens.colors.gray[700] }}>
              {update.description}
            </p>
          </Card>

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
