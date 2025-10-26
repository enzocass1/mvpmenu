import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Card, Button, Badge, EmptyState, Spinner, Tabs } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'
import CreateOrderModal from '../components/CreateOrderModal'

/**
 * Orders Page - Shopify-like Design System
 * Lista ordini con filtri, selezione multipla ed eliminazione
 */
function OrdersPage({ session }) {
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedOrders, setSelectedOrders] = useState([]) // Array di order IDs selezionati
  const [selectionMode, setSelectionMode] = useState(false) // ModalitÃ  selezione attiva
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768) // Mobile detection
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024) // Desktop detection
  const [showCreateOrder, setShowCreateOrder] = useState(false) // Modal per creare ordine

  useEffect(() => {
    if (session) {
      loadData()
      // Auto-reload disabilitato per non interferire con l'interazione utente
      // L'utente puÃ² ricaricare manualmente se necessario
      // const interval = setInterval(() => loadData(), 10000)
      // return () => clearInterval(interval)
    }
  }, [session])

  // Desktop/mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      setIsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load restaurant
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (restaurantError) throw restaurantError
      setRestaurant(restaurantData)

      // Load orders
