/**
 * Utility per gestione timeline ordini
 * Traccia tutte le modifiche con operatore
 */

import { supabase } from '../supabaseClient'

/**
 * Aggiungi entry alla timeline ordine
 * @param {string} orderId - ID ordine
 * @param {string} action - Tipo azione (created, confirmed, etc.)
 * @param {string|null} staffId - ID staff (se azione da staff)
 * @param {object} data - Dati aggiuntivi
 * @param {string|null} data.userId - ID utente owner (se azione da owner)
 * @param {string|null} data.createdByType - Tipo attore: 'staff'|'customer'|'system'|'owner'
 * @param {string|null} data.previousStatus - Status precedente
 * @param {string|null} data.newStatus - Nuovo status
 * @param {object|null} data.changes - Modifiche apportate (JSON)
 * @param {string|null} data.notes - Note aggiuntive
 */
export const addTimelineEntry = async (orderId, action, staffId = null, data = {}) => {
  try {
    const entry = {
      order_id: orderId,
      staff_id: staffId,
      user_id: data.userId || null,
      created_by_type: data.createdByType || (staffId ? 'staff' : 'system'),
      action: action,
      previous_status: data.previousStatus || null,
      new_status: data.newStatus || null,
      changes: data.changes || null,
      notes: data.notes || null
    }

    // Nota: staff_name e staff_role_display vengono popolati automaticamente
    // dal trigger populate_timeline_staff_info() nel database
    // Non serve fare query qui - il trigger fa join con roles table

    const { error } = await supabase
      .from('order_timeline')
      .insert(entry)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Errore aggiunta timeline:', error)
    return false
  }
}

/**
 * Ottieni timeline completa di un ordine
 */
export const getOrderTimeline = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('order_timeline')
      .select(`
        id,
        order_id,
        staff_id,
        user_id,
        created_by_type,
        action,
        previous_status,
        new_status,
        changes,
        notes,
        staff_name,
        staff_role_display,
        created_at
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Errore caricamento timeline:', error)
    return []
  }
}

/**
 * Formatta entry timeline per display
 */
export const formatTimelineEntry = (entry) => {
  const actionLabels = {
    created: 'Ordine creato',
    confirmed: 'Ordine confermato',
    preparing: 'In preparazione',
    completed: 'Completato',
    cancelled: 'Annullato',
    updated: 'Ordine modificato',
    item_added: 'Prodotto aggiunto',
    item_removed: 'Prodotto rimosso',
    item_updated: 'Prodotto modificato',
    table_changed: 'Tavolo modificato'
  }

  const statusLabels = {
    pending: 'In attesa',
    confirmed: 'Confermato',
    preparing: 'In preparazione',
    completed: 'Completato',
    cancelled: 'Annullato'
  }

  let description = actionLabels[entry.action] || entry.action

  if (entry.previous_status && entry.new_status) {
    description += ` (da ${statusLabels[entry.previous_status]} a ${statusLabels[entry.new_status]})`
  }

  // Determina nome operatore basato su created_by_type
  let operatorName = 'Sistema'
  let operatorRole = null

  if (entry.created_by_type === 'staff' || entry.created_by_type === 'owner') {
    // staff_role_display contiene già "da Admin - Vincenzo Cassese"
    // oppure solo nome se non c'è ruolo
    operatorName = entry.staff_name || 'Staff'
    operatorRole = entry.staff_role_display || null
  } else if (entry.created_by_type === 'customer') {
    operatorName = 'Cliente Incognito'
    operatorRole = null
  } else {
    // system
    operatorName = 'Sistema'
    operatorRole = null
  }

  return {
    ...entry,
    actionLabel: actionLabels[entry.action] || entry.action,
    description,
    operatorName,
    operatorRole,
    operatorDisplay: operatorRole || operatorName, // Display completo: "da Admin - Vincenzo Cassese" o "Sistema"
    formattedDate: new Date(entry.created_at).toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

/**
 * Ottieni ultima azione da parte di staff/owner
 */
export const getLastStaffAction = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('order_timeline')
      .select(`
        id,
        order_id,
        staff_id,
        user_id,
        created_by_type,
        action,
        previous_status,
        new_status,
        changes,
        notes,
        staff_name,
        staff_role_display,
        created_at
      `)
      .eq('order_id', orderId)
      .in('created_by_type', ['staff', 'owner'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) throw error
    return formatTimelineEntry(data)
  } catch (error) {
    console.error('Errore ultima azione staff:', error)
    return null
  }
}

/**
 * Ottieni statistiche timeline per ordine
 */
export const getTimelineStats = async (orderId) => {
  try {
    const timeline = await getOrderTimeline(orderId)

    const stats = {
      totalActions: timeline.length,
      staffActions: timeline.filter(e => e.staff_id).length,
      systemActions: timeline.filter(e => !e.staff_id).length,
      statusChanges: timeline.filter(e => e.previous_status && e.new_status).length,
      itemChanges: timeline.filter(e => ['item_added', 'item_removed', 'item_updated'].includes(e.action)).length,
      uniqueStaff: [...new Set(timeline.filter(e => e.staff_id).map(e => e.staff_id))].length,
      firstAction: timeline[0] ? formatTimelineEntry(timeline[0]) : null,
      lastAction: timeline[timeline.length - 1] ? formatTimelineEntry(timeline[timeline.length - 1]) : null
    }

    return stats
  } catch (error) {
    console.error('Errore statistiche timeline:', error)
    return null
  }
}

/**
 * Componente React per visualizzare timeline
 */
export const TimelineView = ({ timeline }) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div style={styles.emptyTimeline}>
        <p>Nessuna attività registrata</p>
      </div>
    )
  }

  return (
    <div style={styles.timeline}>
      {timeline.map((entry, index) => {
        const formatted = formatTimelineEntry(entry)
        const isLast = index === timeline.length - 1

        return (
          <div key={entry.id} style={styles.timelineItem}>
            <div style={styles.timelineDot}>
              <div style={{
                ...styles.dot,
                backgroundColor: getDotColor(entry.action)
              }} />
              {!isLast && <div style={styles.line} />}
            </div>
            <div style={styles.timelineContent}>
              <div style={styles.timelineHeader}>
                <span style={styles.actionLabel}>{formatted.actionLabel}</span>
                <span style={styles.timelineDate}>{formatted.formattedDate}</span>
              </div>
              <div style={styles.timelineBody}>
                <p style={styles.operator}>
                  {formatted.operatorRole ? (
                    // Mostra display completo con ruolo (es: "da Admin - Vincenzo Cassese")
                    <span>{formatted.operatorRole}</span>
                  ) : (
                    // Mostra solo nome/tipo (es: "Sistema" o "Cliente Incognito")
                    <span>{formatted.operatorName}</span>
                  )}
                </p>
                {entry.notes && (
                  <p style={styles.notes}>{entry.notes}</p>
                )}
                {entry.changes && (
                  <details style={styles.changes}>
                    <summary>Dettagli modifiche</summary>
                    <pre style={styles.changesJson}>
                      {JSON.stringify(entry.changes, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const getDotColor = (action) => {
  const colors = {
    created: '#2196F3',
    confirmed: '#FF9800',
    preparing: '#9C27B0',
    completed: '#4CAF50',
    cancelled: '#f44336',
    updated: '#FFC107',
    item_added: '#4CAF50',
    item_removed: '#f44336',
    item_updated: '#FF9800'
  }
  return colors[action] || '#999'
}

const styles = {
  emptyTimeline: {
    padding: '40px',
    textAlign: 'center',
    color: '#999',
    fontSize: '14px'
  },
  timeline: {
    padding: '20px 0'
  },
  timelineItem: {
    display: 'flex',
    gap: '16px',
    marginBottom: '8px'
  },
  timelineDot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0
  },
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid #fff',
    boxShadow: '0 0 0 2px currentColor'
  },
  line: {
    width: '2px',
    flex: 1,
    backgroundColor: '#e0e0e0',
    minHeight: '20px'
  },
  timelineContent: {
    flex: 1,
    paddingBottom: '16px'
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    gap: '12px'
  },
  actionLabel: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#000'
  },
  timelineDate: {
    fontSize: '12px',
    color: '#999',
    whiteSpace: 'nowrap'
  },
  timelineBody: {
    fontSize: '14px',
    color: '#666'
  },
  operator: {
    margin: '0 0 4px 0',
    fontSize: '13px',
    fontWeight: '500',
    color: '#333'
  },
  notes: {
    margin: '8px 0 0 0',
    padding: '8px 12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
    fontSize: '13px',
    fontStyle: 'italic'
  },
  changes: {
    marginTop: '8px',
    fontSize: '12px'
  },
  changesJson: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '11px',
    fontFamily: 'monospace'
  }
}

export default {
  addTimelineEntry,
  getOrderTimeline,
  formatTimelineEntry,
  getLastStaffAction,
  getTimelineStats,
  TimelineView
}
