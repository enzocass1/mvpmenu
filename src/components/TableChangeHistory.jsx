import React, { useState, useEffect } from 'react'
import { Card } from './ui'
import { tokens } from '../styles/tokens'
import { supabase } from '../supabaseClient'

/**
 * TableChangeHistory
 * Component to display the history of table changes for an order
 */
function TableChangeHistory({ orderId, restaurantId }) {
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId && restaurantId) {
      loadChanges()
    }
  }, [orderId, restaurantId])

  const loadChanges = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('table_change_logs')
        .select('*')
        .eq('order_id', orderId)
        .eq('restaurant_id', restaurantId)
        .order('changed_at', { ascending: true })

      if (error) throw error

      setChanges(data || [])
    } catch (error) {
      console.error('Error loading table change history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <Card.Section>
          <div style={{ textAlign: 'center', padding: tokens.spacing.lg }}>
            Caricamento storico...
          </div>
        </Card.Section>
      </Card>
    )
  }

  if (changes.length === 0) {
    return null // Don't show component if no changes
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card>
      <Card.Section>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.sm,
          marginBottom: tokens.spacing.md
        }}>
          <div style={{
            fontSize: tokens.typography.fontSize.sm,
            fontWeight: tokens.typography.fontWeight.semibold,
            color: tokens.colors.gray[900]
          }}>
            Storico Cambi Tavolo
          </div>
          <div style={{
            fontSize: tokens.typography.fontSize.xs,
            color: tokens.colors.gray[600],
            backgroundColor: tokens.colors.gray[100],
            padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
            borderRadius: tokens.borderRadius.md
          }}>
            {changes.length} {changes.length === 1 ? 'cambio' : 'cambi'}
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.md
        }}>
          {changes.map((change, index) => (
            <div
              key={change.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.md,
                padding: tokens.spacing.md,
                backgroundColor: tokens.colors.gray[50],
                borderRadius: tokens.borderRadius.md,
                border: `1px solid ${tokens.colors.gray[200]}`
              }}
            >
              {/* Timeline indicator */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '40px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: tokens.colors.primary.base,
                  color: tokens.colors.white,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: tokens.typography.fontSize.xs,
                  fontWeight: tokens.typography.fontWeight.bold
                }}>
                  {index + 1}
                </div>
                {index < changes.length - 1 && (
                  <div style={{
                    width: '2px',
                    height: '100%',
                    minHeight: '20px',
                    backgroundColor: tokens.colors.gray[300],
                    marginTop: tokens.spacing.xs
                  }} />
                )}
              </div>

              {/* Change details */}
              <div style={{ flex: 1 }}>
                {/* From → To */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.sm,
                  marginBottom: tokens.spacing.xs,
                  flexWrap: 'wrap'
                }}>
                  {/* Old table */}
                  <div style={{
                    fontSize: tokens.typography.fontSize.sm,
                    fontWeight: tokens.typography.fontWeight.medium,
                    color: tokens.colors.gray[700]
                  }}>
                    {change.old_room_name} - Tavolo {change.old_table_number}
                  </div>

                  {/* Arrow */}
                  <div style={{
                    fontSize: tokens.typography.fontSize.lg,
                    color: tokens.colors.gray[400],
                    fontWeight: tokens.typography.fontWeight.bold
                  }}>
                    →
                  </div>

                  {/* New table */}
                  <div style={{
                    fontSize: tokens.typography.fontSize.sm,
                    fontWeight: tokens.typography.fontWeight.semibold,
                    color: tokens.colors.success.dark
                  }}>
                    {change.new_room_name} - Tavolo {change.new_table_number}
                  </div>
                </div>

                {/* Metadata */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: tokens.spacing.xs,
                  fontSize: tokens.typography.fontSize.xs,
                  color: tokens.colors.gray[600]
                }}>
                  <div style={{ display: 'flex', gap: tokens.spacing.md, flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                        Operatore:
                      </span>{' '}
                      {change.changed_by_name}
                    </div>
                    <div>
                      <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                        Data:
                      </span>{' '}
                      {formatDate(change.changed_at)}
                    </div>
                  </div>
                  {change.notes && (
                    <div style={{
                      fontStyle: 'italic',
                      color: tokens.colors.gray[500]
                    }}>
                      Note: {change.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card.Section>
    </Card>
  )
}

export default TableChangeHistory
