import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Leaf, Info } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const EMOJI = { plastic:'🧴', paper:'📄', cardboard:'📦', metal:'🥫', glass:'🍶', trash:'🗑️' }

export default function ResultCard({ result }) {
  const { prediction, confidence, top3, recyclable, bin, instructions, carbon_saved, color, overlay, resin } = result
  const { theme } = useTheme()

  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
      className="rounded-2xl border overflow-hidden"
      style={{ background: theme.card, borderColor: theme.border, boxShadow: `0 4px 24px ${color}15` }}
    >
      {/* Gradient header strip */}
      <div className="px-6 py-5 flex items-center gap-4"
        style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)`, borderBottom: `1px solid ${color}20` }}>
        <div className="text-5xl">{EMOJI[prediction] || '♻️'}</div>
        <div>
          <h2 className="text-2xl font-black capitalize" style={{ color: theme.text }}>{prediction}</h2>
          <div className="mt-1">
            {recyclable ? (
              <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full font-semibold"
                style={{ background: '#10B98125', color: '#10B981', border: '1px solid #10B98140' }}>
                <CheckCircle size={13}/> Recyclable
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full font-semibold"
                style={{ background: '#EF444425', color: '#EF4444', border: '1px solid #EF444440' }}>
                <XCircle size={13}/> Non-Recyclable
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">

      {/* Instructional overlay banner */}
      {overlay && (
        <motion.div initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.2 }}
          className="rounded-xl border-l-4 overflow-hidden"
          style={{ borderLeftColor: color }}
        >
          <div className="px-4 py-3 text-sm font-semibold flex items-start gap-2"
            style={{ background: color+'18', color: theme.text }}>
            <Info size={18} style={{ color, flexShrink:0, marginTop:1 }} />
            <span>{overlay}</span>
          </div>
          {/* Step-by-step prep guide */}
          <div className="px-4 py-2 text-xs space-y-1" style={{ background: color+'08', color: theme.muted }}>
            <p className="font-semibold" style={{ color: theme.text }}>How to prepare:</p>
            {instructions.slice(0,3).map((inst, i) => (
              <p key={i} className="flex items-start gap-1.5">
                <span className="font-bold" style={{ color }}>{i+1}.</span> {inst}
              </p>
            ))}
          </div>
        </motion.div>
      )}

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span style={{ color: theme.muted }}>Confidence</span>
          <span className="font-bold" style={{ color: theme.text }}>{(confidence*100).toFixed(1)}%</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: theme.bg }}>
          <motion.div initial={{ width:0 }} animate={{ width:`${confidence*100}%` }}
            transition={{ duration:0.8, ease:'easeOut' }}
            className="h-full rounded-full" style={{ background: color }}
          />
        </div>
      </div>

      {/* Top 3 */}
      <div>
        <p className="text-sm mb-2 font-medium" style={{ color: theme.muted }}>Top Predictions</p>
        <div className="space-y-2">
          {top3.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs w-16 capitalize" style={{ color: theme.muted }}>{item.label}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: theme.bg }}>
                <div className="h-full rounded-full" style={{ width:`${item.confidence*100}%`, background: theme.accent, opacity: 1-i*0.3 }} />
              </div>
              <span className="text-xs w-12 text-right" style={{ color: theme.text }}>{(item.confidence*100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bin */}
      <div className="rounded-xl p-4" style={{ background: theme.bg }}>
        <p className="text-xs mb-1" style={{ color: theme.muted }}>Disposal Bin</p>
        <p className="font-bold text-lg" style={{ color: theme.text }}>🗑️ {bin}</p>
      </div>

      {/* Resin code — plastic only */}
      {resin && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-xl p-4 border"
          style={{ background: '#3B82F610', borderColor: '#3B82F640' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shrink-0"
              style={{ background: '#3B82F6', color: '#fff' }}>
              {resin.code}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#3B82F6' }}>
                Resin Code {resin.code}
              </p>
              <p className="font-bold text-sm" style={{ color: theme.text }}>{resin.info}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Instructions */}
      <div>
        <p className="text-sm mb-2 font-medium" style={{ color: theme.muted }}>Instructions</p>
        <ul className="space-y-1.5">
          {instructions.map((inst, i) => (
            <motion.li key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.08 }}
              className="flex items-start gap-2 text-sm" style={{ color: theme.text }}
            >
              <span style={{ color: theme.accent, marginTop:2 }}>•</span>{inst}
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Carbon saved */}
      {carbon_saved > 0 && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background:'#10B98110', borderColor:'#10B98130' }}
        >
          <Leaf size={20} style={{ color:'#10B981' }} />
          <div>
            <p className="font-semibold text-sm" style={{ color:'#10B981' }}>+{carbon_saved} kg CO₂ saved</p>
            <p className="text-xs" style={{ color: theme.muted }}>by recycling this item correctly</p>
          </div>
        </motion.div>
      )}
      </div>
    </motion.div>
  )
}
