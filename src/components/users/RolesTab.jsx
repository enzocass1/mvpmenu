/**
 * RolesTab - Gestione Ruoli
 * Mostra tabella ruoli con azioni CRUD
 */

import React, { useState, useEffect } from 'react'
import { tokens } from '../../styles/tokens'
import { Card, Button, Badge } from '../ui'
import { getRoles, deleteRole } from '../../lib/rolesService'
import RoleModal from './RoleModal'

function RolesTab({ restaurantId, session }) {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState(null) // Per edit

  useEffect(() => {
    if (restaurantId) {
      loadRoles()
    }
  }, [restaurantId])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const result = await getRoles(restaurantId)

      if (result.success) {
        setRoles(result.data || [])
      } else {
        console.error('Errore caricamento ruoli:', result.error)
      }
    } catch (error) {
      console.error('Errore caricamento ruoli:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRole = () => {
    setSelectedRole(null)
    setShowRoleModal(true)
  }

  const handleEditRole = (role) => {
    setSelectedRole(role)
    setShowRoleModal(true)
  }

  const handleDeleteRole = async (role) => {
    if (role.is_system_role) {
      alert('Impossibile eliminare ruoli di sistema')
      return
    }

    if (!confirm(`Sei sicuro di voler eliminare il ruolo "${role.name}"?`)) {
      return
    }

    const result = await deleteRole(role.id)

    if (result.success) {
      alert('Ruolo eliminato con successo')
      loadRoles()
    } else {
      alert(`Errore: ${result.error}`)
    }
  }

  const handleRoleSaved = () => {
    setShowRoleModal(false)
    setSelectedRole(null)
    loadRoles()
  }

  if (loading) {
    return (
      <Card padding="xl">
        <div style={{ textAlign: 'center' }}>Caricamento ruoli...</div>
      </Card>
    )
  }

  return (
    <>
      <div style={styles.container}>
        {/* Header con bottone Crea */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Ruoli</h2>
            <p style={styles.subtitle}>
              Gestisci i ruoli e i permessi per il tuo staff
            </p>
          </div>
          <Button variant="primary" onClick={handleCreateRole}>
            + Nuovo Ruolo
          </Button>
        </div>

        {/* Tabella Ruoli */}
        <Card padding="none">
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={{ ...styles.th, width: '30%' }}>Nome Ruolo</th>
                <th style={{ ...styles.th, width: '35%' }}>Descrizione</th>
                <th style={{ ...styles.th, width: '15%', textAlign: 'center' }}>Permessi</th>
                <th style={{ ...styles.th, width: '10%', textAlign: 'center' }}>Utenti</th>
                <th style={{ ...styles.th, width: '10%', textAlign: 'right' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => {
                const permissionsArray = typeof role.permissions === 'string'
                  ? JSON.parse(role.permissions)
                  : role.permissions

                const permissionsCount = permissionsArray?.includes('*')
                  ? 'Tutti'
                  : permissionsArray?.length || 0

                return (
                  <tr key={role.id} style={styles.tableRow}>
                    {/* Nome Ruolo con colore badge */}
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: role.color || '#3B82F6',
                          }}
                        />
                        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                          {role.name}
                        </span>
                        {role.is_system_role && (
                          <Badge variant="default" size="sm">Sistema</Badge>
                        )}
                      </div>
                    </td>

                    {/* Descrizione */}
                    <td style={styles.td}>
                      <span style={{ color: tokens.colors.gray[600] }}>
                        {role.description || '-'}
                      </span>
                    </td>

                    {/* Numero Permessi */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <Badge variant="info" size="sm">
                        {permissionsCount} {permissionsCount === 1 ? 'permesso' : 'permessi'}
                      </Badge>
                    </td>

                    {/* Numero Utenti (TODO: contare da staff_role_assignments) */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={{ color: tokens.colors.gray[600] }}>
                        0
                      </span>
                    </td>

                    {/* Azioni */}
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: tokens.spacing.xs, justifyContent: 'flex-end' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                        >
                          Modifica
                        </Button>
                        {!role.is_system_role && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRole(role)}
                            style={{ color: tokens.colors.error.base }}
                          >
                            Elimina
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {roles.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateText}>Nessun ruolo trovato</p>
              <Button variant="primary" onClick={handleCreateRole}>
                Crea il Primo Ruolo
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Modal Crea/Modifica Ruolo */}
      {showRoleModal && (
        <RoleModal
          isOpen={showRoleModal}
          onClose={() => {
            setShowRoleModal(false)
            setSelectedRole(null)
          }}
          onSave={handleRoleSaved}
          role={selectedRole}
          restaurantId={restaurantId}
        />
      )}
    </>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xl,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.xs,
  },
  subtitle: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[600],
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: tokens.colors.gray[50],
    borderBottom: `1px solid ${tokens.colors.gray[200]}`,
  },
  th: {
    padding: tokens.spacing.md,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.gray[700],
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tableRow: {
    borderBottom: `1px solid ${tokens.colors.gray[200]}`,
    transition: 'background-color 0.2s',
  },
  td: {
    padding: tokens.spacing.md,
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.black,
  },
  emptyState: {
    padding: tokens.spacing['3xl'],
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.gray[600],
    marginBottom: tokens.spacing.lg,
  },
}

export default RolesTab
