import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import DashboardLayout from '../components/ui/DashboardLayout'
import { Card } from '../components/ui'
import { APP_UPDATES, getUpdateById, UPDATE_TYPE_LABEL, EXAMPLE_IMAGE, markUpdatesSeen } from '../lib/appUpdates'

const TYPE_COLORS = {
  novita: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
  miglioramento: { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  correzione: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
}

// Pill compatto per il tipo di aggiornamento (più piccolo dei Badge standard)
function TypePill({ type }) {
  const label = (UPDATE_TYPE_LABEL[type] || UPDATE_TYPE_LABEL.novita).label
  const c = TYPE_COLORS[type] || TYPE_COLORS.novita
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', flexShrink: 0,
      padding: '1px 6px', borderRadius: '999px',
      fontSize: '10px', fontWeight: 600, lineHeight: 1.5, letterSpacing: '0.2px',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

/**
 * Pagina di un giorno di aggiornamenti (/aggiornamenti/:id).
 * È un'unica pagina scorrevole con TUTTI i rapporti del giorno impilati.
 * In alto c'è un indice "toggle" apribile: cliccando un elemento si scorre
 * fino alla sua sezione. Ogni aggiornamento ha il suo link condivisibile
 * (apre la pagina già posizionata su quella sezione).
 */
function UpdateDetailPage({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [indexOpen, setIndexOpen] = useState(false)
  const sectionRefs = useRef({})

  const update = getUpdateById(id)
  // Tutti gli aggiornamenti dello stesso giorno (impilati nella pagina)
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

  // Scorri fino alla sezione dell'aggiornamento richiesto nell'URL
  useEffect(() => {
    const el = sectionRefs.current[id]
    if (!el) { try { window.scrollTo({ top: 0 }) } catch { /* no-op */ } return }
    const t = setTimeout(() => {
      try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch { /* no-op */ }
    }, 120)
    return () => clearTimeout(t)
  }, [id, sameDay.length])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.clear(); sessionStorage.clear()
      window.location.href = '/#/'; window.location.reload()
    } catch (error) { console.error('Errore logout:', error) }
  }

  const goToSection = (uid) => {
    setIndexOpen(false)
    if (uid === id) {
      const el = sectionRefs.current[uid]
      if (el) try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch { /* no-op */ }
    } else {
      navigate(`/aggiornamenti/${uid}`)
    }
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

        <h1 style={{ margin: `0 0 ${tokens.spacing.lg}`, fontSize: isMobile ? tokens.typography.fontSize.xl : tokens.typography.fontSize['2xl'], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.black }}>
          Aggiornamenti del {formatDate(update.date)}
        </h1>

        {/* Indice toggle apribile */}
        {sameDay.length > 1 && (
          <div style={{ marginBottom: tokens.spacing.xl, border: `1px solid ${tokens.colors.gray[200]}`, borderRadius: tokens.borderRadius.lg, overflow: 'hidden', background: tokens.colors.white }}>
            <button
              onClick={() => setIndexOpen((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm,
                width: '100%', textAlign: 'left', cursor: 'pointer',
                padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
                background: tokens.colors.gray[50], border: 'none',
              }}
            >
              <span style={{ fontSize: tokens.typography.fontSize.sm, fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.black }}>
                Indice aggiornamenti ({sameDay.length})
              </span>
              <span style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[500], transform: indexOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
            </button>

            {indexOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${tokens.colors.gray[200]}` }}>
                {sameDay.map((u, i) => {
                  const active = u.id === id
                  return (
                    <button
                      key={u.id}
                      onClick={() => goToSection(u.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm,
                        width: '100%', textAlign: 'left', cursor: 'pointer',
                        padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                        background: active ? tokens.colors.gray[50] : tokens.colors.white,
                        border: 'none',
                        borderTop: i === 0 ? 'none' : `1px solid ${tokens.colors.gray[100]}`,
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, minWidth: 0 }}>
                        <span style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.gray[400], width: '18px', flexShrink: 0 }}>{i + 1}.</span>
                        <span style={{ fontSize: tokens.typography.fontSize.sm, fontWeight: active ? tokens.typography.fontWeight.semibold : tokens.typography.fontWeight.medium, color: active ? tokens.colors.black : tokens.colors.gray[800] }}>
                          {u.title}
                        </span>
                      </span>
                      <TypePill type={u.type} />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tutti i rapporti del giorno, impilati */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing['2xl'] }}>
          {sameDay.map((u) => {
            const image = EXAMPLE_IMAGE[u.id]
            const active = u.id === id
            return (
              <section
                key={u.id}
                ref={(el) => { sectionRefs.current[u.id] = el }}
                style={{ scrollMarginTop: tokens.spacing.lg }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, flexWrap: 'wrap', marginBottom: tokens.spacing.sm }}>
                  <TypePill type={u.type} />
                  <span style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[500] }}>{formatDate(u.date)}</span>
                </div>

                <h2 style={{
                  margin: `0 0 ${tokens.spacing.lg}`,
                  fontSize: isMobile ? tokens.typography.fontSize.xl : tokens.typography.fontSize['2xl'],
                  fontWeight: tokens.typography.fontWeight.bold,
                  color: tokens.colors.black,
                  lineHeight: tokens.typography.lineHeight.tight,
                  // Evidenzia leggermente la sezione aperta dal link
                  ...(active ? { borderLeft: `3px solid ${tokens.colors.black}`, paddingLeft: tokens.spacing.md } : {}),
                }}>
                  {u.title}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
                  <Card padding={isMobile ? 'md' : 'lg'}>
                    <div style={sectionTitle}>Cos'è</div>
                    <p style={{ margin: 0, fontSize: tokens.typography.fontSize.base, lineHeight: tokens.typography.lineHeight.relaxed, color: tokens.colors.gray[700] }}>
                      {u.description}
                    </p>
                  </Card>

                  {u.steps?.length > 0 && (
                    <Card padding={isMobile ? 'md' : 'lg'}>
                      <div style={sectionTitle}>Come si usa</div>
                      <ol style={{ margin: 0, paddingLeft: tokens.spacing.lg, display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
                        {u.steps.map((s, i) => (
                          <li key={i} style={{ fontSize: tokens.typography.fontSize.base, lineHeight: tokens.typography.lineHeight.normal, color: tokens.colors.gray[800] }}>{s}</li>
                        ))}
                      </ol>
                    </Card>
                  )}

                  {image && (
                    <Card padding={isMobile ? 'md' : 'lg'}>
                      <div style={sectionTitle}>Esempio</div>
                      <img src={image} alt={u.title} style={{ display: 'block', width: '100%', borderRadius: tokens.borderRadius.md, border: `1px solid ${tokens.colors.gray[200]}` }} />
                    </Card>
                  )}
                </div>
              </section>
            )
          })}
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
