import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia', // ← AGGIUNGI QUESTO!
})

export default async function handler(req, res) {
  console.log('🔍 API chiamata!')
  console.log('🔑 STRIPE_SECRET_KEY presente?', !!process.env.STRIPE_SECRET_KEY)
  console.log('🔑 Prima parte chiave:', process.env.STRIPE_SECRET_KEY?.substring(0, 7)) // ← Verifica che inizi con sk_test_
  console.log('📊 Body ricevuto:', req.body)
  
  // Abilita CORS
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
    const { priceId, userId, userEmail } = req.body

    console.log('📝 Parametri:', { priceId, userId, userEmail })

    if (!priceId || !userId || !userEmail) {
      console.log('❌ Parametri mancanti!')
      return res.status(400).json({ error: 'Missing required fields' })
    }

    console.log('🚀 Creazione sessione Stripe...')

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL || 'https://mvpmenu20.vercel.app'}/#/dashboard?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://mvpmenu20.vercel.app'}/#/checkout?canceled=true`,
      customer_email: userEmail,
      client_reference_id: userId,
      metadata: {
        userId: userId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
    })

    console.log('✅ Sessione creata:', session.id)
    
    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url
    })
    
  } catch (error) {
    console.error('❌ Errore Stripe completo:', error)
    console.error('❌ Errore message:', error.message)
    console.error('❌ Errore type:', error.type)
    console.error('❌ Errore code:', error.code)
    
    return res.status(500).json({ 
      error: error.message,
      type: error.type,
      code: error.code
    })
  }
}