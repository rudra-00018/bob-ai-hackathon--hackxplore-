import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import { sounds } from '../hooks/useSound'

const GAME_W    = 600
const GAME_H    = 500
const BIN_W     = 90
const BIN_H     = 72
const ITEM_SIZE = 46
const LIVES     = 3
const BASE_SPEED = 2.0
const SPEED_INC  = 0.2

const WASTE = [
  { emoji: '🧴', label: 'Plastic',   bin: 'blue',  color: '#3B82F6' },
  { emoji: '📄', label: 'Paper',     bin: 'blue',  color: '#3B82F6' },
  { emoji: '📦', label: 'Cardboard', bin: 'blue',  color: '#3B82F6' },
  { emoji: '🥫', label: 'Metal Can', bin: 'blue',  color: '#3B82F6' },
  { emoji: '🍶', label: 'Glass',     bin: 'green', color: '#10B981' },
  { emoji: '🍾', label: 'Bottle',    bin: 'green', color: '#10B981' },
  { emoji: '🗑️', label: 'Trash',     bin: 'black', color: '#9CA3AF' },
  { emoji: '🛍️', label: 'Bag',       bin: 'black', color: '#9CA3AF' },
]

const BINS = [
  { id: 'blue',  emoji: '🔵', label: 'Blue',  color: '#3B82F6', bg: 'rgba(59,130,246,0.18)',  key: '1' },
  { id: 'green', emoji: '🟢', label: 'Green', color: '#10B981', bg: 'rgba(16,185,129,0.18)',  key: '2' },
  { id: 'black', emoji: '⚫', label: 'Black', color: '#9CA3AF', bg: 'rgba(156,163,175,0.18)', key: '3' },
]

// ── Floating item label ───────────────────────────────────────────────────────
function ItemLabel({ item }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${(item.x / GAME_W) * 100}%`,
      top:  `${(item.y / GAME_H) * 100}%`,
      transform: 'translateX(-25%)',
      pointerEvents: 'none',
      zIndex: 15,
    }}>
      <div style={{ fontSize: ITEM_SIZE * 0.78, lineHeight: 1, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))' }}>
        {item.emoji}
      </div>
      <div style={{
        fontSize: 9, fontWeight: 700, color: item.color,
        textAlign: 'center', marginTop: 1,
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        letterSpacing: '0.03em',
      }}>
        {item.label}
      </div>
    </div>
  )
}

// ── Score flash ───────────────────────────────────────────────────────────────
function ScoreFlash({ x, y, text, color }) {
  return (
    <motion.div
      initial={{ x, y, opacity: 1, scale: 0.7 }}
      animate={{ y: y - 70, opacity: 0, scale: 1.3 }}
      transition={{ duration: 0.85, ease: 'easeOut' }}
      style={{
        position: 'absolute', left: 0, top: 0,
        fontWeight: 900, fontSize: 20, color,
        pointerEvents: 'none', zIndex: 30,
        textShadow: `0 0 12px ${color}, 0 2px 8px rgba(0,0,0,0.6)`,
        whiteSpace: 'nowrap',
      }}
    >{text}</motion.div>
  )
}

// ── Catch burst ───────────────────────────────────────────────────────────────
function CatchBurst({ x, y, emoji, correct }) {
  const pieces = Array.from({ length: correct ? 8 : 4 }, (_, i) => i)
  return (
    <>
      {pieces.map(i => {
        const angle = (i / pieces.length) * Math.PI * 2
        const dist  = 30 + Math.random() * 40
        return (
          <motion.div key={i}
            initial={{ x, y, opacity: 1, scale: 1 }}
            animate={{ x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist - 30, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ position: 'absolute', left: 0, top: 0, fontSize: correct ? 20 : 14, pointerEvents: 'none', zIndex: 20 }}
          >
            {correct ? emoji : '💨'}
          </motion.div>
        )
      })}
    </>
  )
}

// ── Stars background ──────────────────────────────────────────────────────────
const STARS = Array.from({ length: 18 }, (_, i) => ({
  x: Math.random() * 100, y: Math.random() * 80,
  size: 1 + Math.random() * 2, opacity: 0.15 + Math.random() * 0.25,
}))

export default function WasteCatcher() {
  const { theme } = useTheme()
  const [phase,     setPhase]     = useState('idle')
  const [score,     setScore]     = useState(0)
  const [lives,     setLives]     = useState(LIVES)
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('wc_hi') || '0'))
  const [binX,      setBinX]      = useState(GAME_W / 2 - BIN_W / 2)
  const [activeBin, setActiveBin] = useState('blue')
  const [items,     setItems]     = useState([])
  const [bursts,    setBursts]    = useState([])
  const [flashes,   setFlashes]   = useState([])
  const [combo,     setCombo]     = useState(0)
  const [speedWarn, setSpeedWarn] = useState(false)

  const gameRef    = useRef(null)
  const rafRef     = useRef(null)
  const stateRef   = useRef({ score: 0, lives: LIVES, combo: 0, phase: 'idle' })
  const nextId     = useRef(0)
  const spawnTimer = useRef(0)
  const lastTime   = useRef(0)
  const prevLevel  = useRef(1)

  useEffect(() => { stateRef.current.score  = score  }, [score])
  useEffect(() => { stateRef.current.lives  = lives  }, [lives])
  useEffect(() => { stateRef.current.combo  = combo  }, [combo])
  useEffect(() => { stateRef.current.phase  = phase  }, [phase])

  const spawnItem = useCallback(() => {
    const w = WASTE[Math.floor(Math.random() * WASTE.length)]
    const x = ITEM_SIZE + Math.random() * (GAME_W - ITEM_SIZE * 3)
    setItems(prev => [...prev, { id: nextId.current++, x, y: -ITEM_SIZE - 10, ...w }])
  }, [])

  const endGame = useCallback(() => {
    setPhase('over')
    stateRef.current.phase = 'over'
    cancelAnimationFrame(rafRef.current)
    setHighScore(prev => {
      const hi = Math.max(prev, stateRef.current.score)
      if (stateRef.current.score >= prev && stateRef.current.score > 0) sounds.highScore()
      else sounds.gameOver()
      localStorage.setItem('wc_hi', hi)
      return hi
    })
  }, [])

  const gameLoop = useCallback((ts) => {
    if (stateRef.current.phase !== 'playing') return
    const dt = Math.min(ts - lastTime.current, 50)
    lastTime.current = ts
    spawnTimer.current += dt

    const spawnInterval = Math.max(950 - stateRef.current.score * 9, 360)
    if (spawnTimer.current >= spawnInterval) {
      spawnTimer.current = 0
      spawnItem()
    }

    const level = Math.floor(stateRef.current.score / 5) + 1
    if (level > prevLevel.current) {
      prevLevel.current = level
      sounds.levelUp()
      setSpeedWarn(true)
      setTimeout(() => setSpeedWarn(false), 1200)
    }

    const speed = BASE_SPEED + (level - 1) * SPEED_INC

    setItems(prev => {
      const next = []
      for (const item of prev) {
        const ny = item.y + speed
        if (ny > GAME_H) {
          setLives(l => { const nl = l - 1; if (nl <= 0) endGame(); return nl })
          stateRef.current.combo = 0
          setCombo(0)
          sounds.miss()
          setFlashes(f => [...f, { id: Date.now() + Math.random(), x: item.x, y: GAME_H - 50, text: '💔 Miss!', color: '#EF4444' }])
        } else {
          next.push({ ...item, y: ny })
        }
      }
      return next
    })

    rafRef.current = requestAnimationFrame(gameLoop)
  }, [spawnItem, endGame])

  const startGame = () => {
    prevLevel.current = 1
    sounds.start()
    setPhase('playing')
    setScore(0); setLives(LIVES); setItems([]); setBursts([]); setFlashes([]); setCombo(0); setSpeedWarn(false)
    stateRef.current = { score: 0, lives: LIVES, combo: 0, phase: 'playing' }
    spawnTimer.current = 0
    lastTime.current = performance.now()
    rafRef.current = requestAnimationFrame(gameLoop)
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const handleMouseMove = useCallback((e) => {
    if (stateRef.current.phase !== 'playing') return
    const rect = gameRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = (e.clientX - rect.left) * (GAME_W / rect.width)
    setBinX(Math.max(0, Math.min(GAME_W - BIN_W, mx - BIN_W / 2)))
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (stateRef.current.phase !== 'playing') return
    e.preventDefault()
    const rect = gameRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = (e.touches[0].clientX - rect.left) * (GAME_W / rect.width)
    setBinX(Math.max(0, Math.min(GAME_W - BIN_W, mx - BIN_W / 2)))
  }, [])

  useEffect(() => {
    const h = (e) => {
      if (e.key === '1') setActiveBin('blue')
      if (e.key === '2') setActiveBin('green')
      if (e.key === '3') setActiveBin('black')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // Collision
  useEffect(() => {
    if (phase !== 'playing') return
    const binTop   = GAME_H - BIN_H - 8
    const binLeft  = binX
    const binRight = binX + BIN_W

    setItems(prev => {
      const keep = []
      for (const item of prev) {
        const cx = item.x + ITEM_SIZE / 2
        const cy = item.y + ITEM_SIZE
        if (cy >= binTop && cy <= binTop + BIN_H && cx >= binLeft && cx <= binRight) {
          const correct  = item.bin === activeBin
          const newCombo = correct ? stateRef.current.combo + 1 : 0
          stateRef.current.combo = newCombo
          setCombo(newCombo)
          if (correct) {
            const pts  = newCombo >= 5 ? 5 : newCombo >= 3 ? 3 : 1
            const text = newCombo >= 5 ? `🔥 x${newCombo}!! +${pts}` : newCombo >= 3 ? `🔥 COMBO x${newCombo} +${pts}` : `+${pts}`
            setScore(s => s + pts)
            if (newCombo >= 3) sounds.combo(); else sounds.catch()
            setFlashes(f => [...f, { id: Date.now() + Math.random(), x: item.x, y: binTop - 24, text, color: newCombo >= 3 ? '#F97316' : '#10B981' }])
            setBursts(b => [...b, { id: Date.now() + Math.random(), x: item.x + ITEM_SIZE / 2, y: binTop, emoji: item.emoji, correct: true }])
          } else {
            setLives(l => { const nl = l - 1; if (nl <= 0) endGame(); return nl })
            sounds.wrong()
            setFlashes(f => [...f, { id: Date.now() + Math.random(), x: item.x, y: binTop - 24, text: '❌ Wrong!', color: '#EF4444' }])
            setBursts(b => [...b, { id: Date.now() + Math.random(), x: item.x + ITEM_SIZE / 2, y: binTop, emoji: item.emoji, correct: false }])
          }
        } else {
          keep.push(item)
        }
      }
      return keep
    })
  }, [items, binX, activeBin, endGame, phase])

  const currentBin = BINS.find(b => b.id === activeBin)
  const level = Math.floor(score / 5) + 1

  return (
    <div className="space-y-3">
      {/* HUD outside game — only when not playing */}
      {phase !== 'playing' && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold" style={{ color: theme.text }}>Waste Catcher</h2>
            <p className="text-sm" style={{ color: theme.muted }}>Move mouse · Switch bins with 1 2 3 keys</p>
          </div>
          <span className="text-sm font-bold px-3 py-1.5 rounded-xl" style={{ background: theme.card, color: '#FCD34D', border: `1px solid ${theme.border}` }}>
            🏆 Best: {highScore}
          </span>
        </div>
      )}

      {/* Bin switcher — only while playing, above game */}
      {phase === 'playing' && (
        <div className="flex items-center gap-2 flex-wrap">
          {BINS.map(b => (
            <button key={b.id} onClick={() => setActiveBin(b.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all"
              style={activeBin === b.id
                ? { background: b.color, color: '#fff', boxShadow: `0 0 14px ${b.color}70` }
                : { background: theme.card, color: theme.muted, border: `1px solid ${theme.border}` }
              }
            >
              {b.emoji} {b.label} <span style={{ opacity: 0.5, fontSize: 10 }}>[{b.key}]</span>
            </button>
          ))}
        </div>
      )}

      {/* Game area */}
      <div
        ref={gameRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        style={{
          position: 'relative',
          width: '100%',
          paddingBottom: `${(GAME_H / GAME_W) * 100}%`,
          borderRadius: 20,
          overflow: 'hidden',
          cursor: phase === 'playing' ? 'none' : 'default',
          userSelect: 'none',
          touchAction: 'none',
          border: `2px solid ${phase === 'playing' ? currentBin.color + '80' : theme.border}`,
          boxShadow: phase === 'playing' ? `0 0 40px ${currentBin.color}20, inset 0 0 60px rgba(0,0,0,0.3)` : 'none',
          background: 'linear-gradient(180deg, #0a0f1e 0%, #0d1a2e 40%, #0f2010 100%)',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>

          {/* Stars */}
          {STARS.map((s, i) => (
            <div key={i} style={{
              position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
              width: s.size, height: s.size, borderRadius: '50%',
              background: '#fff', opacity: s.opacity,
            }} />
          ))}

          {/* Ground line */}
          <div style={{
            position: 'absolute', bottom: '14%', left: 0, right: 0,
            height: 1, background: 'rgba(255,255,255,0.06)',
          }} />

          {/* In-game HUD bar */}
          {phase === 'playing' && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 14px',
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(4px)',
              zIndex: 25,
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {Array.from({ length: LIVES }, (_, i) => (
                  <span key={i} style={{ fontSize: 16, opacity: i < lives ? 1 : 0.2 }}>❤️</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <span style={{ color: '#FCD34D', fontWeight: 900, fontSize: 18 }}>{score}</span>
                <span style={{ color: currentBin.color, fontWeight: 700, fontSize: 12,
                  background: currentBin.bg, padding: '2px 8px', borderRadius: 8,
                  border: `1px solid ${currentBin.color}50` }}>
                  Lv.{level}
                </span>
                <span style={{ color: '#FCD34D', fontWeight: 700, fontSize: 11 }}>🏆 {highScore}</span>
              </div>
            </div>
          )}

          {/* Speed warning */}
          <AnimatePresence>
            {speedWarn && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.3 }}
                style={{
                  position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg,#f97316,#ef4444)',
                  color: '#fff', fontWeight: 900, fontSize: 15,
                  padding: '6px 18px', borderRadius: 20, zIndex: 28,
                  boxShadow: '0 0 24px rgba(249,115,22,0.7)',
                  whiteSpace: 'nowrap',
                }}
              >
                ⚡ SPEED UP! Level {level}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Idle / Game Over overlay */}
          {phase !== 'playing' && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            }}>
              {phase === 'over' ? (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                    style={{ fontSize: 56 }}>😢</motion.div>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: 30 }}>Game Over!</div>
                  <div style={{ color: '#FCD34D', fontWeight: 800, fontSize: 22 }}>Score: {score}</div>
                  {score > 0 && score >= highScore && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
                      style={{ color: '#FCD34D', fontWeight: 700, fontSize: 15, background: 'rgba(252,211,77,0.15)', padding: '6px 16px', borderRadius: 12 }}>
                      🏆 New High Score!
                    </motion.div>
                  )}
                </>
              ) : (
                <>
                  <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }}
                    style={{ fontSize: 60 }}>♻️</motion.div>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: 26 }}>Waste Catcher</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
                    Move your mouse to catch falling waste<br />
                    Switch bins with <b style={{ color: '#FCD34D' }}>1 2 3</b> keys or buttons above<br />
                    Wrong bin or miss = lose a life ❤️
                  </div>
                </>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                onClick={startGame}
                style={{
                  background: 'linear-gradient(135deg,#10B981,#34D399)',
                  color: '#fff', fontWeight: 800, fontSize: 17,
                  padding: '13px 40px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 24px rgba(16,185,129,0.5)',
                  marginTop: 4,
                }}
              >
                {phase === 'over' ? '▶ Play Again' : '▶ Start Game'}
              </motion.button>
            </div>
          )}

          {/* Falling items */}
          {items.map(item => <ItemLabel key={item.id} item={item} />)}

          {/* Bin */}
          {phase === 'playing' && (
            <motion.div
              animate={{ boxShadow: [`0 0 16px ${currentBin.color}40`, `0 0 32px ${currentBin.color}80`, `0 0 16px ${currentBin.color}40`] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{
                position: 'absolute',
                left:   `${(binX / GAME_W) * 100}%`,
                bottom: '2%',
                width:  `${(BIN_W / GAME_W) * 100}%`,
                height: `${(BIN_H / GAME_H) * 100}%`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: currentBin.bg,
                border: `3px solid ${currentBin.color}`,
                borderRadius: 14,
                transition: 'border-color 0.15s',
              }}
            >
              <span style={{ fontSize: 28 }}>{currentBin.emoji}</span>
              <span style={{ fontSize: 9, color: currentBin.color, fontWeight: 800, letterSpacing: '0.05em' }}>
                {currentBin.label.toUpperCase()}
              </span>
            </motion.div>
          )}

          {/* Combo badge */}
          <AnimatePresence>
            {phase === 'playing' && combo >= 3 && (
              <motion.div key={combo}
                initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400 }}
                style={{
                  position: 'absolute', top: '14%', right: '3%',
                  background: 'linear-gradient(135deg,#f97316,#ef4444)',
                  color: '#fff', fontWeight: 900, fontSize: 13,
                  padding: '5px 12px', borderRadius: 20, zIndex: 26,
                  boxShadow: '0 0 20px rgba(249,115,22,0.7)',
                }}
              >
                🔥 {combo}x COMBO
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bursts */}
          <AnimatePresence>
            {bursts.map(b => <CatchBurst key={b.id} x={`${(b.x / GAME_W) * 100}%`} y={`${(b.y / GAME_H) * 100}%`} emoji={b.emoji} correct={b.correct} />)}
          </AnimatePresence>

          {/* Score flashes */}
          <AnimatePresence>
            {flashes.map(f => <ScoreFlash key={f.id} x={`${(f.x / GAME_W) * 100}%`} y={`${(f.y / GAME_H) * 100}%`} text={f.text} color={f.color} />)}
          </AnimatePresence>
        </div>
      </div>

      {/* Bin reference — only when not playing */}
      {phase !== 'playing' && (
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          {BINS.map(b => (
            <div key={b.id} className="rounded-xl p-3" style={{ background: theme.card, border: `1px solid ${b.color}30` }}>
              <div className="text-2xl mb-1">{b.emoji}</div>
              <div className="font-bold mb-1" style={{ color: b.color }}>{b.label} Bin</div>
              <div style={{ color: theme.muted, lineHeight: 1.4 }}>
                {b.id === 'blue'  && 'Plastic · Paper · Metal · Cardboard'}
                {b.id === 'green' && 'Glass bottles & jars'}
                {b.id === 'black' && 'General waste & trash'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
