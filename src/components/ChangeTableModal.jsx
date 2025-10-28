import React, { useState, useEffect } from 'react'
import { Modal, Button } from './ui'
import { tokens } from '../styles/tokens'
import { supabase } from '../supabaseClient'
import { getOccupiedTables } from '../lib/orderOperations'
import {
  addTimelineEntry,
  buildOperatorInfo,
  EVENT_SOURCE,
  TIMELINE_ACTION
} from '../lib/timelineService'

/**
 * Modal Cambia Tavolo
 * Simple modal to change table assignment for an existing order
 * Shows: Current Room/Table → New Room/Table
 */
function ChangeTableModal({
  isOpen,
  onClose,
  order,
  onTableChanged,
  restaurantId
}) {
  const [rooms, setRooms] = useState([])
  const [tables, setTables] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [selectedTableId, setSelectedTableId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [currentRoomName, setCurrentRoomName] = useState('')
  const [occupiedTableIds, setOccupiedTableIds] = useState([])

  // Load rooms and tables on mount
  useEffect(() => {
    if (!isOpen || !restaurantId) return
    loadRoomsAndTables()
  }, [isOpen, restaurantId])

  // Load tables when room is selected
  useEffect(() => {
    if (selectedRoomId) {
      loadTablesForRoom(selectedRoomId)
    } else {
      setTables([])
      setSelectedTableId(null)
    }
  }, [selectedRoomId])

  const loadRoomsAndTables = async () => {
    setLoadingData(true)
    try {
      // Load rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name')

      if (roomsError) throw roomsError
      setRooms(roomsData || [])

      // Load current room name
      if (order?.room_id) {
        const currentRoom = roomsData?.find(r => r.id === order.room_id)
        if (currentRoom) {
          setCurrentRoomName(currentRoom.name)
        }
        setSelectedRoomId(order.room_id)
      }

      // Load occupied tables using centralized service
      // ✅ Automatically filters: status IN ('pending', 'confirmed', 'preparing') AND deleted_at IS NULL
      const occupiedTables = await getOccupiedTables(restaurantId)

      // Extract table IDs, excluding current order's table (avoid showing current table as occupied)
      const occupiedIds = occupiedTables
        .filter(t => t.table_id !== order.table_id) // Exclude current order's table
        .map(t => t.table_id)
        .filter(Boolean)

      console.log(`[ChangeTableModal] ${occupiedIds.length} tavoli occupati (escluso tavolo corrente)`)
      setOccupiedTableIds(occupiedIds)
    } catch (error) {
      console.error('Error loading rooms:', error)
      alert('Errore nel caricamento delle sale')
    } finally {
      setLoadingData(false)
    }
  }

  const loadTablesForRoom = async (roomId) => {
    try {
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('room_id', roomId)
        .order('number')

      if (tablesError) throw tablesError
      setTables(tablesData || [])
    } catch (error) {
      console.error('Error loading tables:', error)
      alert('Errore nel caricamento dei tavoli')
    }
  }

  const handleChangeTable = async () => {
    if (!selectedTableId) {
      alert('Seleziona un tavolo')
      return
    }

    // Check if same table
    if (selectedTableId === order.table_id) {
      alert('Hai selezionato lo stesso tavolo')
      return
    }

    setLoading(true)
    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get user name from restaurant or auth metadata
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name')
        .eq('user_id', user.id)
        .single()

      const userName = restaurant?.name || user.email || 'Operatore'

      // Get old table info for logging
      const oldTable = order.table?.number || order.table_number
      const oldRoomName = currentRoomName

      // Get new table info for logging
      const newTable = tables.find(t => t.id === selectedTableId)
      const newRoomName = rooms.find(r => r.id === selectedRoomId)?.name

      // Update order's table_id and room_id
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          table_id: selectedTableId,
          room_id: selectedRoomId,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (updateError) throw updateError

      // ✅ Timeline Event - usando timelineService centralizzato
      await addTimelineEntry({
        orderId: order.id,
        action: TIMELINE_ACTION.TABLE_CHANGED,
        eventSource: EVENT_SOURCE.TABLE_SERVICE, // Cambio tavolo è operazione di servizio
        operator: buildOperatorInfo({
          staffId: null, // NULL per proprietario
          userId: user.id,
          createdByType: 'owner',
          staffName: userName
        }),
        data: {
          previousStatus: order.status,
          newStatus: order.status, // Status rimane lo stesso
          notes: `Tavolo cambiato da ${oldRoomName} T${oldTable} → ${newRoomName} T${newTable?.number}`,
          changes: {
            old_room_name: oldRoomName,
            old_table_number: oldTable,
            new_room_name: newRoomName,
            new_table_number: newTable?.number
          },
          isExpandable: true,
          detailsSummary: `Da ${oldRoomName} T${oldTable} → ${newRoomName} T${newTable?.number}`
        }
      }).catch(error => {
        console.error('Error inserting timeline entry:', error)
        // Don't fail the operation if timeline insert fails
      })

      // Log the table change in analytics table
      const { error: logError } = await supabase
        .from('table_change_logs')
        .insert({
          order_id: order.id,
          restaurant_id: restaurantId,
          old_room_id: order.room_id,
          old_table_id: order.table_id,
          old_room_name: oldRoomName,
          old_table_number: oldTable,
          new_room_id: selectedRoomId,
          new_table_id: selectedTableId,
          new_room_name: newRoomName,
          new_table_number: newTable?.number,
          changed_by_user_id: user.id,
          changed_by_name: userName,
          changed_at: new Date().toISOString()
        })

      if (logError) {
        console.error('Error logging table change:', logError)
        // Don't fail the operation if logging fails
      }

      alert('Tavolo cambiato con successo!')
      onTableChanged?.()
      onClose()
    } catch (error) {
      console.error('Error changing table:', error)
      alert('Errore durante il cambio tavolo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!order) return null

  // Get current room and table info
  const currentRoom = currentRoomName || 'N/A'
  const currentTable = order.table?.number || order.table_number || 'N/A'

  // Get selected new room and table info
  const newRoom = rooms.find(r => r.id === selectedRoomId)?.name || '...'
  const newTable = tables.find(t => t.id === selectedTableId)?.number || '...'

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <Modal.Header>
        <Modal.Title>Cambia Tavolo</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loadingData ? (
          <div style={{ textAlign: 'center', padding: tokens.spacing.xl }}>
            Caricamento...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xl }}>
            {/* Transformation Display */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: tokens.spacing.lg,
              padding: tokens.spacing.lg,
              background: tokens.colors.gray[50],
              borderRadius: tokens.borderRadius.lg,
              border: `1px solid ${tokens.colors.gray[200]}`
            }}>
              {/* Current Table */}
              <div style={{
                flex: 1,
                textAlign: 'center',
                padding: tokens.spacing.md,
                background: tokens.colors.white,
                borderRadius: tokens.borderRadius.md,
                border: `2px solid ${tokens.colors.gray[300]}`
              }}>
                <div style={{
                  fontSize: tokens.typography.fontSize.xs,
                  color: tokens.colors.gray[600],
                  marginBottom: tokens.spacing.xs,
                  fontWeight: tokens.typography.fontWeight.medium
                }}>
                  ATTUALE
                </div>
                <div style={{
                  fontSize: tokens.typography.fontSize.lg,
                  fontWeight: tokens.typography.fontWeight.bold,
                  color: tokens.colors.black
                }}>
                  {currentRoom}
                </div>
                <div style={{
                  fontSize: tokens.typography.fontSize.xl,
                  fontWeight: tokens.typography.fontWeight.bold,
                  color: tokens.colors.black,
                  marginTop: tokens.spacing.xs
                }}>
                  Tavolo {currentTable}
                </div>
              </div>

              {/* Arrow */}
              <div style={{
                fontSize: '32px',
                color: tokens.colors.gray[400],
                fontWeight: tokens.typography.fontWeight.bold
              }}>
                →
              </div>

              {/* New Table */}
              <div style={{
                flex: 1,
                textAlign: 'center',
                padding: tokens.spacing.md,
                background: selectedTableId ? tokens.colors.success.light : tokens.colors.white,
                borderRadius: tokens.borderRadius.md,
                border: `2px solid ${selectedTableId ? tokens.colors.success.base : tokens.colors.gray[300]}`
              }}>
                <div style={{
                  fontSize: tokens.typography.fontSize.xs,
                  color: tokens.colors.gray[600],
                  marginBottom: tokens.spacing.xs,
                  fontWeight: tokens.typography.fontWeight.medium
                }}>
                  NUOVO
                </div>
                <div style={{
                  fontSize: tokens.typography.fontSize.lg,
                  fontWeight: tokens.typography.fontWeight.bold,
                  color: selectedRoomId ? tokens.colors.black : tokens.colors.gray[400]
                }}>
                  {newRoom}
                </div>
                <div style={{
                  fontSize: tokens.typography.fontSize.xl,
                  fontWeight: tokens.typography.fontWeight.bold,
                  color: selectedTableId ? tokens.colors.black : tokens.colors.gray[400],
                  marginTop: tokens.spacing.xs
                }}>
                  {selectedTableId ? `Tavolo ${newTable}` : '...'}
                </div>
              </div>
            </div>

            {/* Selection Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
              {/* Room Selection */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.medium,
                  marginBottom: tokens.spacing.xs,
                  color: tokens.colors.gray[700]
                }}>
                  Seleziona Sala
                </label>
                <select
                  value={selectedRoomId || ''}
                  onChange={(e) => setSelectedRoomId(e.target.value || null)}
                  style={{
                    width: '100%',
                    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                    fontSize: tokens.typography.fontSize.sm,
                    border: `1px solid ${tokens.colors.gray[300]}`,
                    borderRadius: tokens.borderRadius.md,
                    backgroundColor: tokens.colors.white,
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Seleziona una sala --</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Table Selection */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.medium,
                  marginBottom: tokens.spacing.xs,
                  color: tokens.colors.gray[700]
                }}>
                  Seleziona Tavolo
                </label>
                <select
                  value={selectedTableId || ''}
                  onChange={(e) => setSelectedTableId(e.target.value || null)}
                  disabled={!selectedRoomId || tables.length === 0}
                  style={{
                    width: '100%',
                    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                    fontSize: tokens.typography.fontSize.sm,
                    border: `1px solid ${tokens.colors.gray[300]}`,
                    borderRadius: tokens.borderRadius.md,
                    backgroundColor: (!selectedRoomId || tables.length === 0) ? tokens.colors.gray[100] : tokens.colors.white,
                    cursor: (!selectedRoomId || tables.length === 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="">-- Seleziona un tavolo --</option>
                  {tables.map(table => {
                    // Skip current table - non mostrarlo nemmeno come opzione
                    if (table.id === order.table_id) {
                      return null
                    }

                    const isOccupied = occupiedTableIds.includes(table.id)
                    return (
                      <option
                        key={table.id}
                        value={table.id}
                        disabled={isOccupied}
                        style={{ color: isOccupied ? tokens.colors.gray[400] : 'inherit' }}
                      >
                        Tavolo {table.number}{isOccupied ? ' (Occupato)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <div style={{ display: 'flex', gap: tokens.spacing.sm, width: '100%', justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          <Button
            variant="success"
            onClick={handleChangeTable}
            disabled={loading || !selectedTableId}
          >
            {loading ? 'Salvataggio...' : 'Cambia Tavolo'}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

export default ChangeTableModal
