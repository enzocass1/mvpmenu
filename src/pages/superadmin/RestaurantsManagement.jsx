/**
 * Restaurants Management (CRM)
 *
 * Dashboard Super Admin per gestire tutti i ristoranti:
 * - Tabella con tutti i ristoranti
 * - Filtri per piano e stato
 * - Azioni: modifica piano, elimina, export CSV
 * - Statistiche aggregate
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Alert, Spinner, Badge, Modal, Input } from '../../components/ui'
import SuperAdminLayout from '../../components/ui/SuperAdminLayout'
import { tokens } from '../../styles/tokens'
import restaurantsService from '../../services/restaurantsService'
import plansService from '../../services/plansService'
import subscriptionManagementService from '../../services/subscriptionManagementService'

function RestaurantsManagement() {
  const navigate = useNavigate()

  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [filteredRestaurants, setFilteredRestaurants] = useState([])
  const [plans, setPlans] = useState([])
  const [stats, setStats] = useState(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlan, setFilterPlan] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Modals
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showTempUpgradeModal, setShowTempUpgradeModal] = useState(false)
  const [showBatchUpgradeModal, setShowBatchUpgradeModal] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    planId: '',
    status: 'active',
    expiresAt: ''
  })

  // Delete confirmation state
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')

  // Temporary upgrade state
  const [tempUpgradeForm, setTempUpgradeForm] = useState({
    planId: '',
    days: 30,
    reason: ''
  })

  // Batch upgrade state
  const [batchUpgradeForm, setBatchUpgradeForm] = useState({
    planId: '',
    days: 30,
    reason: ''
  })
  const [batchUpgradeProgress, setBatchUpgradeProgress] = useState({
    total: 0,
    current: 0,
    success: 0,
    failed: 0
  })

  /**
   * Load data
   */
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [restaurantsResult, plansResult, statsResult] = await Promise.all([
        restaurantsService.getAllRestaurants(),
        plansService.getAllPlans(true),
        restaurantsService.getRestaurantStats()
      ])

      if (restaurantsResult.error) throw new Error(restaurantsResult.error.message)
      if (plansResult.error) throw new Error(plansResult.error.message)
      if (statsResult.error) throw new Error(statsResult.error.message)

      setRestaurants(restaurantsResult.data)
      setFilteredRestaurants(restaurantsResult.data)
      setPlans(plansResult.data)
      setStats(statsResult.data)
    } catch (err) {
      console.error('❌ Error loading data:', err)
      setError(err.message || 'Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Apply filters
   */
  useEffect(() => {
    let filtered = [...restaurants]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        r =>
          r.name?.toLowerCase().includes(query) ||
          r.subdomain?.toLowerCase().includes(query) ||
          r.owner_email?.toLowerCase().includes(query)
      )
    }

    // Plan filter
    if (filterPlan !== 'all') {
      if (filterPlan === 'no_plan') {
        filtered = filtered.filter(r => !r.subscription_plan_id)
      } else {
        filtered = filtered.filter(r => r.subscription_plan_id === filterPlan)
      }
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.subscription_status === filterStatus)
    }

    setFilteredRestaurants(filtered)
  }, [searchQuery, filterPlan, filterStatus, restaurants])

  /**
   * Handle export CSV
   */
  const handleExportCSV = () => {
    const csvContent = restaurantsService.exportToCSV(filteredRestaurants)
    const filename = `restaurants-${new Date().toISOString().split('T')[0]}.csv`
    restaurantsService.downloadCSV(csvContent, filename)
  }

  /**
   * Handle edit restaurant
   */
  const handleEditRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant)
    setEditForm({
      planId: restaurant.subscription_plan_id || '',
      status: restaurant.subscription_status || 'active',
      expiresAt: restaurant.subscription_expires_at
        ? new Date(restaurant.subscription_expires_at).toISOString().split('T')[0]
        : ''
    })
    setShowEditModal(true)
  }

  /**
   * Handle delete restaurant
   */
  const handleDeleteRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant)
    setDeleteConfirmEmail('')
    setShowDeleteModal(true)
  }

  /**
   * Save edit changes
   */
  const handleSaveEdit = async () => {
    if (!selectedRestaurant || !editForm.planId) {
      setError('Seleziona un piano')
      return
    }

    setLoading(true)
    setError(null)

    const options = {
      status: editForm.status,
      startNow: true,
      expiresAt: editForm.expiresAt ? new Date(editForm.expiresAt).toISOString() : null,
      previousPlanId: selectedRestaurant.subscription_plan_id,
      reason: 'Updated by Super Admin'
    }

    const result = await restaurantsService.updateRestaurantPlan(
      selectedRestaurant.id,
      editForm.planId,
      options
    )

    if (result.error) {
      setError('Errore durante l\'aggiornamento del piano')
      setLoading(false)
    } else {
      setShowEditModal(false)
      setSelectedRestaurant(null)
      await loadData() // Reload data
    }
  }

  /**
   * Confirm delete
   */
  const confirmDelete = async () => {
    if (!selectedRestaurant) return

    // Check email confirmation
    if (deleteConfirmEmail !== selectedRestaurant.owner_email) {
      setError('L\'email inserita non corrisponde. Operazione annullata.')
      return
    }

    setLoading(true)
    setError(null)

    const result = await restaurantsService.deleteRestaurant(selectedRestaurant.id)

    if (result.error) {
      setError('Errore durante la sospensione del ristorante')
      setLoading(false)
    } else {
      setShowDeleteModal(false)
      setSelectedRestaurant(null)
      setDeleteConfirmEmail('')
      await loadData() // Reload data
    }
  }

  /**
   * Handle temporary upgrade
   */
  const handleTempUpgrade = (restaurant) => {
    setSelectedRestaurant(restaurant)
    setTempUpgradeForm({
      planId: '',
      days: 30,
      reason: ''
    })
    setShowTempUpgradeModal(true)
  }

  /**
   * Save temporary upgrade
   */
  const handleSaveTempUpgrade = async () => {
    if (!selectedRestaurant || !tempUpgradeForm.planId) {
      setError('Seleziona un piano per l\'upgrade temporaneo')
      return
    }

    setLoading(true)
    setError(null)

    const result = await subscriptionManagementService.createTemporaryUpgrade(
      selectedRestaurant.id,
      tempUpgradeForm.planId,
      tempUpgradeForm.days,
      tempUpgradeForm.reason || 'Upgrade temporaneo assegnato da Super Admin'
    )

    if (result.error) {
      setError('Errore durante l\'assegnazione dell\'upgrade temporaneo')
      setLoading(false)
    } else {
      setShowTempUpgradeModal(false)
      setSelectedRestaurant(null)
      await loadData() // Reload data
    }
  }

  /**
   * Handle batch upgrade
   */
  const handleBatchUpgrade = () => {
    setBatchUpgradeForm({
      planId: '',
      days: 30,
      reason: ''
    })
    setBatchUpgradeProgress({
      total: filteredRestaurants.length,
      current: 0,
      success: 0,
      failed: 0
    })
    setShowBatchUpgradeModal(true)
  }

  /**
   * Execute batch upgrade
   */
  const executeBatchUpgrade = async () => {
    if (!batchUpgradeForm.planId) {
      setError('Seleziona un piano per l\'upgrade temporaneo')
      return
    }

    if (filteredRestaurants.length === 0) {
      setError('Nessun ristorante selezionato')
      return
    }

    setError(null)

    const total = filteredRestaurants.length
    let successCount = 0
    let failedCount = 0

    // Process each restaurant
    for (let i = 0; i < filteredRestaurants.length; i++) {
      const restaurant = filteredRestaurants[i]

      // Update progress
      setBatchUpgradeProgress({
        total,
        current: i + 1,
        success: successCount,
        failed: failedCount
      })

      // Skip if already on this plan
      if (restaurant.subscription_plan_id === batchUpgradeForm.planId) {
        continue
      }

      // Apply upgrade
      const result = await subscriptionManagementService.createTemporaryUpgrade(
        restaurant.id,
        batchUpgradeForm.planId,
        batchUpgradeForm.days,
        batchUpgradeForm.reason || `Upgrade massivo: ${new Date().toLocaleDateString('it-IT')}`
      )

      if (result.error) {
        failedCount++
      } else {
        successCount++
      }
    }

    // Final update
    setBatchUpgradeProgress({
      total,
      current: total,
      success: successCount,
      failed: failedCount
    })

    // Reload data
    await loadData()
  }

  /**
   * Get status badge variant
   */
  const getStatusVariant = (status) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'trial':
        return 'info'
      case 'expired':
        return 'warning'
      case 'cancelled':
      case 'suspended':
        return 'error'
      default:
        return 'default'
    }
  }

  /**
   * Get status label
   */
  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Attivo'
      case 'trial':
        return 'Trial'
      case 'expired':
        return 'Scaduto'
      case 'cancelled':
        return 'Cancellato'
      case 'suspended':
        return 'Sospeso'
      default:
        return status || 'Sconosciuto'
    }
  }

  // Styles
  const pageHeaderStyles = {
    marginBottom: tokens.spacing.xl,
  }

  const titleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.xs,
  }

  const subtitleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.gray[600],
  }

  const filtersRowStyles = {
    display: 'flex',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.xl,
    flexWrap: 'wrap',
    alignItems: 'center',
  }

  const inputStyles = {
    flex: '1',
    minWidth: '200px',
    padding: tokens.spacing.sm,
    fontSize: tokens.typography.fontSize.sm,
    border: `1px solid ${tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.md,
    outline: 'none',
  }

  const selectStyles = {
    padding: tokens.spacing.sm,
    fontSize: tokens.typography.fontSize.sm,
    border: `1px solid ${tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.md,
    outline: 'none',
    minWidth: '150px',
  }

  const tableStyles = {
    width: '100%',
    borderCollapse: 'collapse',
  }

  const thStyles = {
    textAlign: 'left',
    padding: tokens.spacing.sm,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.gray[600],
    textTransform: 'uppercase',
    borderBottom: `2px solid ${tokens.colors.gray[200]}`,
  }

  const tdStyles = {
    padding: tokens.spacing.md,
    fontSize: tokens.typography.fontSize.sm,
    borderBottom: `1px solid ${tokens.colors.gray[100]}`,
  }

  const actionsStyles = {
    display: 'flex',
    gap: tokens.spacing.xs,
  }

  const statsGridStyles = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.xl,
  }

  const statCardStyles = {
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.gray[50],
    borderRadius: tokens.borderRadius.md,
    textAlign: 'center',
  }

  const statValueStyles = {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.xs,
  }

  const statLabelStyles = {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.gray[600],
    textTransform: 'uppercase',
  }

  if (loading && !restaurants.length) {
    return (
      <SuperAdminLayout>
        <Spinner size="lg" text="Caricamento ristoranti..." centered />
      </SuperAdminLayout>
    )
  }

  if (error && !restaurants.length) {
    return (
      <SuperAdminLayout>
        <Alert variant="error">{error}</Alert>
        <Button onClick={loadData} style={{ marginTop: '16px' }}>
          Riprova
        </Button>
      </SuperAdminLayout>
    )
  }

  return (
    <SuperAdminLayout>
      {/* Page Header */}
      <div style={pageHeaderStyles}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={titleStyles}>CRM Ristoranti</h1>
            <p style={subtitleStyles}>Gestisci tutti i ristoranti registrati</p>
          </div>
          <div style={{ display: 'flex', gap: tokens.spacing.sm }}>
            <Button
              variant="outline"
              onClick={handleBatchUpgrade}
              disabled={filteredRestaurants.length === 0}
              style={{ color: tokens.colors.premium.base }}
            >
              Upgrade Massivo ({filteredRestaurants.length})
            </Button>
            <Button variant="primary" onClick={handleExportCSV}>
              Esporta CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div style={statsGridStyles}>
          <div style={statCardStyles}>
            <div style={statValueStyles}>{stats.total}</div>
            <div style={statLabelStyles}>Totali</div>
          </div>
          <div style={statCardStyles}>
            <div style={statValueStyles}>{stats.active}</div>
            <div style={statLabelStyles}>Attivi</div>
          </div>
          <div style={statCardStyles}>
            <div style={statValueStyles}>{stats.trial}</div>
            <div style={statLabelStyles}>Trial</div>
          </div>
          <div style={statCardStyles}>
            <div style={statValueStyles}>{stats.expired}</div>
            <div style={statLabelStyles}>Scaduti</div>
          </div>
          <div style={statCardStyles}>
            <div style={statValueStyles}>{stats.cancelled}</div>
            <div style={statLabelStyles}>Cancellati</div>
          </div>
          <div style={statCardStyles}>
            <div style={statValueStyles}>{stats.suspended}</div>
            <div style={statLabelStyles}>Sospesi</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={filtersRowStyles}>
        <input
          type="text"
          placeholder="Cerca per nome, subdomain o email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={inputStyles}
        />

        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          style={selectStyles}
        >
          <option value="all">Tutti i piani</option>
          <option value="no_plan">Nessun piano</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={selectStyles}
        >
          <option value="all">Tutti gli stati</option>
          <option value="active">Attivo</option>
          <option value="trial">Trial</option>
          <option value="expired">Scaduto</option>
          <option value="cancelled">Cancellato</option>
          <option value="suspended">Sospeso</option>
        </select>

        <Button variant="outline" onClick={() => {
          setSearchQuery('')
          setFilterPlan('all')
          setFilterStatus('all')
        }}>
          Reset Filtri
        </Button>
      </div>

      {/* Table */}
      <Card>
        <div style={{ overflowX: 'auto', padding: tokens.spacing.md }}>
          {filteredRestaurants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: tokens.spacing.xl, color: tokens.colors.gray[500] }}>
              Nessun ristorante trovato
            </div>
          ) : (
            <table style={tableStyles}>
              <thead>
                <tr>
                  <th style={thStyles}>Nome</th>
                  <th style={thStyles}>Subdomain</th>
                  <th style={thStyles}>Email</th>
                  <th style={thStyles}>Piano</th>
                  <th style={thStyles}>Stato</th>
                  <th style={thStyles}>Scadenza</th>
                  <th style={thStyles}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredRestaurants.map((restaurant) => (
                  <tr key={restaurant.id}>
                    <td style={tdStyles}>
                      <strong>{restaurant.name}</strong>
                    </td>
                    <td style={tdStyles}>
                      <code>{restaurant.subdomain}</code>
                    </td>
                    <td style={tdStyles}>{restaurant.owner_email}</td>
                    <td style={tdStyles}>
                      {restaurant.subscription_plans ? (
                        <div>
                          {restaurant.subscription_plans.name}
                          {restaurant.subscription_plans.is_legacy && (
                            <Badge variant="warning" style={{ marginLeft: tokens.spacing.xs }}>
                              Legacy
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: tokens.colors.gray[400] }}>Nessun piano</span>
                      )}
                    </td>
                    <td style={tdStyles}>
                      <Badge variant={getStatusVariant(restaurant.subscription_status)}>
                        {getStatusLabel(restaurant.subscription_status)}
                      </Badge>
                    </td>
                    <td style={tdStyles}>
                      {restaurant.subscription_expires_at ? (
                        new Date(restaurant.subscription_expires_at).toLocaleDateString('it-IT')
                      ) : (
                        <span style={{ color: tokens.colors.gray[400] }}>N/A</span>
                      )}
                    </td>
                    <td style={tdStyles}>
                      <div style={actionsStyles}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRestaurant(restaurant)}
                        >
                          Modifica
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTempUpgrade(restaurant)}
                          style={{ color: tokens.colors.premium.base }}
                        >
                          Upgrade Temp
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRestaurant(restaurant)}
                          style={{ color: tokens.colors.error.base }}
                        >
                          Elimina
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedRestaurant(null)
          setError(null)
        }}
        size="md"
      >
        <Modal.Header>
          <Modal.Title>
            Modifica Piano - {selectedRestaurant?.name}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div style={{ marginBottom: tokens.spacing.lg }}>
            <label style={{
              display: 'block',
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              marginBottom: tokens.spacing.xs,
              color: tokens.colors.gray[700]
            }}>
              Piano di Sottoscrizione
            </label>
            <select
              value={editForm.planId}
              onChange={(e) => setEditForm({ ...editForm, planId: e.target.value })}
              style={{
                width: '100%',
                padding: tokens.spacing.sm,
                fontSize: tokens.typography.fontSize.sm,
                border: `1px solid ${tokens.colors.gray[300]}`,
                borderRadius: tokens.borderRadius.md,
                outline: 'none',
              }}
            >
              <option value="">Seleziona un piano...</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - €{plan.price_monthly}/mese
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: tokens.spacing.lg }}>
            <label style={{
              display: 'block',
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              marginBottom: tokens.spacing.xs,
              color: tokens.colors.gray[700]
            }}>
              Stato Sottoscrizione
            </label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              style={{
                width: '100%',
                padding: tokens.spacing.sm,
                fontSize: tokens.typography.fontSize.sm,
                border: `1px solid ${tokens.colors.gray[300]}`,
                borderRadius: tokens.borderRadius.md,
                outline: 'none',
              }}
            >
              <option value="active">Attivo</option>
              <option value="trial">Trial</option>
              <option value="expired">Scaduto</option>
              <option value="cancelled">Cancellato</option>
              <option value="suspended">Sospeso</option>
            </select>
          </div>

          <div style={{ marginBottom: tokens.spacing.lg }}>
            <label style={{
              display: 'block',
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              marginBottom: tokens.spacing.xs,
              color: tokens.colors.gray[700]
            }}>
              Data Scadenza (opzionale)
            </label>
            <input
              type="date"
              value={editForm.expiresAt}
              onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })}
              style={{
                width: '100%',
                padding: tokens.spacing.sm,
                fontSize: tokens.typography.fontSize.sm,
                border: `1px solid ${tokens.colors.gray[300]}`,
                borderRadius: tokens.borderRadius.md,
                outline: 'none',
              }}
            />
            <p style={{
              fontSize: tokens.typography.fontSize.xs,
              color: tokens.colors.gray[500],
              marginTop: tokens.spacing.xs
            }}>
              Lascia vuoto per nessuna scadenza
            </p>
          </div>

          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline" onClick={() => {
            setShowEditModal(false)
            setSelectedRestaurant(null)
            setError(null)
          }}>
            Annulla
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveEdit}
            disabled={!editForm.planId}
          >
            Salva Modifiche
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedRestaurant(null)
          setDeleteConfirmEmail('')
          setError(null)
        }}
        size="md"
      >
        <Modal.Header>
          <Modal.Title style={{ color: tokens.colors.error.base }}>
            Conferma Sospensione
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p style={{ marginBottom: tokens.spacing.md }}>
            Sei sicuro di voler sospendere il ristorante <strong>{selectedRestaurant?.name}</strong>?
          </p>

          <Alert variant="warning" style={{ marginBottom: tokens.spacing.md }}>
            L'account verrà sospeso ma non eliminato definitivamente. Potrai riattivarlo in seguito.
          </Alert>

          <p style={{
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.gray[700],
            marginBottom: tokens.spacing.sm
          }}>
            Per confermare, digita l'email del ristorante:
          </p>

          <p style={{
            fontSize: tokens.typography.fontSize.sm,
            fontWeight: tokens.typography.fontWeight.medium,
            color: tokens.colors.gray[900],
            marginBottom: tokens.spacing.sm,
            fontFamily: 'monospace',
            backgroundColor: tokens.colors.gray[100],
            padding: tokens.spacing.xs,
            borderRadius: tokens.borderRadius.sm
          }}>
            {selectedRestaurant?.owner_email}
          </p>

          <input
            type="email"
            placeholder="Conferma email..."
            value={deleteConfirmEmail}
            onChange={(e) => setDeleteConfirmEmail(e.target.value)}
            style={{
              width: '100%',
              padding: tokens.spacing.sm,
              fontSize: tokens.typography.fontSize.sm,
              border: `1px solid ${tokens.colors.gray[300]}`,
              borderRadius: tokens.borderRadius.md,
              outline: 'none',
            }}
          />

          {error && (
            <Alert variant="error" style={{ marginTop: tokens.spacing.md }}>
              {error}
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline" onClick={() => {
            setShowDeleteModal(false)
            setSelectedRestaurant(null)
            setDeleteConfirmEmail('')
            setError(null)
          }}>
            Annulla
          </Button>
          <Button
            variant="primary"
            onClick={confirmDelete}
            disabled={deleteConfirmEmail !== selectedRestaurant?.owner_email}
            style={{ backgroundColor: tokens.colors.error.base }}
          >
            Sospendi Account
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Temporary Upgrade Modal */}
      <Modal
        isOpen={showTempUpgradeModal}
        onClose={() => {
          setShowTempUpgradeModal(false)
          setSelectedRestaurant(null)
          setError(null)
        }}
        size="md"
      >
        <Modal.Header>
          <Modal.Title>
            Assegna Upgrade Temporaneo - {selectedRestaurant?.name}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Alert variant="info" style={{ marginBottom: tokens.spacing.lg }}>
            L'upgrade temporaneo permette di dare accesso a un piano superiore per un periodo limitato.
            Alla scadenza, il ristorante tornerà automaticamente al piano originale.
          </Alert>

          <div style={{ marginBottom: tokens.spacing.lg }}>
            <label style={{
              display: 'block',
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              marginBottom: tokens.spacing.xs,
              color: tokens.colors.gray[700]
            }}>
              Piano corrente
            </label>
            <p style={{
              padding: tokens.spacing.sm,
              backgroundColor: tokens.colors.gray[100],
              borderRadius: tokens.borderRadius.md,
              fontSize: tokens.typography.fontSize.sm,
              color: tokens.colors.gray[700]
            }}>
              {selectedRestaurant?.subscription_plans?.name || 'Nessun piano'}
            </p>
          </div>

          <div style={{ marginBottom: tokens.spacing.lg }}>
            <label style={{
              display: 'block',
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              marginBottom: tokens.spacing.xs,
              color: tokens.colors.gray[700]
            }}>
              Piano Temporaneo *
            </label>
            <select
              value={tempUpgradeForm.planId}
              onChange={(e) => setTempUpgradeForm({ ...tempUpgradeForm, planId: e.target.value })}
              style={{
                width: '100%',
                padding: tokens.spacing.sm,
                fontSize: tokens.typography.fontSize.sm,
                border: `1px solid ${tokens.colors.gray[300]}`,
                borderRadius: tokens.borderRadius.md,
                outline: 'none',
              }}
            >
              <option value="">Seleziona piano...</option>
              {plans
                .filter(p => p.id !== selectedRestaurant?.subscription_plan_id)
                .map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - €{plan.price_monthly}/mese
                  </option>
                ))}
            </select>
          </div>

          <div style={{ marginBottom: tokens.spacing.lg }}>
            <label style={{
              display: 'block',
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              marginBottom: tokens.spacing.xs,
              color: tokens.colors.gray[700]
            }}>
              Durata (giorni) *
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={tempUpgradeForm.days}
              onChange={(e) => setTempUpgradeForm({ ...tempUpgradeForm, days: parseInt(e.target.value) || 1 })}
              style={{
                width: '100%',
                padding: tokens.spacing.sm,
                fontSize: tokens.typography.fontSize.sm,
                border: `1px solid ${tokens.colors.gray[300]}`,
                borderRadius: tokens.borderRadius.md,
                outline: 'none',
              }}
            />
            <p style={{
              fontSize: tokens.typography.fontSize.xs,
              color: tokens.colors.gray[500],
              marginTop: tokens.spacing.xs
            }}>
              L'upgrade scadrà il {selectedRestaurant && new Date(Date.now() + tempUpgradeForm.days * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT')}
            </p>
          </div>

          <div style={{ marginBottom: tokens.spacing.lg }}>
            <label style={{
              display: 'block',
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              marginBottom: tokens.spacing.xs,
              color: tokens.colors.gray[700]
            }}>
              Motivo (opzionale)
            </label>
            <textarea
              value={tempUpgradeForm.reason}
              onChange={(e) => setTempUpgradeForm({ ...tempUpgradeForm, reason: e.target.value })}
              placeholder="Es: Promozione Natale 2025, Test features premium, etc."
              rows={3}
              style={{
                width: '100%',
                padding: tokens.spacing.sm,
                fontSize: tokens.typography.fontSize.sm,
                border: `1px solid ${tokens.colors.gray[300]}`,
                borderRadius: tokens.borderRadius.md,
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline" onClick={() => {
            setShowTempUpgradeModal(false)
            setSelectedRestaurant(null)
            setError(null)
          }}>
            Annulla
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveTempUpgrade}
            disabled={!tempUpgradeForm.planId}
          >
            Assegna Upgrade
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Batch Upgrade Modal */}
      <Modal
        isOpen={showBatchUpgradeModal}
        onClose={() => {
          if (batchUpgradeProgress.current === 0 || batchUpgradeProgress.current === batchUpgradeProgress.total) {
            setShowBatchUpgradeModal(false)
            setError(null)
          }
        }}
        size="md"
      >
        <Modal.Header>
          <Modal.Title>
            Upgrade Temporaneo Massivo
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {batchUpgradeProgress.current === 0 ? (
            <>
              <Alert variant="info" style={{ marginBottom: tokens.spacing.lg }}>
                Stai per applicare un upgrade temporaneo a <strong>{filteredRestaurants.length} ristoranti</strong> che matchano i filtri correnti.
              </Alert>

              <div style={{ marginBottom: tokens.spacing.lg }}>
                <label style={{
                  display: 'block',
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.medium,
                  marginBottom: tokens.spacing.xs,
                  color: tokens.colors.gray[700]
                }}>
                  Filtri Applicati
                </label>
                <div style={{
                  padding: tokens.spacing.sm,
                  backgroundColor: tokens.colors.gray[100],
                  borderRadius: tokens.borderRadius.md,
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.gray[700]
                }}>
                  {searchQuery && <div>• Ricerca: "{searchQuery}"</div>}
                  {filterPlan !== 'all' && (
                    <div>• Piano: {filterPlan === 'no_plan' ? 'Nessun piano' : plans.find(p => p.id === filterPlan)?.name}</div>
                  )}
                  {filterStatus !== 'all' && <div>• Stato: {getStatusLabel(filterStatus)}</div>}
                  {!searchQuery && filterPlan === 'all' && filterStatus === 'all' && (
                    <div>• Nessun filtro (tutti i ristoranti)</div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: tokens.spacing.lg }}>
                <label style={{
                  display: 'block',
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.medium,
                  marginBottom: tokens.spacing.xs,
                  color: tokens.colors.gray[700]
                }}>
                  Piano Temporaneo *
                </label>
                <select
                  value={batchUpgradeForm.planId}
                  onChange={(e) => setBatchUpgradeForm({ ...batchUpgradeForm, planId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: tokens.spacing.sm,
                    fontSize: tokens.typography.fontSize.sm,
                    border: `1px solid ${tokens.colors.gray[300]}`,
                    borderRadius: tokens.borderRadius.md,
                    outline: 'none',
                  }}
                >
                  <option value="">Seleziona piano...</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - €{plan.price_monthly}/mese
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: tokens.spacing.lg }}>
                <label style={{
                  display: 'block',
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.medium,
                  marginBottom: tokens.spacing.xs,
                  color: tokens.colors.gray[700]
                }}>
                  Durata (giorni) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={batchUpgradeForm.days}
                  onChange={(e) => setBatchUpgradeForm({ ...batchUpgradeForm, days: parseInt(e.target.value) || 1 })}
                  style={{
                    width: '100%',
                    padding: tokens.spacing.sm,
                    fontSize: tokens.typography.fontSize.sm,
                    border: `1px solid ${tokens.colors.gray[300]}`,
                    borderRadius: tokens.borderRadius.md,
                    outline: 'none',
                  }}
                />
                <p style={{
                  fontSize: tokens.typography.fontSize.xs,
                  color: tokens.colors.gray[500],
                  marginTop: tokens.spacing.xs
                }}>
                  Tutti gli upgrade scadranno il {new Date(Date.now() + batchUpgradeForm.days * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT')}
                </p>
              </div>

              <div style={{ marginBottom: tokens.spacing.lg }}>
                <label style={{
                  display: 'block',
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.medium,
                  marginBottom: tokens.spacing.xs,
                  color: tokens.colors.gray[700]
                }}>
                  Motivo (opzionale)
                </label>
                <textarea
                  value={batchUpgradeForm.reason}
                  onChange={(e) => setBatchUpgradeForm({ ...batchUpgradeForm, reason: e.target.value })}
                  placeholder="Es: Promozione Black Friday 2025"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: tokens.spacing.sm,
                    fontSize: tokens.typography.fontSize.sm,
                    border: `1px solid ${tokens.colors.gray[300]}`,
                    borderRadius: tokens.borderRadius.md,
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
            </>
          ) : (
            <>
              {/* Progress Bar */}
              <div style={{ marginBottom: tokens.spacing.lg }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: tokens.spacing.xs,
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.gray[700]
                }}>
                  <span>Progresso</span>
                  <span>{batchUpgradeProgress.current} / {batchUpgradeProgress.total}</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: tokens.colors.gray[200],
                  borderRadius: tokens.borderRadius.full,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(batchUpgradeProgress.current / batchUpgradeProgress.total) * 100}%`,
                    height: '100%',
                    backgroundColor: tokens.colors.premium.base,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: tokens.spacing.md,
                marginBottom: tokens.spacing.lg
              }}>
                <div style={{
                  padding: tokens.spacing.md,
                  backgroundColor: tokens.colors.success.light,
                  borderRadius: tokens.borderRadius.md,
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: tokens.typography.fontSize['2xl'],
                    fontWeight: tokens.typography.fontWeight.bold,
                    color: tokens.colors.success.dark
                  }}>
                    {batchUpgradeProgress.success}
                  </div>
                  <div style={{
                    fontSize: tokens.typography.fontSize.xs,
                    color: tokens.colors.success.dark,
                    textTransform: 'uppercase'
                  }}>
                    Successi
                  </div>
                </div>
                <div style={{
                  padding: tokens.spacing.md,
                  backgroundColor: tokens.colors.error.light,
                  borderRadius: tokens.borderRadius.md,
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: tokens.typography.fontSize['2xl'],
                    fontWeight: tokens.typography.fontWeight.bold,
                    color: tokens.colors.error.dark
                  }}>
                    {batchUpgradeProgress.failed}
                  </div>
                  <div style={{
                    fontSize: tokens.typography.fontSize.xs,
                    color: tokens.colors.error.dark,
                    textTransform: 'uppercase'
                  }}>
                    Falliti
                  </div>
                </div>
              </div>

              {batchUpgradeProgress.current === batchUpgradeProgress.total && (
                <Alert variant="success">
                  Upgrade massivo completato! {batchUpgradeProgress.success} successi, {batchUpgradeProgress.failed} falliti.
                </Alert>
              )}
            </>
          )}

          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          {batchUpgradeProgress.current === 0 ? (
            <>
              <Button variant="outline" onClick={() => {
                setShowBatchUpgradeModal(false)
                setError(null)
              }}>
                Annulla
              </Button>
              <Button
                variant="primary"
                onClick={executeBatchUpgrade}
                disabled={!batchUpgradeForm.planId}
                style={{ backgroundColor: tokens.colors.premium.base }}
              >
                Applica a {filteredRestaurants.length} Ristoranti
              </Button>
            </>
          ) : batchUpgradeProgress.current === batchUpgradeProgress.total ? (
            <Button variant="primary" onClick={() => {
              setShowBatchUpgradeModal(false)
              setError(null)
            }}>
              Chiudi
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Elaborazione in corso...
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </SuperAdminLayout>
  )
}

export default RestaurantsManagement
