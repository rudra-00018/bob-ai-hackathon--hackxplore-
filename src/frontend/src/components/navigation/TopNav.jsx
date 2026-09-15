import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Sun, Moon, Bell, LogOut, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { getUnreadCount } from '../../services/notificationService'

// BinIQ wordmark + icon
function Logo() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate('/app')}
      className="flex items-center gap-2 font-bold text-lg text-token-primary hover:opacity-80 transition-opacity"
      aria-label="BinIQ home"
    >
      <div className="w-7 h-7 rounded-md bg-green-500 flex items-center justify-center shrink-0" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4l.5 9a1 1 0 001 .9h5a1 1 0 001-.9L12 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span>BinIQ</span>
    </button>
  )
}

// Theme toggle button
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 flex items-center justify-center rounded-md text-token-tertiary hover:text-token-primary hover:bg-bg-overlay transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

// Desktop nav link
function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) => [
        'flex items-center h-14 px-3 text-sm font-medium border-b-2 transition-colors',
        isActive
          ? 'border-green-500 text-token-primary'
          : 'border-transparent text-token-tertiary hover:text-token-primary',
      ].join(' ')}
    >
      {children}
    </NavLink>
  )
}

export default function TopNav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)

  // Poll unread count every 15 s when tab is active, pausing in background
  useEffect(() => {
    if (!user) return
    const tick = () => {
      if (document.visibilityState === 'visible') {
        setUnread(getUnreadCount())
      }
    }
    tick()
    const id = setInterval(tick, 15_000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="nav-bar" aria-label="Main navigation">
      <div className="page-container h-full flex items-center gap-4">
        {/* Logo */}
        <Logo />

        {/* Desktop nav links — hidden on mobile */}
        {user && (
          <div className="hidden md:flex items-center gap-0 h-full ml-4">
            {user.role !== 'municipality' && (
              <>
                <NavItem to="/app">Dashboard</NavItem>
                <NavItem to="/app/scanner">AI Scanner</NavItem>
                <NavItem to="/app/map">Smart Bins</NavItem>
                <NavItem to="/app/report">Citizen Report</NavItem>
                <NavItem to="/app/insights">Sustainability</NavItem>
                <NavItem to="/app/assistant">AI Assistant</NavItem>
              </>
            )}
            {user.role === 'municipality' && (
              <NavItem to="/municipality">Municipal Operations</NavItem>
            )}
          </div>
        )}

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {user && (
            <>
              {/* Notifications */}
              <NavLink
                to="/app/notifications"
                className={({ isActive }) => [
                  'relative w-9 h-9 flex items-center justify-center rounded-md transition-colors',
                  isActive
                    ? 'text-token-primary bg-bg-overlay'
                    : 'text-token-tertiary hover:text-token-primary hover:bg-bg-overlay',
                ].join(' ')}
                aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
                onClick={() => setUnread(0)}
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span
                    className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none"
                    aria-hidden="true"
                  >
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </NavLink>

              {/* User menu (simple: username + logout) */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-token-default ml-1">
                <NavLink
                  to="/app/profile"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-bg-overlay transition-colors"
                  aria-label="Profile"
                >
                  <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user.username?.charAt(0).toUpperCase() || <User size={14} />}
                  </div>
                  <span className="text-sm font-medium text-token-secondary max-w-[96px] truncate">
                    {user.username}
                  </span>
                </NavLink>

                <button
                  onClick={handleLogout}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-token-tertiary hover:text-red-500 hover:bg-[var(--danger-subtle)] transition-colors"
                  aria-label="Log out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          )}

          {!user && (
            <NavLink
              to="/login"
              className="h-9 px-4 rounded-md bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors flex items-center"
            >
              Sign In
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  )
}
