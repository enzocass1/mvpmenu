import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { checkPremiumAccess } from '../utils/subscription'
import { tokens } from '../styles/tokens'
import { Card } from './ui'


/**
 * Componente per gestione impostazioni ordini al tavolo
 * Include: toggle attivazione, gestione camerieri, ordini prioritari
 * FUNZIONALITÀ PREMIUM: Richiede abbonamento Premium attivo
 *
 * NOTA: I tavoli ora vengono gestiti dalla sezione Cassa > Sale/Tavoli
 */
function OrderSettings({ restaurant }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    orders_enabled: false,
    number_of_tables: 0,
    priority_order_enabled: false,
    priority_order_price: 0
  })
  const [staff, setStaff] = useState([])
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    role: 'waiter'
  })
  const [message, setMessage] = useState({ text: '', type: '' })

  useEffect(() => {
    if (restaurant?.id) {
      loadSettings()
      loadStaff()
    }
  }, [restaurant?.id])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_order_settings')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setSettings(data)
      }
    } catch (error) {
      console.error('Errore caricamento impostazioni:', error)
      showMessage('Errore caricamento impostazioni', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_staff')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setStaff(data || [])
    } catch (error) {
      console.error('Errore caricamento staff:', error)
    }
  }

  const handleToggleOrders = async (enabled) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('restaurant_order_settings')
        .upsert({
          restaurant_id: restaurant.id,
          orders_enabled: enabled,
          number_of_tables: settings.number_of_tables || 0,
          priority_order_enabled: settings.priority_order_enabled || false,
          priority_order_price: settings.priority_order_price || 0
        }, {
          onConflict: 'restaurant_id'
        })

      if (error) throw error

      setSettings({ ...settings, orders_enabled: enabled })
      showMessage(enabled ? 'Ordini al tavolo attivati' : 'Ordini al tavolo disattivati', 'success')
    } catch (error) {
      console.error('Errore salvataggio:', error)
      showMessage('Errore salvataggio impostazioni', 'error')
    } finally {
      setSaving(false)
    }
  }


  const handleTogglePriorityOrder = async (enabled) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('restaurant_order_settings')
        .upsert({
          restaurant_id: restaurant.id,
          orders_enabled: settings.orders_enabled,
          number_of_tables: settings.number_of_tables || 0,
          priority_order_enabled: enabled,
          priority_order_price: settings.priority_order_price || 0
        }, {
          onConflict: 'restaurant_id'
        })

      if (error) throw error

      setSettings({ ...settings, priority_order_enabled: enabled })
      showMessage(enabled ? 'Priority Order attivato' : 'Priority Order disattivato', 'success')
    } catch (error) {
      console.error('Errore salvataggio:', error)
      showMessage('Errore salvataggio impostazioni', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSavePriorityPrice = async () => {
    if (settings.priority_order_price < 0) {
      showMessage('Inserisci un prezzo valido', 'error')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('restaurant_order_settings')
        .upsert({
          restaurant_id: restaurant.id,
          orders_enabled: settings.orders_enabled,
          number_of_tables: settings.number_of_tables || 0,
          priority_order_enabled: settings.priority_order_enabled || false,
          priority_order_price: settings.priority_order_price
        }, {
          onConflict: 'restaurant_id'
        })

      if (error) throw error
      showMessage('Prezzo Priority Order salvato', 'success')
    } catch (error) {
      console.error('Errore salvataggio:', error)
      showMessage('Errore salvataggio prezzo', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()

    if (!newStaff.name || !newStaff.email || !newStaff.password) {
      showMessage('Compila tutti i campi', 'error')
      return
    }

    setSaving(true)
    try {
      // Hash password (in produzione usa bcrypt o simile)
      const password_hash = btoa(newStaff.password) // Semplice encoding per demo

      const { error } = await supabase
        .from('restaurant_staff')
        .insert({
          restaurant_id: restaurant.id,
          name: newStaff.name,
          email: newStaff.email,
          password_hash,
          password: newStaff.password, // Salva password in chiaro per visualizzazione
          role: newStaff.role
        })

      if (error) throw error

      showMessage('Cameriere aggiunto con successo', 'success')
      setNewStaff({ name: '', email: '', password: '', role: 'waiter' })
      setShowAddStaff(false)
      loadStaff()
    } catch (error) {
      console.error('Errore aggiunta staff:', error)
      if (error.code === '23505') {
        showMessage('Email già esistente per questo ristorante', 'error')
      } else {
        showMessage('Errore aggiunta cameriere', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteStaff = async (staffId) => {
    if (!confirm('Sei sicuro di voler eliminare questo cameriere?')) return

    try {
      const { error } = await supabase
        .from('restaurant_staff')
        .delete()
        .eq('id', staffId)

      if (error) throw error

      showMessage('Cameriere eliminato', 'success')
      loadStaff()
    } catch (error) {
      console.error('Errore eliminazione staff:', error)
      showMessage('Errore eliminazione cameriere', 'error')
    }
  }

  const handleToggleStaffActive = async (staffId, currentActive) => {
    try {
      const { error } = await supabase
        .from('restaurant_staff')
        .update({ is_active: !currentActive })
        .eq('id', staffId)

      if (error) throw error

      showMessage('Stato cameriere aggiornato', 'success')
      loadStaff()
    } catch (error) {
      console.error('Errore aggiornamento staff:', error)
      showMessage('Errore aggiornamento stato', 'error')
    }
  }

  const showMessage = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => showMessage('Link copiato negli appunti', 'success'))
      .catch(() => showMessage('Impossibile copiare il link', 'error'))
  }

  // Controllo accesso Premium
  const premiumAccess = checkPremiumAccess(restaurant)
  const hasValidAccess = premiumAccess.hasValidAccess

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p>Caricamento impostazioni...</p>
      </div>
    )
  }

  // Mostra messaggio upgrade se non Premium
  if (!hasValidAccess) {
    return (
      <div style={styles.premiumRequired}>
        <div style={styles.premiumIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF9800" strokeWidth="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </div>
        <h3 style={styles.premiumTitle}>Funzionalità Premium</h3>
        <p style={styles.premiumDescription}>
          Gli ordini al tavolo sono una funzionalità esclusiva del piano Premium.
          Passa a Premium per sbloccare:
        </p>
        <ul style={styles.premiumFeaturesList}>
          <li style={styles.premiumFeature}>
            <span style={styles.checkmark}>✓</span>
            Ordini al tavolo con gestione in tempo reale
          </li>
          <li style={styles.premiumFeature}>
            <span style={styles.checkmark}>✓</span>
            Priority Order per ordini prioritari
          </li>
          <li style={styles.premiumFeature}>
            <span style={styles.checkmark}>✓</span>
            Gestione staff e camerieri
          </li>
          <li style={styles.premiumFeature}>
            <span style={styles.checkmark}>✓</span>
            Configurazione numero tavoli
          </li>
          <li style={styles.premiumFeature}>
            <span style={styles.checkmark}>✓</span>
            Categorie e prodotti illimitati
          </li>
          <li style={styles.premiumFeature}>
            <span style={styles.checkmark}>✓</span>
            Download QR Code e backup menu
          </li>
        </ul>
        <a
          href="/checkout"
          style={styles.upgradeButton}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#333'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#000'}
        >
          Passa a Premium - €30/mese
        </a>
        <p style={styles.premiumFooter}>
          Circa 1€ al giorno per tutte le funzionalità professionali
        </p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Messaggio toast */}
      {message.text && (
        <div style={{
          ...styles.toast,
          backgroundColor: message.type === 'success' ? '#4CAF50' : '#f44336'
        }}>
          {message.text}
        </div>
      )}

      {/* Ordine al Tavolo */}
      <Card>
        <div style={{ padding: tokens.spacing.xl }}>
          <h3 style={styles.cardTitle}>Ordine al Tavolo</h3>
          <div style={styles.toggleContainer}>
            <div>
              <h3 style={styles.sectionTitle}>Attiva Ordini al Tavolo</h3>
              <p style={styles.sectionDescription}>
                Permetti ai clienti di ordinare direttamente dal menu digitale
              </p>
            </div>
            <button
              onClick={() => handleToggleOrders(!settings.orders_enabled)}
              disabled={saving}
              style={{
                ...styles.toggle,
                backgroundColor: settings.orders_enabled ? '#34C759' : '#e0e0e0'
              }}
              aria-label={settings.orders_enabled ? 'Disattiva ordini' : 'Attiva ordini'}
            >
              <div style={{
                ...styles.toggleThumb,
                transform: settings.orders_enabled ? 'translateX(26px)' : 'translateX(0)'
              }} />
            </button>
          </div>

          {/* Link accesso per membri dello staff */}
          {settings.orders_enabled && (
            <div style={{ marginTop: tokens.spacing.lg }}>
            <h3 style={{
              margin: '0 0 15px 0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Link Accesso Staff
            </h3>

            <div style={{
              padding: '12px',
              background: '#F5F5F5',
              borderRadius: '6px',
              marginBottom: '20px',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#000000',
              wordBreak: 'break-all',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              <span style={{ flex: 1, minWidth: '200px' }}>
                {window.location.origin}/#/staff/{restaurant.subdomain}
              </span>
              <button
                onClick={() => copyToClipboard(`${window.location.origin}/#/staff/${restaurant.subdomain}`)}
                aria-label="Copia link accesso staff"
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000000',
                  background: '#FFFFFF',
                  border: '1px solid #000000',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
                onMouseLeave={(e) => e.target.style.background = '#FFFFFF'}
              >
                Copia
              </button>
            </div>

            {/* Scheda descrittiva ruoli */}
            <div style={{
              background: '#F9F9F9',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h4 style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: '#000'
              }}>
                Ruoli e Permessi
              </h4>

              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: '#2196F3',
                    color: '#fff'
                  }}>
                    CAMERIERE
                  </span>
                </div>
                <ul style={{
                  margin: '4px 0 0 0',
                  paddingLeft: '20px',
                  fontSize: '13px',
                  color: '#666',
                  lineHeight: '1.6'
                }}>
                  <li>Visualizza ordini in tempo reale</li>
                  <li>Cambia stato ordini (in preparazione, pronto, completato)</li>
                  <li>Visualizza dettagli ordini e tavoli</li>
                </ul>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: '#FF9800',
                    color: '#fff'
                  }}>
                    MANAGER
                  </span>
                </div>
                <ul style={{
                  margin: '4px 0 0 0',
                  paddingLeft: '20px',
                  fontSize: '13px',
                  color: '#666',
                  lineHeight: '1.6'
                }}>
                  <li>Tutte le funzioni del Cameriere</li>
                  <li>Gestione completa ordini (inclusa eliminazione)</li>
                  <li>Accesso alle statistiche e analisi</li>
                  <li>Visualizzazione cronologia ordini completa</li>
                </ul>
              </div>
            </div>
            </div>
          )}

          {/* Gestione Camerieri */}
          {settings.orders_enabled && (
            <div style={{ marginTop: tokens.spacing.xl }}>
            <div style={styles.staffHeader}>
              <div>
                <h3 style={styles.sectionTitle}>Camerieri</h3>
                <p style={styles.sectionDescription}>
                  Gestisci il personale che può accedere agli ordini
                </p>
              </div>
              <button
                onClick={() => setShowAddStaff(!showAddStaff)}
                style={styles.addButton}
              >
                {showAddStaff ? 'Annulla' : '+ Aggiungi Cameriere'}
              </button>
            </div>

            {/* Form Aggiungi Cameriere */}
            {showAddStaff && (
              <form onSubmit={handleAddStaff} style={styles.form}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Nome</label>
                    <input
                      type="text"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                      style={styles.input}
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email</label>
                    <input
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      style={styles.input}
                      placeholder="email@esempio.com"
                      required
                    />
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Password</label>
                    <input
                      type="password"
                      value={newStaff.password}
                      onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                      style={styles.input}
                      placeholder="Password"
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Ruolo</label>
                    <select
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                      style={styles.select}
                    >
                      <option value="waiter">Cameriere</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  style={styles.submitButton}
                >
                  {saving ? 'Aggiunta...' : 'Aggiungi Cameriere'}
                </button>
              </form>
            )}

            {/* Lista Camerieri */}
            {staff.length > 0 ? (
              <div style={styles.staffList}>
                {staff.map((member) => (
                  <div key={member.id} style={styles.staffCard}>
                    <div style={styles.staffInfo}>
                      <div>
                        <p style={styles.staffName}>{member.name}</p>
                        <p style={styles.staffEmail}>{member.email}</p>
                        {member.password && (
                          <p style={styles.staffPassword}>
                            <strong>Password:</strong> {member.password}
                          </p>
                        )}
                      </div>
                      <span style={{
                        ...styles.roleBadge,
                        backgroundColor: member.role === 'manager' ? '#FF9800' : '#2196F3'
                      }}>
                        {member.role === 'manager' ? 'Manager' : 'Cameriere'}
                      </span>
                    </div>
                    <div style={styles.staffActions}>
                      <button
                        onClick={() => handleToggleStaffActive(member.id, member.is_active)}
                        style={{
                          ...styles.actionButton,
                          backgroundColor: member.is_active ? '#4CAF50' : '#999'
                        }}
                      >
                        {member.is_active ? 'Attivo' : 'Disattivo'}
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(member.id)}
                        style={{
                          ...styles.actionButton,
                          backgroundColor: '#f44336'
                        }}
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.emptyMessage}>Nessun cameriere aggiunto</p>
            )}
            </div>
          )}
        </div>
      </Card>

      {/* Priority Order */}
      <Card>
        <div style={{ padding: tokens.spacing.xl }}>
          <h3 style={styles.cardTitle}>Priority Order</h3>
          <div style={styles.toggleContainer}>
          <div>
            <h3 style={styles.sectionTitle}>Attiva Priority Order</h3>
            <p style={styles.sectionDescription}>
              Permetti ai clienti di pagare per avere il proprio ordine preparato prioritariamente
            </p>
          </div>
          <button
            onClick={() => handleTogglePriorityOrder(!settings.priority_order_enabled)}
            disabled={saving}
            style={{
              ...styles.toggle,
              backgroundColor: settings.priority_order_enabled ? '#34C759' : '#e0e0e0'
            }}
            aria-label={settings.priority_order_enabled ? 'Disattiva Priority Order' : 'Attiva Priority Order'}
          >
            <div style={{
              ...styles.toggleThumb,
              transform: settings.priority_order_enabled ? 'translateX(26px)' : 'translateX(0)'
            }} />
          </button>
        </div>

        {settings.priority_order_enabled && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={styles.subsectionTitle}>Prezzo Priority Order</h4>
            <p style={styles.sectionDescription}>
              Imposta il prezzo che i clienti devono pagare per il servizio Priority Order
            </p>
            <div style={styles.inputGroup}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={styles.currencySymbol}>€</span>
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  value={settings.priority_order_price}
                  onChange={(e) => setSettings({ ...settings, priority_order_price: parseFloat(e.target.value) || 0 })}
                  style={{ ...styles.input, paddingLeft: '32px' }}
                  placeholder="Es. 2.00"
                />
              </div>
              <button
                onClick={handleSavePriorityPrice}
                disabled={saving || settings.priority_order_price < 0}
                style={styles.saveButton}
              >
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
          )}
        </div>
      </Card>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.lg
  },
  cardTitle: {
    margin: `0 0 ${tokens.spacing.lg} 0`,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px',
    color: '#666'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e0e0e0',
    borderTop: '3px solid #000',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  premiumRequired: {
    padding: '40px',
    textAlign: 'center',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '12px'
  },
  premiumIcon: {
    marginBottom: '20px'
  },
  premiumTitle: {
    margin: '0 0 12px 0',
    fontSize: '24px',
    fontWeight: '600',
    color: '#000'
  },
  premiumDescription: {
    margin: '0 0 24px 0',
    fontSize: '15px',
    color: '#666',
    lineHeight: '1.6'
  },
  premiumFeaturesList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 30px 0',
    textAlign: 'left',
    maxWidth: '400px',
    marginLeft: 'auto',
    marginRight: 'auto'
  },
  premiumFeature: {
    fontSize: '14px',
    color: '#333',
    marginBottom: '12px',
    paddingLeft: '28px',
    position: 'relative',
    lineHeight: '1.5'
  },
  checkmark: {
    position: 'absolute',
    left: 0,
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: '16px'
  },
  upgradeButton: {
    display: 'inline-block',
    padding: '14px 32px',
    backgroundColor: '#000',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none'
  },
  premiumFooter: {
    margin: '16px 0 0 0',
    fontSize: '13px',
    color: '#999',
    fontStyle: 'italic'
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
    fontSize: '14px',
    fontWeight: '500'
  },
  toggleContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px'
  },
  sectionTitle: {
    margin: '0 0 4px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#000'
  },
  sectionDescription: {
    margin: 0,
    fontSize: '14px',
    color: '#666'
  },
  subsectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '15px',
    fontWeight: '600',
    color: '#000'
  },
  currencySymbol: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666'
  },
  toggle: {
    position: 'relative',
    width: '60px',
    height: '34px',
    border: '2px solid rgba(0,0,0,0.1)',
    borderRadius: '17px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    flexShrink: 0,
    outline: 'none'
  },
  toggleThumb: {
    position: 'absolute',
    top: '3px',
    left: '3px',
    width: '26px',
    height: '26px',
    backgroundColor: '#fff',
    borderRadius: '50%',
    transition: 'transform 0.3s ease',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
  },
  inputGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px'
  },
  input: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: '#fff',
    color: '#000'
  },
  saveButton: {
    padding: '12px 24px',
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  staffHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    gap: '20px',
    flexWrap: 'wrap'
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  form: {
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    marginBottom: '24px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
    gap: '16px',
    marginBottom: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#333'
  },
  select: {
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: '#fff',
    color: '#000'
  },
  submitButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  staffList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  staffCard: {
    padding: '16px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  },
  staffInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1
  },
  staffName: {
    margin: '0 0 4px 0',
    fontSize: '15px',
    fontWeight: '500',
    color: '#000'
  },
  staffEmail: {
    margin: 0,
    fontSize: '13px',
    color: '#666'
  },
  staffPassword: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#333',
    fontFamily: 'monospace'
  },
  roleBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#fff'
  },
  staffActions: {
    display: 'flex',
    gap: '8px'
  },
  actionButton: {
    padding: '8px 16px',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#999',
    fontSize: '14px',
    padding: '20px'
  }
}

export default OrderSettings
