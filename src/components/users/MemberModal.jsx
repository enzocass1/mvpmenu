/**
 * MemberModal - Modal Crea/Modifica Membro Staff
 * Form con nome, email, password, ruolo
 */

import React, { useState, useEffect } from 'react'
import { tokens } from '../../styles/tokens'
import { Modal, Button, Badge } from '../ui'
import { supabase } from '../../supabaseClient'
import { getRoles, assignRoleToStaff } from '../../lib/rolesService'

function MemberModal({ isOpen, onClose, onSave, member, restaurantId }) {
  const isEdit = !!member

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    is_active: true,
    role_id: null,
  })

  const [roles, setRoles] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadingRoles, setLoadingRoles] = useState(true)

  // Carica ruoli disponibili
  useEffect(() => {
    if (restaurantId) {
      loadRoles()
    }
  }, [restaurantId])

  // Popola form se edit
  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        email: member.email,
        password: '', // Non mostriamo password esistente
        is_active: member.is_active,
        role_id: member.primary_role_id || null,
      })
    }
  }, [member])

  const loadRoles = async () => {
    try {
      setLoadingRoles(true)
      const result = await getRoles(restaurantId)

      if (result.success) {
        // Escludi ruolo "Proprietario" (is_system_role=true con name="Proprietario")
        const filteredRoles = (result.data || []).filter(
          role => !(role.is_system_role && role.name === 'Proprietario')
        )
        setRoles(filteredRoles)
      }
    } catch (error) {
      console.error('Errore caricamento ruoli:', error)
    } finally {
      setLoadingRoles(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Validazioni
      if (!formData.name.trim()) {
        throw new Error('Nome obbligatorio')
      }

      if (!formData.email.trim()) {
        throw new Error('Email obbligatoria')
      }

      if (!isEdit && !formData.password) {
        throw new Error('Password obbligatoria per nuovi membri')
      }

      if (!formData.role_id) {
        throw new Error('Seleziona un ruolo')
      }

      let staffId

      if (isEdit) {
        // Update membro esistente
        const updateData = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          is_active: formData.is_active,
          primary_role_id: formData.role_id,
        }

        // Aggiorna password solo se fornita
        if (formData.password) {
          updateData.password_hash = btoa(formData.password) // Base64 encode
        }

        const { error: updateError } = await supabase
          .from('restaurant_staff')
          .update(updateData)
          .eq('id', member.id)

        if (updateError) throw updateError

        staffId = member.id

        // Se ha cambiato ruolo, aggiorna assegnazione
        if (formData.role_id !== member.primary_role_id) {
          await assignRoleToStaff(staffId, formData.role_id, null)
        }

        alert('Membro aggiornato con successo')
      } else {
        // Crea nuovo membro
        const { data, error: insertError } = await supabase
          .from('restaurant_staff')
          .insert({
            restaurant_id: restaurantId,
            name: formData.name.trim(),
            email: formData.email.trim(),
            password_hash: btoa(formData.password), // Base64 encode
            is_active: formData.is_active,
            primary_role_id: formData.role_id,
          })
          .select()
          .single()

        if (insertError) throw insertError

        staffId = data.id

        // Assegna ruolo
        await assignRoleToStaff(staffId, formData.role_id, null)

        alert('Membro creato con successo')
      }

      onSave()
    } catch (err) {
      console.error('Errore salvataggio membro:', err)
      setError(err.message || 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const selectedRole = roles.find(r => r.id === formData.role_id)

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <Modal.Header>
          <Modal.Title>
            {isEdit ? `Modifica Membro: ${member.name}` : 'Nuovo Membro Staff'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div style={styles.formContainer}>
            {/* Nome */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Nome Completo <span style={{ color: tokens.colors.error.base }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={styles.input}
                placeholder="Mario Rossi"
                required
              />
            </div>

            {/* Email */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Email <span style={{ color: tokens.colors.error.base }}>*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={styles.input}
                placeholder="mario.rossi@email.com"
                required
              />
              <span style={styles.hint}>
                Usata per il login nella sezione staff
              </span>
            </div>

            {/* Password */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Password {!isEdit && <span style={{ color: tokens.colors.error.base }}>*</span>}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={styles.input}
                placeholder={isEdit ? 'Lascia vuoto per non modificare' : 'Almeno 6 caratteri'}
                required={!isEdit}
              />
              {isEdit && (
                <span style={styles.hint}>
                  Lascia vuoto per mantenere la password attuale
                </span>
              )}
            </div>

            {/* Ruolo */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Ruolo <span style={{ color: tokens.colors.error.base }}>*</span>
              </label>

              {loadingRoles ? (
                <div style={{ padding: tokens.spacing.md, textAlign: 'center', color: tokens.colors.gray[500] }}>
                  Caricamento ruoli...
                </div>
              ) : (
                <>
                  <select
                    value={formData.role_id || ''}
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value || null })}
                    style={styles.select}
                    required
                  >
                    <option value="">-- Seleziona un ruolo --</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>

                  {/* Preview ruolo selezionato */}
                  {selectedRole && (
                    <div style={styles.rolePreview}>
                      <Badge
                        variant="default"
                        style={{
                          backgroundColor: `${selectedRole.color}20`,
                          color: selectedRole.color,
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: selectedRole.color,
                        }}
                      >
                        {selectedRole.name}
                      </Badge>
                      <span style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.gray[600] }}>
                        {selectedRole.description}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Stato Attivo */}
            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={styles.checkbox}
                />
                <span>Membro attivo</span>
              </label>
              <span style={styles.hint}>
                I membri disattivati non possono accedere al sistema
              </span>
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
              disabled={saving || loadingRoles}
            >
              {saving ? 'Salvataggio...' : (isEdit ? 'Salva Modifiche' : 'Crea Membro')}
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
    maxHeight: 'calc(80vh - 200px)', // Limita altezza per mostrare sempre i pulsanti
    overflowY: 'auto', // Scroll se contenuto eccede
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
  select: {
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    fontSize: tokens.typography.fontSize.sm,
    border: `1px solid ${tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.md,
    outline: 'none',
    backgroundColor: tokens.colors.white,
    cursor: 'pointer',
  },
  hint: {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.gray[500],
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    cursor: 'pointer',
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[700],
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  rolePreview: {
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.gray[50],
    borderRadius: tokens.borderRadius.md,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
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

export default MemberModal
