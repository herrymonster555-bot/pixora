import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Upload, Download, X, Image as ImageIcon, LoaderCircle } from 'lucide-react'
import { CursorProvider } from './components/Cursor'
import { Tilt } from './components/Tilt'
import { Magnetic } from './components/Magnetic'
import { PremiumLoader } from './components/PremiumLoader'
import { BeforeAfterSlider } from './components/BeforeAfterSlider'

// Decode the PNG in the browser and count fully transparent pixels (alpha === 0).
async function measureTransparency(blob) {
  const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale)), h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h).data
  let transparent = 0
  for (let i = 3; i < data.length; i += 4) if (data[i] === 0) transparent++
  const result = { width: bitmap.width, height: bitmap.height, transparentRatio: transparent / (w * h) }
  bitmap.close()
  return result
}

export default function App() {
  const [file, setFile] = useState(null)
  const [originalUrl, setOriginalUrl] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [resultBlob, setResultBlob] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [quality, setQuality] = useState('preview')
  const [stage, setStage] = useState('empty') // 'empty' | 'ready' | 'processing' | 'success' | 'error'
  const [dragActive, setDragActive] = useState(false)
  const [imageDimensions, setImageDimensions] = useState(null)

  const inputRef = useRef(null)

  useEffect(() => {
    if (originalUrl) {
      const img = new Image()
      img.onload = () => setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
      img.src = originalUrl
    } else {
      setImageDimensions(null)
    }
  }, [originalUrl])

  const chooseFile = useCallback((f) => {
    if (!f) return
    if (!f.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    if (f.size > 12 * 1024 * 1024) { setError('Image must be smaller than 12 MB.'); return }
    setError('')
    if (originalUrl) URL.revokeObjectURL(originalUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setFile(f)
    setOriginalUrl(URL.createObjectURL(f))
    setResultUrl('')
    setResultBlob(null)
    setStage('ready')
    setDragActive(false)
  }, [originalUrl, resultUrl])

  const removeBg = useCallback(async () => {
    if (!file) { setError('Upload an image first.'); return }
    setBusy(true)
    setError('')
    setStage('processing')
    try {
      const form = new FormData()
      form.append('image', file)
      form.append('quality', quality)
      const response = await fetch('/api/remove-background', { method: 'POST', body: form })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Background removal failed.')
      }
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('image/png')) throw new Error(`Expected a PNG from the server but received "${contentType || 'unknown'}".`)
      const blob = new Blob([await response.arrayBuffer()], { type: 'image/png' })
      const alpha = await measureTransparency(blob)
      if (alpha.transparentRatio < 0.005) {
        throw new Error(`The returned PNG has no real transparent pixels (${(alpha.transparentRatio * 100).toFixed(2)}%).`)
      }
      if (resultUrl) URL.revokeObjectURL(resultUrl)
      const url = URL.createObjectURL(blob)
      setResultUrl(url)
      setResultBlob(blob)
      setStage('success')
    } catch (e) {
      setError(e.message)
      setStage('error')
    } finally {
      setBusy(false)
    }
  }, [file, quality, resultUrl])

  const download = useCallback(() => {
    if (!resultBlob) return
    const url = URL.createObjectURL(resultBlob)
    const base = (file?.name || 'pixora').replace(/\.[^.]+$/, '')
    const a = document.createElement('a')
    a.href = url
    a.download = `${base}-pixora-transparent.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }, [resultBlob, file])

  const reset = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setFile(null)
    setOriginalUrl('')
    setResultUrl('')
    setResultBlob(null)
    setStage('empty')
    setError('')
    setDragActive(false)
    setImageDimensions(null)
  }, [originalUrl, resultUrl])

  return (
    <CursorProvider>
      <div className="app-minimal">
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          {/* Logo */}
          <motion.div
            className="logo"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
          >
            <img
              src="/assets/pixora-logo.svg"
              alt="PIXORA"
              className="logo-image"
              style={{ width: 52, height: 52, filter: 'drop-shadow(0 0 12px rgba(198,255,0,0.6))' }}
            />
            <span className="logo-text">PIXORA</span>
          </motion.div>

          {/* Stage-based content */}
          <AnimatePresence mode="wait">
            {stage === 'empty' && (
              <motion.div
                key="empty"
                className="stage-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <UploadArea
                  dragActive={dragActive}
                  setDragActive={setDragActive}
                  chooseFile={chooseFile}
                  inputRef={inputRef}
                />
              </motion.div>
            )}

            {stage === 'ready' && (
              <motion.div
                key="ready"
                className="stage-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <ImagePreview
                  originalUrl={originalUrl}
                  file={file}
                  imageDimensions={imageDimensions}
                  onChange={chooseFile}
                  inputRef={inputRef}
                />
                <div className="actions center-actions">
                  <Magnetic
                    className="btn secondary"
                    onClick={() => inputRef.current?.click()}
                    type="button"
                  >
                    <Upload size={16} />
                    <span>Change Image</span>
                  </Magnetic>
                  <Magnetic
                    className="btn primary remove-btn"
                    onClick={removeBg}
                    disabled={busy}
                    type="button"
                  >
                    <span className="btn-icon">✦</span>
                    <span>Remove Background</span>
                  </Magnetic>
                </div>
              </motion.div>
            )}

            {stage === 'processing' && (
              <motion.div
                key="processing"
                className="stage-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <ImagePreview
                  originalUrl={originalUrl}
                  file={file}
                  imageDimensions={imageDimensions}
                  isProcessing={true}
                />
                <PremiumLoader />
              </motion.div>
            )}

            {stage === 'success' && (
              <motion.div
                key="success"
                className="stage-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <BeforeAfterSlider
                  beforeSrc={originalUrl}
                  afterSrc={resultUrl}
                  beforeAlt="Original image"
                  afterAlt="Background removed"
                />
                <div className="actions success-actions">
                  <Magnetic className="btn secondary" onClick={reset} type="button">
                    <span className="btn-icon">↺</span>
                    <span>New Image</span>
                  </Magnetic>
                  <Magnetic className="btn primary" onClick={download} type="button">
                    <Download size={18} />
                    <span>Download PNG</span>
                  </Magnetic>
                </div>
              </motion.div>
            )}

            {stage === 'error' && (
              <motion.div
                key="error"
                className="stage-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <div className="error-state">
                  <motion.div className="error-icon" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
                    <X size={32} style={{ color: '#ff6b7a' }} />
                  </motion.div>
                  <h3>Background Removal Failed</h3>
                  <p>{error}</p>
                  <Magnetic className="btn primary" onClick={() => { setStage('ready'); setError('') }} type="button">
                    <LoaderCircle size={18} className="spin" />
                    <span>Try Again</span>
                  </Magnetic>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Creator Credits & Footer */}
          <motion.footer
            className="footer-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="credits-card">
              <span className="credits-title">Created by Priyanshu &amp; Rohan</span>
              <div className="discord-credits">
                <svg
                  className="discord-icon"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span className="discord-tag">@iamr0han_5</span>
                <span className="discord-divider">&bull;</span>
                <span className="discord-tag">@badboy0847</span>
              </div>
            </div>
            <p className="powered-by">Powered by remove.bg API</p>
          </motion.footer>
        </motion.div>
      </div>
    </CursorProvider>
  )
}

function UploadArea({ dragActive, setDragActive, chooseFile, inputRef }) {
  return (
    <div
      className={`dropzone ${dragActive ? 'dragging' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragActive(true) }}
      onDragLeave={() => setDragActive(false)}
      onDrop={e => { e.preventDefault(); setDragActive(false); chooseFile(e.dataTransfer.files?.[0]) }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          chooseFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <motion.div
        className="drop-icon"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <Upload size={32} />
      </motion.div>
      <motion.strong
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
      >
        Upload Image
      </motion.strong>
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 25 }}
      >
        Drag & drop or click to select
      </motion.span>
      <motion.small
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        JPG · PNG · WEBP — Up to 12 MB
      </motion.small>
    </div>
  )
}

function ImagePreview({ originalUrl, file, imageDimensions, onChange, inputRef, isProcessing }) {
  return (
    <div className="image-preview-wrapper">
      <Tilt maxRotation={6} scale={1.015} className="image-preview-card">
        <div className="image-preview-inner">
          <img
            src={originalUrl}
            alt="Uploaded image"
          />
        </div>
      </Tilt>

      <div className="image-info">
        <motion.div
          className="info-row"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
        >
          <ImageIcon size={16} style={{ color: '#C6FF00' }} />
          <span>{file?.name}</span>
        </motion.div>
        {imageDimensions && (
          <motion.div
            className="info-row"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 25 }}
          >
            <span>{imageDimensions.width} × {imageDimensions.height} px</span>
            <span className="file-size">{formatFileSize(file?.size)}</span>
          </motion.div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          onChange?.(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}