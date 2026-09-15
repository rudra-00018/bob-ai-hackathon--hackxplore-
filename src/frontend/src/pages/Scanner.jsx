import { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, RefreshCw, Volume2, ArrowLeftRight } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import ResultCard from '../components/ResultCard'
import CompareView from '../components/CompareView'
import GamificationPopup from '../components/GamificationPopup'
import RecyclingMap from '../components/RecyclingMap'

import BinGame from '../components/BinGame'
import WasteCatcher from '../components/WasteCatcher'

export default function Scanner() {
  const [mode,    setMode]    = useState('upload')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [liveOn,  setLiveOn]  = useState(false)
  const [gamePop, setGamePop] = useState(null)
  const [showMap, setShowMap] = useState(false)
  const webcamRef = useRef(null)
  const liveTimer = useRef(null)
  const { theme } = useTheme()
  const { refreshUser } = useAuth()

  const handleResult = useCallback(async (data) => {
    setResult(data)
    if (data.gamification) {
      setGamePop(data.gamification)
      await refreshUser()
    }
    speak(data)
  }, [refreshUser])

  const onDrop = useCallback(async (files) => {
    const file = files[0]; if (!file) return
    setPreview(URL.createObjectURL(file))
    setResult(null); setLoading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { data } = await axios.post('/api/predict', fd)
      handleResult(data)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Prediction failed')
    } finally { setLoading(false) }
  }, [handleResult])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept:{'image/*':[]}, multiple:false })

  const captureOnce = useCallback(async () => {
    const img = webcamRef.current?.getScreenshot(); if (!img) return
    setPreview(img); setLoading(true)
    try {
      const { data } = await axios.post('/api/predict/base64', { image: img })
      handleResult(data)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Prediction failed')
    } finally { setLoading(false) }
  }, [handleResult])

  const toggleLive = () => {
    if (liveOn) { clearInterval(liveTimer.current); setLiveOn(false) }
    else { setLiveOn(true); liveTimer.current = setInterval(captureOnce, 3000) }
  }
  useEffect(() => () => clearInterval(liveTimer.current), [])

  const speak = (data) => {
    if (!window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(
      `This item is ${data.recyclable ? 'recyclable' : 'non-recyclable'} ${data.prediction}. ${data.overlay}`
    )
    window.speechSynthesis.speak(u)
  }

  const reset = () => { setResult(null); setPreview(null) }

  return (
    <div className="relative min-h-screen">
      {/* Background image — place bg-scanner.jpg in frontend/public/images/ */}
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-5 pointer-events-none"
        style={{ backgroundImage:"url('/images/bg-scanner.jpg')" }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-black mb-2 gradient-text">
            Smart Waste Scanner
          </h1>
          <p className="text-base" style={{ color: theme.muted }}>
            Upload or scan an item for instant AI classification & disposal instructions
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 justify-center flex-wrap">
          {[
            { key:'upload',  label:'Upload',    icon:'📤' },
            { key:'webcam',  label:'Webcam',    icon:'📷' },
            { key:'game',    label:'Bin Game',  icon:'🎮' },
            { key:'catcher', label:'Catcher',   icon:'🥛' },
            { key:'compare', label:'Compare',   icon:'⚖️' },
            { key:'map',     label:'Find Bins', icon:'🗺️' },
          ].map(m => (
            <button key={m.key} onClick={() => { setMode(m.key); reset() }}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-1.5"
              style={mode === m.key
                ? { background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`, color: '#fff', boxShadow: `0 2px 14px ${theme.accent}40` }
                : { background: theme.card, color: theme.muted, border: `1px solid ${theme.border}` }
              }
            >{m.icon} {m.label}</button>
          ))}
        </div>

        {mode === 'map' ? (
          <div className="rounded-2xl p-6 border" style={{ background: theme.card, borderColor: theme.border }}>
            <RecyclingMap />
          </div>
        ) : mode === 'compare' ? (
          <CompareView />
        ) : mode === 'game' ? (
          <div className="rounded-2xl p-6 border" style={{ background: theme.card, borderColor: theme.border }}>
            <BinGame />
          </div>
        ) : mode === 'catcher' ? (
          <div className="rounded-2xl p-6 border" style={{ background: theme.card, borderColor: theme.border }}>
            <WasteCatcher />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Input panel */}
            <div className="rounded-2xl p-6 border space-y-4" style={{ background: theme.card, borderColor: theme.border }}>
              {mode === 'upload' ? (
                <div {...getRootProps()}
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
                  style={isDragActive
                    ? { borderColor: theme.accent, background: theme.accent+'15' }
                    : { borderColor: theme.border }
                  }
                >
                  <input {...getInputProps()} />
                  <div className="text-5xl mb-3">📤</div>
                  <p className="font-medium" style={{ color: theme.text }}>Drop image here or click to upload</p>
                  <p className="text-sm mt-1" style={{ color: theme.muted }}>JPG, PNG, WEBP</p>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full"
                    videoConstraints={{ facingMode:'environment' }} />
                  {liveOn && (
                    <div className="absolute top-0 left-0 w-full h-1 scan-line" style={{ background: theme.accent }} />
                  )}
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">
                    {liveOn ? '🔴 LIVE' : '⏸ PAUSED'}
                  </div>
                </div>
              )}

              {preview && mode === 'upload' && (
                <img src={preview} alt="preview" className="w-full rounded-xl object-cover max-h-48" />
              )}

              <div className="flex gap-2 flex-wrap">
                {mode === 'webcam' && (
                  <>
                    <button onClick={captureOnce} disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
                      style={{ background: theme.accent }}
                    ><Camera size={18}/> Capture</button>
                    <button onClick={toggleLive}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all"
                      style={{ background: liveOn ? '#EF4444' : theme.card, color: liveOn ? '#fff' : theme.text, border:`1px solid ${theme.border}` }}
                    >
                      <RefreshCw size={18} className={liveOn ? 'animate-spin' : ''} />
                      {liveOn ? 'Stop' : 'Live'}
                    </button>
                  </>
                )}
                {result && (
                  <>
                    <button onClick={reset} className="flex items-center gap-1 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                      style={{ background: theme.card, color: theme.muted, border:`1px solid ${theme.border}` }}>
                      <RefreshCw size={15}/> Reset
                    </button>
                    <button onClick={() => speak(result)} className="flex items-center gap-1 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                      style={{ background: theme.card, color: theme.muted, border:`1px solid ${theme.border}` }}>
                      <Volume2 size={15}/>
                    </button>
                  </>
                )}
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-3 py-4" style={{ color: theme.accent }}>
                  <RefreshCw size={20} className="animate-spin" />
                  <span className="font-medium">Analyzing with AI...</span>
                </div>
              )}
            </div>

            {/* Result panel */}
            <AnimatePresence mode="wait">
              {result ? (
                <ResultCard key="result" result={result} />
              ) : (
                <motion.div key="empty"
                  initial={{ opacity:0 }} animate={{ opacity:1 }}
                  className="rounded-2xl p-6 border flex items-center justify-center"
                  style={{ background: theme.card, borderColor: theme.border }}
                >
                  <div className="text-center" style={{ color: theme.muted }}>
                    <div className="text-7xl mb-4">♻️</div>
                    <p className="font-medium">Scan or upload an item</p>
                    <p className="text-sm mt-1">Get instant disposal instructions</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Gamification popup */}
      <GamificationPopup data={gamePop} onClose={() => setGamePop(null)} />
    </div>
  )
}
