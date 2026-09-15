import TopNav from '../navigation/TopNav'
import BottomNav from '../navigation/BottomNav'

/**
 * AppLayout — wraps all authenticated pages
 * Renders TopNav + main content area + BottomNav (mobile)
 */
export function AppLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <TopNav />
      <main
        className="flex-1 has-bottom-nav"
        id="main-content"
        tabIndex={-1}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

/**
 * PageLayout — content container with consistent max-width and padding
 * Use inside AppLayout for standard pages
 */
export function PageLayout({ children, className = '' }) {
  return (
    <div className={`page-container py-10 ${className}`}>
      {children}
    </div>
  )
}

/**
 * PageHeader — consistent page title + optional subtitle + action
 */
export function PageHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-10 ${className}`}>
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold text-token-primary tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-base text-token-tertiary leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/**
 * AuthLayout — full-page wrapper for login/signup
 * Two-column on desktop: brand panel left, form right
 */
export function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex bg-bg-primary">
      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-bg-secondary p-12 border-r border-token-default">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4l.5 9a1 1 0 001 .9h5a1 1 0 001-.9L12 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-xl text-token-primary">BinIQ</span>
        </div>

        {/* Hero text */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-token-primary leading-tight">
              Scan. Sort.<br />
              <span className="text-green-500">Save the Planet.</span>
            </h1>
            <p className="text-base text-token-tertiary mt-4 leading-relaxed">
              AI-powered waste intelligence that turns every scan into environmental impact.
            </p>
          </div>

          {/* Feature bullets */}
          <ul className="space-y-3">
            {[
              'AI classifies 30+ waste categories instantly',
              'Track your personal CO₂ impact',
              'Find nearby bins and recycling centers',
              'Report waste issues in your community',
            ].map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-token-secondary">
                <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Stats */}
        <div className="flex gap-8">
          {[
            ['30+', 'Waste categories'],
            ['89%', 'Model accuracy'],
            ['Free', 'Always'],
          ].map(([val, label]) => (
            <div key={label}>
              <div className="text-xl font-bold text-token-primary tabular-nums">{val}</div>
              <div className="text-xs text-token-tertiary mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form area */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  )
}

export default AppLayout
