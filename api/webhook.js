import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Configurazione per gestire il body raw del webhook
export const config = {
  api: {
    bodyParser: false,
  },
}

// Funzione per leggere il body raw
async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  console.log('🎣 Webhook ricevuto da Stripe!')
  
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

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']

  let event

  try {
    // Verifica la firma del webhook
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
    console.log('✅ Evento webhook verificato:', event.type)
  } catch (err) {
    console.error('❌ Errore verifica firma webhook:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  // Gestisci gli eventi di Stripe
  try {
    switch (event.type) {
      // 1. CHECKOUT COMPLETATO - Primo pagamento
      case 'checkout.session.completed': {
        const session = event.data.object
        console.log('💳 Checkout completato:', session.id)
        console.log('👤 Cliente:', session.customer)
        console.log('📝 Subscription:', session.subscription)
        
        const userId = session.client_reference_id || session.metadata?.userId
        const customerId = session.customer
        const subscriptionId = session.subscription

        if (!userId) {
          console.error('❌ userId mancante nel webhook!')
          return res.status(400).json({ error: 'userId mancante' })
        }

        console.log('📊 Aggiornamento database per userId:', userId)

        const { data, error } = await supabase
          .from('restaurants')
          .update({
            subscription_tier: 'premium',
            subscription_status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_ends_at: null,
            is_manual_premium: false,              // ← AGGIUNTO!
            manual_premium_reason: null,           // ← AGGIUNTO!
            manual_premium_granted_at: null,       // ← AGGIUNTO!
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (error) {
          console.error('❌ Errore aggiornamento Supabase:', error)
          throw error
        }

        console.log('✅ Database aggiornato - Premium attivato via Stripe:', data)
        break
      }

      // 2. PAGAMENTO RIUSCITO - Rinnovo mensile
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        console.log('💰 Pagamento riuscito (rinnovo mensile):', invoice.id)
        console.log('📝 Subscription:', invoice.subscription)
        
        if (!invoice.subscription) {
          console.log('ℹ️ Invoice senza subscription, skip')
          break
        }

        // Conferma che la subscription è ancora attiva
        const { data, error } = await supabase
          .from('restaurants')
          .update({
            subscription_status: 'active',
            subscription_ends_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', invoice.subscription)

        if (error) {
          console.error('❌ Errore conferma rinnovo:', error)
          throw error
        }

        console.log('✅ Rinnovo confermato nel database:', data)
        break
      }

      // 3. SUBSCRIPTION AGGIORNATA
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        console.log('🔄 Subscription aggiornata:', subscription.id)
        console.log('📊 Status:', subscription.status)
        
        const { data, error } = await supabase
          .from('restaurants')
          .update({
            subscription_status: subscription.status,
            subscription_ends_at: subscription.status === 'canceled' 
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('❌ Errore aggiornamento subscription:', error)
          throw error
        }

        console.log('✅ Subscription aggiornata nel database:', data)
        break
      }

      // 4. SUBSCRIPTION CANCELLATA
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        console.log('🗑️ Subscription cancellata:', subscription.id)
        
        const { data, error } = await supabase
          .from('restaurants')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('❌ Errore cancellazione subscription:', error)
          throw error
        }

        console.log('✅ Subscription cancellata nel database - tornato a FREE:', data)
        break
      }

      // 5. PAGAMENTO FALLITO
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        console.log('⚠️ Pagamento fallito:', invoice.id)
        console.log('📝 Subscription:', invoice.subscription)
        
        if (!invoice.subscription) {
          console.log('ℹ️ Invoice senza subscription, skip')
          break
        }

        const { data, error } = await supabase
          .from('restaurants')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', invoice.subscription)

        if (error) {
          console.error('❌ Errore aggiornamento pagamento fallito:', error)
          throw error
        }

        console.log('✅ Stato aggiornato a past_due:', data)
        break
      }

      default:
        console.log(`ℹ️ Evento non gestito: ${event.type}`)
    }

    return res.status(200).json({ received: true })
    
  } catch (error) {
    console.error('❌ Errore gestione webhook:', error)
    return res.status(500).json({ 
      error: error.message,
      details: error
    })
  }
}