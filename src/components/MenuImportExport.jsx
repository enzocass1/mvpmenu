import { useState } from 'react'
import { supabase } from '../supabaseClient'

function MenuImportExport({ restaurantId }) {
  const [importing, setImporting] = useState(false)
  const [emailSending, setEmailSending] = useState(false)

  // Invia menu via email (usando Supabase Storage)
  const handleSendMenuEmail = async () => {
    setEmailSending(true)
    try {
      // Ottieni email utente
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        alert('Email utente non trovata')
        setEmailSending(false)
        return
      }

      // Ottieni dati ristorante
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name')
        .eq('id', restaurantId)
        .single()

      const csvContent = await generateCSV()
      const fileName = `menu-backup-${Date.now()}.csv`

      // Upload file su Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('menu-backups')
        .upload(`${user.id}/${fileName}`, csvContent, {
          contentType: 'text/csv',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Genera URL pubblico con scadenza (7 giorni)
      const { data: urlData } = await supabase.storage
        .from('menu-backups')
        .createSignedUrl(`${user.id}/${fileName}`, 604800) // 7 giorni in secondi

      if (!urlData?.signedUrl) {
        throw new Error('Impossibile generare link di download')
      }

      // Prepara email
      const subject = `Backup Menu - ${restaurant?.name || 'Ristorante'}`
      const body = `Ciao,\n\nIl backup del tuo menu è pronto!\n\nScarica il file CSV qui:\n${urlData.signedUrl}\n\n(Il link scadrà tra 7 giorni)\n\nCordiali saluti,\nIl team di MVPMenu`
      
      const mailtoLink = `mailto:${user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      
      window.location.href = mailtoLink
      
      setTimeout(() => {
        setEmailSending(false)
        alert('Client email aperto con link di download. Completa e invia il messaggio.')
      }, 1000)

    } catch (error) {
      console.error('Error sending email:', error)
      alert('Errore durante la creazione del backup: ' + error.message)
      setEmailSending(false)
    }
  }

  // Genera CSV (funzione condivisa)
  const generateCSV = async () => {
    // Carica categorie con i loro prodotti
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*, products(*)')
      .eq('restaurant_id', restaurantId)
      .order('order', { ascending: true })

    if (catError) throw catError

    // Crea CSV
    let csvContent = 'Categoria,Immagine Categoria,Prodotto,Descrizione,Prezzo,Immagine Prodotto\n'

    categories.forEach(category => {
      if (category.products && category.products.length > 0) {
        // Ordina prodotti
        const sortedProducts = category.products.sort((a, b) => a.order - b.order)
        
        sortedProducts.forEach(product => {
          const row = [
            category.name,
            category.image_url || '',
            product.name,
            product.description || '',
            product.price,
            product.image_url || ''
          ]
          // Escape virgole e virgolette
          const escapedRow = row.map(field => {
            const str = String(field)
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`
            }
            return str
          })
          csvContent += escapedRow.join(',') + '\n'
        })
      } else {
        // Categoria senza prodotti
        const row = [
          category.name,
          category.image_url || '',
          '',
          '',
          '',
          ''
        ]
        csvContent += row.join(',') + '\n'
      }
    })

    return csvContent
  }

  // Importa menu da CSV
  const handleImportMenu = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      // Salta header
      const dataLines = lines.slice(1)

      // Parse CSV
      const parsedData = []
      dataLines.forEach(line => {
        const row = []
        let currentField = ''
        let insideQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          
          if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
              currentField += '"'
              i++
            } else {
              insideQuotes = !insideQuotes
            }
          } else if (char === ',' && !insideQuotes) {
            row.push(currentField.trim())
            currentField = ''
          } else {
            currentField += char
          }
        }
        row.push(currentField.trim())
        
        if (row.length >= 6) {
          parsedData.push({
            categoryName: row[0],
            categoryImage: row[1],
            productName: row[2],
            productDescription: row[3],
            productPrice: row[4],
            productImage: row[5]
          })
        }
      })

      if (parsedData.length === 0) {
        alert('File CSV vuoto o non valido')
        setImporting(false)
        return
      }

      // Conferma import
      if (!window.confirm(`Vuoi importare ${parsedData.length} righe dal CSV?\n\nATTENZIONE: Questo sostituirà completamente il menu esistente!`)) {
        setImporting(false)
        return
      }

      // Elimina menu esistente
      await supabase
        .from('categories')
        .delete()
        .eq('restaurant_id', restaurantId)

      // Raggruppa per categoria
      const categoriesMap = new Map()
      parsedData.forEach(row => {
        if (!categoriesMap.has(row.categoryName)) {
          categoriesMap.set(row.categoryName, {
            name: row.categoryName,
            image_url: row.categoryImage,
            products: []
          })
        }
        
        if (row.productName) {
          categoriesMap.get(row.categoryName).products.push({
            name: row.productName,
            description: row.productDescription,
            price: parseFloat(row.productPrice) || 0,
            image_url: row.productImage
          })
        }
      })

      // Inserisci categorie
      let categoryOrder = 0
      for (const [categoryName, categoryData] of categoriesMap) {
        const { data: category, error: catError } = await supabase
          .from('categories')
          .insert([{
            restaurant_id: restaurantId,
            name: categoryData.name,
            image_url: categoryData.image_url,
            order: categoryOrder++
          }])
          .select()
          .single()

        if (catError) {
          console.error('Error creating category:', catError)
          continue
        }

        // Inserisci prodotti della categoria
        if (categoryData.products.length > 0) {
          const productsToInsert = categoryData.products.map((product, index) => ({
            category_id: category.id,
            name: product.name,
            description: product.description,
            price: product.price,
            image_url: product.image_url,
            order: index
          }))

          const { error: prodError } = await supabase
            .from('products')
            .insert(productsToInsert)

          if (prodError) {
            console.error('Error creating products:', prodError)
          }
        }
      }

      alert('Menu importato con successo!\n\nRicarica la pagina per vedere le modifiche.')
      window.location.reload()
    } catch (error) {
      console.error('Error importing menu:', error)
      alert('Errore durante l\'importazione del menu')
    } finally {
      setImporting(false)
      event.target.value = null // Reset input file
    }
  }

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px',
        marginBottom: '30px'
      }}>
        {/* Invia Menu via Email */}
        <button
          onClick={handleSendMenuEmail}
          disabled={emailSending}
          aria-label="Invia backup menu via email"
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#FFFFFF',
            background: emailSending ? '#999' : '#000000',
            border: 'none',
            borderRadius: '6px',
            cursor: emailSending ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (!emailSending) e.target.style.background = '#333333'
          }}
          onMouseLeave={(e) => {
            if (!emailSending) e.target.style.background = '#000000'
          }}
        >
          {emailSending ? 'Creando Backup...' : 'Invia Backup via Email'}
        </button>

        {/* Carica Menu */}
        <label style={{
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#000000',
          background: importing ? '#F5F5F5' : '#FFFFFF',
          border: '1px solid #000000',
          borderRadius: '6px',
          cursor: importing ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          {importing ? 'Importando...' : 'Carica Menu CSV'}
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain,application/csv,application/vnd.ms-excel"
            onChange={handleImportMenu}
            disabled={importing}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Istruzioni */}
      <div style={{
        background: '#F9F9F9',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #E0E0E0'
      }}>
        <h4 style={{
          margin: '0 0 15px 0',
          fontSize: '14px',
          fontWeight: '500',
          color: '#000000'
        }}>
          Come usare
        </h4>
        
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ 
            color: '#000000',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Invia Backup via Email:
          </strong>
          <p style={{ 
            margin: '5px 0 0 0', 
            fontSize: '13px', 
            color: '#666',
            fontWeight: '400',
            lineHeight: '1.5'
          }}>
            Crea un backup del tuo menu e ricevi il link per scaricarlo via email. Il link sarà valido per 7 giorni.
          </p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong style={{ 
            color: '#000000',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Carica Menu CSV:
          </strong>
          <p style={{ 
            margin: '5px 0 0 0', 
            fontSize: '13px', 
            color: '#666',
            fontWeight: '400',
            lineHeight: '1.5'
          }}>
            Importa un file CSV per sostituire completamente il menu esistente.
          </p>
          <p style={{ 
            margin: '8px 0 0 0', 
            fontSize: '13px', 
            color: '#f44336', 
            fontWeight: '500'
          }}>
            ⚠️ ATTENZIONE: Questa operazione eliminerà tutte le categorie e prodotti attuali!
          </p>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: '6px'
        }}>
          <p style={{
            margin: '0 0 10px 0',
            fontSize: '13px',
            fontWeight: '500',
            color: '#000000'
          }}>
            Formato CSV richiesto:
          </p>
          <code style={{
            display: 'block',
            padding: '12px',
            background: '#F5F5F5',
            border: '1px solid #E0E0E0',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
            color: '#000000',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            lineHeight: '1.6',
            fontWeight: '400'
          }}>
Categoria,Immagine Categoria,Prodotto,Descrizione,Prezzo,Immagine Prodotto{'\n'}
Antipasti,https://...,Bruschetta,Pomodoro e basilico,5.50,https://...{'\n'}
Primi,,Carbonara,Guanciale e uovo,12.00,
          </code>
        </div>
      </div>
    </div>
  )
}

export default MenuImportExport