import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { Upload, ArrowLeftRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function DropZone({ label, onResult, theme }) {
  const [preview, setPreview] = useState(null)
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)

  const onDrop = async (files) => {
    const file = files[0]; if (!file) return
    setPreview(URL.createObjectURL(file)); setLoading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { data } = await axios.post('/api/predict', fd)
      setResult(data); onResult(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept:{'image/*':[]}, multiple:false })

  return (
    <div className="rounded-2xl p-5 border space-y-3" style={{ background: theme.card, borderColor: theme.border }}>
      <p className="font-semibold text-sm" style={{ color: theme.muted }}>{label}</p>
      <div {...getRootProps()}
        className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:opacity-80"
        style={{ borderColor: theme.border }}
      >
        <input {...getInputProps()} />
        {preview ? (
          <img src={preview} alt="preview" className="w-full rounded-lg max-h-40 object-cover" />
        ) : (
          <>
            <Upload size={32} className="mx-auto mb-2" style={{ color: theme.muted }} />
            <p className="text-sm" style={{ color: theme.muted }}>Drop image</p>
          </>
        )}
      </div>
      {loading && <p className="text-sm text-center" style={{ color: theme.accent }}>Analyzing...</p>}
      {result && (
        <div className="space-y-1 text-sm">
          <p className="font-bold capitalize" style={{ color: theme.text }}>{result.prediction}</p>
          <p style={{ color: theme.muted }}>Confidence: {(result.confidence*100).toFixed(1)}%</p>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={result.recyclable ? { background:'#10B98120', color:'#10B981' } : { background:'#EF444420', color:'#EF4444' }}>
            {result.recyclable ? '✓ Recyclable' : '✗ Non-Recyclable'}
          </span>
        </div>
      )}
    </div>
  )
}

export default function CompareView() {
  const [resultA, setResultA] = useState(null)
  const [resultB, setResultB] = useState(null)
  const { theme } = useTheme()

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}>
        <ArrowLeftRight size={20} style={{ color: theme.accent }} /> Compare Two Items
      </h2>
      <div className="grid md:grid-cols-2 gap-5">
        <DropZone label="Image A" onResult={setResultA} theme={theme} />
        <DropZone label="Image B" onResult={setResultB} theme={theme} />
      </div>
      {resultA && resultB && (
        <div className="rounded-2xl p-6 border" style={{ background: theme.card, borderColor: theme.border }}>
          <h3 className="font-bold mb-4" style={{ color: theme.text }}>Comparison</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="font-medium" style={{ color: theme.muted }}>Metric</div>
            <div className="font-medium" style={{ color: theme.text }}>Image A</div>
            <div className="font-medium" style={{ color: theme.text }}>Image B</div>
            {['prediction','confidence','recyclable','bin'].map(key => (
              <>
                <div key={key+'k'} className="capitalize" style={{ color: theme.muted }}>{key}</div>
                <div key={key+'a'} className="capitalize" style={{ color: theme.text }}>
                  {key==='confidence' ? `${(resultA[key]*100).toFixed(1)}%` : String(resultA[key])}
                </div>
                <div key={key+'b'} className="capitalize" style={{ color: theme.text }}>
                  {key==='confidence' ? `${(resultB[key]*100).toFixed(1)}%` : String(resultB[key])}
                </div>
              </>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
