import { useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'

interface Props {
  onImage: (base64: string) => void
  onClear: () => void
  hasImage: boolean
}

export function ImageUpload({ onImage, onClear, hasImage }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setCompressing(true)
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      })
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(',')[1]
        setPreview(dataUrl)
        onImage(base64)
      }
      reader.readAsDataURL(compressed)
    } finally {
      setCompressing(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleClear() {
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
    onClear()
  }

  return (
    <div
      className="image-upload"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {preview ? (
        <div className="image-upload__preview">
          <img src={preview} alt="Uploaded" />
          <button className="image-upload__clear" onClick={handleClear} aria-label="Remove image">
            ✕
          </button>
        </div>
      ) : (
        <button
          className="image-upload__drop-zone"
          onClick={() => inputRef.current?.click()}
          disabled={compressing}
        >
          {compressing ? 'Processing…' : 'Click or drag an image here'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: 'none' }}
        aria-label="Upload image"
      />
      {hasImage && !preview && <p className="image-upload__status">Image attached</p>}
    </div>
  )
}
