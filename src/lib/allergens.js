// Allergeni alimentari — i 14 obbligatori per legge (Reg. UE 1169/2011).
// Ogni prodotto salva in products.allergens un array di chiavi, es: ["glutine","latte"].

export const ALLERGENS = [
  { key: 'glutine', label: 'Glutine' },
  { key: 'crostacei', label: 'Crostacei' },
  { key: 'uova', label: 'Uova' },
  { key: 'pesce', label: 'Pesce' },
  { key: 'arachidi', label: 'Arachidi' },
  { key: 'soia', label: 'Soia' },
  { key: 'latte', label: 'Latte e lattosio' },
  { key: 'frutta_a_guscio', label: 'Frutta a guscio' },
  { key: 'sedano', label: 'Sedano' },
  { key: 'senape', label: 'Senape' },
  { key: 'sesamo', label: 'Sesamo' },
  { key: 'solfiti', label: 'Anidride solforosa e solfiti' },
  { key: 'lupini', label: 'Lupini' },
  { key: 'molluschi', label: 'Molluschi' },
]

// Lista allergeni di un prodotto (sempre un array, anche se il campo manca)
export const getProductAllergens = (product) =>
  Array.isArray(product?.allergens) ? product.allergens : []

// true se il prodotto ha almeno un allergene
export const hasAllergens = (product) => getProductAllergens(product).length > 0

// Dati completi (chiave + nome) degli allergeni di un prodotto, nell'ordine di legge
export const getAllergenInfo = (product) => {
  const keys = getProductAllergens(product)
  return ALLERGENS.filter(a => keys.includes(a.key))
}
