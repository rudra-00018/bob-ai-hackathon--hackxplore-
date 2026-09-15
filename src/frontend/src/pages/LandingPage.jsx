import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ScanLine, Map, Flag, BarChart2, Bot, Recycle,
  ArrowRight, CheckCircle, Zap, Layers, Globe,
  Trash2, Leaf, TrendingUp, Users, AlertTriangle,
  ChevronRight, Camera, Upload, Volume2,
} from 'lucide-react'
import PublicNav from '../components/navigation/PublicNav'

// ── Animation helpers ─────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
}

function FadeUp({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay, ease: 'easeOut' } } }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function FadeIn({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Section label ──────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--brand-subtle)] border border-[var(--brand-border)] text-green-600 dark:text-green-400 text-xs font-semibold uppercase tracking-wider mb-4">
      {children}
    </span>
  )
}

// ── Divider ────────────────────────────────────────────────────────────────────
function SectionDivider() {
  return <div className="border-t border-token-default" />
}

// ── 1. HERO ───────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-14 overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(var(--border-default) 1px, transparent 1px),
            linear-gradient(90deg, var(--border-default) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          opacity: 0.35,
        }}
      />
      {/* Radial fade mask */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, transparent 40%, var(--bg-primary) 100%)' }}
      />

      <div className="page-container relative z-10 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <FadeUp>
            <SectionLabel>
              <Recycle size={12} />
              AI-Powered Waste Intelligence
            </SectionLabel>
          </FadeUp>

          {/* Headline */}
          <FadeUp delay={0.05}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-token-primary leading-tight tracking-tight mt-2">
              Scan. Sort.{' '}
              <span className="text-green-500">Save the Planet.</span>
            </h1>
          </FadeUp>

          {/* Subheadline */}
          <FadeUp delay={0.1}>
            <p className="text-base sm:text-lg text-token-tertiary mt-5 max-w-xl mx-auto leading-relaxed">
              BinIQ uses AI to classify any waste item in under a second — telling you exactly which bin it goes in, how to prepare it, and how much CO₂ you save.
            </p>
          </FadeUp>

          {/* CTAs */}
          <FadeUp delay={0.15}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Link
                to="/signup"
                className="flex items-center gap-2 px-6 py-3 rounded-md bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors shadow-md hover:shadow-lg"
              >
                Get Started Free <ArrowRight size={16} />
              </Link>
              <a
                href="#how-it-works"
                onClick={(e) => { e.preventDefault(); document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' }) }}
                className="flex items-center gap-2 px-6 py-3 rounded-md border border-token-default text-token-secondary hover:text-token-primary hover:bg-bg-overlay font-semibold text-sm transition-colors"
              >
                See how it works
              </a>
            </div>
          </FadeUp>

          {/* Trust row */}
          <FadeIn delay={0.3}>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10 text-xs text-token-tertiary">
              {[
                { icon: <CheckCircle size={13} className="text-green-500" />, text: 'No credit card required' },
                { icon: <CheckCircle size={13} className="text-green-500" />, text: '30+ waste categories' },
                { icon: <CheckCircle size={13} className="text-green-500" />, text: 'Works on any device' },
              ].map(({ icon, text }) => (
                <span key={text} className="flex items-center gap-1.5">{icon}{text}</span>
              ))}
            </div>
          </FadeIn>
        </div>

        {/* Dashboard preview card */}
        <FadeUp delay={0.2} className="mt-16 max-w-4xl mx-auto">
          <div className="card p-0 overflow-hidden shadow-xl">
            {/* Mock browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-bg-secondary border-b border-token-default">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-4">
                <div className="h-5 rounded bg-bg-tertiary flex items-center px-3">
                  <span className="text-xs text-token-disabled">biniq.app/scanner</span>
                </div>
              </div>
            </div>

            {/* Mock scanner UI */}
            <div className="p-6 bg-bg-primary">
              <div className="grid md:grid-cols-2 gap-5">
                {/* Upload zone mock */}
                <div className="rounded-lg border-2 border-dashed border-token-default p-8 flex flex-col items-center justify-center gap-3 bg-bg-secondary min-h-[220px]">
                  <div className="w-14 h-14 rounded-full bg-[var(--brand-subtle)] flex items-center justify-center">
                    <Camera size={24} className="text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-token-secondary">Drop image or tap to scan</p>
                  <p className="text-xs text-token-disabled">JPG · PNG · WEBP</p>
                  <div className="flex gap-2 mt-1">
                    <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-bg-tertiary text-token-tertiary border border-token-default">
                      <Upload size={11} /> Upload
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-bg-tertiary text-token-tertiary border border-token-default">
                      <Camera size={11} /> Camera
                    </span>
                  </div>
                </div>

                {/* Result card mock */}
                <div className="rounded-lg border border-token-default overflow-hidden">
                  {/* Green top border = result type */}
                  <div className="h-1 bg-blue-500" />
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="text-3xl">🧴</span>
                      <div>
                        <div className="text-base font-semibold text-token-primary capitalize">Plastic Bottle</div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--success-subtle)] text-green-700 dark:text-green-400 border border-[var(--success-border)] mt-1">
                          <CheckCircle size={11} /> Recyclable
                        </span>
                      </div>
                    </div>
                    {/* Confidence bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-token-tertiary mb-1">
                        <span>Confidence</span><span className="font-medium text-token-primary">94.2%</span>
                      </div>
                      <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: '94.2%' }} />
                      </div>
                    </div>
                    {/* Bin */}
                    <div className="rounded-md bg-bg-secondary px-3 py-2 mb-3">
                      <p className="text-xs text-token-tertiary">Disposal bin</p>
                      <p className="text-sm font-semibold text-token-primary mt-0.5">🔵 Blue Recycling Bin</p>
                    </div>
                    {/* CO2 */}
                    <div className="flex items-center gap-2 rounded-md bg-[var(--success-subtle)] border border-[var(--success-border)] px-3 py-2">
                      <Leaf size={14} className="text-green-500 shrink-0" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">+0.08 kg CO₂ saved · = 0.5 km not driven</span>
                    </div>
                    {/* Voice */}
                    <button className="mt-3 flex items-center gap-1.5 text-xs text-token-tertiary hover:text-token-primary transition-colors">
                      <Volume2 size={13} /> Listen to instructions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

// ── 2. STATS BAR ──────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { value: '30+',    label: 'Waste categories classified' },
    { value: '89%',    label: 'Model accuracy on validation set' },
    { value: '6',      label: 'Bin types supported' },
    { value: '< 1s',   label: 'Average classification time' },
  ]

  return (
    <section className="border-y border-token-default bg-bg-secondary">
      <div className="page-container py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x-0 md:divide-x divide-token-default">
          {stats.map(({ value, label }, i) => (
            <FadeIn key={value} delay={i * 0.06}>
              <div className="text-center px-4 py-2">
                <div className="text-2xl font-bold text-token-primary tabular-nums">{value}</div>
                <div className="text-xs text-token-tertiary mt-1">{label}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── 3. FEATURES ───────────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: <ScanLine size={22} />,
      title: 'AI Waste Scanner',
      desc: 'Point your camera at any item. BinIQ identifies the material, tells you which bin it belongs in, and explains how to prepare it.',
      tags: ['Upload', 'Camera', 'Live mode'],
    },
    {
      icon: <Map size={22} />,
      title: 'Smart Bin Map',
      desc: 'Find the nearest recycling center, glass bank, or e-waste drop-off. See crowdsourced fill levels so you never walk to a full bin.',
      tags: ['Nearby bins', 'Fill status', 'Directions'],
    },
    {
      icon: <Flag size={22} />,
      title: 'Waste Reporting',
      desc: 'See an overflowing bin or illegal dumping? Report it in one tap. AI auto-tags the type and severity from your photo.',
      tags: ['Photo + GPS', 'AI tagging', 'Status tracking'],
    },
    {
      icon: <BarChart2 size={22} />,
      title: 'Sustainability Dashboard',
      desc: 'Track your personal CO₂ savings over time. See your recycling rate, streak, and how your impact compares to the community.',
      tags: ['CO₂ tracker', 'Weekly trends', 'Badges'],
    },
    {
      icon: <Bot size={22} />,
      title: 'EcoBot Assistant',
      desc: 'Ask anything about recycling in plain language. Powered by Groq AI, with a reliable rule-based fallback when offline.',
      tags: ['Natural language', 'Item-specific', 'Always available'],
    },
    {
      icon: <Layers size={22} />,
      title: 'Gamification Engine',
      desc: 'Earn XP and coins for every correct disposal. Level up, collect badges, maintain streaks, and climb the community leaderboard.',
      tags: ['XP & coins', 'Streaks', 'Leaderboard'],
    },
  ]

  return (
    <section id="features" className="py-20 md:py-28">
      <div className="page-container">
        <FadeUp className="text-center mb-14">
          <SectionLabel><Layers size={12} /> Capabilities</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-token-primary tracking-tight">
            Everything you need to<br className="hidden sm:block" /> recycle correctly
          </h2>
          <p className="text-token-tertiary mt-3 max-w-lg mx-auto text-sm leading-relaxed">
            Six integrated features that take you from "what is this?" to correct disposal in seconds.
          </p>
        </FadeUp>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp}>
              <div className="card p-6 h-full flex flex-col gap-4 hover:border-token-strong hover:shadow-md transition-all duration-150">
                <div className="w-10 h-10 rounded-lg bg-[var(--brand-subtle)] flex items-center justify-center text-green-500">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-token-primary">{f.title}</h3>
                  <p className="text-sm text-token-tertiary mt-1.5 leading-relaxed">{f.desc}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                  {f.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded text-xs bg-bg-secondary text-token-tertiary border border-token-default">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ── 4. HOW IT WORKS ───────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: '01',
      icon: <Camera size={24} />,
      title: 'Scan or upload',
      desc: 'Take a photo of any waste item using your camera, or upload an existing image. BinIQ accepts JPG, PNG, and WEBP.',
    },
    {
      num: '02',
      icon: <Zap size={24} />,
      title: 'AI classifies instantly',
      desc: 'Our MobileNetV3 model identifies the material and category in under a second. For plastic items, OCR reads the resin code.',
    },
    {
      num: '03',
      icon: <Trash2 size={24} />,
      title: 'Get exact disposal instructions',
      desc: 'See which bin, how to prepare the item (rinse, flatten, remove cap), and location-aware rules for your city.',
    },
    {
      num: '04',
      icon: <Leaf size={24} />,
      title: 'Track your impact',
      desc: 'Every correct disposal earns XP, coins, and CO₂ credits. Your dashboard tracks cumulative environmental impact over time.',
    },
  ]

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-bg-secondary">
      <div className="page-container">
        <FadeUp className="text-center mb-14">
          <SectionLabel><Zap size={12} /> How It Works</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-token-primary tracking-tight">
            From scan to sorted in 15 seconds
          </h2>
          <p className="text-token-tertiary mt-3 max-w-lg mx-auto text-sm leading-relaxed">
            No manuals. No guessing. The entire workflow fits in the time it takes to walk to the bin.
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 relative">
          {/* Connector line — desktop */}
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-token-default" aria-hidden="true" />

          {steps.map((s, i) => (
            <FadeUp key={s.num} delay={i * 0.08}>
              <div className="flex flex-col items-center text-center px-4 py-6 relative">
                {/* Circle */}
                <div className="relative z-10 w-16 h-16 rounded-full bg-bg-primary border-2 border-green-500 flex items-center justify-center text-green-500 mb-5 shadow-sm">
                  {s.icon}
                </div>
                <div className="text-xs font-bold text-green-500 mb-1.5">{s.num}</div>
                <h3 className="text-sm font-semibold text-token-primary mb-2">{s.title}</h3>
                <p className="text-xs text-token-tertiary leading-relaxed">{s.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── 5. AI CAPABILITIES ────────────────────────────────────────────────────────
function AISection() {
  const capabilities = [
    {
      icon: <ScanLine size={18} />,
      title: 'MobileNetV3 Classification',
      desc: '30+ waste categories including plastics, glass, metal, paper, cardboard, e-waste, textiles, and general waste.',
    },
    {
      icon: <Layers size={18} />,
      title: 'Multi-object Detection',
      desc: 'Detect and classify multiple items in a single photo. Bounding boxes show exactly what was identified.',
    },
    {
      icon: <Globe size={18} />,
      title: 'OCR Resin Code Reading',
      desc: 'For plastic items, EasyOCR reads the recycling symbol (codes 1–7) to give material-specific guidance.',
    },
    {
      icon: <Bot size={18} />,
      title: 'Groq-Powered EcoBot',
      desc: 'LLaMA3-backed natural language assistant. Knows your last scan context. Falls back to rule-based responses offline.',
    },
    {
      icon: <AlertTriangle size={18} />,
      title: 'Report AI Tagging',
      desc: 'When you report a waste issue, AI analyses your photo and auto-fills the type, severity, and estimated volume.',
    },
    {
      icon: <TrendingUp size={18} />,
      title: 'Confidence Thresholds',
      desc: 'Predictions below 60% confidence ask you to confirm before awarding XP, preventing incorrect gamification.',
    },
  ]

  return (
    <section id="ai" className="py-20 md:py-28">
      <div className="page-container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text side */}
          <FadeUp>
            <SectionLabel><Zap size={12} /> AI Engine</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-bold text-token-primary tracking-tight mt-1">
              Multiple AI systems working together
            </h2>
            <p className="text-token-tertiary mt-4 text-sm leading-relaxed">
              BinIQ isn't a single model — it's a pipeline. Computer vision classifies the item, OCR reads plastic codes, a decision engine merges the signals, and a large language model answers follow-up questions. Each layer improves accuracy.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3">
              {capabilities.map((c) => (
                <div key={c.title} className="flex gap-3">
                  <div className="w-8 h-8 rounded-md bg-bg-secondary border border-token-default flex items-center justify-center text-token-tertiary shrink-0 mt-0.5">
                    {c.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-token-primary">{c.title}</p>
                    <p className="text-xs text-token-tertiary mt-0.5 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>

          {/* Visual: AI pipeline diagram */}
          <FadeIn delay={0.15}>
            <div className="card p-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-token-tertiary mb-4">Classification Pipeline</p>
              {[
                { step: 'Input',         detail: 'Camera frame or uploaded image',        color: 'bg-blue-500' },
                { step: 'Preprocessing', detail: 'Resize 224×224, normalize ImageNet',    color: 'bg-purple-500' },
                { step: 'CNN Inference', detail: 'MobileNetV3-Small, 6 base classes',     color: 'bg-green-500' },
                { step: 'OCR (plastic)', detail: 'EasyOCR resin code detection (1–7)',    color: 'bg-amber-500' },
                { step: 'Decision',      detail: 'Merge confidence + OCR + carbon data',  color: 'bg-green-500' },
                { step: 'Output',        detail: 'Bin, instructions, CO₂, gamification', color: 'bg-green-600' },
              ].map((row, i) => (
                <div key={row.step} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${row.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-token-primary">{row.step}</span>
                      <span className="text-xs text-token-tertiary truncate">{row.detail}</span>
                    </div>
                  </div>
                  {i < 5 && (
                    <ChevronRight size={12} className="text-token-disabled shrink-0" />
                  )}
                </div>
              ))}

              <div className="pt-3 border-t border-token-default mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-token-tertiary">Average inference time</span>
                  <span className="font-semibold text-green-500">&lt; 1 second</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1.5">
                  <span className="text-token-tertiary">Validation accuracy</span>
                  <span className="font-semibold text-green-500">89.93%</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// ── 6. SMART BIN FEATURES ─────────────────────────────────────────────────────
function SmartBinSection() {
  return (
    <section className="py-20 md:py-28 bg-bg-secondary">
      <div className="page-container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Visual */}
          <FadeIn delay={0.1} className="order-2 lg:order-1">
            <div className="card p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-token-tertiary mb-5">Live Bin Network</p>
              <div className="space-y-3">
                {[
                  { type: 'Blue Recycling',  fill: 72, color: '#3B82F6', status: 'normal', location: 'Oak Street · 120m' },
                  { type: 'Glass Bank',       fill: 91, color: '#22C55E', status: 'full',   location: 'Park Ave · 340m' },
                  { type: 'General Waste',    fill: 34, color: '#374151', status: 'normal', location: 'High St · 210m' },
                  { type: 'E-Waste Drop-off', fill: 18, color: '#F97316', status: 'normal', location: 'Library · 560m' },
                ].map((bin) => (
                  <div key={bin.type} className="rounded-lg bg-bg-primary border border-token-default p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: bin.color }} />
                        <span className="text-sm font-medium text-token-primary">{bin.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            bin.status === 'full'
                              ? 'bg-[var(--danger-subtle)] text-red-600 dark:text-red-400'
                              : 'bg-[var(--success-subtle)] text-green-700 dark:text-green-400'
                          }`}
                        >
                          {bin.status === 'full' ? 'Full' : 'Available'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${bin.fill}%`,
                            background: bin.fill > 85 ? '#EF4444' : bin.fill > 60 ? '#F59E0B' : bin.color,
                          }}
                        />
                      </div>
                      <span className="text-xs text-token-tertiary w-8 text-right">{bin.fill}%</span>
                    </div>
                    <p className="text-xs text-token-disabled mt-1.5">{bin.location}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-token-tertiary mt-4 text-center">
                Fill data: crowdsourced community reports
              </p>
            </div>
          </FadeIn>

          {/* Text */}
          <FadeUp className="order-1 lg:order-2">
            <SectionLabel><Map size={12} /> Smart Bin Network</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-bold text-token-primary tracking-tight mt-1">
              Know which bin is available before you walk there
            </h2>
            <p className="text-token-tertiary mt-4 text-sm leading-relaxed">
              The BinIQ map shows all nearby recycling points with crowdsourced fill status. When the community marks a bin as full, everyone nearby is notified and directed to the next closest option.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Bins visible on map with type, fill level, and status',
                'Community marking — three reports confirms a bin as full',
                'Nearest available bin finder — filtered by waste type',
                'IoT sensor-ready architecture for future smart bin hardware',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-token-secondary">
                  <CheckCircle size={15} className="text-green-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </FadeUp>
        </div>
      </div>
    </section>
  )
}

// ── 7. REPORTING FLOW ─────────────────────────────────────────────────────────
function ReportingSection() {
  const steps = [
    {
      icon: <Camera size={20} />,
      title: 'Take a photo',
      desc: 'Snap the issue — overflowing bin, illegal dumping, or hazardous waste.',
    },
    {
      icon: <Zap size={20} />,
      title: 'AI tags it automatically',
      desc: 'Type, severity, and location are filled in from your photo and GPS — no manual entry.',
    },
    {
      icon: <Flag size={20} />,
      title: 'Submit in one tap',
      desc: 'Your report goes live on the community map instantly.',
    },
    {
      icon: <TrendingUp size={20} />,
      title: 'Track to resolution',
      desc: 'Follow status updates from submitted → acknowledged → resolved. You earn XP when it is fixed.',
    },
  ]

  return (
    <section id="reporting" className="py-20 md:py-28">
      <div className="page-container">
        <FadeUp className="text-center mb-14">
          <SectionLabel><Flag size={12} /> Waste Reporting</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-token-primary tracking-tight">
            See it. Report it. Get it fixed.
          </h2>
          <p className="text-token-tertiary mt-3 max-w-lg mx-auto text-sm leading-relaxed">
            Citizens are the city's best sensor network. BinIQ makes reporting a waste issue faster than sending a text message.
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <FadeUp key={s.title} delay={i * 0.07}>
              <div className="card p-5 h-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--brand-subtle)] border border-[var(--brand-border)] flex items-center justify-center text-green-500 shrink-0">
                    {s.icon}
                  </div>
                  <span className="text-xs font-bold text-token-disabled">Step {i + 1}</span>
                </div>
                <h3 className="text-sm font-semibold text-token-primary mb-1.5">{s.title}</h3>
                <p className="text-xs text-token-tertiary leading-relaxed">{s.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── 8. IMPACT ─────────────────────────────────────────────────────────────────
function ImpactSection() {
  return (
    <section id="impact" className="py-20 md:py-28 bg-bg-secondary">
      <div className="page-container">
        <FadeUp className="text-center mb-14">
          <SectionLabel><Leaf size={12} /> Environmental Impact</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-token-primary tracking-tight">
            Small actions, measurable outcomes
          </h2>
          <p className="text-token-tertiary mt-3 max-w-lg mx-auto text-sm leading-relaxed">
            Every scan is linked to a CO₂ saving based on validated emissions factors. No estimates, no approximations.
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {[
            { material: 'Metal can',      saving: '0.12 kg CO₂', equiv: '= 0.8 km not driven',    icon: '🥫', color: '#6B7280' },
            { material: 'Plastic bottle', saving: '0.08 kg CO₂', equiv: '= 0.5 km not driven',    icon: '🧴', color: '#3B82F6' },
            { material: 'Glass bottle',   saving: '0.07 kg CO₂', equiv: '= 2 cups of coffee',     icon: '🍶', color: '#22C55E' },
            { material: 'Cardboard box',  saving: '0.06 kg CO₂', equiv: '= 1 hour of TV',         icon: '📦', color: '#D97706' },
            { material: 'Paper',          saving: '0.05 kg CO₂', equiv: '= 1.5 cups of coffee',   icon: '📄', color: '#F59E0B' },
            { material: 'General waste',  saving: '0.00 kg CO₂', equiv: 'Reduce and reuse first', icon: '🗑️', color: '#374151' },
          ].map((item) => (
            <FadeUp key={item.material}>
              <div className="card p-4 flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                  style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-token-primary">{item.material}</p>
                  <p className="text-xs text-green-500 font-medium">{item.saving}</p>
                  <p className="text-xs text-token-tertiary">{item.equiv}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>

        {/* Community impact callout */}
        <FadeUp>
          <div className="card p-8 text-center bg-[var(--brand-subtle)] border-[var(--brand-border)]">
            <Users size={28} className="text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-token-primary">Community impact adds up</h3>
            <p className="text-sm text-token-tertiary mt-2 max-w-md mx-auto leading-relaxed">
              When users in a city all scan and sort correctly, the aggregate CO₂ saving appears on the community dashboard. Every scan contributes to a shared city-level total.
            </p>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

// ── 9. SUSTAINABILITY ─────────────────────────────────────────────────────────
function SustainabilitySection() {
  const items = [
    {
      icon: <TrendingUp size={20} />,
      title: 'Personal Carbon Tracker',
      desc: 'Your cumulative CO₂ saved is tracked in real time and shown in human-readable equivalents — km not driven, coffees, hours of TV.',
    },
    {
      icon: <BarChart2 size={20} />,
      title: 'Waste Diversion Rate',
      desc: 'See what percentage of your scanned items were recycled vs sent to general waste. The single clearest metric of recycling behaviour.',
    },
    {
      icon: <Users size={20} />,
      title: 'Community Aggregation',
      desc: 'City-level totals show the combined impact of all BinIQ users. Community milestones trigger XP bonuses for everyone.',
    },
    {
      icon: <Recycle size={20} />,
      title: 'Eco Challenges',
      desc: 'Weekly challenges are auto-generated based on your scan history. If you mostly scan plastic, BinIQ challenges you to find glass.',
    },
  ]

  return (
    <section className="py-20 md:py-28">
      <div className="page-container">
        <FadeUp className="text-center mb-14">
          <SectionLabel><Globe size={12} /> Sustainability</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-token-primary tracking-tight">
            Behaviour change through data
          </h2>
          <p className="text-token-tertiary mt-3 max-w-lg mx-auto text-sm leading-relaxed">
            Seeing your impact in concrete terms — not percentages — is the most effective driver of long-term recycling habit change.
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 gap-5">
          {items.map((item, i) => (
            <FadeUp key={item.title} delay={i * 0.07}>
              <div className="card p-6 flex gap-4 h-full">
                <div className="w-10 h-10 rounded-lg bg-bg-secondary border border-token-default flex items-center justify-center text-token-tertiary shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-token-primary mb-1">{item.title}</h3>
                  <p className="text-sm text-token-tertiary leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── 10. FINAL CTA ─────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="py-20 md:py-28 bg-bg-secondary border-t border-token-default">
      <div className="page-container">
        <FadeUp className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center mx-auto mb-6">
            <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4l.5 9a1 1 0 001 .9h5a1 1 0 001-.9L12 4"
                stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-token-primary tracking-tight">
            Start recycling smarter today
          </h2>
          <p className="text-token-tertiary mt-4 text-sm leading-relaxed">
            Free to use. No hardware required. Works entirely in your browser. Scan your first item in under 30 seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              to="/signup"
              className="flex items-center gap-2 px-6 py-3 rounded-md bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors shadow-md hover:shadow-lg"
            >
              Create free account <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-md border border-token-default text-token-secondary hover:text-token-primary hover:bg-bg-overlay font-semibold text-sm transition-colors"
            >
              Sign in
            </Link>
          </div>
          <p className="text-xs text-token-disabled mt-5">
            No credit card · No download · Works on any device
          </p>
        </FadeUp>
      </div>
    </section>
  )
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-token-default py-8">
      <div className="page-container flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-token-disabled">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4l.5 9a1 1 0 001 .9h5a1 1 0 001-.9L12 4"
                stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-medium text-token-tertiary">BinIQ</span>
          <span>— AI-Powered Waste Intelligence</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="hover:text-token-tertiary transition-colors">Sign In</Link>
          <Link to="/signup" className="hover:text-token-tertiary transition-colors">Sign Up</Link>
          <a href="#features" onClick={(e) => { e.preventDefault(); document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' }) }}
            className="hover:text-token-tertiary transition-colors">Features</a>
        </div>
      </div>
    </footer>
  )
}

// ── PAGE EXPORT ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-token-primary">
      <PublicNav />
      <main id="main-content">
        <Hero />
        <StatsBar />
        <Features />
        <SectionDivider />
        <HowItWorks />
        <SectionDivider />
        <AISection />
        <SectionDivider />
        <SmartBinSection />
        <SectionDivider />
        <ReportingSection />
        <SectionDivider />
        <ImpactSection />
        <SectionDivider />
        <SustainabilitySection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
