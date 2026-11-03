// Il database restituisce al massimo 1000 righe per richiesta: con molte vendite le
// statistiche risultavano incomplete. Questa funzione legge a pagine finché non ha tutto.
//
// Uso: const { data, error } = await fetchAllRows(() => supabase.from('order_items').select('*').eq(...))
// La funzione passata deve creare la query da capo ogni volta (una nuova per pagina).

const PAGE_SIZE = 1000

export async function fetchAllRows(makeQuery, { maxRows = 200000, orderBy = ['id'] } = {}) {
  const rows = []
  for (let from = 0; from < maxRows; from += PAGE_SIZE) {
    // Ordine secondario su colonne univoche (default id): pagine stabili anche con valori uguali
    let query = makeQuery()
    for (const col of orderBy) query = query.order(col, { ascending: true })
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1)
    if (error) return { data: rows.length ? rows : null, error }
    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
  }
  return { data: rows, error: null }
}
