import { useState, useEffect } from 'react'
import axios from 'axios'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

const COLORS = ['#10B981','#3B82F6','#F59E0B','#6B7280','#D97706','#EF4444']

export default function Dashboard() {
  const [stats,   setStats]   = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()
  const { user }  = useAuth()

  useEffect(() => {
    Promise.all([axios.get('/api/stats'), axios.get('/api/history?limit=100')])
      .then(([s, h]) => { setStats(s.data); setHistory(h.data.history || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-4xl animate-pulse">♻️</div>
  )

  const catCount = {}
  history.forEach(h => { catCount[h.prediction] = (catCount[h.prediction]||0)+1 })
  const pieData = Object.entries(catCount).map(([name,value]) => ({ name, value }))
  const barData = [
    { name:'Recyclable',     value: stats?.recyclable_count||0 },
    { name:'Non-Recyclable', value: (stats?.total||0)-(stats?.recyclable_count||0) },
  ]
  const carbonLine = history.slice(0,15).reverse().map((h,i) => ({ day:`#${i+1}`, carbon: h.carbon_saved }))

  const nextBadge = stats?.next_badge
  const progress  = nextBadge ? Math.min(100, ((stats?.total||0)/nextBadge.threshold)*100) : 100

  // XP level
  const xp = stats?.xp || 0
  const level = Math.floor(xp / 100) + 1
  const xpInLevel = xp % 100

  return (
    <div className="relative min-h-screen">
      {/* Background image — place bg-dashboard.jpg in frontend/public/images/ */}
      <div className="fixed inset-0 bg-cover bg-center opacity-5 pointer-events-none"
        style={{ backgroundImage:"url('/images/bg-dashboard.jpg')" }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: theme.text }}>My Dashboard</h1>
            <p style={{ color: theme.muted }}>Welcome back, {user?.username} 👋</p>
          </div>
          {/* Level badge */}
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border"
            style={{ background: theme.card, borderColor: theme.border }}>
            <div className="text-3xl">⭐</div>
            <div>
              <div className="font-bold text-sm" style={{ color: theme.text }}>Level {level}</div>
              <div className="text-xs" style={{ color: theme.muted }}>{xpInLevel}/100 XP</div>
              <div className="w-24 h-1.5 rounded-full mt-1" style={{ background: theme.bg }}>
                <div className="h-full rounded-full" style={{ width:`${xpInLevel}%`, background: theme.accent }} />
              </div>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Scans',    value: stats?.total||0,                     icon: '🔍', color: '#10B981', grad: 'linear-gradient(135deg,#064e3b,#065f46)' },
            { label: 'Recycled',       value: stats?.recyclable_count||0,           icon: '♻️', color: '#3B82F6', grad: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' },
            { label: 'CO₂ Saved (kg)', value: (stats?.carbon_saved||0).toFixed(2), icon: '🌿', color: '#22C55E', grad: 'linear-gradient(135deg,#14532d,#15803d)' },
            { label: 'Coins',          value: stats?.coins||0,                      icon: '🪙', color: '#FCD34D', grad: 'linear-gradient(135deg,#451a03,#92400e)' },
          ].map(s => (
            <motion.div key={s.label} whileHover={{ scale: 1.04, y: -2 }}
              className="rounded-2xl p-5 text-center relative overflow-hidden"
              style={{ background: s.grad, border: `1px solid ${s.color}30`, boxShadow: `0 4px 20px ${s.color}20` }}
            >
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-1 font-medium text-white/60">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Streak */}
        {(stats?.streak||0) > 0 && (
          <div className="flex items-center gap-4 px-6 py-4 rounded-2xl border"
            style={{ background: theme.card, borderColor: theme.border }}>
            <div className="text-4xl">🔥</div>
            <div>
              <div className="font-bold" style={{ color: theme.text }}>{stats.streak} Day Streak!</div>
              <div className="text-sm" style={{ color: theme.muted }}>Keep scanning daily to maintain your streak</div>
            </div>
          </div>
        )}

        {/* Badges */}
        {stats?.badges?.length > 0 && (
          <div className="rounded-2xl p-6 border" style={{ background: theme.card, borderColor: theme.border }}>
            <h2 className="font-bold mb-4" style={{ color: theme.text }}>🏅 Earned Badges</h2>
            <div className="flex flex-wrap gap-3">
              {stats.badges.map(b => (
                <motion.div key={b.id} whileHover={{ scale:1.05 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border"
                  style={{ background:'#FCD34D15', borderColor:'#FCD34D40' }}
                >
                  <span className="text-2xl">{b.icon}</span>
                  <span className="font-medium text-sm" style={{ color:'#FCD34D' }}>{b.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Next badge progress */}
        {nextBadge && (
          <div className="rounded-2xl p-6 border" style={{ background: theme.card, borderColor: theme.border }}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold" style={{ color: theme.text }}>Next Badge: {nextBadge.icon} {nextBadge.name}</h2>
              <span className="text-sm" style={{ color: theme.muted }}>{stats?.total||0}/{nextBadge.threshold}</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: theme.bg }}>
              <motion.div initial={{ width:0 }} animate={{ width:`${progress}%` }} transition={{ duration:1 }}
                className="h-full rounded-full" style={{ background: theme.accent }} />
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl p-6 border" style={{ background: theme.card, borderColor: theme.border }}>
            <h2 className="font-bold mb-4" style={{ color: theme.text }}>Waste by Category</h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                    labelLine={{ stroke: theme.muted }}
                  >
                    {pieData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: theme.card, border:`1px solid ${theme.border}`, color: theme.text }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center py-8" style={{ color: theme.muted }}>No data yet</p>}
          </div>

          <div className="rounded-2xl p-6 border" style={{ background: theme.card, borderColor: theme.border }}>
            <h2 className="font-bold mb-4" style={{ color: theme.text }}>Recyclable vs Non-Recyclable</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fill: theme.muted, fontSize:12 }} />
                <YAxis tick={{ fill: theme.muted, fontSize:12 }} />
                <Tooltip contentStyle={{ background: theme.card, border:`1px solid ${theme.border}`, color: theme.text }} />
                <Bar dataKey="value" radius={[8,8,0,0]}>
                  {barData.map((_,i) => <Cell key={i} fill={i===0?'#10B981':'#EF4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl p-6 border md:col-span-2" style={{ background: theme.card, borderColor: theme.border }}>
            <h2 className="font-bold mb-4" style={{ color: theme.text }}>Carbon Saved Over Time</h2>
            {carbonLine.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={carbonLine}>
                  <XAxis dataKey="day" tick={{ fill: theme.muted, fontSize:12 }} />
                  <YAxis tick={{ fill: theme.muted, fontSize:12 }} />
                  <Tooltip contentStyle={{ background: theme.card, border:`1px solid ${theme.border}`, color: theme.text }} />
                  <Line type="monotone" dataKey="carbon" stroke={theme.accent} strokeWidth={2} dot={{ fill: theme.accent }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-center py-8" style={{ color: theme.muted }}>No data yet</p>}
          </div>
        </div>

        {/* History table */}
        {history.length > 0 && (
          <div className="rounded-2xl p-6 border" style={{ background: theme.card, borderColor: theme.border }}>
            <h2 className="font-bold mb-4" style={{ color: theme.text }}>Recent History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: theme.border }}>
                    {['Item','Confidence','Recyclable','CO₂ Saved','Time'].map(h => (
                      <th key={h} className="text-left py-2 pr-4 font-medium" style={{ color: theme.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0,20).map((h,i) => (
                    <tr key={i} className="border-b transition-colors hover:opacity-80" style={{ borderColor: theme.border }}>
                      <td className="py-2 pr-4 capitalize font-medium" style={{ color: theme.text }}>{h.prediction}</td>
                      <td className="py-2 pr-4" style={{ color: theme.muted }}>{(h.confidence*100).toFixed(1)}%</td>
                      <td className="py-2 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-xs"
                          style={h.recyclable ? { background:'#10B98120', color:'#10B981' } : { background:'#EF444420', color:'#EF4444' }}>
                          {h.recyclable ? '✓ Yes' : '✗ No'}
                        </span>
                      </td>
                      <td className="py-2 pr-4" style={{ color: theme.muted }}>{h.carbon_saved} kg</td>
                      <td className="py-2" style={{ color: theme.muted }}>{new Date(h.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Activity heatmap — last 10 weeks */}
        {history.length > 0 && (() => {
          const today = new Date()
          const cells = Array.from({ length: 70 }, (_, i) => {
            const d = new Date(today)
            d.setDate(today.getDate() - (69 - i))
            const key = d.toISOString().slice(0, 10)
            const count = history.filter(h => h.timestamp?.slice(0, 10) === key).length
            return { key, count }
          })
          const maxCount = Math.max(...cells.map(c => c.count), 1)
          return (
            <div className="rounded-2xl p-6 border" style={{ background: theme.card, borderColor: theme.border }}>
              <h2 className="font-bold mb-4" style={{ color: theme.text }}>Activity Heatmap</h2>
              <div className="flex flex-wrap gap-1">
                {cells.map(c => (
                  <div key={c.key} title={`${c.key}: ${c.count} scan${c.count !== 1 ? 's' : ''}`}
                    className="rounded-sm"
                    style={{
                      width: 14, height: 14,
                      background: c.count === 0
                        ? theme.bg
                        : `rgba(16,185,129,${0.2 + (c.count / maxCount) * 0.8})`,
                      border: `1px solid ${theme.border}`,
                    }}
                  />
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: theme.muted }}>Last 10 weeks of scanning activity</p>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
