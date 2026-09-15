import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { User, Building2, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AuthLayout } from '../components/layout/AppLayout'
import { useTheme } from '../context/ThemeContext'
import { Sun, Moon } from 'lucide-react'
import Input, { InputGroup, PasswordInput } from '../components/ui/Input'
import Button from '../components/ui/Button'
import { FormError } from '../components/ui/Alert'
import toast from '../components/ui/Toast'

export default function Login() {
  const location   = useLocation()
  // If arriving at /signup, start in signup mode
  const [mode,    setMode]    = useState(location.pathname === '/signup' ? 'signup' : 'login')
  const [role,    setRole]    = useState('user')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [form,    setForm]    = useState({ username: '', email: '', password: '' })

  const { login, signup }     = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate              = useNavigate()

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const user = await login(form.email, form.password)
        toast.success(`Welcome back, ${user.username}!`)
        navigate(user.role === 'municipality' ? '/municipality' : '/app', { replace: true })
      } else {
        if (!form.username.trim()) {
          setError('Username is required')
          setLoading(false)
          return
        }
        const user = await signup(form.username, form.email, form.password, role)
        toast.success(`Account created! Welcome, ${user.username} 🌱`)
        navigate(user.role === 'municipality' ? '/municipality' : '/app', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setForm({ username: '', email: '', password: '' })
  }

  return (
    <AuthLayout>
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-token-subtle">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-7 h-7 rounded-md bg-green-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4l.5 9a1 1 0 001 .9h5a1 1 0 001-.9L12 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-token-primary">BinIQ</span>
        </div>
        <div className="lg:ml-auto">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-md text-token-tertiary hover:text-token-primary hover:bg-bg-overlay transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Form area */}
      <div className="flex-1 flex items-center justify-center px-8 py-10">
        <div className="w-full max-w-md">

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-token-primary">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-token-tertiary mt-1">
              {mode === 'login'
                ? 'Sign in to continue your eco journey'
                : 'Join and start making a difference today'}
            </p>
          </div>

          {/* Mode toggle */}
          <div
            className="flex rounded-lg p-1 mb-6 bg-bg-secondary border border-token-default"
            role="tablist"
            aria-label="Authentication mode"
          >
            {['login', 'signup'].map(m => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={[
                  'flex-1 py-2 rounded-md text-sm font-semibold capitalize transition-all',
                  mode === m
                    ? 'bg-bg-primary text-token-primary shadow-sm'
                    : 'text-token-tertiary hover:text-token-secondary',
                ].join(' ')}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Role selector — signup only */}
          {mode === 'signup' && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-token-tertiary mb-3">
                I'm joining as
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'user',         label: 'Citizen',      Icon: User,       desc: 'Scan items & earn rewards' },
                  { key: 'municipality', label: 'Municipality',  Icon: Building2,  desc: 'City-wide analytics' },
                ].map(({ key, label, Icon, desc }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRole(key)}
                    className={[
                      'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center',
                      role === key
                        ? 'border-green-500 bg-[var(--brand-subtle)]'
                        : 'border-token-default bg-bg-primary hover:border-token-strong',
                    ].join(' ')}
                  >
                    <Icon
                      size={22}
                      className={role === key ? 'text-green-500' : 'text-token-tertiary'}
                    />
                    <div>
                      <p className={`text-sm font-semibold ${role === key ? 'text-green-600 dark:text-green-400' : 'text-token-primary'}`}>
                        {label}
                      </p>
                      <p className="text-xs text-token-tertiary mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error alert */}
          {error && <FormError error={error} className="mb-4" />}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'signup' && (
              <InputGroup label="Username" required>
                <Input
                  value={form.username}
                  onChange={set('username')}
                  placeholder="eco_hero_42"
                  autoComplete="username"
                  required
                />
              </InputGroup>
            )}

            <InputGroup label="Email address" required>
              <Input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </InputGroup>

            <InputGroup label="Password" required>
              <PasswordInput
                value={form.password}
                onChange={set('password')}
                placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Your password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
            </InputGroup>

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-token-link hover:underline"
                  onClick={() => toast.info('Password reset coming soon')}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
              icon={!loading ? <ArrowRight size={18} /> : undefined}
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Switch mode link */}
          <p className="text-center text-sm text-token-tertiary mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              className="font-semibold text-token-link hover:underline"
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>

          <p className="text-center text-xs text-token-disabled mt-4">
            By continuing you agree to our Terms of Service & Privacy Policy
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
