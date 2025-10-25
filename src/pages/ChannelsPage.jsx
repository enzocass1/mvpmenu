import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Card, Button, Input, Spinner, EmptyState } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'
import QRCode from 'qrcode'

/**
 * Channels Page - Shopify-like Design System
 * Menu Online, QR Code, Link condivisione
 */
function ChannelsPage({ session }) {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  useEffect(() => {
    if (session) {
      loadRestaurant()
    }
  }, [session])

  const loadRestaurant = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error) throw error
      setRestaurant(data)

      if (data?.subdomain) {
        const menuUrl = `${window.location.origin}/#/menu/${data.subdomain}`
        const qrUrl = await QRCode.toDataURL(menuUrl, {
          width: 300,
          margin: 2,
        })
        setQrCodeUrl(qrUrl)
      }
    } catch (error) {
      console.error('Errore caricamento ristorante:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const handleDownloadQR = () => {
    const link = document.createElement('a')
    link.download = `qr-code-${restaurant.subdomain}.png`
    link.href = qrCodeUrl
    link.click()
  }

  const handleCopyLink = () => {
    const menuUrl = `${window.location.origin}/#/menu/${restaurant.subdomain}`
    navigator.clipboard.writeText(menuUrl)
    alert('Link copiato negli appunti!')
  }

  const isPremium = restaurant?.subscription_tier === 'premium'
  const menuUrl = restaurant?.subdomain
    ? `${window.location.origin}/#/menu/${restaurant.subdomain}`
    : ''

  const pageHeaderStyles = {
    marginBottom: tokens.spacing.xl,
  }

  const titleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.sm,
  }

  const subtitleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.gray[600],
  }

  const sectionTitleStyles = {
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.lg,
  }

  const qrContainerStyles = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacing.lg,
  }

  const buttonGroupStyles = {
    display: 'flex',
    gap: tokens.spacing.md,
    flexWrap: 'wrap',
  }

  if (loading) {
    return (
      <DashboardLayout
        restaurantName={restaurant?.name}
        userName={session?.user?.email}
        isPremium={isPremium}
        onLogout={handleLogout}
      >
        <Spinner size="lg" text="Caricamento..." centered />
      </DashboardLayout>
    )
  }

  if (!restaurant?.subdomain) {
    return (
      <DashboardLayout
        restaurantName={restaurant?.name}
        userName={session?.user?.email}
        isPremium={isPremium}
        onLogout={handleLogout}
      >
        <Card>
          <EmptyState
            title="Configurazione incompleta"
            description="Completa la configurazione del tuo ristorante nelle impostazioni per attivare i canali di vendita."
          />
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      restaurantName={restaurant?.name}
      userName={session?.user?.email}
      isPremium={isPremium}
      onLogout={handleLogout}
    >
      {/* Page Header */}
      <div style={pageHeaderStyles}>
        <h1 style={titleStyles}>Canali di Vendita</h1>
        <p style={subtitleStyles}>
          Condividi il tuo menu online con i clienti
        </p>
      </div>

      {/* QR Code Section */}
      <h2 style={sectionTitleStyles}>QR Code Menu</h2>
      <Card padding="xl" style={{ marginBottom: tokens.spacing.xl }}>
        <div style={qrContainerStyles}>
          {qrCodeUrl && (
            <img
              src={qrCodeUrl}
              alt="QR Code Menu"
              style={{
                maxWidth: '300px',
                width: '100%',
                height: 'auto',
                border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
                borderRadius: tokens.borderRadius.md,
              }}
            />
          )}
          <div style={buttonGroupStyles}>
            <Button variant="primary" onClick={handleDownloadQR}>
              Scarica QR Code
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              Stampa QR Code
            </Button>
          </div>
        </div>
      </Card>

      {/* Link Condivisione Section */}
      <h2 style={sectionTitleStyles}>Link Condivisione</h2>
      <Card padding="lg" style={{ marginBottom: tokens.spacing.xl }}>
        <div style={{ display: 'flex', gap: tokens.spacing.md, flexDirection: 'column' }}>
          <Input
            label="URL Menu Pubblico"
            value={menuUrl}
            readOnly
            fullWidth
          />
          <div style={buttonGroupStyles}>
            <Button variant="primary" onClick={handleCopyLink}>
              Copia Link
            </Button>
            <Button variant="outline" onClick={() => window.open(menuUrl, '_blank')}>
              Apri Menu
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card padding="lg">
        <h3
          style={{
            margin: 0,
            fontSize: tokens.typography.fontSize.lg,
            fontWeight: tokens.typography.fontWeight.semibold,
            color: tokens.colors.black,
            marginBottom: tokens.spacing.sm,
          }}
        >
          Come usare il QR Code
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.gray[700],
            lineHeight: tokens.typography.lineHeight.relaxed,
          }}
        >
          1. Scarica o stampa il QR Code
          <br />
          2. Posizionalo sui tavoli del tuo ristorante
          <br />
          3. I clienti possono scannerizzarlo per visualizzare il menu e ordinare
          <br />
          4. Gli ordini arriveranno automaticamente nella sezione Ordini
        </p>
      </Card>
    </DashboardLayout>
  )
}

export default ChannelsPage
