import React from 'react'
import { Card, Badge, Button } from './ui'
import { tokens } from '../styles/tokens'

/**
 * OrphanOrdersAlert
 * Component to display orders that have lost their table reference
 * (happens when a table is deleted while orders are still active)
 */
function OrphanOrdersAlert({ orphanOrders, onAssignTable }) {
  if (!orphanOrders || orphanOrders.length === 0) {
    return null
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div style={{ marginBottom: tokens.spacing.lg }}>
      <Card padding="md">
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: tokens.spacing.md,
            padding: tokens.spacing.md,
            backgroundColor: tokens.colors.warning.light,
            borderRadius: tokens.borderRadius.md,
            border: `2px solid ${tokens.colors.warning.base}`
          }}>
            {/* Warning Icon */}
            <div style={{
              fontSize: '24px',
              lineHeight: 1
            }}>
              ⚠️
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: tokens.typography.fontSize.md,
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.warning.dark,
                marginBottom: tokens.spacing.xs
              }}>
                Ordini Senza Tavolo Assegnato
              </div>

              <div style={{
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.gray[700],
                marginBottom: tokens.spacing.md
              }}>
                {orphanOrders.length} {orphanOrders.length === 1 ? 'ordine ha' : 'ordini hanno'} perso il riferimento al tavolo.
                Questo può accadere quando un tavolo viene eliminato mentre ci sono ordini attivi.
              </div>

              {/* Orders List */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing.sm
              }}>
                {orphanOrders.map(order => (
                  <div
                    key={order.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: tokens.spacing.md,
                      padding: tokens.spacing.sm,
                      backgroundColor: tokens.colors.white,
                      borderRadius: tokens.borderRadius.md,
                      border: `1px solid ${tokens.colors.gray[300]}`,
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{
                        fontSize: tokens.typography.fontSize.sm,
                        fontWeight: tokens.typography.fontWeight.semibold,
                        marginBottom: tokens.spacing.xs
                      }}>
                        {order.customer_name || 'Cliente'} {order.table_number && `(ex Tavolo ${order.table_number})`}
                      </div>
                      <div style={{
                        fontSize: tokens.typography.fontSize.xs,
                        color: tokens.colors.gray[600]
                      }}>
                        Creato: {formatDate(order.created_at)} • {formatCurrency(order.total_amount)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: tokens.spacing.sm, alignItems: 'center' }}>
                      <Badge variant={
                        order.status === 'pending' ? 'warning' :
                        order.status === 'preparing' ? 'info' :
                        'default'
                      }>
                        {order.status === 'pending' ? 'In Attesa' :
                         order.status === 'preparing' ? 'In Preparazione' :
                         order.status}
                      </Badge>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onAssignTable?.(order)}
                      >
                        Assegna Tavolo
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: tokens.spacing.md,
                padding: tokens.spacing.sm,
                backgroundColor: tokens.colors.gray[100],
                borderRadius: tokens.borderRadius.sm,
                fontSize: tokens.typography.fontSize.xs,
                color: tokens.colors.gray[600]
              }}>
                💡 <strong>Suggerimento:</strong> Assegna questi ordini a un tavolo per continuare la gestione normale.
                In alternativa, puoi completarli o annullarli dalla sezione Ordini.
              </div>
            </div>
          </div>
      </Card>
    </div>
  )
}

export default OrphanOrdersAlert
