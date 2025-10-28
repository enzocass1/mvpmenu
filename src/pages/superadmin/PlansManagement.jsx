/**
 * Plans Management
 *
 * Gestione completa dei piani di abbonamento:
 * - Lista piani esistenti
 * - Crea nuovo piano
 * - Modifica piano esistente
 * - Assegna features
 * - Configura limiti
 * - Modifica prezzi
 * - Elimina piano
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Alert, Spinner } from '../../components/ui'
import SuperAdminLayout from '../../components/ui/SuperAdminLayout'
import { tokens } from '../../styles/tokens'
import plansService from '../../services/plansService.js'
import subscriptionManagementService from '../../services/subscriptionManagementService.js'

function PlansManagement() {
  const navigate = useNavigate()

  // State
  const [plans, setPlans] = useState([])
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)

  // Trial configuration state
  const [trialConfig, setTrialConfig] = useState({
    trial_enabled: false,
    trial_days: 14,
    trial_plan_id: null
  })
  const [savingTrial, setSavingTrial] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    features: [],
    limits: {
      staff_members: -1,
      products: -1,
      orders_per_month: -1,
      tables: -1,
    },
    is_visible: true,
    is_legacy: false,
  })

  /**
   * Load initial data
   */
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [plansResult, featuresResult, trialConfigResult] = await Promise.all([
        plansService.getAllPlans(true), // Include hidden
        plansService.getAllFeatures(),
        subscriptionManagementService.getTrialConfiguration(),
      ])

      if (plansResult.error) throw new Error(plansResult.error.message)
      if (featuresResult.error) throw new Error(featuresResult.error.message)

      setPlans(plansResult.data)
      setFeatures(featuresResult.data)

      // Load trial configuration
      if (trialConfigResult.data) {
        setTrialConfig({
          trial_enabled: trialConfigResult.data.trial_enabled || false,
          trial_days: trialConfigResult.data.trial_days || 14,
          trial_plan_id: trialConfigResult.data.trial_plan_id || null
        })
      }
    } catch (err) {
      console.error('❌ Error loading data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Save trial configuration
   */
  const handleSaveTrialConfig = async () => {
    setSavingTrial(true)
    setError(null)

    try {
      const { error } = await subscriptionManagementService.updateTrialConfiguration(
        trialConfig.trial_enabled,
        trialConfig.trial_days,
        trialConfig.trial_plan_id
      )

      if (error) throw error

      console.log('✅ Configurazione trial salvata')
      // Optional: show success message
    } catch (err) {
      console.error('❌ Error saving trial config:', err)
      setError(err.message)
    } finally {
      setSavingTrial(false)
    }
  }

  /**
   * Handle create/edit plan
   */
  const handleSavePlan = async () => {
    try {
      setError(null)

      if (editingPlan) {
        // Update existing plan
        const { error } = await plansService.updatePlan(editingPlan.id, formData)
        if (error) throw error
        console.log('✅ Piano aggiornato')
      } else {
        // Create new plan
        const { error } = await plansService.createPlan(formData)
        if (error) throw error
        console.log('✅ Piano creato')
      }

      setShowModal(false)
      setEditingPlan(null)
      resetForm()
      loadData()
    } catch (err) {
      console.error('❌ Error saving plan:', err)
      setError(err.message)
    }
  }

  /**
   * Handle delete plan
   */
  const handleDeletePlan = async (planId) => {
    if (!confirm('Sei sicuro di voler eliminare questo piano?')) return

    try {
      const { error } = await plansService.deletePlan(planId)
      if (error) throw error

      console.log('✅ Piano eliminato')
      loadData()
    } catch (err) {
      console.error('❌ Error deleting plan:', err)
      alert(err.message)
    }
  }

  /**
   * Open modal for new plan
   */
  const handleNewPlan = () => {
    resetForm()
    setEditingPlan(null)
    setShowModal(true)
  }

  /**
   * Open modal for editing plan
   */
  const handleEditPlan = (plan) => {
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly || 0,
      features: plan.features || [],
      limits: plan.limits || {
        staff_members: -1,
        products: -1,
        orders_per_month: -1,
        tables: -1,
      },
      is_visible: plan.is_visible,
      is_legacy: plan.is_legacy,
    })
    setEditingPlan(plan)
    setShowModal(true)
  }

  /**
   * Reset form
   */
  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      features: [],
      limits: {
        staff_members: -1,
        products: -1,
        orders_per_month: -1,
        tables: -1,
      },
      is_visible: true,
      is_legacy: false,
    })
  }

  /**
   * Toggle feature
   */
  const toggleFeature = (featureKey) => {
    setFormData((prev) => {
      const features = prev.features.includes(featureKey)
        ? prev.features.filter((f) => f !== featureKey)
        : [...prev.features, featureKey]

      return { ...prev, features }
    })
  }

  /**
   * Update limit
   */
  const updateLimit = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      limits: {
        ...prev.limits,
        [key]: value === '' ? -1 : parseInt(value),
      },
    }))
  }

  /**
   * Group features by category
   */
  const groupedFeatures = features.reduce((acc, feature) => {
    const category = feature.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(feature)
    return acc
  }, {})

  if (loading && !plans.length) {
    return (
      <SuperAdminLayout>
        <Spinner size="lg" text="Caricamento piani..." centered />
      </SuperAdminLayout>
    )
  }

  return (
    <SuperAdminLayout>
      {/* Page Header */}
      <div style={{ marginBottom: tokens.spacing.xl }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing.md }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: tokens.typography.fontSize['3xl'],
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.black,
              marginBottom: tokens.spacing.xs
            }}>
              Gestione Piani
            </h1>
            <p style={{
              margin: 0,
              fontSize: tokens.typography.fontSize.base,
              color: tokens.colors.gray[600]
            }}>
              Crea e modifica i piani di abbonamento
            </p>
          </div>
          <Button variant="primary" onClick={handleNewPlan}>
            + Nuovo Piano
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" style={{ marginBottom: '24px' }}>
          {error}
        </Alert>
      )}

      {/* Trial Configuration Card */}
      <Card padding="lg" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          Configurazione Trial Period
        </h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          Offri ai nuovi utenti un period di prova gratuito con funzionalità premium
        </p>

        {/* Toggle Trial */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={trialConfig.trial_enabled}
              onChange={(e) => setTrialConfig({ ...trialConfig, trial_enabled: e.target.checked })}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '15px', fontWeight: '500' }}>
              Abilita Trial per nuovi utenti
            </span>
          </label>
        </div>

        {trialConfig.trial_enabled && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Trial Days */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Durata Trial (giorni)
              </label>
              <Input
                type="number"
                min="1"
                max="365"
                value={trialConfig.trial_days}
                onChange={(e) => setTrialConfig({ ...trialConfig, trial_days: parseInt(e.target.value) || 14 })}
                placeholder="14"
              />
            </div>

            {/* Trial Plan */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Piano da usare durante trial
              </label>
              <select
                value={trialConfig.trial_plan_id || ''}
                onChange={(e) => setTrialConfig({ ...trialConfig, trial_plan_id: e.target.value || null })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="">Seleziona piano...</option>
                {plans.filter(p => p.slug !== 'free').map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} (€{plan.price_monthly}/mese)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #eee' }}>
          <Button
            variant="primary"
            onClick={handleSaveTrialConfig}
            disabled={savingTrial || (trialConfig.trial_enabled && !trialConfig.trial_plan_id)}
          >
            {savingTrial ? 'Salvataggio...' : 'Salva Configurazione Trial'}
          </Button>
        </div>

        {/* Info Box */}
        {trialConfig.trial_enabled && trialConfig.trial_plan_id && (
          <div style={{
            marginTop: '20px',
            padding: '12px 16px',
            backgroundColor: '#EBF5FF',
            borderLeft: '4px solid #2563EB',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#1E40AF'
          }}>
            <strong>ℹ️ Info:</strong> I nuovi utenti riceveranno automaticamente {trialConfig.trial_days} giorni
            di accesso alle funzionalità del piano{' '}
            {plans.find(p => p.id === trialConfig.trial_plan_id)?.name}.
            Alla scadenza, saranno downgraded al piano FREE se non effettuano un upgrade.
          </div>
        )}
      </Card>

      {/* Plans Grid */}
      <div style={styles.plansGrid}>
        {plans.map((plan) => (
          <Card key={plan.id} padding="lg" style={styles.planCard}>
            {/* Plan Header */}
            <div style={styles.planHeader}>
              <div>
                <h3 style={styles.planName}>{plan.name}</h3>
                <p style={styles.planSlug}>{plan.slug}</p>
              </div>
              <div style={styles.badges}>
                {plan.is_legacy && <span style={styles.legacyBadge}>Legacy</span>}
                {!plan.is_visible && <span style={styles.hiddenBadge}>Hidden</span>}
              </div>
            </div>

            {/* Price */}
            <div style={styles.priceSection}>
              <div style={styles.price}>
                €{plan.price_monthly.toFixed(2)}
                <span style={styles.pricePeriod}>/mese</span>
              </div>
              {plan.price_yearly > 0 && (
                <div style={styles.yearlyPrice}>
                  €{plan.price_yearly.toFixed(2)}/anno
                </div>
              )}
            </div>

            {/* Description */}
            {plan.description && (
              <p style={styles.description}>{plan.description}</p>
            )}

            {/* Features Summary */}
            <div style={styles.featuresSection}>
              <div style={styles.featuresSummary}>
                {plan.features?.includes('*') ? (
                  <span style={styles.wildcard}>✨ Tutte le funzioni</span>
                ) : (
                  <span>{plan.features?.length || 0} funzioni</span>
                )}
              </div>
            </div>

            {/* Limits Summary */}
            <div style={styles.limitsSection}>
              <h4 style={styles.limitsSectionTitle}>Limiti</h4>
              <div style={styles.limitsGrid}>
                {Object.entries(plan.limits || {}).map(([key, value]) => (
                  <div key={key} style={styles.limitItem}>
                    <span style={styles.limitLabel}>
                      {formatLimitKey(key)}:
                    </span>
                    <span style={styles.limitValue}>
                      {value === -1 ? '∞' : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={styles.planActions}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleEditPlan(plan)}
                fullWidth
              >
                Modifica
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeletePlan(plan.id)}
                fullWidth
                style={{ marginTop: '8px' }}
              >
                Elimina
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingPlan ? 'Modifica Piano' : 'Nuovo Piano'}
              </h2>
              <button style={styles.closeButton} onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* Basic Info */}
              <div style={styles.formSection}>
                <h3 style={styles.formSectionTitle}>Informazioni Base</h3>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nome Piano</label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Premium"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Slug (URL-friendly)</label>
                  <Input
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="premium"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Descrizione</label>
                  <textarea
                    style={styles.textarea}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Piano ideale per ristoranti di medie dimensioni..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Pricing */}
              <div style={styles.formSection}>
                <h3 style={styles.formSectionTitle}>Prezzi</h3>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Prezzo Mensile (€)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price_monthly}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_monthly: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Prezzo Annuale (€)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price_yearly}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_yearly: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div style={styles.formSection}>
                <h3 style={styles.formSectionTitle}>Funzionalità</h3>

                {/* Wildcard option */}
                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.features.includes('*')}
                      onChange={() => toggleFeature('*')}
                    />
                    <span>✨ Tutte le funzionalità (Wildcard)</span>
                  </label>
                </div>

                {/* Features by category */}
                {!formData.features.includes('*') && (
                  <div style={styles.featuresGrid}>
                    {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                      <div key={category} style={styles.featureCategory}>
                        <h4 style={styles.featureCategoryTitle}>
                          {category.toUpperCase()}
                        </h4>
                        {categoryFeatures.map((feature) => (
                          <div key={feature.key} style={styles.checkboxGroup}>
                            <label style={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={formData.features.includes(feature.key)}
                                onChange={() => toggleFeature(feature.key)}
                              />
                              <span>{feature.name}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Limits */}
              <div style={styles.formSection}>
                <h3 style={styles.formSectionTitle}>Limiti</h3>
                <p style={styles.formSectionSubtitle}>
                  Inserisci -1 per "illimitato"
                </p>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Staff Members</label>
                    <Input
                      type="number"
                      value={formData.limits.staff_members}
                      onChange={(e) => updateLimit('staff_members', e.target.value)}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Prodotti</label>
                    <Input
                      type="number"
                      value={formData.limits.products}
                      onChange={(e) => updateLimit('products', e.target.value)}
                    />
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Ordini/Mese</label>
                    <Input
                      type="number"
                      value={formData.limits.orders_per_month}
                      onChange={(e) => updateLimit('orders_per_month', e.target.value)}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Tavoli</label>
                    <Input
                      type="number"
                      value={formData.limits.tables}
                      onChange={(e) => updateLimit('tables', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Visibility */}
              <div style={styles.formSection}>
                <h3 style={styles.formSectionTitle}>Visibilità</h3>

                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.is_visible}
                      onChange={(e) =>
                        setFormData({ ...formData, is_visible: e.target.checked })
                      }
                    />
                    <span>Piano visibile pubblicamente</span>
                  </label>
                </div>

                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.is_legacy}
                      onChange={(e) =>
                        setFormData({ ...formData, is_legacy: e.target.checked })
                      }
                    />
                    <span>Piano Legacy (solo per utenti esistenti)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={styles.modalFooter}>
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Annulla
              </Button>
              <Button variant="primary" onClick={handleSavePlan}>
                {editingPlan ? 'Salva Modifiche' : 'Crea Piano'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  )
}

/**
 * Helper: Format limit key
 */
function formatLimitKey(key) {
  const labels = {
    staff_members: 'Staff',
    products: 'Prodotti',
    orders_per_month: 'Ordini/Mese',
    tables: 'Tavoli',
  }
  return labels[key] || key
}

const styles = {
  container: {
    padding: '32px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e0e0e0',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#000',
    margin: 0,
    marginTop: '16px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
    marginTop: '4px',
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  planCard: {
    backgroundColor: '#fff',
    position: 'relative',
  },
  planHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  planName: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#000',
    margin: 0,
  },
  planSlug: {
    fontSize: '13px',
    color: '#999',
    margin: 0,
    marginTop: '4px',
  },
  badges: {
    display: 'flex',
    gap: '8px',
  },
  legacyBadge: {
    fontSize: '11px',
    padding: '4px 8px',
    backgroundColor: '#ffd700',
    color: '#000',
    borderRadius: '12px',
    fontWeight: '600',
  },
  hiddenBadge: {
    fontSize: '11px',
    padding: '4px 8px',
    backgroundColor: '#e0e0e0',
    color: '#666',
    borderRadius: '12px',
    fontWeight: '600',
  },
  priceSection: {
    marginBottom: '16px',
  },
  price: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#667eea',
    lineHeight: '1',
  },
  pricePeriod: {
    fontSize: '16px',
    color: '#999',
    fontWeight: '400',
  },
  yearlyPrice: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  description: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  featuresSection: {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #f0f0f0',
  },
  featuresSummary: {
    fontSize: '14px',
    color: '#000',
    fontWeight: '500',
  },
  wildcard: {
    color: '#667eea',
  },
  limitsSection: {
    marginBottom: '16px',
  },
  limitsSectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '8px',
  },
  limitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  limitItem: {
    fontSize: '13px',
    color: '#666',
  },
  limitLabel: {
    fontWeight: '500',
  },
  limitValue: {
    marginLeft: '4px',
    color: '#000',
  },
  planActions: {
    display: 'flex',
    flexDirection: 'column',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e0e0e0',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#000',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: 0,
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
  },
  modalBody: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
  },
  formSection: {
    marginBottom: '32px',
  },
  formSectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '4px',
  },
  formSectionSubtitle: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '16px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#000',
    marginBottom: '8px',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  checkboxGroup: {
    marginBottom: '12px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#000',
    cursor: 'pointer',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '24px',
    marginTop: '16px',
  },
  featureCategory: {
    backgroundColor: '#f9f9f9',
    padding: '16px',
    borderRadius: '8px',
  },
  featureCategoryTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#666',
    marginBottom: '12px',
    letterSpacing: '0.5px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '24px',
    borderTop: '1px solid #e0e0e0',
  },
}

export default PlansManagement
