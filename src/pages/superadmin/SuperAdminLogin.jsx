/**
 * Super Admin Login Page
 *
 * Pagina di login per Super Admin con supporto 2FA:
 * - Step 1: Email + Password
 * - Step 2: Codice 2FA (se abilitato)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Alert } from '../../components/ui'
import superAdminService from '../../services/superAdminService'

function SuperAdminLogin() {
  const navigate = useNavigate()

  // State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Login: email + password (verifica lato server via Supabase Auth)
   */
  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await superAdminService.login(email, password)
      navigate('/super-admin/dashboard')
    } catch (err) {
      console.error('❌ Login error:', err)
      setError(err.message || 'Errore durante il login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Logo / Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>🔐 Super Admin</h1>
          <p style={styles.subtitle}>MVP Menu - Sistema di Gestione</p>
        </div>

        {/* Login Card */}
        <Card padding="xl" style={styles.card}>
          <form onSubmit={handlePasswordLogin}>
              <h2 style={styles.cardTitle}>Accedi</h2>
              <p style={styles.cardSubtitle}>
                Inserisci le tue credenziali per accedere al pannello Super Admin
              </p>

              {error && (
                <Alert variant="error" style={{ marginBottom: '24px' }}>
                  {error}
                </Alert>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@mvpmenu.com"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                style={{ marginTop: '8px' }}
              >
                {loading ? 'Accesso in corso...' : 'Accedi'}
              </Button>

              <p style={styles.helpText}>
                🔒 Questa pagina è protetta. Solo Super Admin autorizzati possono accedere.
              </p>
            </form>
        </Card>

        {/* Footer Info */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Hai problemi di accesso? Contatta il supporto tecnico
          </p>
          <p style={styles.footerCopyright}>
            © 2025 MVP Menu - Tutti i diritti riservati
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '24px',
  },
  content: {
    width: '100%',
    maxWidth: '440px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#fff',
    margin: 0,
    marginBottom: '8px',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.9)',
    margin: 0,
  },
  card: {
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#000',
    margin: 0,
    marginBottom: '8px',
  },
  cardSubtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    marginBottom: '32px',
    lineHeight: '1.5',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#000',
    marginBottom: '8px',
  },
  helpText: {
    fontSize: '13px',
    color: '#666',
    textAlign: 'center',
    marginTop: '24px',
    marginBottom: 0,
    lineHeight: '1.5',
  },
  backButton: {
    fontSize: '14px',
    color: '#667eea',
    cursor: 'pointer',
    marginBottom: '16px',
    display: 'inline-block',
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    marginTop: '32px',
  },
  footerText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.8)',
    margin: 0,
    marginBottom: '8px',
  },
  footerCopyright: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
    margin: 0,
  },
}

export default SuperAdminLogin
