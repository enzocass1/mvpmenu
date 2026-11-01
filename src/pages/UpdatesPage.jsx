import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import DashboardLayout from '../components/ui/DashboardLayout'
import { Card, Badge, Button, PageHeader } from '../components/ui'
import { APP_UPDATES, UPDATE_TYPE_LABEL, markUpdatesSeen } from '../lib/appUpdates'

const TYPE_TO_BADGE = { novita: 'error', miglioramento: 'info', correzione: 'success' }

/**
 * Lista "Aggiornamenti": una scheda per ogni aggiornamento, con alcuni punti
 * chiave; cliccando si apre la pagina dedicata (/aggiornamenti/:id) col
 * contenuto completo e un link condivisibile (utile per le email ai clienti).
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

  return (
    <DashboardLayout
      restaurantName={restaurant?.name}
      userName={session?.user?.email}
      isPremium={restaurant?.subscription_tier === 'premium'}
      permissions={['*']}
      onLogout={handleLogout}
    >
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <PageHeader title="Aggiornamenti" subtitle="Tutte le novità e i miglioramenti. Apri una scheda per i dettagli e il link da condividere." />

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
          {APP_UPDATES.map((u) => {
            const label = (UPDATE_TYPE_LABEL[u.type] || UPDATE_TYPE_LABEL.novita).label
            const highlights = (u.steps || []).slice(0, 3)
            return (
              <Card key={u.id} padding={isMobile ? 'md' : 'lg'} hoverable onClick={() => navigate(`/aggiornamenti/${u.id}`)}>
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
                  lineHeight: tokens.typography.lineHeight.normal,
                  color: tokens.colors.gray[700],
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{u.description}</p>

                {highlights.length > 0 && (
                  <ul style={{ margin: `0 0 ${tokens.spacing.md}`, paddingLeft: tokens.spacing.lg, display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
                    {highlights.map((h, i) => (
                      <li key={i} style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[700], lineHeight: tokens.typography.lineHeight.normal, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</li>
                    ))}
                  </ul>
                )}

                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/aggiornamenti/${u.id}`) }}>
                  Apri aggiornamento
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
