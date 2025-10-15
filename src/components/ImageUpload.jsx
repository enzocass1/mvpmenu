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
      alert('Immagine caricata con successo!')

    } catch (error) {
      console.error('Errore upload:', error)
      alert('Errore durante il caricamento: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ marginBottom: '15px' }}>
      {preview && (
        <div style={{ marginBottom: '15px' }}>
          <img 
            src={preview} 
            alt="Preview" 
            style={{ 
              maxWidth: '200px', 
              maxHeight: '200px', 
              objectFit: 'cover', 
              borderRadius: '6px',
              border: '1px solid #E0E0E0'
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
          padding: '10px 12px',
          border: '1px solid #000000',
          borderRadius: '6px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          width: '100%',
          backgroundColor: uploading ? '#F5F5F5' : '#FFFFFF',
          fontSize: '14px',
          fontWeight: '400',
          color: '#000000',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
          outline: 'none',
          transition: 'background 0.2s ease'
        }}
      />

      {uploading && (
        <p style={{ 
          color: '#000000', 
          marginTop: '10px', 
          fontWeight: '400',
          fontSize: '13px'
        }}>
          Caricamento in corso...
        </p>
      )}

      <p style={{ 
        fontSize: '12px', 
        color: '#999', 
        marginTop: '5px',
        fontWeight: '400'
      }}>
        Scegli un'immagine dalla galleria
      </p>
    </div>
  )
}

export default ImageUpload