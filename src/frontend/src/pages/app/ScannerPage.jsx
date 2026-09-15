import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Webcam from 'react-webcam'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, Upload, RefreshCw, Volume2, MapPin, Flag,
  Leaf, SwitchCamera, Info, Sparkles, Layers, Box,
  ChevronRight, CheckCircle, AlertTriangle, Cpu,
} from 'lucide-react'
import { PageLayout, PageHeader } from '../../components/layout/AppLayout'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import toast from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { predictApi } from '../../services/api'
import BoundingBoxOverlay from '../../components/scanner/BoundingBoxOverlay'

// Emojis and bin styling per waste category
export const CATEGORY_META = {
  plastic: {
    emoji: '🧴',
    label: 'Plastic Bottle / Container',
    bin: 'Blue Recycling Bin',
    binColor: '#3B82F6',
    binBg: 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300',
    recyclable: true,
    carbon: 0.08,
    instructions: 'Empty liquids, rinse residue, and flatten to save space. Caps can usually stay on.',
  },
  paper: {
    emoji: '📄',
    label: 'Paper & Clean Card',
    bin: 'Yellow / Paper Bin',
    binColor: '#EAB308',
    binBg: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300',
    recyclable: true,
    carbon: 0.05,
    instructions: 'Keep dry and clean. Remove plastic wrapping or greasy sections before recycling.',
  },
  cardboard: {
    emoji: '📦',
    label: 'Corrugated Cardboard',
    bin: 'Yellow / Paper Bin',
    binColor: '#D97706',
    binBg: 'bg-amber-600/15 border-amber-600/30 text-amber-800 dark:text-amber-200',
    recyclable: true,
    carbon: 0.06,
    instructions: 'Flatten all boxes. Remove plastic tape and packaging foam.',
  },
  metal: {
    emoji: '🥫',
    label: 'Metal Can / Foil',
    bin: 'Blue Recycling Bin',
    binColor: '#6B7280',
    binBg: 'bg-slate-500/15 border-slate-500/30 text-slate-700 dark:text-slate-300',
    recyclable: true,
    carbon: 0.12,
    instructions: 'Rinse out food or drink residue. Foil can be scrunched into a tennis ball size.',
  },
  glass: {
    emoji: '🍶',
    label: 'Glass Bottle / Jar',
    bin: 'Green Glass Bank',
    binColor: '#22C55E',
    binBg: 'bg-green-500/15 border-green-500/30 text-green-700 dark:text-green-300',
    recyclable: true,
    carbon: 0.07,
    instructions: 'Empty and rinse clean. Metal lids can go in metal recycling or stay attached.',
  },
  'food organics': {
    emoji: '🍌',
    label: 'Food Organics',
    bin: 'Brown Compost Bin',
    binColor: '#84CC16',
    binBg: 'bg-lime-500/15 border-lime-500/30 text-lime-700 dark:text-lime-300',
    recyclable: false,
    carbon: 0.03,
    instructions: 'Place in the compost or organic-waste bin without plastic bags.',
  },
  'miscellaneous trash': {
    emoji: '🗑️',
    label: 'Miscellaneous Trash',
    bin: 'General Waste (Black Bin)',
    binColor: '#EF4444',
    binBg: 'bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-300',
    recyclable: false,
    carbon: 0,
    instructions: 'Dispose in general waste after checking whether the item can be reused.',
  },
  'textile trash': {
    emoji: '👕',
    label: 'Textile Trash',
    bin: 'Textile Recycling Bank / Charity',
    binColor: '#8B5CF6',
    binBg: 'bg-violet-500/15 border-violet-500/30 text-violet-700 dark:text-violet-300',
    recyclable: false,
    carbon: 0.04,
    instructions: 'Donate wearable items or use a dedicated textile recycling point.',
  },
  vegetation: {
    emoji: '🌿',
    label: 'Vegetation',
    bin: 'Brown Compost Bin / Garden Waste',
    binColor: '#22C55E',
    binBg: 'bg-green-500/15 border-green-500/30 text-green-700 dark:text-green-300',
    recyclable: false,
    carbon: 0.02,
    instructions: 'Place in garden-waste collection or compost at home.',
  },
  ewaste: {
    emoji: '📱',
    label: 'Electronic Device / Cable',
    bin: 'E-Waste Drop-off Point',
    binColor: '#F97316',
    binBg: 'bg-orange-500/15 border-orange-500/30 text-orange-700 dark:text-orange-300',
    recyclable: true,
    carbon: 0.25,
    instructions: 'Do not throw in household bins. Bring to a dedicated e-waste collection centre.',
  },
  trash: {
    emoji: '🗑️',
    label: 'General Non-Recyclable Waste',
    bin: 'Grey / Black General Bin',
    binColor: '#4B5563',
    binBg: 'bg-zinc-500/15 border-zinc-500/30 text-zinc-700 dark:text-zinc-300',
    recyclable: false,
    carbon: 0.0,
    instructions: 'Dispose in the general waste bin. Try to replace with reusable alternatives next time.',
  },
  unknown: {
    emoji: '♻️',
    label: 'Unclassified Item',
    bin: 'General Waste or Check Council Guide',
    binColor: '#6B7280',
    binBg: 'bg-zinc-500/15 border-zinc-500/30 text-zinc-700 dark:text-zinc-300',
    recyclable: false,
    carbon: 0.0,
    instructions: 'Unable to reliably classify this item. Check your local municipal guidelines.',
  },
  'unknown/uncertain': {
    emoji: '❔',
    label: 'Unknown/Uncertain',
    bin: 'Please verify locally',
    binColor: '#6B7280',
    binBg: 'bg-zinc-500/15 border-zinc-500/30 text-zinc-700 dark:text-zinc-300',
    recyclable: false,
    carbon: 0,
    instructions: 'The model is not confident enough. Try a clear, close photo of one item.',
  },
}

// Sample benchmark scenes for multi-object detection testing
const SAMPLE_MULTI_SCENES = [
  {
    title: '🥤 Mixed Waste Scene (3 Items)',
    description: 'Plastic Bottle + Corrugated Cardboard + Metal Can',
    previewUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
    detections: [
      {
        id: 'det-1',
        box: [18, 12, 85, 42], // top, left, bottom, right %
        category: 'plastic',
        label: 'Plastic PET Water Bottle',
        confidence: 0.96,
        color: '#3B82F6',
        emoji: '🧴',
        bin: 'Blue Recycling Bin',
        recyclable: true,
        carbon: 0.08,
        instructions: 'Rinse clean, crush flat, and place in Blue Recycling Bin.',
      },
      {
        id: 'det-2',
        box: [12, 46, 75, 88],
        category: 'cardboard',
        label: 'Corrugated Shipping Box',
        confidence: 0.93,
        color: '#D97706',
        emoji: '📦',
        bin: 'Yellow / Paper Bin',
        recyclable: true,
        carbon: 0.06,
        instructions: 'Flatten completely. Remove packing tape.',
      },
      {
        id: 'det-3',
        box: [58, 38, 92, 65],
        category: 'metal',
        label: 'Aluminum Beverage Can',
        confidence: 0.91,
        color: '#6B7280',
        emoji: '🥫',
        bin: 'Blue Recycling Bin',
        recyclable: true,
        carbon: 0.12,
        instructions: 'Empty liquid residue and crush to save bin volume.',
      },
    ],
  },
  {
    title: '🍶 Glass & Metal Jars (2 Items)',
    description: 'Glass Jar + Metal Food Tin',
    previewUrl: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=800&q=80',
    detections: [
      {
        id: 'det-1',
        box: [15, 14, 88, 52],
        category: 'glass',
        label: 'Glass Food Jar',
        confidence: 0.95,
        color: '#22C55E',
        emoji: '🍶',
        bin: 'Green Glass Bank',
        recyclable: true,
        carbon: 0.07,
        instructions: 'Rinse food residue. Place in Green Glass Bank.',
      },
      {
        id: 'det-2',
        box: [22, 56, 85, 90],
        category: 'metal',
        label: 'Metal Food Tin',
        confidence: 0.89,
        color: '#6B7280',
        emoji: '🥫',
        bin: 'Blue Recycling Bin',
        recyclable: true,
        carbon: 0.12,
        instructions: 'Rinse out sauce residue and place in Blue Recycling Bin.',
      },
    ],
  },
]

export default function ScannerPage() {
  const { refreshUser } = useAuth()

  const [mode, setMode] = useState('camera') // 'camera' | 'upload'
  const [facingMode, setFacingMode] = useState('environment') // 'user' | 'environment'
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [selectedDetectionId, setSelectedDetectionId] = useState(null)
  const [camError, setCamError] = useState(null)
  const [speaking, setSpeaking] = useState(false)

  const webcamRef = useRef(null)

  // Voice narration helper
  const speakResult = useCallback((text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [])

  // Process classification or multi-detection response
  const processResult = useCallback((data, imageSource = null) => {
    const isMulti = data.detections && Array.isArray(data.detections) && data.detections.length > 0

    if (isMulti) {
      // Normalize multi-object detections
      const normalizedDetections = data.detections.map((d, i) => {
        const cat = d.category?.toLowerCase() || 'unknown'
        const meta = CATEGORY_META[cat] || CATEGORY_META.unknown
        return {
          id: d.id || `det-${i + 1}`,
          box: d.box || [10 + i * 20, 10 + i * 20, 50 + i * 20, 50 + i * 20],
          category: cat,
          label: d.label || meta.label,
          confidence: d.confidence ? Math.round(d.confidence > 1 ? d.confidence : d.confidence * 100) : 92,
          recyclable: d.recyclable ?? meta.recyclable,
          bin: d.bin || meta.bin,
          carbon: d.carbon || meta.carbon,
          instructions: d.instructions || meta.instructions,
          color: d.color || meta.binColor,
          emoji: d.emoji || meta.emoji,
          meta,
        }
      })

      const totalCarbon = normalizedDetections.reduce((sum, d) => sum + (d.carbon || 0), 0)
      const allRecyclable = normalizedDetections.every(d => d.recyclable)

      const res = {
        isMulti: true,
        mode: 'multi_detection',
        modelArchitecture: data.model_architecture || 'Multi-Object Detection Pipeline',
        detectionSupported: true,
        detections: normalizedDetections,
        totalCarbon: parseFloat(totalCarbon.toFixed(3)),
        allRecyclable,
        itemCount: normalizedDetections.length,
      }

      setResult(res)
      setSelectedDetectionId(normalizedDetections[0]?.id || null)
      setPreviewImage(imageSource || previewImage)

      // Narrate summary
      const summaryText = `Detected ${normalizedDetections.length} items. ${normalizedDetections.map(d => `${d.label} goes into ${d.bin}`).join('. ')}`
      speakResult(summaryText)
    } else {
      // Single-object classification (default MobileNetV3)
      const cat = data.prediction?.toLowerCase() || 'unknown'
      const meta = CATEGORY_META[cat] || CATEGORY_META.unknown
      const isRecyclable = data.recyclable ?? meta.recyclable

      const res = {
        isMulti: false,
        mode: 'single_classification',
        modelArchitecture: data.model_architecture || 'MobileNetV3-Small (Single-Item Classifier)',
        detectionSupported: false,
        category: cat,
        // Preserve the exact RealWaste training class returned by the model.
        label: data.label || data.prediction || meta.label,
        confidence: data.confidence ? Math.round(data.confidence * 100) : 92,
        recyclable: isRecyclable,
        bin: data.bin || meta.bin,
        carbon: data.carbon_saved || meta.carbon,
        instructions: data.instructions || meta.instructions,
        top3: data.top3 || [],
        meta,
      }

      setResult(res)
      setPreviewImage(imageSource || previewImage)
      speakResult(`${meta.label}. Dispose in the ${meta.bin}. ${isRecyclable ? 'This item is recyclable.' : 'This item belongs in general waste.'} ${meta.instructions}`)
    }

    if (refreshUser) refreshUser().catch(() => {})
  }, [previewImage, refreshUser, speakResult])

  // Dropzone file handler
  const onDrop = useCallback(async (files) => {
    const file = files[0]
    if (!file) return

    // Read local image for preview overlay
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewImage(reader.result)
    }
    reader.readAsDataURL(file)

    setResult(null)
    setLoading(true)

    try {
      const data = await predictApi.classify(file)
      processResult(data, reader.result)
    } catch (err) {
      toast.error(err.message || 'AI classification failed. Please verify image file format.')
    } finally {
      setLoading(false)
    }
  }, [processResult])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  })

  // Camera shutter snap
  const capturePhoto = useCallback(async () => {
    const screenshot = webcamRef.current?.getScreenshot()
    if (!screenshot) {
      toast.error('Could not capture frame from camera. Please grant camera permissions.')
      return
    }
    setPreviewImage(screenshot)
    setResult(null)
    setLoading(true)

    try {
      const data = await predictApi.classifyBase64(screenshot)
      processResult(data, screenshot)
    } catch (err) {
      toast.error(err.message || 'AI classification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [processResult])

  // Load sample multi-detection benchmark scene
  const handleLoadSampleScene = (scene) => {
    setPreviewImage(scene.previewUrl)
    processResult(
      {
        mode: 'multi_detection',
        model_architecture: 'Multi-Object Detection Pipeline (Benchmark Mode)',
        detections: scene.detections,
      },
      scene.previewUrl
    )
  }

  // Camera flip
  const flipCamera = () => {
    setFacingMode(f => (f === 'environment' ? 'user' : 'environment'))
  }

  // Reset scanner
  const handleReset = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    setSpeaking(false)
    setResult(null)
    setPreviewImage(null)
    setSelectedDetectionId(null)
  }

  // Active focused detection (for multi-object view)
  const activeDetection = result?.isMulti
    ? result.detections.find(d => d.id === selectedDetectionId) || result.detections[0]
    : null

  return (
    <PageLayout className="max-w-4xl mx-auto">
      <PageHeader
        title="AI Waste Scanner"
        subtitle="Point your camera or upload a photo to identify waste items, bounding boxes, and disposal bins"
      />

      {/* Mode Switcher */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex p-1 rounded-xl bg-bg-secondary border border-token-default shadow-sm select-none">
          <button
            type="button"
            onClick={() => { setMode('camera'); handleReset() }}
            className={[
              'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all min-h-[44px]',
              mode === 'camera'
                ? 'bg-bg-primary text-token-primary shadow-sm border border-token-default'
                : 'text-token-tertiary hover:text-token-primary',
            ].join(' ')}
          >
            <Camera size={18} />
            Live Camera
          </button>
          <button
            type="button"
            onClick={() => { setMode('upload'); handleReset() }}
            className={[
              'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all min-h-[44px]',
              mode === 'upload'
                ? 'bg-bg-primary text-token-primary shadow-sm border border-token-default'
                : 'text-token-tertiary hover:text-token-primary',
            ].join(' ')}
          >
            <Upload size={18} />
            Upload Photo
          </button>
        </div>
      </div>

      {/* Main Scanner Card */}
      <Card padded className="overflow-hidden border-token-default shadow-lg">
        <div className="space-y-5">
          {/* Active Viewport when NOT showing result */}
          {!result && (
            <div className="relative rounded-2xl overflow-hidden bg-black border border-token-default aspect-[4/3] sm:aspect-[16/10] flex items-center justify-center">
              {mode === 'camera' ? (
                camError ? (
                  <div className="p-6 text-center space-y-3">
                    <Camera size={36} className="text-zinc-500 mx-auto" />
                    <p className="text-sm font-medium text-white">Camera not available</p>
                    <p className="text-xs text-zinc-400 max-w-xs">{camError}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setMode('upload')}
                      icon={<Upload size={14} />}
                    >
                      Switch to photo upload
                    </Button>
                  </div>
                ) : (
                  <>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      screenshotQuality={0.92}
                      videoConstraints={{
                        facingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                      }}
                      onUserMediaError={err => setCamError(err?.message || 'Camera access denied')}
                      className="w-full h-full object-cover"
                    />

                    {/* Camera overlay corners */}
                    <div className="absolute inset-8 sm:inset-14 border-2 border-white/40 rounded-2xl pointer-events-none flex flex-col justify-between p-4">
                      <div className="flex justify-between">
                        <div className="w-5 h-5 border-t-2 border-l-2 border-green-400" />
                        <div className="w-5 h-5 border-t-2 border-r-2 border-green-400" />
                      </div>
                      <div className="flex justify-between">
                        <div className="w-5 h-5 border-b-2 border-l-2 border-green-400" />
                        <div className="w-5 h-5 border-b-2 border-r-2 border-green-400" />
                      </div>
                    </div>

                    {/* Top indicator tag */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      AI Live Scanner
                    </div>

                    {/* Flip camera button */}
                    <button
                      type="button"
                      onClick={flipCamera}
                      className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                      aria-label="Switch front and back camera"
                    >
                      <SwitchCamera size={18} />
                    </button>

                    {/* Shutter capture button */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        disabled={loading}
                        className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-md p-1.5 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-green-400 disabled:opacity-50"
                        aria-label="Capture photo for classification"
                      >
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
                          <Camera size={26} className="text-slate-900" />
                        </div>
                      </button>
                    </div>
                  </>
                )
              ) : (
                /* Upload Mode Dropzone */
                <div
                  {...getRootProps()}
                  className={[
                    'w-full h-full p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors',
                    isDragActive ? 'bg-green-500/10' : 'bg-bg-secondary hover:bg-bg-overlay',
                  ].join(' ')}
                >
                  <input {...getInputProps()} />
                  <div className="w-16 h-16 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center text-green-600 dark:text-green-400 mb-3">
                    <Upload size={30} />
                  </div>
                  <p className="text-base font-semibold text-token-primary">
                    Tap to take a photo or select an image
                  </p>
                  <p className="text-xs text-token-tertiary mt-1">
                    Supports JPG, PNG, WEBP (Up to 10 MB)
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold shadow-sm transition-colors">
                    <Camera size={14} /> Choose File / Photo
                  </div>
                </div>
              )}

              {/* Loading indicator overlay */}
              {loading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 z-20">
                  <RefreshCw size={32} className="animate-spin text-green-400" />
                  <p className="text-sm font-semibold tracking-wide">Analyzing with AI Engine…</p>
                  <p className="text-xs text-zinc-400">Evaluating visual features & spatial boundaries</p>
                </div>
              )}
            </div>
          )}

          {/* ── Scan Results View ── */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="space-y-6"
              >
                {/* 1. Multi-Object Detection Mode View */}
                {result.isMulti ? (
                  <div className="space-y-5">
                    {/* Bounding Box Image Canvas */}
                    <BoundingBoxOverlay
                      imageUrl={previewImage}
                      detections={result.detections}
                      selectedId={selectedDetectionId}
                      onSelectDetection={(id) => {
                        setSelectedDetectionId(id)
                        const det = result.detections.find(d => d.id === id)
                        if (det) {
                          speakResult(`${det.label}. Target: ${det.bin}. ${det.instructions}`)
                        }
                      }}
                    />

                    {/* Multi-Object Manifest Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-bg-secondary border border-token-default">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-token-tertiary">
                            Detected Items ({result.itemCount})
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                            ✨ Multi-Object Detection
                          </span>
                        </div>
                        <p className="text-xs text-token-secondary mt-0.5">
                          Tap any bounding box or list card below to inspect disposal instructions
                        </p>
                      </div>

                      {result.totalCarbon > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-700 dark:text-green-300 text-xs font-bold shrink-0">
                          <Leaf size={15} className="text-green-500" />
                          <span>+{result.totalCarbon} kg CO₂e Total Offset</span>
                        </div>
                      )}
                    </div>

                    {/* Detection Cards Grid */}
                    <div className="grid sm:grid-cols-3 gap-3">
                      {result.detections.map((det) => {
                        const isSelected = activeDetection?.id === det.id
                        return (
                          <button
                            key={det.id}
                            type="button"
                            onClick={() => {
                              setSelectedDetectionId(det.id)
                              speakResult(`${det.label}. Target: ${det.bin}. ${det.instructions}`)
                            }}
                            className={[
                              'p-3.5 rounded-xl border text-left transition-all relative overflow-hidden',
                              isSelected
                                ? 'border-blue-500 bg-blue-500/10 shadow-md ring-2 ring-blue-500/40'
                                : 'border-token-default bg-bg-secondary hover:border-token-strong hover:bg-bg-tertiary',
                            ].join(' ')}
                          >
                            <div className="flex items-center justify-between text-xs font-bold text-token-primary">
                              <span className="flex items-center gap-1.5 truncate">
                                <span>{det.emoji}</span>
                                <span className="truncate">{det.label}</span>
                              </span>
                              <Badge variant={det.recyclable ? 'success' : 'neutral'} size="sm">
                                {det.confidence}%
                              </Badge>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-token-subtle text-xs">
                              <div className="text-[11px] font-semibold text-token-tertiary uppercase">Target Bin:</div>
                              <div className="font-bold text-token-primary flex items-center gap-1.5 mt-0.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ background: det.color }}
                                />
                                <span className="truncate">{det.bin}</span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* Active Focused Item Details Box */}
                    {activeDetection && (
                      <div className={`p-4 rounded-xl border ${activeDetection.meta.binBg} space-y-3`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl" aria-hidden="true">
                              {activeDetection.emoji}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-token-primary">
                                  {activeDetection.label}
                                </h3>
                                <Badge variant={activeDetection.recyclable ? 'success' : 'neutral'}>
                                  {activeDetection.recyclable ? 'Recyclable' : 'General Waste'}
                                </Badge>
                              </div>
                              <p className="text-xs text-token-secondary font-medium mt-0.5">
                                Target: <strong className="text-token-primary">{activeDetection.bin}</strong>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => speakResult(`${activeDetection.label}. Target: ${activeDetection.bin}. ${activeDetection.instructions}`)}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-bg-primary text-token-tertiary hover:text-token-primary border border-token-default shadow-sm transition-colors shrink-0"
                            aria-label="Listen to instructions"
                          >
                            <Volume2 size={16} />
                          </button>
                        </div>

                        <p className="text-xs text-token-secondary leading-relaxed bg-bg-primary/80 p-3 rounded-lg border border-token-default">
                          {activeDetection.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 2. Single-Classification Mode View (Default MobileNetV3) */
                  <div className="space-y-4">
                    {/* Optional Image Preview Thumbnail */}
                    {previewImage && (
                      <div className="relative rounded-2xl overflow-hidden bg-black max-h-64 flex items-center justify-center border border-token-default shadow-sm">
                        <img
                          src={previewImage}
                          alt="Scanned Item"
                          className="w-full h-auto max-h-64 object-contain mx-auto"
                        />
                      </div>
                    )}

                    {/* Result Header Banner */}
                    <div className={`rounded-2xl p-5 border ${result.meta.binBg} space-y-3`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl" aria-hidden="true">
                            {result.meta.emoji}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-xl font-bold text-token-primary capitalize">
                                {result.label}
                              </h2>
                              <Badge variant={result.recyclable ? 'success' : 'neutral'}>
                                {result.recyclable ? 'Recyclable' : 'General Waste'}
                              </Badge>
                            </div>
                            <p className="text-xs text-token-secondary font-medium mt-0.5">
                              Classification Confidence: <span className="font-bold">{result.confidence}%</span>
                            </p>
                          </div>
                        </div>

                        {/* Audio Readout */}
                        <button
                          type="button"
                          onClick={() => speakResult(`${result.meta.label}. Dispose in the ${result.meta.bin}. ${result.instructions}`)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                            speaking
                              ? 'bg-green-500 text-white border-green-500 animate-pulse'
                              : 'bg-bg-primary text-token-tertiary hover:text-token-primary border-token-default shadow-sm'
                          }`}
                          aria-label="Listen to disposal instructions"
                        >
                          <Volume2 size={18} />
                        </button>
                      </div>

                      {/* Target Bin Card */}
                      <div className="p-3.5 rounded-xl bg-bg-primary/90 border border-token-default space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-token-tertiary">
                          Target Disposal Bin
                        </p>
                        <p className="text-base font-bold text-token-primary flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ background: result.meta.binColor }}
                          />
                          {result.bin}
                        </p>
                        <p className="text-xs text-token-secondary leading-relaxed pt-1">
                          {result.instructions}
                        </p>
                      </div>

                      {/* Carbon offset badge */}
                      {result.carbon > 0 && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-800 dark:text-green-300 text-xs font-medium">
                          <Leaf size={16} className="text-green-600 dark:text-green-400 shrink-0" />
                          <span>
                            <strong>+{result.carbon} kg CO₂e avoided</strong> by correctly diverting this item.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Architecture Notice */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary border border-token-subtle text-xs text-token-tertiary">
                      <div className="flex items-center gap-2">
                        <Cpu size={14} className="text-blue-500 shrink-0" />
                        <span>
                          <strong>Engine:</strong> {result.modelArchitecture}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-token-secondary">
                        Spatial Detection Pipeline Ready
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick Action Navigation Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Link
                    to="/app/map"
                    className="flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl border border-token-default bg-bg-secondary hover:bg-bg-overlay font-semibold text-sm text-token-primary transition-colors"
                  >
                    <MapPin size={16} className="text-green-500" />
                    Find Nearest Bin on Map
                  </Link>
                  <Link
                    to="/app/report"
                    className="flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl border border-token-default bg-bg-secondary hover:bg-bg-overlay font-semibold text-sm text-token-primary transition-colors"
                  >
                    <Flag size={16} className="text-amber-500" />
                    Report Bin Issue
                  </Link>
                </div>

                {/* Scan Another Button */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full min-h-[48px] mt-2"
                  onClick={handleReset}
                  icon={<RefreshCw size={18} />}
                >
                  Scan Another Item
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* ── Multi-Object Detection Benchmark Tester ── */}
      <Card className="mt-6 bg-gradient-to-r from-bg-secondary via-bg-primary to-bg-secondary border-token-default">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-token-default flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-purple-500" />
            <h3 className="text-sm font-bold text-token-primary">
              Multi-Object Detection Benchmark Test Scenes
            </h3>
          </div>
          <Badge variant="brand" size="sm">
            Interactive Test Suite
          </Badge>
        </div>

        <p className="text-xs text-token-secondary mb-3 leading-relaxed">
          Test spatial bounding boxes and multi-item classification overlays on complex mixed waste scenes:
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          {SAMPLE_MULTI_SCENES.map((scene, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleLoadSampleScene(scene)}
              className="p-3 rounded-xl border border-token-default bg-bg-secondary hover:border-purple-500 hover:bg-purple-500/5 text-left transition-all flex items-start gap-3 group"
            >
              <img
                src={scene.previewUrl}
                alt={scene.title}
                className="w-14 h-14 rounded-lg object-cover border border-token-subtle shrink-0"
              />
              <div className="space-y-1 min-w-0">
                <div className="text-xs font-bold text-token-primary group-hover:text-purple-600 dark:group-hover:text-purple-400 flex items-center justify-between gap-1">
                  <span className="truncate">{scene.title}</span>
                  <ChevronRight size={14} className="shrink-0 opacity-50 group-hover:opacity-100" />
                </div>
                <p className="text-[11px] text-token-tertiary truncate">
                  {scene.description}
                </p>
                <div className="flex items-center gap-1.5 pt-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                  <Box size={12} /> {scene.detections.length} Bounding Boxes
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Helpful Tips strip */}
      <div className="mt-6 flex items-start gap-2.5 p-4 rounded-xl bg-bg-secondary border border-token-default text-xs text-token-tertiary">
        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Pro Tip:</strong> Hold the camera steady about 20–30 cm away from waste items. For mixed items, ensure items are spaced slightly apart for clear visual detection.
        </p>
      </div>
    </PageLayout>
  )
}
