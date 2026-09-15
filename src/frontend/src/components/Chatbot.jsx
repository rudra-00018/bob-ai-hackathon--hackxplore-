import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Bot, Minimize2 } from 'lucide-react'
import axios from 'axios'
import { useTheme } from '../context/ThemeContext'

const SUGGESTIONS = [
  'Can I recycle a pizza box?',
  'How to dispose batteries?',
  'What is resin code 1 (PET)?',
  'Is aluminium foil recyclable?',
  'How to recycle glass bottles?',
  'What goes in the blue bin?',
]

export default function Chatbot() {
  const [open,    setOpen]    = useState(false)
  const [msgs,    setMsgs]    = useState([
    { role: 'bot', text: "Hi! I'm EcoBot 🌱 Ask me anything about recycling, waste disposal, or circular economy!" }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const { theme } = useTheme()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setMsgs(m => [...m, { role: 'user', text: msg }])
    setLoading(true)
    try {
      // axios already has the auth token set globally from AuthContext
      const { data } = await axios.post('/api/chat', { message: msg })
      setMsgs(m => [...m, { role: 'bot', text: data.reply }])
    } catch (err) {
      const errMsg = err.response?.status === 401
        ? "Please log in to use EcoBot. 🔐"
        : "Sorry, I'm having trouble right now. Try again! ♻️"
      setMsgs(m => [...m, { role: 'bot', text: errMsg }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center border-2 overflow-hidden"
        style={{ background: theme.accent, borderColor: theme.accentHover }}
        aria-label="Open EcoBot"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={24} className="text-white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              {/* Try custom avatar, fallback to Bot icon */}
              <img src="/images/chatbot-avatar.png" alt="EcoBot"
                className="w-14 h-14 object-cover"
                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }}
              />
              <Bot size={26} className="text-white" style={{ display: 'none' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl shadow-2xl border overflow-hidden"
            style={{
              width: 360,
              maxHeight: '72vh',
              background: theme.card,
              borderColor: theme.border,
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{ background: theme.accent }}>
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                <img src="/images/chatbot-avatar.png" alt=""
                  className="w-full h-full object-cover"
                  onError={e => { e.target.style.display = 'none' }}
                />
                <Bot size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-white text-sm">EcoBot</div>
                <div className="text-white/70 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block"></span>
                  {loading ? 'Thinking...' : 'Online · Powered by Groq AI'}
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'bot' && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2 shrink-0 mt-1"
                      style={{ background: theme.accent + '30' }}>
                      🌱
                    </div>
                  )}
                  <div
                    className="max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                    style={m.role === 'user'
                      ? { background: theme.accent, color: '#fff', borderRadius: '18px 18px 4px 18px' }
                      : { background: theme.bg, color: theme.text, borderRadius: '18px 18px 18px 4px', border: `1px solid ${theme.border}` }
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2 shrink-0"
                    style={{ background: theme.accent + '30' }}>🌱</div>
                  <div className="px-4 py-3 rounded-2xl text-sm"
                    style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.muted }}>
                    <span className="flex gap-1">
                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick suggestions — show only at start */}
            {msgs.length <= 1 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-full border transition-all hover:opacity-80 active:scale-95"
                    style={{ borderColor: theme.accent + '60', color: theme.accent, background: theme.accent + '12' }}
                  >{s}</button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2 p-3 border-t shrink-0" style={{ borderColor: theme.border }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about recycling..."
                className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none border transition-all"
                style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 active:scale-95"
                style={{ background: theme.accent }}
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
