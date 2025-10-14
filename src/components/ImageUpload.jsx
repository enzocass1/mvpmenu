import { useState } from 'react'
import { supabase } from '../supabaseClient'

function ImageUpload({ currentImageUrl, onImageUploaded, folder = 'general' }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentImageUrl || null)

  const handleFileChange = async (e) => {
    try {
      setUploading(true)
      
      const file = e.target.files[0]
      if (!file) return

      if (!file.type.startsWith('image/')) {
        alert('Per favore seleziona un file immagine')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(file)

      const fileExt = file.name.split('.').pop()
      const fileName = `${folder}/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('menu-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName)

      onImageUploaded(publicUrl)
      alert('✅ Immagine caricata con successo!')

    } catch (error) {
      console.error('Errore upload:', error)
      alert('❌ Errore durante il caricamento: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
        📸 Carica Immagine
      </label>
      
      {preview && (
        <div style={{ marginBottom: '10px' }}>
          <img 
            src={preview} 
            alt="Preview" 
            style={{ 
              maxWidth: '200px', 
              maxHeight: '200px', 
              objectFit: 'cover', 
              borderRadius: '8px',
              border: '2px solid #ddd'
            }} 
          />
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        style={{
          padding: '10px',
          border: '2px dashed #2196F3',
          borderRadius: '8px',
          cursor: 'pointer',
          width: '100%',
          backgroundColor: uploading ? '#f5f5f5' : 'white'
        }}
      />

      {uploading && (
        <p style={{ color: '#2196F3', marginTop: '10px', fontWeight: 'bold' }}>
          ⏳ Caricamento in corso...
        </p>
      )}

      <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
        💡 Tocca per scegliere dalla galleria o scattare una foto
      </p>
    </div>
  )
}

export default ImageUpload