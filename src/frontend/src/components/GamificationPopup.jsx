import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sounds } from '../hooks/useSound'

/* ── Confetti particle for recyclable ── */
const CONFETTI_COLORS = ['#10B981','#34D399','#FCD34D','#60A5FA','#A78BFA','#F472B6']
function ConfettiPiece({ i }) {
  const x  = (Math.random() - 0.5) * 300
  const rot = Math.random() * 720 - 360
  const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
  const size  = 6 + Math.random() * 8
  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
      animate={{ x, y: -(120 + Math.random()*120), opacity: 0, rotate: rot, scale: 0.3 }}
      transition={{ duration: 1.4 + Math.random()*0.6, delay: i * 0.04, ease: 'easeOut' }}
      className="absolute pointer-events-none"
      style={{ width: size, height: size, borderRadius: Math.random()>0.5 ? '50%' : '2px', background: color, left:'50%', top:'50%' }}
    />
  )
}

/* ── Coin flying up for recyclable ── */
function Coin({ i }) {
  const x = (Math.random() - 0.5) * 160
  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x, y: -(100 + Math.random()*80), opacity: 0, scale: 0.4 }}
      transition={{ duration: 1.1, delay: i * 0.07, ease: 'easeOut' }}
      className="absolute text-2xl pointer-events-none select-none"
      style={{ left: '50%', top: '50%' }}
    >🪙</motion.div>
  )
}

/* ── Smoke/warning particle for non-recyclable ── */
function WarnParticle({ i }) {
  const x = (Math.random() - 0.5) * 120
  const emojis = ['💨','⚠️','😬','🚫','💔']
  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x, y: 60 + Math.random()*40, opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.9, delay: i * 0.1, ease: 'easeIn' }}
      className="absolute text-xl pointer-events-none select-none"
      style={{ left: '50%', top: '30%' }}
    >{emojis[i % emojis.length]}</motion.div>
  )
}

/* ── Badge unlock overlay ── */
function BadgeUnlock({ badges }) {
  if (!badges?.length) return null
  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
      className="mt-3 rounded-xl px-4 py-2 border"
      style={{ background: 'rgba(252,211,77,0.15)', borderColor: '#FCD34D' }}
    >
      <p className="text-yellow-300 font-bold text-xs mb-1">🏅 BADGE UNLOCKED!</p>
      {badges.map(b => (
        <p key={b.id} className="text-yellow-200 text-sm font-semibold">{b.icon} {b.name}</p>
      ))}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════
   POSITIVE popup — recyclable item
══════════════════════════════════════════════════════════ */
function PositivePopup({ data, onClose }) {
  const coins    = Array.from({ length: Math.min(data.coins_gained || 5, 10) }, (_, i) => i)
  const confetti = Array.from({ length: 20 }, (_, i) => i)

  useEffect(() => {
    sounds.correct()
    if (data.coins_gained > 0) setTimeout(() => sounds.coin(), 300)
    if (data.new_badges?.length) setTimeout(() => sounds.badge(), 600)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 60 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 30 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="relative"
    >
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {confetti.map(i => <ConfettiPiece key={i} i={i} />)}
        {coins.map(i => <Coin key={i} i={i} />)}
      </div>

      {/* Card */}
      <div className="relative rounded-3xl px-8 py-6 shadow-2xl text-center min-w-[280px]"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
          border: '2px solid #34D399',
          boxShadow: '0 0 40px rgba(16,185,129,0.4), 0 20px 60px rgba(0,0,0,0.5)'
        }}
      >
        {/* Glow ring */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ border: '2px solid #10B981', boxShadow: '0 0 30px #10B981' }}
        />

        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl mb-2"
        >🎉</motion.div>

        <h2 className="text-xl font-black text-white mb-1">Excellent Recycling!</h2>
        <p className="text-emerald-300 text-sm mb-3">You're helping the planet 🌍</p>

        {/* Rewards row */}
        <div className="flex items-center justify-center gap-4 mb-2">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="flex flex-col items-center gap-1 bg-white/10 rounded-2xl px-4 py-2"
          >
            <span className="text-2xl">🪙</span>
            <span className="text-yellow-300 font-black text-lg">+{data.coins_gained}</span>
            <span className="text-white/60 text-xs">coins</span>
          </motion.div>
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="flex flex-col items-center gap-1 bg-white/10 rounded-2xl px-4 py-2"
          >
            <span className="text-2xl">⚡</span>
            <span className="text-blue-300 font-black text-lg">+{data.xp_gained}</span>
            <span className="text-white/60 text-xs">XP</span>
          </motion.div>
          {data.streak > 1 && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="flex flex-col items-center gap-1 bg-white/10 rounded-2xl px-4 py-2"
            >
              <span className="text-2xl">🔥</span>
              <span className="text-orange-300 font-black text-lg">{data.streak}</span>
              <span className="text-white/60 text-xs">streak</span>
            </motion.div>
          )}
        </div>

        <BadgeUnlock badges={data.new_badges} />

        <button onClick={onClose}
          className="mt-3 text-emerald-300/60 text-xs hover:text-emerald-300 transition-colors"
        >tap to dismiss</button>
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════
   NEGATIVE popup — non-recyclable item
══════════════════════════════════════════════════════════ */
const NEGATIVE_MESSAGES = [
  { title: "Oops! Wrong Bin!", sub: "This one goes in the black bin 🗑️", tip: "Not everything can be recycled — that's okay!" },
  { title: "Non-Recyclable!", sub: "Reduce & reuse before you refuse ♻️", tip: "Try to buy less single-use items next time." },
  { title: "General Waste!", sub: "This belongs in the black bin 🗑️", tip: "Check if it can be repaired or donated first." },
  { title: "Can't Recycle This!", sub: "But you're learning — keep going! 💪", tip: "Every scan makes you a smarter recycler." },
]

function NegativePopup({ data, onClose }) {
  const msg = NEGATIVE_MESSAGES[Math.floor(Math.random() * NEGATIVE_MESSAGES.length)]
  const particles = Array.from({ length: 6 }, (_, i) => i)

  useEffect(() => { sounds.miss() }, [])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 60, rotate: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 30 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      className="relative"
    >
      {/* Warning particles */}
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {particles.map(i => <WarnParticle key={i} i={i} />)}
      </div>

      {/* Card */}
      <div className="relative rounded-3xl px-8 py-6 shadow-2xl text-center min-w-[280px]"
        style={{
          background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)',
          border: '2px solid #F87171',
          boxShadow: '0 0 40px rgba(239,68,68,0.35), 0 20px 60px rgba(0,0,0,0.5)'
        }}
      >
        {/* Pulse ring */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ border: '2px solid #EF4444' }}
        />

        {/* Shake icon */}
        <motion.div
          animate={{ x: [0, -6, 6, -4, 4, 0] }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-5xl mb-2"
        >🚫</motion.div>

        <h2 className="text-xl font-black text-white mb-1">{msg.title}</h2>
        <p className="text-red-300 text-sm mb-3">{msg.sub}</p>

        {/* XP consolation */}
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="inline-flex items-center gap-2 bg-white/10 rounded-2xl px-4 py-2 mb-3"
        >
          <span className="text-xl">⚡</span>
          <span className="text-blue-300 font-bold">+{data.xp_gained} XP</span>
          <span className="text-white/50 text-xs">for trying!</span>
        </motion.div>

        {/* Tip box */}
        <div className="bg-white/10 rounded-xl px-4 py-2 mb-2">
          <p className="text-yellow-200 text-xs">💡 {msg.tip}</p>
        </div>

        <button onClick={onClose}
          className="mt-1 text-red-300/60 text-xs hover:text-red-300 transition-colors"
        >tap to dismiss</button>
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════
   Main export — decides which popup to show
══════════════════════════════════════════════════════════ */
export default function GamificationPopup({ data, onClose }) {
  useEffect(() => {
    if (!data) return
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [data, onClose])

  return (
    <AnimatePresence>
      {data && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ paddingBottom: '80px' }}
        >
          <div className="pointer-events-auto" onClick={onClose}>
            {data.recyclable
              ? <PositivePopup data={data} onClose={onClose} />
              : <NegativePopup data={data} onClose={onClose} />
            }
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
