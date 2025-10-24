import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'

/**
 * IMPOSTAZIONI FISCALI
 * Configurazione RT (Registratore Telematico), IVA, Metodi di Pagamento
 */
function FiscalSettings() {
  const navigate = useNavigate()
  const location = useLocation()

  // Prova prima da location.state, poi da localStorage
  let restaurant = location.state?.restaurant
  if (!restaurant) {
    const stored = localStorage.getItem('analytics_restaurant')
    if (stored) {
      try {
        restaurant = JSON.parse(stored)
      } catch (error) {
        console.error('Errore parsing restaurant da localStorage:', error)
        restaurant = null
      }
    }
  }

  // Se non c'è un ristorante, reindirizza alla dashboard
  if (!restaurant) {
    navigate('/dashboard')
    return null
  }

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('company') // company, rt, tax, payments, closures

  // Dati aziendali e RT
  const [rtConfig, setRtConfig] = useState({
    business_name: '',
    vat_number: '',
    tax_code: '',
    address: '',
    city: '',
    postal_code: '',
    province: '',
    rt_serial_number: '',
    rt_model: '',
    rt_manufacturer: '',
    rt_connection_type: 'ethernet',
    rt_ip_address: '',
    rt_port: 9100,
    rt_com_port: '',
    middleware_url: 'http://localhost:3001',
    middleware_api_key: '',
    rt_status: 'not_configured',
    lottery_enabled: true,
    auto_print_receipt: true,
    table_service_markup_percent: 0
  })

  // Aliquote IVA
  const [taxRates, setTaxRates] = useState([])
  const [showAddTaxRate, setShowAddTaxRate] = useState(false)
  const [newTaxRate, setNewTaxRate] = useState({ name: '', rate: '', rt_department_code: '' })

  // Metodi di pagamento
  const [paymentMethods, setPaymentMethods] = useState([])
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [newPayment, setNewPayment] = useState({ name: '', icon: 'payment', rt_payment_code: '', is_cash: false })

  // Modelli RT disponibili
  const [rtModels, setRtModels] = useState([])

  // Messaggi
  const [message, setMessage] = useState({ text: '', type: '' })

  useEffect(() => {
    loadAll()
  }, [restaurant?.id])

  const loadAll = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadRTConfig(),
        loadTaxRates(),
        loadPaymentMethods(),
        loadRTModels()
      ])
    } catch (error) {
      console.error('Errore caricamento dati:', error)
      showMessage('Errore caricamento dati', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadRTConfig = async () => {
    const { data, error } = await supabase
      .from('rt_configurations')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (data) {
      setRtConfig(data)
    }
  }

  const loadTaxRates = async () => {
    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('rate', { ascending: false })

    if (error) throw error
    setTaxRates(data || [])
  }

  const loadPaymentMethods = async () => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('sort_order')

    if (error) throw error
    setPaymentMethods(data || [])
  }

  const loadRTModels = async () => {
    const { data, error } = await supabase
      .from('rt_models_catalog')
      .select('*')
      .eq('is_active', true)
      .order('manufacturer')

    if (error) throw error
    setRtModels(data || [])
  }

  const saveRTConfig = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('rt_configurations')
        .upsert({
          restaurant_id: restaurant.id,
          ...rtConfig,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'restaurant_id'
        })

      if (error) throw error
      showMessage('Configurazione salvata', 'success')
      await loadRTConfig()
    } catch (error) {
      console.error('Errore salvataggio:', error)
      showMessage('Errore salvataggio configurazione', 'error')
    } finally {
      setSaving(false)
    }
  }

  const testRTConnection = async () => {
    setSaving(true)
    try {
      // Chiamata al middleware per testare connessione
      const response = await fetch(`${rtConfig.middleware_url}/api/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': rtConfig.middleware_api_key || ''
        }
      })

      if (!response.ok) {
        throw new Error('Middleware non raggiungibile')
      }

      const result = await response.json()

      if (result.success) {
        // Aggiorna stato RT
        await supabase
          .from('rt_configurations')
          .update({
            rt_status: 'connected',
            rt_status_message: 'RT connesso e operativo',
            last_connection_check: new Date().toISOString()
          })
          .eq('restaurant_id', restaurant.id)

        showMessage('Connessione RT riuscita!', 'success')
        await loadRTConfig()
      } else {
        throw new Error(result.error || 'Errore connessione RT')
      }
    } catch (error) {
      console.error('Errore test connessione:', error)

      // Aggiorna stato RT come errore
      await supabase
        .from('rt_configurations')
        .update({
          rt_status: 'error',
          rt_status_message: error.message,
          last_connection_check: new Date().toISOString()
        })
        .eq('restaurant_id', restaurant.id)

      showMessage(`Errore connessione: ${error.message}`, 'error')
      await loadRTConfig()
    } finally {
      setSaving(false)
    }
  }

  const addTaxRate = async () => {
    if (!newTaxRate.name || !newTaxRate.rate) {
      showMessage('Compila tutti i campi', 'error')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('tax_rates')
        .insert({
          restaurant_id: restaurant.id,
          name: newTaxRate.name,
          rate: parseFloat(newTaxRate.rate),
          rt_department_code: newTaxRate.rt_department_code || null,
          is_default: taxRates.length === 0 // Prima aliquota = default
        })

      if (error) throw error

      showMessage('Aliquota IVA aggiunta', 'success')
      setNewTaxRate({ name: '', rate: '', rt_department_code: '' })
      setShowAddTaxRate(false)
      await loadTaxRates()
    } catch (error) {
      console.error('Errore aggiunta aliquota:', error)
      showMessage('Errore aggiunta aliquota', 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteTaxRate = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questa aliquota IVA?')) return

    try {
      const { error } = await supabase
        .from('tax_rates')
        .delete()
        .eq('id', id)

      if (error) throw error
      showMessage('Aliquota eliminata', 'success')
      await loadTaxRates()
    } catch (error) {
      console.error('Errore eliminazione:', error)
      showMessage('Errore eliminazione aliquota', 'error')
    }
  }

  const addPaymentMethod = async () => {
    if (!newPayment.name || !newPayment.rt_payment_code) {
      showMessage('Compila tutti i campi obbligatori', 'error')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('payment_methods')
        .insert({
          restaurant_id: restaurant.id,
          name: newPayment.name,
          icon: newPayment.icon,
          rt_payment_code: newPayment.rt_payment_code,
          is_cash: newPayment.is_cash,
          sort_order: paymentMethods.length
        })

      if (error) throw error

      showMessage('Metodo di pagamento aggiunto', 'success')
      setNewPayment({ name: '', icon: 'payment', rt_payment_code: '', is_cash: false })
      setShowAddPayment(false)
      await loadPaymentMethods()
    } catch (error) {
      console.error('Errore aggiunta metodo:', error)
      showMessage('Errore aggiunta metodo di pagamento', 'error')
    } finally {
      setSaving(false)
    }
  }

  const deletePaymentMethod = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questo metodo di pagamento?')) return

    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id)

      if (error) throw error
      showMessage('Metodo eliminato', 'success')
      await loadPaymentMethods()
    } catch (error) {
      console.error('Errore eliminazione:', error)
      showMessage('Errore eliminazione metodo', 'error')
    }
  }

  const showMessage = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Caricamento...</div>
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

      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={() => navigate('/dashboard', { state: { restaurant } })}
          style={styles.backButton}
        >
          ← Dashboard
        </button>
        <div>
          <h1 style={styles.title}>Impostazioni Fiscali</h1>
          <p style={styles.subtitle}>
            Configurazione RT, IVA e metodi di pagamento per {restaurant.name}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{...styles.tab, ...(activeTab === 'company' ? styles.tabActive : {})}}
          onClick={() => setActiveTab('company')}
        >
          Dati Aziendali
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'rt' ? styles.tabActive : {})}}
          onClick={() => setActiveTab('rt')}
        >
          Registratore Telematico
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'tax' ? styles.tabActive : {})}}
          onClick={() => setActiveTab('tax')}
        >
          Aliquote IVA
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'payments' ? styles.tabActive : {})}}
          onClick={() => setActiveTab('payments')}
        >
          Metodi di Pagamento
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'closures' ? styles.tabActive : {})}}
          onClick={() => setActiveTab('closures')}
        >
          Chiusure Fiscali
        </button>
      </div>

      {/* CONTENT */}
      <div style={styles.content}>
        {/* TAB 1: DATI AZIENDALI */}
        {activeTab === 'company' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Dati Aziendali</h2>
            <p style={styles.sectionDesc}>
              Questi dati verranno stampati su tutti gli scontrini fiscali
            </p>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Ragione Sociale *</label>
                <input
                  type="text"
                  value={rtConfig.business_name}
                  onChange={(e) => setRtConfig({...rtConfig, business_name: e.target.value})}
                  style={styles.input}
                  placeholder="es: Ristorante Da Mario S.r.l."
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Partita IVA *</label>
                <input
                  type="text"
                  value={rtConfig.vat_number}
                  onChange={(e) => setRtConfig({...rtConfig, vat_number: e.target.value})}
                  style={styles.input}
                  placeholder="IT12345678901"
                  maxLength={13}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Codice Fiscale</label>
                <input
                  type="text"
                  value={rtConfig.tax_code}
                  onChange={(e) => setRtConfig({...rtConfig, tax_code: e.target.value})}
                  style={styles.input}
                  placeholder="Opzionale se uguale a P.IVA"
                  maxLength={16}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Indirizzo *</label>
                <input
                  type="text"
                  value={rtConfig.address}
                  onChange={(e) => setRtConfig({...rtConfig, address: e.target.value})}
                  style={styles.input}
                  placeholder="Via Roma 1"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Città *</label>
                <input
                  type="text"
                  value={rtConfig.city}
                  onChange={(e) => setRtConfig({...rtConfig, city: e.target.value})}
                  style={styles.input}
                  placeholder="Milano"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>CAP *</label>
                <input
                  type="text"
                  value={rtConfig.postal_code}
                  onChange={(e) => setRtConfig({...rtConfig, postal_code: e.target.value})}
                  style={styles.input}
                  placeholder="20100"
                  maxLength={5}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Provincia *</label>
                <input
                  type="text"
                  value={rtConfig.province}
                  onChange={(e) => setRtConfig({...rtConfig, province: e.target.value.toUpperCase()})}
                  style={styles.input}
                  placeholder="MI"
                  maxLength={2}
                />
              </div>
            </div>

            <button
              onClick={saveRTConfig}
              disabled={saving}
              style={styles.primaryButton}
            >
              {saving ? 'Salvataggio...' : 'Salva Dati Aziendali'}
            </button>
          </div>
        )}

        {/* TAB 2: REGISTRATORE TELEMATICO */}
        {activeTab === 'rt' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Registratore Telematico (RT)</h2>
            <p style={styles.sectionDesc}>
              Configura la connessione al registratore telematico per emettere scontrini fiscali
            </p>

            {/* Stato RT */}
            <div style={{
              ...styles.statusCard,
              backgroundColor: rtConfig.rt_status === 'connected' ? '#E8F5E9' :
                               rtConfig.rt_status === 'error' ? '#FFEBEE' : '#F5F5F5'
            }}>
              <div style={styles.statusDot} className={rtConfig.rt_status} />
              <div>
                <div style={styles.statusLabel}>Stato RT</div>
                <div style={styles.statusValue}>
                  {rtConfig.rt_status === 'connected' ? '✓ Connesso' :
                   rtConfig.rt_status === 'error' ? '✗ Errore' :
                   rtConfig.rt_status === 'disconnected' ? '○ Disconnesso' :
                   '○ Non Configurato'}
                </div>
                {rtConfig.rt_status_message && (
                  <div style={styles.statusMessage}>{rtConfig.rt_status_message}</div>
                )}
              </div>
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Matricola RT</label>
                <input
                  type="text"
                  value={rtConfig.rt_serial_number}
                  onChange={(e) => setRtConfig({...rtConfig, rt_serial_number: e.target.value})}
                  style={styles.input}
                  placeholder="FP123456789"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Produttore</label>
                <select
                  value={rtConfig.rt_manufacturer}
                  onChange={(e) => setRtConfig({...rtConfig, rt_manufacturer: e.target.value, rt_model: ''})}
                  style={styles.select}
                >
                  <option value="">Seleziona produttore</option>
                  <option value="epson">Epson</option>
                  <option value="custom">Custom</option>
                  <option value="rch">RCH</option>
                  <option value="ditron">Ditron</option>
                  <option value="olivetti">Olivetti</option>
                </select>
              </div>

              {rtConfig.rt_manufacturer && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Modello RT</label>
                  <select
                    value={rtConfig.rt_model}
                    onChange={(e) => setRtConfig({...rtConfig, rt_model: e.target.value})}
                    style={styles.select}
                  >
                    <option value="">Seleziona modello</option>
                    {rtModels
                      .filter(m => m.manufacturer === rtConfig.rt_manufacturer)
                      .map(model => (
                        <option key={model.id} value={model.model_name}>
                          {model.model_name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Tipo Connessione</label>
                <select
                  value={rtConfig.rt_connection_type}
                  onChange={(e) => setRtConfig({...rtConfig, rt_connection_type: e.target.value})}
                  style={styles.select}
                >
                  <option value="ethernet">Ethernet (LAN)</option>
                  <option value="usb">USB</option>
                  <option value="serial">Seriale (COM)</option>
                  <option value="bluetooth">Bluetooth</option>
                </select>
              </div>

              {rtConfig.rt_connection_type === 'ethernet' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Indirizzo IP</label>
                    <input
                      type="text"
                      value={rtConfig.rt_ip_address}
                      onChange={(e) => setRtConfig({...rtConfig, rt_ip_address: e.target.value})}
                      style={styles.input}
                      placeholder="192.168.1.100"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Porta</label>
                    <input
                      type="number"
                      value={rtConfig.rt_port}
                      onChange={(e) => setRtConfig({...rtConfig, rt_port: parseInt(e.target.value) || 9100})}
                      style={styles.input}
                      placeholder="9100"
                    />
                  </div>
                </>
              )}

              {rtConfig.rt_connection_type === 'serial' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Porta COM</label>
                  <input
                    type="text"
                    value={rtConfig.rt_com_port}
                    onChange={(e) => setRtConfig({...rtConfig, rt_com_port: e.target.value})}
                    style={styles.input}
                    placeholder="COM3 (Windows) o /dev/ttyUSB0 (Linux/Mac)"
                  />
                </div>
              )}
            </div>

            {/* Middleware Configuration */}
            <div style={styles.subsection}>
              <h3 style={styles.subsectionTitle}>Middleware RT (Server Locale)</h3>
              <p style={styles.subsectionDesc}>
                Il middleware è un server locale installato nel ristorante che gestisce la comunicazione con l'RT
              </p>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>URL Middleware</label>
                  <input
                    type="text"
                    value={rtConfig.middleware_url}
                    onChange={(e) => setRtConfig({...rtConfig, middleware_url: e.target.value})}
                    style={styles.input}
                    placeholder="http://192.168.1.50:3001"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>API Key</label>
                  <input
                    type="text"
                    value={rtConfig.middleware_api_key}
                    onChange={(e) => setRtConfig({...rtConfig, middleware_api_key: e.target.value})}
                    style={styles.input}
                    placeholder="Opzionale per sicurezza"
                  />
                </div>
              </div>
            </div>

            {/* Altre Impostazioni */}
            <div style={styles.subsection}>
              <h3 style={styles.subsectionTitle}>Altre Impostazioni</h3>

              <div style={styles.toggleGroup}>
                <label style={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={rtConfig.lottery_enabled}
                    onChange={(e) => setRtConfig({...rtConfig, lottery_enabled: e.target.checked})}
                  />
                  Abilita Lotteria degli Scontrini
                </label>

                <label style={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={rtConfig.auto_print_receipt}
                    onChange={(e) => setRtConfig({...rtConfig, auto_print_receipt: e.target.checked})}
                  />
                  Stampa Automatica Scontrino
                </label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Maggiorazione Servizio al Tavolo (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={rtConfig.table_service_markup_percent}
                  onChange={(e) => setRtConfig({...rtConfig, table_service_markup_percent: parseFloat(e.target.value) || 0})}
                  style={styles.input}
                  placeholder="0.00"
                />
                <small style={styles.hint}>
                  Esempio: inserendo 10.00, i prezzi al tavolo saranno maggiorati del 10%
                </small>
              </div>
            </div>

            <div style={styles.buttonGroup}>
              <button
                onClick={saveRTConfig}
                disabled={saving}
                style={styles.primaryButton}
              >
                {saving ? 'Salvataggio...' : 'Salva Configurazione'}
              </button>
              <button
                onClick={testRTConnection}
                disabled={saving}
                style={styles.secondaryButton}
              >
                Testa Connessione RT
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ALIQUOTE IVA */}
        {activeTab === 'tax' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Aliquote IVA</h2>
                <p style={styles.sectionDesc}>
                  Configura le aliquote IVA da applicare ai prodotti
                </p>
              </div>
              <button
                onClick={() => setShowAddTaxRate(!showAddTaxRate)}
                style={styles.primaryButton}
              >
                {showAddTaxRate ? 'Annulla' : '+ Aggiungi Aliquota'}
              </button>
            </div>

            {/* Form aggiungi aliquota */}
            {showAddTaxRate && (
              <div style={styles.addForm}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Nome Aliquota *</label>
                    <input
                      type="text"
                      value={newTaxRate.name}
                      onChange={(e) => setNewTaxRate({...newTaxRate, name: e.target.value})}
                      style={styles.input}
                      placeholder="es: IVA 22%"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Aliquota (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newTaxRate.rate}
                      onChange={(e) => setNewTaxRate({...newTaxRate, rate: e.target.value})}
                      style={styles.input}
                      placeholder="22.00"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Codice Reparto RT</label>
                    <input
                      type="text"
                      value={newTaxRate.rt_department_code}
                      onChange={(e) => setNewTaxRate({...newTaxRate, rt_department_code: e.target.value})}
                      style={styles.input}
                      placeholder="1"
                      maxLength={2}
                    />
                  </div>
                </div>
                <button
                  onClick={addTaxRate}
                  disabled={saving}
                  style={styles.primaryButton}
                >
                  {saving ? 'Aggiunta...' : 'Aggiungi Aliquota'}
                </button>
              </div>
            )}

            {/* Lista aliquote */}
            {taxRates.length > 0 ? (
              <div style={styles.list}>
                {taxRates.map(rate => (
                  <div key={rate.id} style={styles.listItem}>
                    <div style={styles.listItemContent}>
                      <div style={styles.listItemTitle}>{rate.name}</div>
                      <div style={styles.listItemDetails}>
                        Aliquota: {rate.rate}%
                        {rate.rt_department_code && ` • Reparto RT: ${rate.rt_department_code}`}
                        {rate.is_default && <span style={styles.badge}>Default</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTaxRate(rate.id)}
                      style={styles.deleteButton}
                    >
                      Elimina
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p>Nessuna aliquota IVA configurata</p>
                <small>Aggiungi almeno un'aliquota IVA per poter emettere scontrini fiscali</small>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: METODI DI PAGAMENTO */}
        {activeTab === 'payments' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Metodi di Pagamento</h2>
                <p style={styles.sectionDesc}>
                  Configura i metodi di pagamento accettati alla cassa
                </p>
              </div>
              <button
                onClick={() => setShowAddPayment(!showAddPayment)}
                style={styles.primaryButton}
              >
                {showAddPayment ? 'Annulla' : '+ Aggiungi Metodo'}
              </button>
            </div>

            {/* Form aggiungi metodo */}
            {showAddPayment && (
              <div style={styles.addForm}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Nome Metodo *</label>
                    <input
                      type="text"
                      value={newPayment.name}
                      onChange={(e) => setNewPayment({...newPayment, name: e.target.value})}
                      style={styles.input}
                      placeholder="es: Contanti, Carta, Satispay"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Codice RT *</label>
                    <input
                      type="text"
                      value={newPayment.rt_payment_code}
                      onChange={(e) => setNewPayment({...newPayment, rt_payment_code: e.target.value})}
                      style={styles.input}
                      placeholder="0"
                      maxLength={2}
                    />
                    <small style={styles.hint}>
                      0=Contanti, 1=Carta, 2=Assegno, 3=Ticket, ecc. (varia per RT)
                    </small>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Icona</label>
                    <select
                      value={newPayment.icon}
                      onChange={(e) => setNewPayment({...newPayment, icon: e.target.value})}
                      style={styles.select}
                    >
                      <option value="cash">Contanti</option>
                      <option value="credit_card">Carta</option>
                      <option value="mobile">Mobile Payment</option>
                      <option value="payment">Generico</option>
                    </select>
                  </div>
                </div>
                <label style={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={newPayment.is_cash}
                    onChange={(e) => setNewPayment({...newPayment, is_cash: e.target.checked})}
                  />
                  È un pagamento in contanti (calcola resto)
                </label>
                <button
                  onClick={addPaymentMethod}
                  disabled={saving}
                  style={styles.primaryButton}
                >
                  {saving ? 'Aggiunta...' : 'Aggiungi Metodo'}
                </button>
              </div>
            )}

            {/* Lista metodi */}
            {paymentMethods.length > 0 ? (
              <div style={styles.list}>
                {paymentMethods.map(method => (
                  <div key={method.id} style={styles.listItem}>
                    <div style={styles.listItemContent}>
                      <div style={styles.listItemTitle}>{method.name}</div>
                      <div style={styles.listItemDetails}>
                        Codice RT: {method.rt_payment_code}
                        {method.is_cash && <span style={styles.badge}>Contanti</span>}
                        {!method.is_active && <span style={{...styles.badge, backgroundColor: '#999'}}>Disattivo</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => deletePaymentMethod(method.id)}
                      style={styles.deleteButton}
                    >
                      Elimina
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p>Nessun metodo di pagamento configurato</p>
                <small>Aggiungi almeno un metodo di pagamento per poter accettare incassi</small>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CHIUSURE FISCALI */}
        {activeTab === 'closures' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Chiusure Fiscali</h2>
            <p style={styles.sectionDesc}>
              Gestione chiusure giornaliere (Z) e intermedie (X)
            </p>

            <div style={styles.closureInfo}>
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Ultimo Numero Scontrino</div>
                <div style={styles.infoValue}>{rtConfig.last_receipt_number || 0}</div>
              </div>
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Ultima Chiusura Z</div>
                <div style={styles.infoValue}>
                  {rtConfig.last_closure_date
                    ? new Date(rtConfig.last_closure_date).toLocaleDateString('it-IT')
                    : 'Mai effettuata'}
                </div>
              </div>
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Numero Chiusure</div>
                <div style={styles.infoValue}>{rtConfig.last_closure_number || 0}</div>
              </div>
            </div>

            <div style={styles.closureActions}>
              <div style={styles.closureCard}>
                <h3 style={styles.closureCardTitle}>Chiusura X (Intermedia)</h3>
                <p style={styles.closureCardDesc}>
                  Stampa un report dei totali senza azzerare i progressivi.
                  Può essere eseguita più volte durante la giornata.
                </p>
                <button style={styles.secondaryButton}>
                  Esegui Chiusura X
                </button>
              </div>

              <div style={styles.closureCard}>
                <h3 style={styles.closureCardTitle}>Chiusura Z (Giornaliera)</h3>
                <p style={styles.closureCardDesc}>
                  Chiude la giornata fiscale azzerando i progressivi.
                  Può essere eseguita una sola volta al giorno.
                </p>
                <button style={{...styles.primaryButton, backgroundColor: '#EF4444'}}>
                  Esegui Chiusura Z
                </button>
              </div>
            </div>

            <div style={styles.alert}>
              <strong>⚠️ Attenzione:</strong> La chiusura Z è un'operazione irreversibile che deve essere eseguita
              alla fine di ogni giornata lavorativa. Assicurati che tutti gli scontrini siano stati emessi prima di procedere.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F5F5F5',
    paddingBottom: '40px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '16px',
    color: '#666'
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 24px',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 10000
  },
  header: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px 20px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    fontSize: '14px',
    color: '#666',
    cursor: 'pointer',
    padding: '8px 0',
    marginBottom: '20px',
    fontWeight: '500'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  tabs: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid #E0E0E0',
    overflowX: 'auto'
  },
  tab: {
    background: 'none',
    border: 'none',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s'
  },
  tabActive: {
    color: '#000',
    borderBottomColor: '#000'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 20px'
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    border: '1px solid #E0E0E0'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },
  sectionDesc: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 24px 0',
    lineHeight: '1.5'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    gap: '16px',
    flexWrap: 'wrap'
  },
  subsection: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #E0E0E0'
  },
  subsectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },
  subsectionDesc: {
    fontSize: '13px',
    color: '#666',
    margin: '0 0 16px 0'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#000'
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  select: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: '#fff',
    cursor: 'pointer'
  },
  hint: {
    fontSize: '12px',
    color: '#999',
    fontStyle: 'italic'
  },
  toggleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px'
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#000',
    cursor: 'pointer'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  primaryButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#000',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  secondaryButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#000',
    backgroundColor: '#fff',
    border: '1px solid #000',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  statusCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px'
  },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#999'
  },
  statusLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px'
  },
  statusValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000'
  },
  statusMessage: {
    fontSize: '13px',
    color: '#666',
    marginTop: '4px'
  },
  addForm: {
    backgroundColor: '#F9F9F9',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '24px'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#F9F9F9',
    borderRadius: '8px',
    gap: '16px'
  },
  listItemContent: {
    flex: 1
  },
  listItemTitle: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#000',
    marginBottom: '4px'
  },
  listItemDetails: {
    fontSize: '13px',
    color: '#666'
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    marginLeft: '8px',
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: '#000',
    color: '#fff',
    borderRadius: '4px'
  },
  deleteButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#EF4444',
    backgroundColor: '#fff',
    border: '1px solid #EF4444',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#999'
  },
  closureInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px'
  },
  infoCard: {
    padding: '16px',
    backgroundColor: '#F9F9F9',
    borderRadius: '8px',
    textAlign: 'center'
  },
  infoLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px'
  },
  infoValue: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000'
  },
  closureActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  closureCard: {
    padding: '20px',
    backgroundColor: '#F9F9F9',
    borderRadius: '8px'
  },
  closureCardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },
  closureCardDesc: {
    fontSize: '13px',
    color: '#666',
    margin: '0 0 16px 0',
    lineHeight: '1.5'
  },
  alert: {
    padding: '16px',
    backgroundColor: '#FFF3E0',
    border: '1px solid #FFB74D',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#E65100',
    lineHeight: '1.5'
  }
}

export default FiscalSettings
