// api/create-customer-portal.js

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { customerId, email } = req.body

    console.log('🔵 create-customer-portal chiamata')
    console.log('📦 Request body:', { customerId, email })

    let finalCustomerId = customerId

    // Se non c'è customerId, prova a cercarlo via email
    if (!customerId && email) {
      console.log('⚠️ customerId mancante, cerco via email:', email)
      
      try {
        const customers = await stripe.customers.list({
          email: email,
          limit: 1
        })

        if (customers.data.length > 0) {
          finalCustomerId = customers.data[0].id
          console.log('✅ Customer trovato via email:', finalCustomerId)
        } else {
          console.log('❌ Nessun customer trovato con questa email')
          return res.status(404).json({ 
            error: 'Nessun abbonamento trovato. Contatta il supporto per assistenza.',
            code: 'NO_CUSTOMER_FOUND'
          })
        }
      } catch (searchError) {
        console.error('❌ Errore ricerca customer:', searchError)
        return res.status(500).json({ 
          error: 'Errore nella ricerca del cliente',
          code: 'CUSTOMER_SEARCH_ERROR'
        })
      }
    }

    // Se ancora non abbiamo un customer ID, errore
    if (!finalCustomerId) {
      console.error('❌ Né customerId né email forniti')
      return res.status(400).json({ 
        error: 'Customer ID o email mancanti',
        code: 'MISSING_IDENTIFIER'
      })
    }

    // Verifica che il customer esista su Stripe
    try {
      await stripe.customers.retrieve(finalCustomerId)
      console.log('✅ Customer verificato su Stripe:', finalCustomerId)
    } catch (retrieveError) {
      console.error('❌ Customer non trovato su Stripe:', retrieveError.message)
      
      // Se il customer non esiste e abbiamo l'email, suggerisci di contattare supporto
      if (email) {
        return res.status(404).json({ 
          error: 'Abbonamento non trovato. Contatta il supporto per verificare il tuo account.',
          code: 'CUSTOMER_NOT_FOUND',
          email: email
        })
      }
      
      return res.status(404).json({ 
        error: 'Cliente non trovato su Stripe',
        code: 'CUSTOMER_NOT_FOUND'
      })
    }

    // Crea sessione del Customer Portal
    console.log('🔄 Creazione sessione Customer Portal...')
    const session = await stripe.billingPortal.sessions.create({
      customer: finalCustomerId,
      return_url: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/#/dashboard`
    })

    console.log('✅ Sessione creata:', session.id)
    console.log('🔗 URL:', session.url)

    return res.status(200).json({ 
      url: session.url,
      customerId: finalCustomerId
    })

  } catch (error) {
    console.error('❌ Errore completo:', error)
    console.error('Stack:', error.stack)
    
    // Gestione errori Stripe specifici
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: error.message,
        code: 'STRIPE_INVALID_REQUEST'
      })
    }

    return res.status(500).json({ 
      error: error.message || 'Errore durante la creazione del portale clienti',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
}