/**
 * MembersTab - Gestione Membri Staff
 * Mostra tabella membri con ruoli assegnati e azioni CRUD
 */

import React, { useState, useEffect } from 'react'
import { tokens } from '../../styles/tokens'
import { Card, Button, Badge } from '../ui'
import { supabase } from '../../supabaseClient'
import MemberModal from './MemberModal'

function MembersTab({ restaurantId, session }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null) // Per edit

  useEffect(() => {
    if (restaurantId) {
      loadMembers()
    }
  }, [restaurantId])

  const loadMembers = async () => {
    try {
      setLoading(true)

      // Carica membri con ruolo primario
      const { data, error } = await supabase
        .from('restaurant_staff')
        .select(`
          *,
          primary_role:staff_roles!primary_role_id (
            id,
            name,
            color
          )
        `)
        .eq('restaurant_id', restaurantId)
        .order('name')

      if (error) throw error

      setMembers(data || [])
    } catch (error) {
      console.error('Errore caricamento membri:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMember = () => {
    setSelectedMember(null)
    setShowMemberModal(true)
  }

  const handleEditMember = (member) => {
    setSelectedMember(member)
    setShowMemberModal(true)
  }

  const handleToggleActive = async (member) => {
    try {
      const { error } = await supabase
        .from('restaurant_staff')
        .update({ is_active: !member.is_active })
        .eq('id', member.id)

      if (error) throw error

      alert(`Membro ${member.is_active ? 'disattivato' : 'attivato'} con successo`)
      loadMembers()
    } catch (error) {
      console.error('Errore toggle active:', error)
      alert(`Errore: ${error.message}`)
    }
  }

  const handleDeleteMember = async (member) => {
    if (!confirm(`Sei sicuro di voler eliminare "${member.name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('restaurant_staff')
        .delete()
        .eq('id', member.id)

      if (error) throw error

      alert('Membro eliminato con successo')
      loadMembers()
    } catch (error) {
      console.error('Errore eliminazione membro:', error)
      alert(`Errore: ${error.message}`)
    }
  }

  const handleMemberSaved = () => {
    setShowMemberModal(false)
    setSelectedMember(null)
    loadMembers()
  }

  if (loading) {
    return (
      <Card padding="xl">
        <div style={{ textAlign: 'center' }}>Caricamento membri...</div>
      </Card>
    )
  }

  return (
    <>
      <div style={styles.container}>
        {/* Header con bottone Crea */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Membri</h2>
            <p style={styles.subtitle}>
              Gestisci i membri del tuo staff e assegna i ruoli
            </p>
          </div>
          <Button variant="primary" onClick={handleCreateMember}>
            + Nuovo Membro
          </Button>
        </div>

        {/* Tabella Membri */}
        <Card padding="none">
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={{ ...styles.th, width: '25%' }}>Nome</th>
                <th style={{ ...styles.th, width: '25%' }}>Email</th>
                <th style={{ ...styles.th, width: '20%' }}>Ruolo</th>
                <th style={{ ...styles.th, width: '15%', textAlign: 'center' }}>Stato</th>
                <th style={{ ...styles.th, width: '15%', textAlign: 'right' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} style={styles.tableRow}>
                  {/* Nome */}
                  <td style={styles.td}>
                    <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                      {member.name}
                    </span>
                  </td>

                  {/* Email */}
                  <td style={styles.td}>
                    <span style={{ color: tokens.colors.gray[600] }}>
                      {member.email}
                    </span>
                  </td>

                  {/* Ruolo */}
                  <td style={styles.td}>
                    {member.primary_role ? (
                      <Badge
                        variant="default"
                        size="sm"
                        style={{
                          backgroundColor: `${member.primary_role.color}20`,
                          color: member.primary_role.color,
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: member.primary_role.color,
                        }}
                      >
                        {member.primary_role.name}
                      </Badge>
                    ) : (
                      <span style={{ color: tokens.colors.gray[500], fontStyle: 'italic' }}>
                        Nessun ruolo
                      </span>
                    )}
                  </td>

                  {/* Stato */}
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <Badge
                      variant={member.is_active ? 'success' : 'default'}
                      size="sm"
                    >
                      {member.is_active ? 'Attivo' : 'Disattivato'}
                    </Badge>
                  </td>

                  {/* Azioni */}
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: tokens.spacing.xs, justifyContent: 'flex-end' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMember(member)}
                      >
                        Modifica
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(member)}
                        style={{
                          color: member.is_active
                            ? tokens.colors.warning.base
                            : tokens.colors.success.base
                        }}
                      >
                        {member.is_active ? 'Disattiva' : 'Attiva'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMember(member)}
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

          {members.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateText}>Nessun membro trovato</p>
              <Button variant="primary" onClick={handleCreateMember}>
                Crea il Primo Membro
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Modal Crea/Modifica Membro */}
      {showMemberModal && (
        <MemberModal
          isOpen={showMemberModal}
          onClose={() => {
            setShowMemberModal(false)
            setSelectedMember(null)
          }}
          onSave={handleMemberSaved}
          member={selectedMember}
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

export default MembersTab
