import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
})

export default async function handler(req, res) {
  console.log('🔍 Customer Portal richiesto')
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { customerId } = req.body

    console.log('📝 Customer ID ricevuto:', customerId)

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID mancante' })
    }

    // Crea una sessione del Customer Portal
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL || 'https://mvpmenu20.vercel.app'}/#/dashboard`,
    })

    console.log('✅ Portal session creata:', portalSession.id)

    return res.status(200).json({ url: portalSession.url })
    
  } catch (error) {
    console.error('❌ Errore creazione portal:', error)
    return res.status(500).json({ 
      error: error.message,
      type: error.type
    })
  }
}