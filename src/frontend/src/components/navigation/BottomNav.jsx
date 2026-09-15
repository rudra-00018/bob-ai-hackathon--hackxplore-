import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ScanLine, Flag, BarChart2, User, MapPin } from 'lucide-react'

const tabs = [
  { to: '/app',          label: 'Home',     Icon: LayoutDashboard, end: true },
  { to: '/app/scanner',  label: 'Scanner',  Icon: ScanLine, end: false },
  { to: '/app/map',      label: 'Map',      Icon: MapPin, end: false },
  { to: '/app/report',   label: 'Report',   Icon: Flag, end: false },
  { to: '/app/insights', label: 'Impact',   Icon: BarChart2, end: false },
]

export default function BottomNav() {
  return (
    <nav
      className="bottom-nav md:hidden touch-manipulation select-none"
      aria-label="Mobile bottom navigation"
    >
      <div className="grid grid-cols-5 h-full max-w-lg mx-auto">
        {tabs.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => [
              'flex flex-col items-center justify-center min-h-[48px] h-full transition-all duration-150 relative py-1',
              isActive
                ? 'text-green-600 dark:text-green-400 font-semibold'
                : 'text-token-tertiary hover:text-token-primary',
            ].join(' ')}
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                <div
                  className={[
                    'w-10 h-7 rounded-full flex items-center justify-center transition-colors',
                    isActive ? 'bg-green-500/15' : 'bg-transparent',
                  ].join(' ')}
                >
                  <Icon
                    size={20}
                    className={isActive ? 'text-green-600 dark:text-green-400 stroke-[2.2]' : 'stroke-[1.8]'}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-[11px] leading-none mt-0.5 tracking-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
