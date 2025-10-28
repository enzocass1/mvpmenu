/**
 * Roles Service
 * Gestione completa ruoli e permessi per sistema staff
 *
 * Funzionalità:
 * - CRUD ruoli
 * - Assegnazione ruoli a staff
 * - Verifica permessi
 * - Supporto KPI e analytics
 */

import { supabase } from '../supabaseClient'

// =====================================================
// CONSTANTS - Permission Keys
// =====================================================

export const PERMISSIONS = {
  // Gestione Ordini
  ORDERS_VIEW_ALL: 'orders.view_all',
  ORDERS_VIEW_OWN: 'orders.view_own',
  ORDERS_VIEW_DETAILS: 'orders.view_details',
  ORDERS_CREATE: 'orders.create',
  ORDERS_EDIT: 'orders.edit',
  ORDERS_ADD_PRODUCTS: 'orders.add_products',
  ORDERS_REMOVE_PRODUCTS: 'orders.remove_products',
  ORDERS_EDIT_QUANTITIES: 'orders.edit_quantities',
  ORDERS_CONFIRM: 'orders.confirm',
  ORDERS_START_PREPARING: 'orders.start_preparing',
  ORDERS_COMPLETE: 'orders.complete',
  ORDERS_CANCEL: 'orders.cancel',
  ORDERS_DELETE: 'orders.delete',
  ORDERS_ADD_NOTES: 'orders.add_notes',
  ORDERS_SET_PRIORITY: 'orders.set_priority',
  ORDERS_CHANGE_TABLE: 'orders.change_table',
  ORDERS_GENERATE_PRECONTO: 'orders.generate_preconto',

  // Gestione Tavoli
  TABLES_VIEW: 'tables.view',
  TABLES_OPEN: 'tables.open',
  TABLES_CHANGE: 'tables.change',
  TABLES_CLOSE: 'tables.close',
  TABLES_MANAGE: 'tables.manage',

  // Gestione Cassa
  CASHIER_ACCESS: 'cashier.access',
  CASHIER_VIEW_ORDERS: 'cashier.view_orders',
  CASHIER_CLOSE_TABLES: 'cashier.close_tables',
  CASHIER_PRINT_RECEIPT: 'cashier.print_receipt',
  CASHIER_GENERATE_PRECONTO: 'cashier.generate_preconto',
  CASHIER_VIEW_TOTALS: 'cashier.view_totals',

  // Gestione Prodotti
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  PRODUCTS_MANAGE_VARIANTS: 'products.manage_variants',
  PRODUCTS_MANAGE_CATEGORIES: 'products.manage_categories',
  PRODUCTS_UPLOAD_IMAGES: 'products.upload_images',
  PRODUCTS_SET_AVAILABILITY: 'products.set_availability',
  PRODUCTS_SET_PRICES: 'products.set_prices',

  // Gestione Staff
  STAFF_VIEW: 'staff.view',
  STAFF_CREATE: 'staff.create',
  STAFF_EDIT: 'staff.edit',
  STAFF_DELETE: 'staff.delete',
  STAFF_DEACTIVATE: 'staff.deactivate',
  STAFF_MANAGE_ROLES: 'staff.manage_roles',
  STAFF_ASSIGN_ROLES: 'staff.assign_roles',
  STAFF_VIEW_PERMISSIONS: 'staff.view_permissions',

  // Analytics
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_VIEW_REVENUE: 'analytics.view_revenue',
  ANALYTICS_VIEW_PRODUCTS: 'analytics.view_products',
  ANALYTICS_VIEW_CONVERSION: 'analytics.view_conversion',
  ANALYTICS_VIEW_TIME_ANALYSIS: 'analytics.view_time_analysis',
  ANALYTICS_VIEW_AOV: 'analytics.view_aov',
  ANALYTICS_EXPORT: 'analytics.export',

  // Gestione Ristorante
  RESTAURANT_VIEW_SETTINGS: 'restaurant.view_settings',
  RESTAURANT_EDIT_SETTINGS: 'restaurant.edit_settings',
  RESTAURANT_EDIT_OPENING_HOURS: 'restaurant.edit_opening_hours',
  RESTAURANT_MANAGE_ROOMS: 'restaurant.manage_rooms',
  RESTAURANT_VIEW_FISCAL: 'restaurant.view_fiscal',
  RESTAURANT_EDIT_FISCAL: 'restaurant.edit_fiscal',
  RESTAURANT_VIEW_SUBSCRIPTION: 'restaurant.view_subscription',
  RESTAURANT_MANAGE_SUBSCRIPTION: 'restaurant.manage_subscription',

  // Menu Pubblico
  PUBLIC_MENU_VIEW_SETTINGS: 'public_menu.view_settings',
  PUBLIC_MENU_EDIT_SETTINGS: 'public_menu.edit_settings',
  PUBLIC_MENU_MANAGE_QR: 'public_menu.manage_qr',

  // Canali
  CHANNELS_VIEW: 'channels.view',
  CHANNELS_MANAGE: 'channels.manage',

  // Clienti
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_EDIT: 'customers.edit',
  CUSTOMERS_DELETE: 'customers.delete',
  CUSTOMERS_VIEW_ORDERS: 'customers.view_orders',
  CUSTOMERS_MANAGE_LOYALTY: 'customers.manage_loyalty',
}

// Gruppi di permessi per UI
export const PERMISSION_GROUPS = [
  {
    name: 'Gestione Ordini',
    key: 'orders',
    permissions: [
      { key: PERMISSIONS.ORDERS_VIEW_ALL, label: 'Visualizzare tutti gli ordini' },
      { key: PERMISSIONS.ORDERS_VIEW_DETAILS, label: 'Vedere dettagli completi ordine' },
      { key: PERMISSIONS.ORDERS_CREATE, label: 'Creare nuovi ordini' },
      { key: PERMISSIONS.ORDERS_EDIT, label: 'Modificare ordini esistenti' },
      { key: PERMISSIONS.ORDERS_ADD_PRODUCTS, label: 'Aggiungere prodotti' },
      { key: PERMISSIONS.ORDERS_REMOVE_PRODUCTS, label: 'Rimuovere prodotti' },
      { key: PERMISSIONS.ORDERS_EDIT_QUANTITIES, label: 'Modificare quantità' },
      { key: PERMISSIONS.ORDERS_CONFIRM, label: 'Confermare ordini' },
      { key: PERMISSIONS.ORDERS_START_PREPARING, label: 'Mettere in preparazione' },
      { key: PERMISSIONS.ORDERS_COMPLETE, label: 'Completare ordini' },
      { key: PERMISSIONS.ORDERS_CANCEL, label: 'Annullare ordini' },
      { key: PERMISSIONS.ORDERS_DELETE, label: 'Eliminare ordini' },
      { key: PERMISSIONS.ORDERS_ADD_NOTES, label: 'Aggiungere note' },
      { key: PERMISSIONS.ORDERS_SET_PRIORITY, label: 'Impostare priorità' },
      { key: PERMISSIONS.ORDERS_CHANGE_TABLE, label: 'Cambiare tavolo' },
      { key: PERMISSIONS.ORDERS_GENERATE_PRECONTO, label: 'Generare preconto' },
    ]
  },
  {
    name: 'Gestione Tavoli',
    key: 'tables',
    permissions: [
      { key: PERMISSIONS.TABLES_VIEW, label: 'Visualizzare stato tavoli' },
      { key: PERMISSIONS.TABLES_OPEN, label: 'Aprire tavoli' },
      { key: PERMISSIONS.TABLES_CHANGE, label: 'Cambiare tavolo ordine' },
      { key: PERMISSIONS.TABLES_CLOSE, label: 'Chiudere tavoli' },
      { key: PERMISSIONS.TABLES_MANAGE, label: 'Gestire sale e tavoli (config)' },
    ]
  },
  {
    name: 'Gestione Cassa',
    key: 'cashier',
    permissions: [
      { key: PERMISSIONS.CASHIER_ACCESS, label: 'Accedere alla cassa' },
      { key: PERMISSIONS.CASHIER_VIEW_ORDERS, label: 'Visualizzare ordini in cassa' },
      { key: PERMISSIONS.CASHIER_CLOSE_TABLES, label: 'Chiudere tavoli dalla cassa' },
      { key: PERMISSIONS.CASHIER_PRINT_RECEIPT, label: 'Stampare scontrini fiscali' },
      { key: PERMISSIONS.CASHIER_GENERATE_PRECONTO, label: 'Generare preconti' },
      { key: PERMISSIONS.CASHIER_VIEW_TOTALS, label: 'Visualizzare totali giornalieri' },
    ]
  },
  {
    name: 'Gestione Prodotti',
    key: 'products',
    permissions: [
      { key: PERMISSIONS.PRODUCTS_VIEW, label: 'Visualizzare prodotti' },
      { key: PERMISSIONS.PRODUCTS_CREATE, label: 'Creare nuovi prodotti' },
      { key: PERMISSIONS.PRODUCTS_EDIT, label: 'Modificare prodotti' },
      { key: PERMISSIONS.PRODUCTS_DELETE, label: 'Eliminare prodotti' },
      { key: PERMISSIONS.PRODUCTS_MANAGE_VARIANTS, label: 'Gestire varianti' },
      { key: PERMISSIONS.PRODUCTS_MANAGE_CATEGORIES, label: 'Gestire categorie' },
      { key: PERMISSIONS.PRODUCTS_UPLOAD_IMAGES, label: 'Caricare immagini' },
      { key: PERMISSIONS.PRODUCTS_SET_AVAILABILITY, label: 'Impostare disponibilità' },
      { key: PERMISSIONS.PRODUCTS_SET_PRICES, label: 'Modificare prezzi' },
    ]
  },
  {
    name: 'Gestione Staff',
    key: 'staff',
    permissions: [
      { key: PERMISSIONS.STAFF_VIEW, label: 'Visualizzare lista staff' },
      { key: PERMISSIONS.STAFF_CREATE, label: 'Invitare/creare membri' },
      { key: PERMISSIONS.STAFF_EDIT, label: 'Modificare dati membri' },
      { key: PERMISSIONS.STAFF_DELETE, label: 'Eliminare membri' },
      { key: PERMISSIONS.STAFF_DEACTIVATE, label: 'Disattivare/riattivare membri' },
      { key: PERMISSIONS.STAFF_MANAGE_ROLES, label: 'Gestire ruoli (solo proprietario)' },
      { key: PERMISSIONS.STAFF_ASSIGN_ROLES, label: 'Assegnare ruoli ai membri' },
      { key: PERMISSIONS.STAFF_VIEW_PERMISSIONS, label: 'Visualizzare permessi' },
    ]
  },
  {
    name: 'Analytics e Report',
    key: 'analytics',
    permissions: [
      { key: PERMISSIONS.ANALYTICS_VIEW, label: 'Accedere alla sezione analytics' },
      { key: PERMISSIONS.ANALYTICS_VIEW_REVENUE, label: 'Visualizzare revenue' },
      { key: PERMISSIONS.ANALYTICS_VIEW_PRODUCTS, label: 'Prodotti più venduti' },
      { key: PERMISSIONS.ANALYTICS_VIEW_CONVERSION, label: 'Funnel di conversione' },
      { key: PERMISSIONS.ANALYTICS_VIEW_TIME_ANALYSIS, label: 'Analisi per fasce orarie' },
      { key: PERMISSIONS.ANALYTICS_VIEW_AOV, label: 'Average Order Value' },
      { key: PERMISSIONS.ANALYTICS_EXPORT, label: 'Esportare dati' },
    ]
  },
  {
    name: 'Gestione Ristorante',
    key: 'restaurant',
    permissions: [
      { key: PERMISSIONS.RESTAURANT_VIEW_SETTINGS, label: 'Visualizzare impostazioni' },
      { key: PERMISSIONS.RESTAURANT_EDIT_SETTINGS, label: 'Modificare impostazioni' },
      { key: PERMISSIONS.RESTAURANT_EDIT_OPENING_HOURS, label: 'Modificare orari apertura' },
      { key: PERMISSIONS.RESTAURANT_MANAGE_ROOMS, label: 'Gestire sale' },
      { key: PERMISSIONS.RESTAURANT_VIEW_FISCAL, label: 'Visualizzare impostazioni fiscali' },
      { key: PERMISSIONS.RESTAURANT_EDIT_FISCAL, label: 'Modificare impostazioni fiscali' },
      { key: PERMISSIONS.RESTAURANT_VIEW_SUBSCRIPTION, label: 'Visualizzare piano' },
      { key: PERMISSIONS.RESTAURANT_MANAGE_SUBSCRIPTION, label: 'Gestire abbonamento' },
    ]
  },
]

// =====================================================
// CRUD RUOLI
// =====================================================

/**
 * Ottieni tutti i ruoli di un ristorante
 */
export async function getRoles(restaurantId) {
  try {
    const { data, error } = await supabase
      .from('staff_roles')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('is_system_role', { ascending: false }) // System roles first
      .order('name')

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('❌ Errore getRoles:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Ottieni un singolo ruolo per ID
 */
export async function getRole(roleId) {
  try {
    const { data, error } = await supabase
      .from('staff_roles')
      .select('*')
      .eq('id', roleId)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('❌ Errore getRole:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Crea nuovo ruolo
 */
export async function createRole(restaurantId, roleData) {
  try {
    const { name, description, permissions, color } = roleData

    // Validazioni
    if (!name || name.trim().length === 0) {
      throw new Error('Nome ruolo obbligatorio')
    }

    if (!permissions || !Array.isArray(permissions)) {
      throw new Error('Permessi devono essere un array')
    }

    const { data, error } = await supabase
      .from('staff_roles')
      .insert({
        restaurant_id: restaurantId,
        name: name.trim(),
        description: description?.trim() || null,
        permissions: JSON.stringify(permissions), // Converti array a JSON
        color: color || '#3B82F6',
        is_system_role: false
      })
      .select()
      .single()

    if (error) throw error

    console.log('✅ Ruolo creato:', data.name)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Errore createRole:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Aggiorna ruolo esistente
 */
export async function updateRole(roleId, updates) {
  try {
    // Verifica che non sia un ruolo di sistema
    const { data: role } = await getRole(roleId)
    if (role && role.is_system_role) {
      throw new Error('Impossibile modificare ruoli di sistema')
    }

    const updateData = {}

    if (updates.name !== undefined) {
      if (updates.name.trim().length === 0) {
        throw new Error('Nome ruolo obbligatorio')
      }
      updateData.name = updates.name.trim()
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description?.trim() || null
    }

    if (updates.permissions !== undefined) {
      if (!Array.isArray(updates.permissions)) {
        throw new Error('Permessi devono essere un array')
      }
      updateData.permissions = JSON.stringify(updates.permissions)
    }

    if (updates.color !== undefined) {
      updateData.color = updates.color
    }

    const { data, error } = await supabase
      .from('staff_roles')
      .update(updateData)
      .eq('id', roleId)
      .select()
      .single()

    if (error) throw error

    console.log('✅ Ruolo aggiornato:', data.name)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Errore updateRole:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Elimina ruolo (solo se non è di sistema e non ha membri assegnati)
 */
export async function deleteRole(roleId) {
  try {
    // Verifica che non sia un ruolo di sistema
    const { data: role } = await getRole(roleId)
    if (!role) {
      throw new Error('Ruolo non trovato')
    }

    if (role.is_system_role) {
      throw new Error('Impossibile eliminare ruoli di sistema')
    }

    // Verifica che non ci siano membri assegnati
    const { data: assignments, error: assignmentsError } = await supabase
      .from('staff_role_assignments')
      .select('id')
      .eq('role_id', roleId)
      .limit(1)

    if (assignmentsError) throw assignmentsError

    if (assignments && assignments.length > 0) {
      throw new Error('Impossibile eliminare: ci sono membri con questo ruolo assegnato')
    }

    // Elimina il ruolo
    const { error } = await supabase
      .from('staff_roles')
      .delete()
      .eq('id', roleId)

    if (error) throw error

    console.log('✅ Ruolo eliminato:', role.name)
    return { success: true }
  } catch (error) {
    console.error('❌ Errore deleteRole:', error)
    return { success: false, error: error.message }
  }
}

// =====================================================
// ASSEGNAZIONE RUOLI A STAFF
// =====================================================

/**
 * Assegna ruolo a membro staff
 */
export async function assignRoleToStaff(staffId, roleId, assignedByUserId) {
  try {
    // Verifica che il ruolo esista
    const { data: role } = await getRole(roleId)
    if (!role) {
      throw new Error('Ruolo non trovato')
    }

    // Crea assegnazione
    const { data, error } = await supabase
      .from('staff_role_assignments')
      .insert({
        staff_id: staffId,
        role_id: roleId,
        assigned_by: assignedByUserId || null
      })
      .select()
      .single()

    if (error) {
      // Se è un duplicate, ignora (già assegnato)
      if (error.code === '23505') {
        return { success: true, message: 'Ruolo già assegnato' }
      }
      throw error
    }

    // Aggiorna primary_role_id se è il primo ruolo assegnato
    const { data: staffRoles } = await getStaffRoles(staffId)
    if (staffRoles && staffRoles.length === 1) {
      await supabase
        .from('restaurant_staff')
        .update({ primary_role_id: roleId })
        .eq('id', staffId)
    }

    console.log('✅ Ruolo assegnato a staff:', staffId)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Errore assignRoleToStaff:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Rimuovi ruolo da membro staff
 */
export async function removeRoleFromStaff(staffId, roleId) {
  try {
    const { error } = await supabase
      .from('staff_role_assignments')
      .delete()
      .eq('staff_id', staffId)
      .eq('role_id', roleId)

    if (error) throw error

    // Se era il primary_role, aggiorna con un altro ruolo o NULL
    const { data: staff } = await supabase
      .from('restaurant_staff')
      .select('primary_role_id')
      .eq('id', staffId)
      .single()

    if (staff && staff.primary_role_id === roleId) {
      // Trova un altro ruolo assegnato
      const { data: staffRoles } = await getStaffRoles(staffId)
      const newPrimaryRoleId = staffRoles && staffRoles.length > 0
        ? staffRoles[0].id
        : null

      await supabase
        .from('restaurant_staff')
        .update({ primary_role_id: newPrimaryRoleId })
        .eq('id', staffId)
    }

    console.log('✅ Ruolo rimosso da staff:', staffId)
    return { success: true }
  } catch (error) {
    console.error('❌ Errore removeRoleFromStaff:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Ottieni tutti i ruoli assegnati a uno staff member
 */
export async function getStaffRoles(staffId) {
  try {
    const { data, error } = await supabase
      .from('staff_role_assignments')
      .select(`
        *,
        role:staff_roles(*)
      `)
      .eq('staff_id', staffId)

    if (error) throw error

    // Estrai solo i ruoli
    const roles = data.map(assignment => assignment.role)

    return { success: true, data: roles }
  } catch (error) {
    console.error('❌ Errore getStaffRoles:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Ottieni tutti i membri staff con un determinato ruolo
 */
export async function getStaffByRole(roleId) {
  try {
    const { data, error } = await supabase
      .from('staff_role_assignments')
      .select(`
        *,
        staff:restaurant_staff(*)
      `)
      .eq('role_id', roleId)

    if (error) throw error

    // Estrai solo gli staff
    const staffMembers = data.map(assignment => assignment.staff)

    return { success: true, data: staffMembers }
  } catch (error) {
    console.error('❌ Errore getStaffByRole:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Imposta ruolo primario per uno staff member
 */
export async function setPrimaryRole(staffId, roleId) {
  try {
    // Verifica che il ruolo sia assegnato allo staff
    const { data: staffRoles } = await getStaffRoles(staffId)
    const hasRole = staffRoles.some(role => role.id === roleId)

    if (!hasRole) {
      throw new Error('Ruolo non assegnato a questo staff member')
    }

    const { error } = await supabase
      .from('restaurant_staff')
      .update({ primary_role_id: roleId })
      .eq('id', staffId)

    if (error) throw error

    console.log('✅ Ruolo primario aggiornato per staff:', staffId)
    return { success: true }
  } catch (error) {
    console.error('❌ Errore setPrimaryRole:', error)
    return { success: false, error: error.message }
  }
}

// =====================================================
// EXPORT DEFAULT
// =====================================================

export default {
  PERMISSIONS,
  PERMISSION_GROUPS,
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  assignRoleToStaff,
  removeRoleFromStaff,
  getStaffRoles,
  getStaffByRole,
  setPrimaryRole
}
