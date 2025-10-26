import React, { useState, useEffect } from 'react'
import { Modal, Button, Badge, Spinner } from './ui'
import { tokens } from '../styles/tokens'
import * as ordersService from '../lib/ordersService'

/**
 * Modal Dettaglio Tavolo
 * Mostra ordine completo con batch, prodotti, azioni
 */
function TableDetailModal({
  isOpen,
  onClose,
  order,
  onOrderUpdated,
  onAddProducts,
  onChangeTable,
  restaurantId
}) {
  const [loading, setLoading] = useState(false)
  const [elapsedTime, setElapsedTime] = useState('00:00:00')

  // Aggiorna timer ogni secondo
  useEffect(() => {
    if (!order || !order.opened_at) return

    const updateTimer = () => {
      setElapsedTime(ordersService.formatElapsedTime(order.opened_at))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [order?.opened_at])

  if (!order) return null

  // Raggruppa items per batch
  const batches = ordersService.groupItemsByBatch(order.items || [])
  const batchNumbers = Object.keys(batches).sort((a, b) => a - b)

  // Calcola totali
  const itemsTotal = (order.items || []).reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0)
  const priorityTotal = parseFloat(order.priority_order_amount || 0)
  const grandTotal = itemsTotal + priorityTotal

  // Determina azioni disponibili
  const isPending = order.status === 'pending'
  const isPreparing = order.status === 'preparing'
  const hasPendingItems = (order.items || []).some(item => !item.prepared)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const result = await ordersService.confirmOrder(order.id, null) // TODO: pass staffId
      if (result.success) {
        alert('Ordine confermato!')
        onOrderUpdated?.()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Errore conferma:', error)
      alert('Errore durante la conferma')
    } finally {
      setLoading(false)
    }
  }

  const handlePreconto = async () => {
    setLoading(true)
    try {
      const result = await ordersService.generatePreconto(order.id, null) // TODO: pass staffId
      if (result.success) {
        // Generate print HTML
        printReceipt(result.order, false)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Errore preconto:', error)
      alert('Errore durante la generazione del preconto')
    } finally {
      setLoading(false)
    }
  }

  const handleScontrino = async () => {
    if (!confirm('Chiudere il tavolo e generare lo scontrino fiscale?')) return

    setLoading(true)
    try {
      const result = await ordersService.generateScontrino(order.id, null) // TODO: pass staffId
      if (result.success) {
        // Generate print HTML
        printReceipt(result.order, true, result.receiptNumber)
        onOrderUpdated?.()
        onClose()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Errore scontrino:', error)
      alert('Errore durante la generazione dello scontrino')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Eliminare questo ordine? Questa azione non può essere annullata.')) return

    setLoading(true)
    try {
      const result = await ordersService.deleteOrder(order.id, null) // TODO: pass staffId
      if (result.success) {
        alert('Ordine eliminato')
        onOrderUpdated?.()
        onClose()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('Errore durante l\'eliminazione')
    } finally {
      setLoading(false)
    }
  }

  const printReceipt = (orderData, isScontrino, receiptNumber) => {
    const printWindow = window.open('', '_blank')
    const items = orderData.items || order.items || []

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${isScontrino ? 'Scontrino' : 'Preconto'} #${orderData.order_number || order.order_number}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            width: 80mm;
            margin: 0;
            padding: 8mm;
          }
          .header {
            text-align: center;
            font-weight: bold;
            margin-bottom: 8px;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
          }
          .line {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          .separator {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .total {
            font-weight: bold;
            font-size: 14px;
            border-top: 2px solid #000;
            padding-top: 8px;
            margin-top: 8px;
          }
          .footer {
            text-align: center;
            margin-top: 16px;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>${isScontrino ? 'SCONTRINO FISCALE' : 'PRECONTO'}</div>
          ${isScontrino && receiptNumber ? `<div>N° ${receiptNumber}</div>` : ''}
          <div>Ordine #${orderData.order_number || order.order_number}</div>
          <div>${new Date().toLocaleString('it-IT')}</div>
        </div>

        ${orderData.table ? `<div class="line"><span>Tavolo:</span><span>${orderData.table.number}</span></div>` : ''}
        ${orderData.room ? `<div class="line"><span>Sala:</span><span>${orderData.room.name}</span></div>` : ''}
        ${orderData.customer_name || order.customer_name ? `<div class="line"><span>Cliente:</span><span>${orderData.customer_name || order.customer_name}</span></div>` : ''}

        <div class="separator"></div>

        ${items.map(item => `
          <div class="line">
            <span>${item.quantity}x ${item.product_name}${item.variant_title ? ` (${item.variant_title})` : ''}</span>
            <span>€${parseFloat(item.subtotal).toFixed(2)}</span>
          </div>
          ${item.notes ? `<div style="font-size: 10px; margin-left: 20px; font-style: italic;">${item.notes}</div>` : ''}
        `).join('')}

        ${(orderData.priority_order_amount || order.priority_order_amount) > 0 ? `
          <div class="line">
            <span>Priority Order</span>
            <span>€${parseFloat(orderData.priority_order_amount || order.priority_order_amount).toFixed(2)}</span>
          </div>
        ` : ''}

        <div class="separator"></div>

        <div class="total">
          <div class="line">
            <span>TOTALE:</span>
            <span>€${parseFloat(orderData.total_amount || order.total_amount || grandTotal).toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          Grazie per la visita!
        </div>

        <script>
          window.onload = () => {
            window.print()
            window.onafterprint = () => window.close()
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <Modal.Header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Modal.Title>
            Tavolo {order.table?.number || order.table_number} - {order.room?.name || 'Sala'}
          </Modal.Title>
          <Badge
            variant={isPending ? 'warning' : isPreparing ? 'success' : 'default'}
            size="lg"
          >
            {isPending ? 'In Attesa' : isPreparing ? 'Attivo' : 'Completato'}
          </Badge>
        </div>
      </Modal.Header>

      <Modal.Body>
        {loading ? (
          <Spinner centered text="Caricamento..." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
            {/* Info Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: tokens.spacing.md,
              background: tokens.colors.gray[50],
              borderRadius: tokens.borderRadius.md
            }}>
              <div>
                <div style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.gray[600] }}>
                  Ordine #{order.order_number}
                </div>
                {order.customer_name && (
                  <div style={{ fontSize: tokens.typography.fontSize.sm, marginTop: tokens.spacing.xs }}>
                    Cliente: {order.customer_name}
                  </div>
                )}
              </div>
              <div className="timer-display">
                {elapsedTime}
              </div>
            </div>

            {/* Priority Badge */}
            {priorityTotal > 0 && (
              <div className="priority-badge">
                ⚡ Priority Order (+€{priorityTotal.toFixed(2)})
              </div>
            )}

            {/* Prodotti per Batch */}
            <div>
              <h4 style={{
                margin: 0,
                marginBottom: tokens.spacing.md,
                fontSize: tokens.typography.fontSize.base,
                fontWeight: tokens.typography.fontWeight.semibold
              }}>
                Prodotti Ordinati
              </h4>

              {batchNumbers.map((batchNum, index) => {
                const batchItems = batches[batchNum]
                const isFirstBatch = index === 0

                return (
                  <div key={batchNum}>
                    {!isFirstBatch && (
                      <div className="batch-separator">
                        {batchNum === '2' ? 'Seconda Portata' : batchNum === '3' ? 'Terza Portata' : `Portata ${batchNum}`}
                        {' '}
                        <span style={{ fontSize: '12px', color: tokens.colors.gray[500] }}>
                          ({batchItems.filter(i => !i.prepared).length} da preparare)
                        </span>
                      </div>
                    )}

                    {batchItems.map((item, idx) => (
                      <div key={item.id || idx} className={`product-item ${item.prepared ? 'prepared' : ''}`}>
                        <input
                          type="checkbox"
                          className="product-checkbox"
                          checked={item.prepared}
                          disabled
                          readOnly
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: tokens.typography.fontSize.sm,
                            fontWeight: tokens.typography.fontWeight.medium
                          }}>
                            {item.quantity}x {item.product_name}
                            {item.variant_title && (
                              <span style={{ color: tokens.colors.gray[600] }}>
                                {' '}({item.variant_title})
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <div style={{
                              fontSize: tokens.typography.fontSize.xs,
                              color: tokens.colors.gray[500],
                              fontStyle: 'italic',
                              marginTop: tokens.spacing.xs
                            }}>
                              Note: {item.notes}
                            </div>
                          )}
                          <div style={{
                            fontSize: tokens.typography.fontSize.xs,
                            color: tokens.colors.gray[600],
                            marginTop: tokens.spacing.xs
                          }}>
                            €{parseFloat(item.product_price).toFixed(2)} × {item.quantity}
                          </div>
                        </div>
                        <div style={{
                          fontSize: tokens.typography.fontSize.base,
                          fontWeight: tokens.typography.fontWeight.semibold
                        }}>
                          €{parseFloat(item.subtotal).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            {/* Note Ordine */}
            {order.customer_notes && (
              <div style={{
                padding: tokens.spacing.md,
                background: tokens.colors.info.light,
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.fontSize.sm
              }}>
                <strong>Note:</strong> {order.customer_notes}
              </div>
            )}

            {/* Totale */}
            <div style={{
              borderTop: `2px solid ${tokens.colors.gray[300]}`,
              paddingTop: tokens.spacing.md,
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing.sm
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotale:</span>
                <span>€{itemsTotal.toFixed(2)}</span>
              </div>
              {priorityTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Priority:</span>
                  <span>+€{priorityTotal.toFixed(2)}</span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: tokens.typography.fontSize.xl,
                fontWeight: tokens.typography.fontWeight.bold,
                paddingTop: tokens.spacing.sm,
                borderTop: `1px solid ${tokens.colors.gray[200]}`
              }}>
                <span>TOTALE:</span>
                <span>€{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <div style={{ display: 'flex', gap: tokens.spacing.sm, width: '100%', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {/* Cambia Tavolo - always visible */}
          <Button variant="secondary" onClick={() => onChangeTable?.(order)} disabled={loading}>
            Cambia Tavolo
          </Button>

          <div style={{ display: 'flex', gap: tokens.spacing.sm, flexWrap: 'wrap' }}>
            {/* Azioni per ordine PENDING */}
            {isPending && (
              <>
                <Button variant="primary" onClick={handleConfirm} disabled={loading}>
                  Conferma Ordine
                </Button>
                <Button variant="outline" onClick={() => onAddProducts?.(order)} disabled={loading}>
                  Modifica
                </Button>
                <Button variant="danger" onClick={handleDelete} disabled={loading}>
                  Elimina
                </Button>
              </>
            )}

            {/* Azioni per ordine PREPARING */}
            {isPreparing && (
              <>
                <Button variant="primary" onClick={() => onAddProducts?.(order)} disabled={loading}>
                  Aggiungi Prodotti
                </Button>
                <Button variant="outline" onClick={handlePreconto} disabled={loading}>
                  Preconto
                </Button>
                <Button variant="success" onClick={handleScontrino} disabled={loading}>
                  Scontrino
                </Button>
                <Button variant="ghost" onClick={handleDelete} disabled={loading}>
                  Elimina
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

export default TableDetailModal
