/**
 * Staff Dashboard - Home page for staff members
 * Uses permission-based filtering to show only authorized menu items
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Card, Button, KPICard, EmptyState, Spinner } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'

function StaffDashboard() {
  const { subdomain } = useParams()
  const navigate = useNavigate()
  const [staffSession, setStaffSession] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    ordersToday: 0,
    revenueToday: 0,
    ordersActive: 0,
  })

  useEffect(() => {
    checkAccess()
  }, [subdomain])

  useEffect(() => {
    if (staffSession?.restaurant_id) {
      loadRestaurant()
      loadStats()
    }
  }, [staffSession])

  const checkAccess = async () => {
    try {
      // Load staff session from localStorage
      const sessionData = localStorage.getItem('staff_session')
      if (!sessionData) {
        console.log('❌ No staff session found, redirecting to login')
        navigate(`/staff/${subdomain}`)
        return
      }

      const session = JSON.parse(sessionData)

      // Verify subdomain matches
      if (session.subdomain !== subdomain) {
        console.log('❌ Subdomain mismatch, clearing session')
        localStorage.removeItem('staff_session')
        navigate(`/staff/${subdomain}`)
        return
      }

      setStaffSession(session)
      setLoading(false)
    } catch (error) {
      console.error('❌ Error checking access:', error)
      navigate(`/staff/${subdomain}`)
    }
  }

  const loadRestaurant = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', staffSession.restaurant_id)
        .single()

      if (error) throw error
      setRestaurant(data)
    } catch (error) {
      console.error('Error loading restaurant:', error)
    }
  }

  const loadStats = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Load today's orders count
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, total')
        .eq('restaurant_id', staffSession.restaurant_id)
        .gte('created_at', today.toISOString())

      if (ordersError) throw ordersError

      // Load active orders count
      const { data: activeData, error: activeError } = await supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', staffSession.restaurant_id)
        .in('status', ['pending', 'in_progress', 'ready'])

      if (activeError) throw activeError

      // Calculate stats
      const ordersToday = ordersData?.length || 0
      const revenueToday = ordersData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
      const ordersActive = activeData?.length || 0

      setStats({
        ordersToday,
        revenueToday,
        ordersActive,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('staff_session')
    navigate(`/staff/${subdomain}`)
  }

  if (loading) {
    return (
      <DashboardLayout
        restaurantName={restaurant?.name}
        userName={staffSession?.name}
        permissions={staffSession?.permissions || []}
      >
        <Spinner size="lg" text="Caricamento dashboard..." centered />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      restaurantName={restaurant?.name}
      userName={staffSession?.name}
      permissions={staffSession?.permissions || []}
      onLogout={handleLogout}
    >
      {/* Welcome Section */}
      <Card padding="xl">
        <div style={styles.welcomeSection}>
          <div>
            <h1 style={styles.welcomeTitle}>
              Benvenuto, {staffSession?.name}
            </h1>
            <p style={styles.welcomeSubtitle}>
              {staffSession?.role_name && (
                <span style={{
                  color: staffSession?.role_color || '#666',
                  fontWeight: 600
                }}>
                  {staffSession.role_name}
                </span>
              )}
              {' '}&bull; {restaurant?.name}
            </p>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <KPICard
          title="Ordini Oggi"
          value={stats.ordersToday}
          variant="info"
        />
        <KPICard
          title="Incasso Oggi"
          value={`€${stats.revenueToday.toFixed(2)}`}
          variant="success"
        />
        <KPICard
          title="Ordini Attivi"
          value={stats.ordersActive}
          variant="warning"
        />
      </div>

      {/* Quick Actions */}
      <Card padding="xl">
        <h2 style={styles.sectionTitle}>Azioni Rapide</h2>
        <div style={styles.actionsGrid}>
          {staffSession?.permissions?.includes('orders.view_all') && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(`/staff/${subdomain}/orders`)}
            >
              Visualizza Ordini
            </Button>
          )}
          {staffSession?.permissions?.includes('cashier.access') && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/cassa')}
            >
              Apri Cassa
            </Button>
          )}
        </div>
      </Card>
    </DashboardLayout>
  )
}

const styles = {
  welcomeSection: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '24px',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#000',
    margin: 0,
    marginBottom: '8px',
  },
  welcomeSubtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginTop: '24px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: 0,
    marginBottom: '20px',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
}

export default StaffDashboard
