import { useState } from 'react'
import { supabase } from '../supabaseClient'

function MenuImportExport({ restaurantId }) {
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  // Esporta menu in CSV
  const handleExportMenu = async () => {
    setLoading(true)
    try {
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

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `menu-${new Date().getTime()}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      alert('✅ Menu esportato con successo!')
    } catch (error) {
      console.error('Error exporting menu:', error)
      alert('❌ Errore durante l\'esportazione del menu')
    } finally {
      setLoading(false)
    }
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
        alert('❌ File CSV vuoto o non valido')
        setImporting(false)
        return
      }

      // Conferma import
      if (!window.confirm(`Vuoi importare ${parsedData.length} righe dal CSV?\n\n⚠️ ATTENZIONE: Questo sostituirà completamente il menu esistente!`)) {
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

      alert('✅ Menu importato con successo!\n\nRicarica la pagina per vedere le modifiche.')
      window.location.reload()
    } catch (error) {
      console.error('Error importing menu:', error)
      alert('❌ Errore durante l\'importazione del menu')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{
      background: '#FFFFFF',
      border: '2px solid #000000',
      borderRadius: '8px',
      padding: '30px',
      boxShadow: '4px 4px 0px #000000'
    }}>
      <h3 style={{
        margin: '0 0 25px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#000000',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        📥 Importa/Esporta Menu
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '15px'
      }}>
        {/* Scarica Menu */}
        <button
          onClick={handleExportMenu}
          disabled={loading}
          style={{
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '700',
            color: '#FFFFFF',
            background: loading ? '#999999' : '#4CAF50',
            border: '2px solid #000000',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '3px 3px 0px #000000',
            transition: 'all 0.2s ease'
          }}
          onMouseDown={(e) => {
            if (!loading) {
              e.target.style.transform = 'translate(2px, 2px)'
              e.target.style.boxShadow = '1px 1px 0px #000000'
            }
          }}
          onMouseUp={(e) => {
            if (!loading) {
              e.target.style.transform = 'translate(0, 0)'
              e.target.style.boxShadow = '3px 3px 0px #000000'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.target.style.transform = 'translate(0, 0)'
              e.target.style.boxShadow = '3px 3px 0px #000000'
            }
          }}
        >
          {loading ? '⏳ Esportando...' : '⬇️ Scarica Menu CSV'}
        </button>

        {/* Carica Menu */}
        <label style={{
          padding: '16px 24px',
          fontSize: '16px',
          fontWeight: '700',
          color: '#FFFFFF',
          background: importing ? '#999999' : '#FF9800',
          border: '2px solid #000000',
          borderRadius: '4px',
          cursor: importing ? 'not-allowed' : 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          boxShadow: '3px 3px 0px #000000',
          transition: 'all 0.2s ease',
          display: 'block',
          textAlign: 'center'
        }}>
          {importing ? '⏳ Importando...' : '⬆️ Carica Menu CSV'}
          <input
            type="file"
            accept=".csv"
            onChange={handleImportMenu}
            disabled={importing}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Istruzioni */}
      <div style={{
        marginTop: '25px',
        padding: '20px',
        background: '#F5F5F5',
        border: '2px solid #000000',
        borderRadius: '4px'
      }}>
        <h4 style={{
          margin: '0 0 15px 0',
          fontSize: '16px',
          fontWeight: '700',
          color: '#000000'
        }}>
          📖 Come usare
        </h4>
        
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#4CAF50' }}>⬇️ Scarica Menu:</strong>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
            Esporta il tuo menu attuale in formato CSV per backup o modifica offline.
          </p>
        </div>

        <div>
          <strong style={{ color: '#FF9800' }}>⬆️ Carica Menu:</strong>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
            Importa un file CSV per sostituire completamente il menu esistente.
          </p>
          <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#f44336', fontWeight: '600' }}>
            ⚠️ ATTENZIONE: Questa operazione eliminerà tutte le categorie e prodotti attuali!
          </p>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: '4px'
        }}>
          <p style={{
            margin: '0 0 10px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: '#000000'
          }}>
            Formato CSV richiesto:
          </p>
          <code style={{
            display: 'block',
            padding: '10px',
            background: '#F5F5F5',
            border: '1px solid #E0E0E0',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#000000',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
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