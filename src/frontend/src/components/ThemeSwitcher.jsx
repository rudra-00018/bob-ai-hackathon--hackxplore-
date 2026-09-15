import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette } from 'lucide-react'
import { useTheme, THEMES } from '../context/ThemeContext'

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const { themeKey, setThemeKey, theme } = useTheme()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border"
        style={{ background: theme.card, borderColor: theme.border, color: theme.text }}
        title="Change theme"
      >
        <Palette size={15} />
        <span className="hidden sm:inline">{THEMES[themeKey].icon}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity:0, y:-8, scale:0.95 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-8, scale:0.95 }}
              className="absolute right-0 top-12 z-50 rounded-2xl shadow-2xl border p-2 min-w-[160px]"
              style={{ background: theme.card, borderColor: theme.border }}
            >
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => { setThemeKey(key); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all"
                  style={themeKey===key
                    ? { background: theme.accent+'22', color: theme.accent }
                    : { color: theme.text }
                  }
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="font-medium">{t.name}</span>
                  {themeKey===key && <span className="ml-auto text-xs">✓</span>}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
