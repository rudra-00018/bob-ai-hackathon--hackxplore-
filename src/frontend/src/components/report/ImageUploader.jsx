import { useCallback, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Webcam from 'react-webcam'
import { Camera, Upload, RefreshCw, X, ZoomIn } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { validateImage, compressImage, validateImageDeep } from '../../services/reportService'

// ── Mode toggle ───────────────────────────────────────────────────────────────
function ModeTab({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-all',
        active
          ? 'bg-bg-primary text-token-primary shadow-sm border border-token-default'
          : 'text-token-tertiary hover:text-token-primary',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}

/**
 * ImageUploader — handles camera capture and file upload with validation.
 *
 * @param {function} onFile   - called with (File, previewUrl) when image is ready
 * @param {function} onClear  - called when image is removed
 * @param {string}   error    - validation error from parent
 * @param {boolean}  disabled
 */
export default function ImageUploader({ onFile, onClear, error, disabled = false }) {
  const [mode,       setMode]       = useState('upload') // 'upload' | 'camera'
  const [preview,    setPreview]    = useState(null)
  const [hasFile,    setHasFile]    = useState(false)
  const [processing, setProcessing] = useState(false)
  const [camError,   setCamError]   = useState(null)
  const webcamRef = useRef(null)

  // ── Process file: validate → compress → callback ──────────────────────────
  const processFile = useCallback(async (file) => {
    setProcessing(true)
    try {
      // Fast synchronous check first
      const quick = validateImage(file)
      if (!quick.valid) {
        onFile(null, null, quick.error)
        setProcessing(false)
        return
      }

      // Deep async check — actually decode the image to catch corrupted files
      const deep = await validateImageDeep(file)
      if (!deep.valid) {
        onFile(null, null, deep.error)
        setProcessing(false)
        return
      }

      // Compress if large
      const finalFile = file.size > 1.5 * 1024 * 1024
        ? await compressImage(file, 1280, 0.85)
        : file

      const url = URL.createObjectURL(finalFile)
      setPreview(url)
      setHasFile(true)
      onFile(finalFile, url, null)
    } catch (err) {
      onFile(null, null, 'Failed to process image. Please try again.')
    } finally {
      setProcessing(false)
    }
  }, [onFile])

  // ── Dropzone ───────────────────────────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => { if (accepted[0]) processFile(accepted[0]) },
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    multiple: false,
    disabled: disabled || hasFile || processing,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (rejected) => {
      const err = rejected[0]?.errors[0]
      onFile(null, null, err?.code === 'file-too-large'
        ? 'Image is too large (max 10 MB)'
        : 'File type not supported. Use JPG, PNG or WEBP.')
    },
  })

  // ── Camera capture ─────────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot()
    if (!screenshot) return
    // Convert base64 to File
    const arr  = screenshot.split(',')
    const mime = arr[0].match(/:(.*?);/)[1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8 = new Uint8Array(n)
    while (n--) u8[n] = bstr.charCodeAt(n)
    const file = new File([u8], 'capture.jpg', { type: mime })
    processFile(file)
  }, [processFile])

  // ── Clear ──────────────────────────────────────────────────────────────────
  const clear = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setHasFile(false)
    setCamError(null)
    onClear()
  }, [preview, onClear])

  return (
    <div className="space-y-3">
      {/* Mode tabs */}
      {!hasFile && (
        <div className="flex items-center gap-1 p-1 bg-bg-secondary rounded-lg w-fit">
          <ModeTab active={mode === 'upload'} onClick={() => setMode('upload')} icon={<Upload size={15} />} label="Upload" />
          <ModeTab active={mode === 'camera'} onClick={() => setMode('camera')} icon={<Camera size={15} />} label="Camera" />
        </div>
      )}

      {/* Preview */}
      <AnimatePresence mode="wait">
        {hasFile && preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative rounded-xl overflow-hidden border border-token-default bg-bg-secondary"
            style={{ maxHeight: 320 }}
          >
            <img
              src={preview}
              alt="Selected image preview"
              className="w-full object-cover"
              style={{ maxHeight: 320 }}
            />
            {/* Overlay actions */}
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                type="button"
                onClick={clear}
                disabled={disabled}
                className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                aria-label="Remove image"
              >
                <X size={15} />
              </button>
            </div>
            {/* Processing overlay */}
            {processing && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="flex items-center gap-2 text-white text-sm">
                  <RefreshCw size={16} className="animate-spin" />
                  Processing…
                </div>
              </div>
            )}
          </motion.div>
        ) : mode === 'upload' ? (
          /* Drop zone */
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            {...getRootProps()}
            className={[
              'relative rounded-xl border-2 border-dashed transition-all cursor-pointer',
              'flex flex-col items-center justify-center gap-4 py-12 px-6 text-center',
              isDragActive
                ? 'border-green-500 bg-[var(--brand-subtle)]'
                : error
                  ? 'border-red-400 bg-[var(--danger-subtle)]'
                  : 'border-token-default hover:border-token-strong hover:bg-bg-overlay',
              disabled ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
            aria-label="Upload image"
          >
            <input {...getInputProps()} aria-label="File upload input" />

            {processing ? (
              <RefreshCw size={28} className="text-green-500 animate-spin" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-bg-secondary border border-token-default flex items-center justify-center">
                <Upload size={22} className="text-token-tertiary" />
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-token-primary">
                {isDragActive ? 'Drop image here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-token-tertiary mt-1">JPG, PNG, WEBP · Max 10 MB</p>
            </div>
          </motion.div>
        ) : (
          /* Camera view */
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl overflow-hidden border border-token-default bg-black relative"
            style={{ minHeight: 260 }}
          >
            {camError ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
                <Camera size={28} className="text-token-disabled" />
                <p className="text-sm text-token-secondary">Camera not available</p>
                <p className="text-xs text-token-tertiary">{camError}</p>
                <button
                  type="button"
                  onClick={() => setMode('upload')}
                  className="text-xs text-token-link hover:underline"
                >
                  Switch to upload instead
                </button>
              </div>
            ) : (
              <>
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.9}
                  videoConstraints={{ facingMode: 'environment', width: { ideal: 1280 } }}
                  className="w-full"
                  onUserMediaError={(err) => setCamError(err?.message || 'Camera access denied')}
                />
                {/* Capture button */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={disabled || processing}
                    className="w-14 h-14 rounded-full bg-white border-4 border-gray-300 hover:border-green-500 transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center"
                    aria-label="Capture photo"
                  >
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-400" />
                  </button>
                </div>
                {/* Live indicator */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded bg-black/50 text-white text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500" role="alert">
          <X size={12} />
          {error}
        </p>
      )}
    </div>
  )
}
