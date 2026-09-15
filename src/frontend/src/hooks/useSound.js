/**
 * useSound — Web Audio API synthesized sound effects.
 * No external files needed. All sounds generated programmatically.
 */

let ctx = null

function getCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)() } catch { return null }
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// ── Low-level helpers ─────────────────────────────────────────────────────────

function playTone({ freq = 440, type = 'sine', gain = 0.3, duration = 0.15, start = 0, ramp = null }) {
  const c = getCtx(); if (!c) return
  const osc = c.createOscillator()
  const g   = c.createGain()
  osc.connect(g); g.connect(c.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime + start)
  if (ramp) osc.frequency.linearRampToValueAtTime(ramp, c.currentTime + start + duration)
  g.gain.setValueAtTime(gain, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + duration)
  osc.start(c.currentTime + start)
  osc.stop(c.currentTime + start + duration + 0.01)
}

function playNoise({ gain = 0.15, duration = 0.1, start = 0, freq = 800, q = 1 }) {
  const c = getCtx(); if (!c) return
  const bufSize = c.sampleRate * duration
  const buf = c.createBuffer(1, bufSize, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = q
  const g = c.createGain()
  src.connect(filter); filter.connect(g); g.connect(c.destination)
  g.gain.setValueAtTime(gain, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + duration)
  src.start(c.currentTime + start)
  src.stop(c.currentTime + start + duration + 0.01)
}

// ── Sound library ─────────────────────────────────────────────────────────────

export const sounds = {

  // ✅ Correct answer — bright ascending chime
  correct() {
    playTone({ freq: 523, type: 'triangle', gain: 0.35, duration: 0.12 })
    playTone({ freq: 659, type: 'triangle', gain: 0.35, duration: 0.12, start: 0.1 })
    playTone({ freq: 784, type: 'triangle', gain: 0.4,  duration: 0.2,  start: 0.2 })
    playTone({ freq: 1047,type: 'sine',     gain: 0.3,  duration: 0.3,  start: 0.32 })
  },

  // ❌ Wrong answer — low thud + descending
  wrong() {
    playTone({ freq: 220, type: 'sawtooth', gain: 0.25, duration: 0.08 })
    playTone({ freq: 180, type: 'sawtooth', gain: 0.2,  duration: 0.12, start: 0.07 })
    playNoise({ gain: 0.12, duration: 0.1, freq: 200, q: 0.5 })
  },

  // 🪙 Coin collect — classic coin sound
  coin() {
    playTone({ freq: 988,  type: 'square', gain: 0.2, duration: 0.06 })
    playTone({ freq: 1319, type: 'square', gain: 0.2, duration: 0.1, start: 0.05 })
  },

  // 🔥 Combo — energetic rising sweep
  combo() {
    playTone({ freq: 400, type: 'sawtooth', gain: 0.2, duration: 0.08 })
    playTone({ freq: 600, type: 'sawtooth', gain: 0.25, duration: 0.08, start: 0.07 })
    playTone({ freq: 900, type: 'sawtooth', gain: 0.3,  duration: 0.1,  start: 0.14 })
    playTone({ freq: 1200,type: 'triangle', gain: 0.3,  duration: 0.15, start: 0.22 })
  },

  // 💔 Miss / lose life — sad descending
  miss() {
    playTone({ freq: 330, type: 'triangle', gain: 0.3, duration: 0.15 })
    playTone({ freq: 247, type: 'triangle', gain: 0.25, duration: 0.2, start: 0.12 })
    playTone({ freq: 196, type: 'sine',     gain: 0.2,  duration: 0.25, start: 0.28 })
  },

  // 🎮 Game start — upbeat fanfare
  start() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) => playTone({ freq: f, type: 'triangle', gain: 0.3, duration: 0.12, start: i * 0.1 }))
  },

  // 💀 Game over — dramatic descending
  gameOver() {
    playTone({ freq: 494, type: 'sawtooth', gain: 0.3, duration: 0.2 })
    playTone({ freq: 392, type: 'sawtooth', gain: 0.3, duration: 0.2, start: 0.18 })
    playTone({ freq: 294, type: 'sawtooth', gain: 0.3, duration: 0.2, start: 0.36 })
    playTone({ freq: 196, type: 'sawtooth', gain: 0.35, duration: 0.4, start: 0.54 })
    playNoise({ gain: 0.1, duration: 0.3, freq: 150, q: 0.5, start: 0.54 })
  },

  // 🏆 High score — triumphant
  highScore() {
    const melody = [523, 659, 784, 659, 784, 1047]
    melody.forEach((f, i) => playTone({ freq: f, type: 'triangle', gain: 0.35, duration: 0.15, start: i * 0.12 }))
  },

  // ⚡ Level up — power-up sweep
  levelUp() {
    playTone({ freq: 300, type: 'square', gain: 0.2, duration: 0.3, ramp: 900 })
    playTone({ freq: 900, type: 'triangle', gain: 0.3, duration: 0.2, start: 0.28 })
    playTone({ freq: 1200,type: 'triangle', gain: 0.25, duration: 0.2, start: 0.44 })
  },

  // 🗑️ Catch (neutral) — soft pop
  catch() {
    playNoise({ gain: 0.18, duration: 0.06, freq: 1200, q: 3 })
    playTone({ freq: 600, type: 'sine', gain: 0.15, duration: 0.08, start: 0.02 })
  },

  // 🏅 Badge unlock — sparkle
  badge() {
    [1047, 1319, 1568, 2093].forEach((f, i) =>
      playTone({ freq: f, type: 'sine', gain: 0.25, duration: 0.1, start: i * 0.08 })
    )
  },

  // 🖱️ Button click — subtle tick
  click() {
    playNoise({ gain: 0.08, duration: 0.04, freq: 2000, q: 5 })
  },
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export default function useSound() {
  return sounds
}
