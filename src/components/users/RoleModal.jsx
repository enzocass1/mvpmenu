/**
 * RoleModal - Modal Crea/Modifica Ruolo
 * Form con nome, descrizione, colore e checkbox permessi
 */

import React, { useState, useEffect } from 'react'
import { tokens } from '../../styles/tokens'
import { Modal, Button } from '../ui'
import { createRole, updateRole, PERMISSION_GROUPS } from '../../lib/rolesService'

function RoleModal({ isOpen, onClose, onSave, role, restaurantId }) {
  const isEdit = !!role

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    permissions: [],
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Popola form se edit
  useEffect(() => {
    if (role) {
      const permissionsArray = typeof role.permissions === 'string'
        ? JSON.parse(role.permissions)
        : role.permissions

      setFormData({
        name: role.name,
        description: role.description || '',
        color: role.color || '#3B82F6',
        permissions: permissionsArray || [],
      })
    }
  }, [role])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Validazioni
      if (!formData.name.trim()) {
        throw new Error('Nome ruolo obbligatorio')
      }

      if (formData.permissions.length === 0) {
        throw new Error('Seleziona almeno un permesso')
      }

      let result

      if (isEdit) {
        // Update
        result = await updateRole(role.id, formData)
      } else {
        // Create
        result = await createRole(restaurantId, formData)
      }

      if (result.success) {
        onSave()
      } else {
        throw new Error(result.error || 'Errore salvataggio ruolo')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePermissionToggle = (permissionKey) => {
    setFormData(prev => {
      const newPermissions = prev.permissions.includes(permissionKey)
        ? prev.permissions.filter(p => p !== permissionKey)
        : [...prev.permissions, permissionKey]

      return {
        ...prev,
        permissions: newPermissions
      }
    })
  }

  const handleGroupToggle = (group) => {
    const groupPermissions = group.permissions.map(p => p.key)
    const allSelected = groupPermissions.every(p => formData.permissions.includes(p))

    setFormData(prev => {
      let newPermissions

      if (allSelected) {
        // Deseleziona tutti del gruppo
        newPermissions = prev.permissions.filter(p => !groupPermissions.includes(p))
      } else {
        // Seleziona tutti del gruppo
        newPermissions = [...new Set([...prev.permissions, ...groupPermissions])]
      }

      return {
        ...prev,
        permissions: newPermissions
      }
    })
  }

  const isGroupSelected = (group) => {
    const groupPermissions = group.permissions.map(p => p.key)
    return groupPermissions.every(p => formData.permissions.includes(p))
  }

  const isGroupPartiallySelected = (group) => {
    const groupPermissions = group.permissions.map(p => p.key)
    const selectedCount = groupPermissions.filter(p => formData.permissions.includes(p)).length
    return selectedCount > 0 && selectedCount < groupPermissions.length
  }

  // Colori predefiniti
  const presetColors = [
    '#8B5CF6', // Violet
    '#3B82F6', // Blue
    '#22C55E', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#6366F1', // Indigo
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit}>
        <Modal.Header>
          <Modal.Title>
            {isEdit ? `Modifica Ruolo: ${role.name}` : 'Crea Nuovo Ruolo'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div style={styles.formContainer}>
            {/* Nome Ruolo */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Nome Ruolo <span style={{ color: tokens.colors.error.base }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={styles.input}
                placeholder="es: Manager, Cameriere, Cassiere"
                required
                disabled={role?.is_system_role}
              />
            </div>

            {/* Descrizione */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Descrizione</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                placeholder="Breve descrizione del ruolo e delle sue responsabilità"
                disabled={role?.is_system_role}
              />
            </div>

            {/* Colore Badge */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Colore Badge</label>
              <div style={styles.colorPicker}>
                {presetColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    style={{
                      ...styles.colorButton,
                      backgroundColor: color,
                      border: formData.color === color
                        ? `3px solid ${tokens.colors.black}`
                        : `1px solid ${tokens.colors.gray[300]}`,
                      transform: formData.color === color ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Permessi */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Permessi <span style={{ color: tokens.colors.error.base }}>*</span>
              </label>
              <div style={styles.permissionsContainer}>
                {PERMISSION_GROUPS.map((group) => {
                  const isSelected = isGroupSelected(group)
                  const isPartial = isGroupPartiallySelected(group)

                  return (
                    <div key={group.key} style={styles.permissionGroup}>
                      {/* Header Gruppo con Checkbox "Seleziona Tutti" */}
                      <div
                        style={styles.groupHeader}
                        onClick={() => handleGroupToggle(group)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          ref={input => {
                            if (input) input.indeterminate = isPartial
                          }}
                          onChange={() => {}} // Handled by onClick
                          style={styles.checkbox}
                        />
                        <span style={styles.groupName}>{group.name}</span>
                        <span style={styles.groupCount}>
                          ({group.permissions.length})
                        </span>
                      </div>

                      {/* Lista Permessi del Gruppo */}
                      <div style={styles.permissionsList}>
                        {group.permissions.map((permission) => (
                          <label
                            key={permission.key}
                            style={styles.permissionItem}
                          >
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(permission.key)}
                              onChange={() => handlePermissionToggle(permission.key)}
                              style={styles.checkbox}
                            />
                            <span style={styles.permissionLabel}>
                              {permission.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Riepilogo Permessi Selezionati */}
              <div style={styles.permissionsSummary}>
                Selezionati: <strong>{formData.permissions.length}</strong> permessi
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.error}>
                {error}
              </div>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <div style={styles.footer}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || role?.is_system_role}
            >
              {saving ? 'Salvataggio...' : (isEdit ? 'Salva Modifiche' : 'Crea Ruolo')}
            </Button>
          </div>
        </Modal.Footer>
      </form>
    </Modal>
  )
}

const styles = {
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.lg,
    maxHeight: 'calc(80vh - 200px)', // Limita altezza totale form
    overflowY: 'auto', // Scroll sull'intero form se necessario
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
  },
  label: {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.gray[700],
  },
  input: {
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    fontSize: tokens.typography.fontSize.sm,
    border: `1px solid ${tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.md,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  colorPicker: {
    display: 'flex',
    gap: tokens.spacing.sm,
    flexWrap: 'wrap',
  },
  colorButton: {
    width: '40px',
    height: '40px',
    borderRadius: tokens.borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  permissionsContainer: {
    border: `1px solid ${tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.md,
    maxHeight: '400px',
    overflowY: 'auto',
    overflowX: 'hidden',
    // Fix scroll per desktop
    WebkitOverflowScrolling: 'touch',
  },
  permissionGroup: {
    borderBottom: `1px solid ${tokens.colors.gray[200]}`,
  },
  groupHeader: {
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.gray[50],
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    cursor: 'pointer',
    userSelect: 'none',
  },
  groupName: {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
  },
  groupCount: {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.gray[500],
  },
  permissionsList: {
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
  },
  permissionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.xs,
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  permissionLabel: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[700],
  },
  permissionsSummary: {
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.gray[50],
    borderRadius: tokens.borderRadius.md,
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[700],
    textAlign: 'center',
  },
  error: {
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.error.light,
    color: tokens.colors.error.dark,
    borderRadius: tokens.borderRadius.md,
    fontSize: tokens.typography.fontSize.sm,
    textAlign: 'center',
  },
  footer: {
    display: 'flex',
    gap: tokens.spacing.sm,
    justifyContent: 'flex-end',
    width: '100%',
  },
}

export default RoleModal
