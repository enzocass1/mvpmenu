/**
 * Permissions Service
 * Verifica permessi per controllo accessi basato su ruoli
 *
 * Funzionalità:
 * - Verifica se staff ha un permesso specifico
 * - Verifica permessi multipli
 * - Supporto wildcard "*" (tutti i permessi)
 * - Cache permessi per performance
 */

import { supabase } from '../supabaseClient'
import { getStaffRoles } from './rolesService'

// =====================================================
// CACHE PERMESSI (in-memory per performance)
// =====================================================

const permissionsCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minuti

function getCacheKey(staffId) {
  return `staff_${staffId}`
}

function getFromCache(staffId) {
  const key = getCacheKey(staffId)
  const cached = permissionsCache.get(key)

  if (!cached) return null

  // Verifica TTL
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    permissionsCache.delete(key)
    return null
  }

  return cached.permissions
}

function setCache(staffId, permissions) {
  const key = getCacheKey(staffId)
  permissionsCache.set(key, {
    permissions,
    timestamp: Date.now()
  })
}

function clearCache(staffId = null) {
  if (staffId) {
    permissionsCache.delete(getCacheKey(staffId))
  } else {
    permissionsCache.clear()
  }
}

// =====================================================
// CORE FUNCTIONS
// =====================================================

/**
 * Ottieni tutti i permessi di uno staff member
 * Combina i permessi di tutti i ruoli assegnati
 */
export async function getStaffPermissions(staffId) {
  try {
    // Check cache first
    const cached = getFromCache(staffId)
    if (cached) {
      return { success: true, permissions: cached }
    }

    // Carica ruoli dello staff
    const { success, data: roles, error } = await getStaffRoles(staffId)

    if (!success || error) {
      throw new Error(error || 'Errore caricamento ruoli staff')
    }

    if (!roles || roles.length === 0) {
      // Staff senza ruoli → nessun permesso
      setCache(staffId, [])
      return { success: true, permissions: [] }
    }

    // Combina permessi da tutti i ruoli
    const allPermissions = new Set()

    for (const role of roles) {
      if (!role.permissions) continue

      // Parse JSON se necessario
      const rolePermissions = typeof role.permissions === 'string'
        ? JSON.parse(role.permissions)
        : role.permissions

      if (!Array.isArray(rolePermissions)) continue

      // Aggiungi permessi al set (evita duplicati)
      rolePermissions.forEach(permission => {
        allPermissions.add(permission)
      })
    }

    const permissions = Array.from(allPermissions)

    // Salva in cache
    setCache(staffId, permissions)

    return { success: true, permissions }
  } catch (error) {
    console.error('❌ Errore getStaffPermissions:', error)
    return { success: false, error: error.message, permissions: [] }
  }
}

/**
 * Verifica se staff ha un permesso specifico
 */
export async function hasPermission(staffId, permission) {
  try {
    const { success, permissions } = await getStaffPermissions(staffId)

    if (!success || !permissions) {
      return false
    }

    // Wildcard "*" → ha tutti i permessi (Proprietario)
    if (permissions.includes('*')) {
      return true
    }

    // Verifica permesso specifico
    return permissions.includes(permission)
  } catch (error) {
    console.error('❌ Errore hasPermission:', error)
    return false
  }
}

/**
 * Verifica se staff ha TUTTI i permessi richiesti
 */
export async function hasAllPermissions(staffId, requiredPermissions) {
  try {
    if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) {
      return true // Nessun permesso richiesto
    }

    const { success, permissions } = await getStaffPermissions(staffId)

    if (!success || !permissions) {
      return false
    }

    // Wildcard "*" → ha tutti i permessi
    if (permissions.includes('*')) {
      return true
    }

    // Verifica che abbia TUTTI i permessi richiesti
    return requiredPermissions.every(required => permissions.includes(required))
  } catch (error) {
    console.error('❌ Errore hasAllPermissions:', error)
    return false
  }
}

/**
 * Verifica se staff ha ALMENO UNO dei permessi richiesti
 */
export async function hasAnyPermission(staffId, requiredPermissions) {
  try {
    if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) {
      return true // Nessun permesso richiesto
    }

    const { success, permissions } = await getStaffPermissions(staffId)

    if (!success || !permissions) {
      return false
    }

    // Wildcard "*" → ha tutti i permessi
    if (permissions.includes('*')) {
      return true
    }

    // Verifica che abbia ALMENO UNO dei permessi richiesti
    return requiredPermissions.some(required => permissions.includes(required))
  } catch (error) {
    console.error('❌ Errore hasAnyPermission:', error)
    return false
  }
}

/**
 * Verifica permessi per proprietario (user_id)
 * I proprietari hanno SEMPRE tutti i permessi
 */
export async function isOwner(userId, restaurantId) {
  try {
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('user_id')
      .eq('id', restaurantId)
      .single()

    if (error) throw error

    return restaurant && restaurant.user_id === userId
  } catch (error) {
    console.error('❌ Errore isOwner:', error)
    return false
  }
}

/**
 * Verifica permesso per sessione corrente (staff o owner)
 * Uso: chiamare questa funzione prima di ogni operazione critica
 */
export async function checkPermission(permission, session = null, staffSession = null) {
  try {
    // Se sessione owner → sempre permesso
    if (session && session.user) {
      // Carica ristorante per verificare ownership
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single()

      if (restaurant) {
        return { allowed: true, reason: 'owner' }
      }
    }

    // Se sessione staff → verifica permessi ruolo
    if (staffSession && staffSession.staff_id) {
      const allowed = await hasPermission(staffSession.staff_id, permission)
      return {
        allowed,
        reason: allowed ? 'role_permission' : 'insufficient_permission'
      }
    }

    // Nessuna sessione valida
    return { allowed: false, reason: 'no_session' }
  } catch (error) {
    console.error('❌ Errore checkPermission:', error)
    return { allowed: false, reason: 'error', error: error.message }
  }
}

/**
 * Middleware per proteggere funzioni
 * Uso: await requirePermission('orders.create', session, staffSession)
 */
export async function requirePermission(permission, session = null, staffSession = null) {
  const result = await checkPermission(permission, session, staffSession)

  if (!result.allowed) {
    throw new Error(`Permesso negato: ${permission} (motivo: ${result.reason})`)
  }

  return true
}

/**
 * Ottieni elenco permessi raggruppati per categoria
 * Utile per UI che mostra permessi disponibili
 */
export function getAvailablePermissions() {
  // Importa da rolesService
  const { PERMISSION_GROUPS } = require('./rolesService')
  return PERMISSION_GROUPS
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Invalida cache permessi (chiamare dopo modifica ruoli)
 */
export function invalidatePermissionsCache(staffId = null) {
  clearCache(staffId)
  console.log(staffId
    ? `✅ Cache permessi invalidata per staff: ${staffId}`
    : '✅ Cache permessi completamente invalidata'
  )
}

/**
 * Debug: stampa permessi staff in console
 */
export async function debugStaffPermissions(staffId) {
  const { success, permissions, error } = await getStaffPermissions(staffId)

  console.log('========================================')
  console.log(`DEBUG Permessi Staff: ${staffId}`)
  console.log('========================================')

  if (!success) {
    console.error('❌ Errore:', error)
    return
  }

  if (permissions.includes('*')) {
    console.log('✅ WILDCARD: Ha TUTTI i permessi (Proprietario)')
  } else {
    console.log(`✅ Permessi (${permissions.length}):`)
    permissions.forEach(p => console.log(`   - ${p}`))
  }

  console.log('========================================')
}

// =====================================================
// EXPORT DEFAULT
// =====================================================

export default {
  getStaffPermissions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isOwner,
  checkPermission,
  requirePermission,
  getAvailablePermissions,
  invalidatePermissionsCache,
  debugStaffPermissions
}
