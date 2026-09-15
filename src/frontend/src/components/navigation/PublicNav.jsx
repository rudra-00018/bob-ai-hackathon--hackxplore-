import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Moon, Menu, X } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

function BinIQLogo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold text-lg text-token-primary hover:opacity-80 transition-opacity" aria-label="BinIQ home">
      <div className="w-7 h-7 rounded-md bg-green-500 flex items-center justify-center shrink-0" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4l.5 9a1 1 0 001 .9h5a1 1 0 001-.9L12 4"
            stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span>BinIQ</span>
    </Link>
  )
}

export default function PublicNav() {
  const { isDark, toggleTheme } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const navLinks = [
    { label: 'Features',     href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'AI',           href: '#ai' },
    { label: 'Impact',       href: '#impact' },
  ]

  const scrollTo = (e, href) => {
    e.preventDefault()
    setMenuOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-200',
        scrolled
          ? 'bg-bg-primary border-b border-token-default shadow-sm'
          : 'bg-transparent',
      ].join(' ')}
    >
      <div className="page-container h-14 flex items-center gap-6">
        <BinIQLogo />

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Landing navigation">
          {navLinks.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={(e) => scrollTo(e, href)}
              className="px-3 py-1.5 text-sm font-medium text-token-tertiary hover:text-token-primary transition-colors rounded-md hover:bg-bg-overlay"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-md text-token-tertiary hover:text-token-primary hover:bg-bg-overlay transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Auth links — desktop */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/login"
              className="px-3 py-1.5 text-sm font-medium text-token-secondary hover:text-token-primary transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-4 py-1.5 rounded-md bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-md text-token-tertiary hover:text-token-primary hover:bg-bg-overlay transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-bg-primary border-b border-token-default px-6 pb-4 pt-2 space-y-1">
          {navLinks.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={(e) => scrollTo(e, href)}
              className="block px-3 py-2.5 text-sm font-medium text-token-secondary hover:text-token-primary rounded-md hover:bg-bg-overlay transition-colors"
            >
              {label}
            </a>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="block text-center px-4 py-2.5 rounded-md border border-token-default text-sm font-semibold text-token-primary hover:bg-bg-overlay transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              onClick={() => setMenuOpen(false)}
              className="block text-center px-4 py-2.5 rounded-md bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
