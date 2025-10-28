-- =====================================================
-- QUERY: Verifica Assegnazione Ruoli a Staff
-- =====================================================
-- Controlla quali staff members hanno ruoli assegnati
-- e quali ne sono privi
-- =====================================================

-- 1. PANORAMICA: Staff con e senza ruoli
SELECT
  'Staff con primary_role_id' as categoria,
  COUNT(*) as count
FROM restaurant_staff
WHERE primary_role_id IS NOT NULL
  AND deleted_at IS NULL

UNION ALL

SELECT
  'Staff SENZA primary_role_id' as categoria,
  COUNT(*) as count
FROM restaurant_staff
WHERE primary_role_id IS NULL
  AND deleted_at IS NULL;

-- =====================================================

-- 2. DETTAGLIO: Staff con ruoli assegnati
SELECT
  r.name as restaurant_name,
  rs.full_name as staff_name,
  rs.email,
  sr.name as primary_role,
  sr.color as role_color,
  rs.created_at as staff_created_at
FROM restaurant_staff rs
JOIN restaurants r ON rs.restaurant_id = r.id
LEFT JOIN staff_roles sr ON rs.primary_role_id = sr.id
WHERE rs.deleted_at IS NULL
  AND rs.primary_role_id IS NOT NULL
ORDER BY r.name, rs.full_name;

-- =====================================================

-- 3. DETTAGLIO: Staff SENZA ruoli assegnati
SELECT
  r.name as restaurant_name,
  rs.id as staff_id,
  rs.full_name as staff_name,
  rs.email,
  rs.created_at as staff_created_at
FROM restaurant_staff rs
JOIN restaurants r ON rs.restaurant_id = r.id
WHERE rs.deleted_at IS NULL
  AND rs.primary_role_id IS NULL
ORDER BY r.name, rs.full_name;

-- =====================================================

-- 4. VERIFICA: Ruoli disponibili per ristorante
SELECT
  r.name as restaurant_name,
  sr.name as role_name,
  sr.description,
  sr.color,
  sr.is_system_role,
  COUNT(rs.id) as staff_count
FROM staff_roles sr
JOIN restaurants r ON sr.restaurant_id = r.id
LEFT JOIN restaurant_staff rs ON rs.primary_role_id = sr.id AND rs.deleted_at IS NULL
GROUP BY r.name, sr.id, sr.name, sr.description, sr.color, sr.is_system_role
ORDER BY r.name, sr.is_system_role DESC, sr.name;

-- =====================================================

-- 5. VERIFICA: Assegnazioni multiple (staff_role_assignments)
SELECT
  r.name as restaurant_name,
  rs.full_name as staff_name,
  STRING_AGG(sr.name, ', ' ORDER BY sr.name) as assigned_roles,
  COUNT(sra.role_id) as roles_count
FROM staff_role_assignments sra
JOIN restaurant_staff rs ON sra.staff_id = rs.id
JOIN staff_roles sr ON sra.role_id = sr.id
JOIN restaurants r ON rs.restaurant_id = r.id
WHERE rs.deleted_at IS NULL
GROUP BY r.name, rs.full_name, rs.id
ORDER BY r.name, rs.full_name;

-- =====================================================

-- 6. TIMELINE: Eventi con e senza ruoli
SELECT
  'Eventi con staff_role_id' as categoria,
  COUNT(*) as count
FROM order_timeline
WHERE staff_role_id IS NOT NULL

UNION ALL

SELECT
  'Eventi SENZA staff_role_id (ma con staff_id)' as categoria,
  COUNT(*) as count
FROM order_timeline
WHERE staff_role_id IS NULL
  AND staff_id IS NOT NULL

UNION ALL

SELECT
  'Eventi sistema/cliente' as categoria,
  COUNT(*) as count
FROM order_timeline
WHERE staff_id IS NULL;
