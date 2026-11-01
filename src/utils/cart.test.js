import { describe, it, expect } from 'vitest'
import { cartLineKey, addCartItem, updateCartItemQuantity, removeCartItem, countCartPieces } from './cart'

const spritzAperol = { id: 'p1', name: 'Spritz', price: 6, quantity: 1, notes: '', variant_id: 'v-aperol', variant_title: 'Aperol' }
const spritzCampari = { id: 'p1', name: 'Spritz', price: 6.5, quantity: 1, notes: '', variant_id: 'v-campari', variant_title: 'Campari' }

describe('carrello', () => {
  it('tiene separate due varianti dello stesso prodotto', () => {
    const cart = addCartItem(addCartItem([], spritzAperol), spritzCampari)
    expect(cart).toHaveLength(2)
    expect(cart.map(i => i.variant_title)).toEqual(['Aperol', 'Campari'])
  })

  it('somma la quantità se prodotto, variante e note coincidono', () => {
    const cart = addCartItem(addCartItem([], spritzAperol), { ...spritzAperol, quantity: 2 })
    expect(cart).toHaveLength(1)
    expect(cart[0].quantity).toBe(3)
  })

  it('tiene separate righe con note diverse', () => {
    const cart = addCartItem(addCartItem([], spritzAperol), { ...spritzAperol, notes: 'senza ghiaccio' })
    expect(cart).toHaveLength(2)
  })

  it('modifica e rimuove solo la riga indicata', () => {
    let cart = addCartItem(addCartItem([], spritzAperol), spritzCampari)
    cart = updateCartItemQuantity(cart, cartLineKey(spritzCampari), 4)
    expect(cart.find(i => i.variant_id === 'v-campari').quantity).toBe(4)
    expect(cart.find(i => i.variant_id === 'v-aperol').quantity).toBe(1)

    cart = removeCartItem(cart, cartLineKey(spritzAperol))
    expect(cart).toHaveLength(1)
    expect(cart[0].variant_id).toBe('v-campari')
  })

  it('quantità sotto 1 rimuove la riga', () => {
    const cart = updateCartItemQuantity([spritzAperol], cartLineKey(spritzAperol), 0)
    expect(cart).toEqual([])
  })

  it('il badge conta i pezzi, non le righe', () => {
    expect(countCartPieces([{ ...spritzAperol, quantity: 2 }, spritzCampari])).toBe(3)
  })

  it('prodotto senza variante: chiave stabile anche con campi mancanti', () => {
    expect(cartLineKey({ id: 'x' })).toBe(cartLineKey({ id: 'x', variant_id: null, notes: '' }))
  })
})
