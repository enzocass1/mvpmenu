import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import DashboardLayout from '../components/ui/DashboardLayout'
import { Card, Badge, Button, PageHeader } from '../components/ui'
import { APP_UPDATES, UPDATE_TYPE_LABEL, markUpdatesSeen } from '../lib/appUpdates'

const TYPE_COLORS = {
  novita: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
  miglioramento: { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  correzione: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
}

// Pill compatto per il tipo di aggiornamento
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
 * Lista "Aggiornamenti": una scheda per ogni GIORNO di aggiornamenti.
 * La scheda raggruppa tutti gli aggiornamenti di quella data ed elenca i
 * titoli; cliccando si apre la pagina del giorno (/aggiornamenti/:id) con una
 * tab per ogni aggiornamento e il link condivisibile (utile per le email).
 */
function UpdatesPage({ session }) {
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

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
      localStorage.clear(); sessionStorage.clear()
      window.location.href = '/#/'; window.location.reload()
    } catch (error) { console.error('Errore logout:', error) }
  }

  const formatDate = (iso) => {
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return iso }
  }

  // Raggruppa gli aggiornamenti per data (giorno), piu' recente prima
  const byDate = {}
  APP_UPDATES.forEach((u) => { (byDate[u.date] = byDate[u.date] || []).push(u) })
  const days = Object.keys(byDate).sort().reverse()
  const today = new Date().toISOString().slice(0, 10)

  return (
    <DashboardLayout
      restaurantName={restaurant?.name}
      userName={session?.user?.email}
      isPremium={restaurant?.subscription_tier === 'premium'}
      permissions={['*']}
      onLogout={handleLogout}
    >
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <PageHeader title="Aggiornamenti" subtitle="Le novità e i miglioramenti dell'app. Apri una giornata per i dettagli e il link da condividere." />

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
          {days.map((date) => {
            const ups = byDate[date]
            const isToday = date === today
            // Conteggio per tipo, per un sottotitolo utile
            const counts = ups.reduce((acc, u) => { acc[u.type] = (acc[u.type] || 0) + 1; return acc }, {})
            const parts = []
            if (counts.novita) parts.push(`${counts.novita} novità`)
            if (counts.miglioramento) parts.push(`${counts.miglioramento} migliorie`)
            if (counts.correzione) parts.push(`${counts.correzione} correzioni`)

            return (
              <Card key={date} padding={isMobile ? 'md' : 'lg'} hoverable onClick={() => navigate(`/aggiornamenti/${ups[0].id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, flexWrap: 'wrap', marginBottom: tokens.spacing.sm }}>
                  {isToday && <Badge variant="error">Oggi</Badge>}
                  <span style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[500] }}>{formatDate(date)}</span>
                </div>

                <h2 style={{
                  margin: `0 0 ${tokens.spacing.xs}`,
                  fontSize: isMobile ? tokens.typography.fontSize.lg : tokens.typography.fontSize.xl,
                  fontWeight: tokens.typography.fontWeight.bold,
                  color: tokens.colors.black,
                }}>Aggiornamenti del {formatDate(date)}</h2>

                <p style={{
                  margin: `0 0 ${tokens.spacing.md}`,
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.gray[600],
                }}>{ups.length} aggiornament{ups.length === 1 ? 'o' : 'i'}{parts.length ? ` · ${parts.join(' · ')}` : ''}</p>

                <ul style={{ margin: `0 0 ${tokens.spacing.md}`, paddingLeft: tokens.spacing.lg, display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
                  {ups.map((u) => (
                    <li key={u.id} style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[800], lineHeight: tokens.typography.lineHeight.normal }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: tokens.spacing.sm, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>{u.title}</span>
                        <TypePill type={u.type} />
                      </span>
                    </li>
                  ))}
                </ul>

                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/aggiornamenti/${ups[0].id}`) }}>
                  Scopri gli aggiornamenti
                </Button>
              </Card>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default UpdatesPage
