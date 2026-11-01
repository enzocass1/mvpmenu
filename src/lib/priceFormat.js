// Formattazione prezzo di un prodotto con eventuali varianti, condivisa da tutti
// i layout del menu (Classico, Store, Builder) e dalla ricerca.
//
// Regole:
//  - più varianti con prezzi DIVERSI  → "Da €X"  (X = prezzo più basso)
//  - varianti tutte allo stesso prezzo → "€X"     (nessun "Da")
//  - nessuna variante                  → "€X"

export function getPriceInfo(p) {
  if (p?.hasVariants && Array.isArray(p.variants) && p.variants.length) {
    const prices = p.variants.map(v => Number(v.price ?? p.price ?? 0))
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    return { value: min, from: min !== max }
  }
  return { value: Number(p?.price || 0), from: false }
}

// Stringa pronta da mostrare, es. "Da €7.00" oppure "€3.50"
export function formatPrice(p) {
  const { value, from } = getPriceInfo(p)
  return (from ? 'Da ' : '') + '€' + value.toFixed(2)
}
