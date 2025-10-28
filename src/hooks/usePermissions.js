/**
 * usePermissions Hook
 * Hook React per verificare permessi staff in componenti
 *
 * Uso:
 * const { hasPermission, isLoading, permissions } = usePermissions(staffId)
 * if (hasPermission('orders.create')) { ... }
 */

import { useState, useEffect, useCallback } from 'react'
import { getStaffPermissions, hasPermission as checkPermission } from '../lib/permissionsService'

export function usePermissions(staffId) {
  const [permissions, setPermissions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Carica permessi
  useEffect(() => {
    if (!staffId) {
      setPermissions([])
      setIsLoading(false)
      return
    }

    loadPermissions()
  }, [staffId])

  const loadPermissions = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await getStaffPermissions(staffId)

      if (result.success) {
        setPermissions(result.permissions || [])
      } else {
        throw new Error(result.error || 'Errore caricamento permessi')
      }
    } catch (err) {
      console.error('❌ usePermissions error:', err)
      setError(err.message)
      setPermissions([])
    } finally {
      setIsLoading(false)
    }
  }

  // Verifica se ha un permesso specifico
  const hasPermission = useCallback((permission) => {
    // Wildcard → ha tutti i permessi
    if (permissions.includes('*')) {
      return true
    }

    return permissions.includes(permission)
  }, [permissions])

  // Verifica se ha TUTTI i permessi richiesti
  const hasAllPermissions = useCallback((requiredPermissions) => {
    if (!Array.isArray(requiredPermissions)) {
      return false
    }

    // Wildcard → ha tutti i permessi
    if (permissions.includes('*')) {
      return true
    }

    return requiredPermissions.every(p => permissions.includes(p))
  }, [permissions])

  // Verifica se ha ALMENO UNO dei permessi richiesti
  const hasAnyPermission = useCallback((requiredPermissions) => {
    if (!Array.isArray(requiredPermissions)) {
      return false
    }

    // Wildcard → ha tutti i permessi
    if (permissions.includes('*')) {
      return true
    }

    return requiredPermissions.some(p => permissions.includes(p))
  }, [permissions])

  // Reload permessi (utile dopo cambio ruoli)
  const reload = useCallback(() => {
    if (staffId) {
      loadPermissions()
    }
  }, [staffId])

  return {
    permissions,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isLoading,
    error,
    reload
  }
}

/**
 * useOwnerCheck Hook
 * Verifica se l'utente corrente è il proprietario del ristorante
 *
 * Uso:
 * const { isOwner, isLoading } = useOwnerCheck(session, restaurantId)
 */
export function useOwnerCheck(session, restaurantId) {
  const [isOwner, setIsOwner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!session || !restaurantId) {
      setIsOwner(false)
      setIsLoading(false)
      return
    }

    const checkOwnership = async () => {
      try {
        setIsLoading(true)
        const { isOwner: ownerResult } = await import('../lib/permissionsService')
        const result = await ownerResult(session.user.id, restaurantId)
        setIsOwner(result)
      } catch (error) {
        console.error('❌ useOwnerCheck error:', error)
        setIsOwner(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkOwnership()
  }, [session, restaurantId])

  return { isOwner, isLoading }
}

/**
 * useSessionPermissions Hook
 * Combina permessi owner + staff per sessione corrente
 * Determina automaticamente se è owner o staff e carica permessi appropriati
 *
 * Uso:
 * const { hasPermission, isOwner, isStaff, isLoading } = useSessionPermissions()
 */
export function useSessionPermissions() {
  const [hasPermissionFunc, setHasPermissionFunc] = useState(() => () => false)
  const [isOwner, setIsOwner] = useState(false)
  const [isStaff, setIsStaff] = useState(false)
  const [permissions, setPermissions] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSessionPermissions()
  }, [])

  const loadSessionPermissions = async () => {
    try {
      setIsLoading(true)

      // Check staff session first
      const staffSessionStr = localStorage.getItem('staff_session')
      if (staffSessionStr) {
        const staffSession = JSON.parse(staffSessionStr)

        if (staffSession.staff_id) {
          // È uno staff member
          const result = await getStaffPermissions(staffSession.staff_id)

          if (result.success) {
            setIsStaff(true)
            setIsOwner(false)
            setPermissions(result.permissions || [])

            // Crea funzione hasPermission
            setHasPermissionFunc(() => (permission) => {
              if (result.permissions.includes('*')) return true
              return result.permissions.includes(permission)
            })

            setIsLoading(false)
            return
          }
        }
      }

      // Check owner session (supabase auth)
      const { supabase } = await import('../supabaseClient')
      const { data: { session } } = await supabase.auth.getSession()

      if (session && session.user) {
        // È il proprietario → tutti i permessi
        setIsOwner(true)
        setIsStaff(false)
        setPermissions(['*'])

        // Owner ha sempre tutti i permessi
        setHasPermissionFunc(() => () => true)

        setIsLoading(false)
        return
      }

      // Nessuna sessione valida
      setIsOwner(false)
      setIsStaff(false)
      setPermissions([])
      setHasPermissionFunc(() => () => false)

    } catch (error) {
      console.error('❌ useSessionPermissions error:', error)
      setIsOwner(false)
      setIsStaff(false)
      setPermissions([])
      setHasPermissionFunc(() => () => false)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    hasPermission: hasPermissionFunc,
    permissions,
    isOwner,
    isStaff,
    isLoading,
    reload: loadSessionPermissions
  }
}

export default usePermissions
