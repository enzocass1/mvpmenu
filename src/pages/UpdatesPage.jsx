import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import DashboardLayout from '../components/ui/DashboardLayout'
import { Card, Badge, Button, PageHeader } from '../components/ui'
import { APP_UPDATES, UPDATE_TYPE_LABEL, markUpdatesSeen } from '../lib/appUpdates'

const TYPE_TO_BADGE = { novita: 'error', miglioramento: 'info', correzione: 'success' }

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
                  {ups.map((u) => {
                    const label = (UPDATE_TYPE_LABEL[u.type] || UPDATE_TYPE_LABEL.novita).label
                    return (
                      <li key={u.id} style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[800], lineHeight: tokens.typography.lineHeight.normal }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: tokens.spacing.sm, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>{u.title}</span>
                          <Badge variant={TYPE_TO_BADGE[u.type] || 'default'} size="sm">{label}</Badge>
                        </span>
                      </li>
                    )
                  })}
                </ul>

                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/aggiornamenti/${ups[0].id}`) }}>
                  Apri la giornata
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
