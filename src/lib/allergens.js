// Allergeni alimentari — i 14 obbligatori per legge (Reg. UE 1169/2011).
// Ogni prodotto salva in products.allergens un array di chiavi, es: ["glutine","latte"].

export const ALLERGENS = [
  { key: 'glutine', label: 'Glutine', emoji: '🌾' },
  { key: 'crostacei', label: 'Crostacei', emoji: '🦐' },
  { key: 'uova', label: 'Uova', emoji: '🥚' },
  { key: 'pesce', label: 'Pesce', emoji: '🐟' },
  { key: 'arachidi', label: 'Arachidi', emoji: '🥜' },
  { key: 'soia', label: 'Soia', emoji: '🌱' },
  { key: 'latte', label: 'Latte e lattosio', emoji: '🥛' },
  { key: 'frutta_a_guscio', label: 'Frutta a guscio', emoji: '🌰' },
  { key: 'sedano', label: 'Sedano', emoji: '🥬' },
  { key: 'senape', label: 'Senape', emoji: '🟡' },
  { key: 'sesamo', label: 'Sesamo', emoji: '🥯' },
  { key: 'solfiti', label: 'Anidride solforosa e solfiti', emoji: '🍷' },
  { key: 'lupini', label: 'Lupini', emoji: '🫘' },
  { key: 'molluschi', label: 'Molluschi', emoji: '🐚' },
]

// Lista allergeni di un prodotto (sempre un array, anche se il campo manca)
export const getProductAllergens = (product) =>
  Array.isArray(product?.allergens) ? product.allergens : []

// true se il prodotto ha almeno un allergene
export const hasAllergens = (product) => getProductAllergens(product).length > 0

// Dati completi (label + emoji) degli allergeni di un prodotto, nell'ordine di legge
export const getAllergenInfo = (product) => {
  const keys = getProductAllergens(product)
  return ALLERGENS.filter(a => keys.includes(a.key))
}
