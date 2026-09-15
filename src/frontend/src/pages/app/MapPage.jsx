import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Navigation, Layers, Flag, X,
  RefreshCw, Loader2, MapPin, Filter,
  ChevronDown, ChevronUp, List, Map as MapIcon,
} from 'lucide-react'
import BinMap from '../../components/map/BinMap'
import BinDetailSheet from '../../components/map/BinDetailSheet'
import {
  BIN_STATUS, BIN_STATUS_META, BIN_TYPE, BIN_TYPE_META,
  getBins, fetchRecyclingCenters, geocodeQuery, getUserLocation, getApproximateLocation,
  distanceKm, formatDistance,
} from '../../services/binService'
import { useTheme } from '../../context/ThemeContext'
import toast from '../../components/ui/Toast'

// ── Status legend item ────────────────────────────────────────────────────────
function LegendItem({ status }) {
  const meta = BIN_STATUS_META[status]
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
      <span className="text-xs text-token-tertiary">{meta.label}</span>
    </div>
  )
}

// ── Bin list item ─────────────────────────────────────────────────────────────
function BinListItem({ bin, userLocation, isSelected, onClick }) {
  const typeMeta   = BIN_TYPE_META[bin.type]   || { label: 'Bin',   color: '#6B7280', emoji: '🗑️' }
  const statusMeta = BIN_STATUS_META[bin.status] || BIN_STATUS_META[BIN_STATUS.UNKNOWN]

  const distance = userLocation
    ? formatDistance(distanceKm(userLocation.lat, userLocation.lon, bin.lat, bin.lon))
    : null

  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-token-subtle last:border-0',
        isSelected ? 'bg-[var(--brand-subtle)]' : 'hover:bg-bg-overlay',
      ].join(' ')}
    >
      {/* Type icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
        style={{ background: `${typeMeta.color}18`, border: `1px solid ${typeMeta.color}30` }}
      >
        {typeMeta.emoji}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-token-primary truncate">{typeMeta.label}</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0"
            style={{ color: statusMeta.color, background: `${statusMeta.color}18` }}
          >
            {statusMeta.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {bin.address && (
            <span className="text-xs text-token-tertiary truncate">{bin.address}</span>
          )}
          {distance && (
            <span className="text-xs text-token-disabled shrink-0">{distance}</span>
          )}
        </div>
        {/* Fill bar (mini) */}
        {bin.fillLevel !== null && (
          <div className="h-1 rounded-full bg-bg-tertiary mt-1.5 overflow-hidden" style={{ maxWidth: 120 }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${bin.fillLevel}%`,
                background: statusMeta.color,
              }}
            />
          </div>
        )}
      </div>

      {bin.dataSource === 'mock' && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 shrink-0 border border-amber-200 dark:border-amber-800">
          Demo
        </span>
      )}
    </button>
  )
}

// ── Type filter chip ──────────────────────────────────────────────────────────
function TypeChip({ type, active, onClick }) {
  const meta = BIN_TYPE_META[type]
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0',
        active
          ? 'text-white border-transparent'
          : 'bg-bg-primary text-token-secondary border-token-default hover:border-token-strong',
      ].join(' ')}
      style={active ? { background: meta.color, borderColor: meta.color } : {}}
    >
      <span>{meta.emoji}</span>
      {meta.label}
    </button>
  )
}

// ── Main MapPage ──────────────────────────────────────────────────────────────
export default function MapPage() {
  const { isDark } = useTheme()
  const navigate   = useNavigate()

  // ── State ──────────────────────────────────────────────────────────────────
  const [bins,          setBins]          = useState([])
  const [centers,       setCenters]       = useState([])
  const [userLocation,  setUserLocation]  = useState(null)
  const [flyTarget,     setFlyTarget]     = useState(null)
  const [selectedBin,   setSelectedBin]   = useState(null)
  const [selectedCenter,setSelectedCenter]= useState(null)

  // Layer toggles
  const [showBins,      setShowBins]      = useState(true)
  const [showCenters,   setShowCenters]   = useState(false)

  // Type filter (null = all)
  const [typeFilter,    setTypeFilter]    = useState(null)

  // Search
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searching,     setSearching]     = useState(false)
  const [locationLabel, setLocationLabel] = useState('')

  // Loading states
  const [loadingBins,   setLoadingBins]   = useState(false)
  const [loadingGPS,    setLoadingGPS]    = useState(false)
  const [binsError,     setBinsError]     = useState(null)

  // View mode (map vs list) — for mobile
  const [viewMode,      setViewMode]      = useState('map')

  // Legend & filters panel
  const [showLegend,    setShowLegend]    = useState(false)
  const [showFilters,   setShowFilters]   = useState(false)

  // ── Load bins around a location ────────────────────────────────────────────
  const loadBins = useCallback(async (lat, lon, label = '') => {
    setLoadingBins(true)
    setBinsError(null)
    setSelectedBin(null)
    setSelectedCenter(null)
    try {
      const data = await getBins(lat, lon, 800)
      setBins(data)
      if (label) setLocationLabel(label)
    } catch (err) {
      setBinsError(err.message || 'Failed to load bins')
      toast.error(err.message || 'Failed to load bins')
    } finally {
      setLoadingBins(false)
    }
  }, [])

  // ── Load OSM recycling centers ─────────────────────────────────────────────
  const loadCenters = useCallback(async (lat, lon) => {
    try {
      const data = await fetchRecyclingCenters(lat, lon, 5000)
      setCenters(data)
    } catch {
      // Centers are supplementary — silent fail
    }
  }, [])

  // ── GPS locate ─────────────────────────────────────────────────────────────
  const handleLocate = useCallback(async () => {
    setLoadingGPS(true)
    try {
      const loc = await getUserLocation()
      setUserLocation(loc)
      setFlyTarget(loc)
      await loadBins(loc.lat, loc.lon, 'Your location')
      loadCenters(loc.lat, loc.lon)
    } catch (err) {
      // GPS is preferred, but desktop browsers and embedded webviews often do
      // not expose it. Keep the map useful by falling back to a coarse
      // network-based estimate instead of leaving it centred on London.
      try {
        const loc = await getApproximateLocation()
        setUserLocation(loc)
        setFlyTarget(loc)
        await loadBins(loc.lat, loc.lon, loc.label)
        loadCenters(loc.lat, loc.lon)
        toast('Browser GPS is unavailable — showing an approximate city-level location.')
      } catch (fallbackErr) {
        toast.error(`${err.message}. ${fallbackErr.message}`)
      }
    } finally {
      setLoadingGPS(false)
    }
  }, [loadBins, loadCenters])

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (e) => {
    e?.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const { lat, lon, display } = await geocodeQuery(searchQuery)
      const loc = { lat, lon }
      setFlyTarget(loc)
      await loadBins(lat, lon, display)
      loadCenters(lat, lon)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSearching(false)
    }
  }, [searchQuery, loadBins, loadCenters])

  // ── Auto-locate on first load ──────────────────────────────────────────────
  useEffect(() => {
    handleLocate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Filtered bin list ──────────────────────────────────────────────────────
  const filteredBins = typeFilter
    ? bins.filter(b => b.type === typeFilter)
    : bins

  // Sort: full/maintenance first, then by fill level desc
  const sortedBins = [...filteredBins].sort((a, b) => {
    const urgency = { full: 3, maintenance: 2, nearly_full: 1, available: 0, offline: 0, unknown: 0 }
    return (urgency[b.status] || 0) - (urgency[a.status] || 0)
  })

  // ── Stats summary ──────────────────────────────────────────────────────────
  const stats = {
    total:      bins.length,
    available:  bins.filter(b => b.status === BIN_STATUS.AVAILABLE).length,
    full:       bins.filter(b => b.status === BIN_STATUS.FULL).length,
    attention:  bins.filter(b => b.status === BIN_STATUS.FULL || b.status === BIN_STATUS.MAINTENANCE).length,
  }

  const isLoading = loadingBins || loadingGPS || searching

  return (
    <div className="flex flex-col h-[calc(100dvh-56px-64px)] md:h-[calc(100dvh-56px)] overflow-hidden touch-manipulation">

      {/* ── Top control bar ── */}
      <div className="bg-bg-primary border-b border-token-default px-3 sm:px-4 py-2.5 sm:py-3 space-y-2.5 shrink-0">

        {/* Search row */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-token-disabled pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search city, address, postcode…"
              className="input-base pl-9 text-base md:text-sm"
              aria-label="Search location"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !searchQuery.trim()}
            className="min-h-[44px] px-4 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center gap-1.5 shrink-0"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span className="hidden sm:inline">Search</span>
          </button>
          <button
            type="button"
            onClick={handleLocate}
            disabled={isLoading}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-token-default text-token-tertiary hover:text-token-primary hover:bg-bg-overlay disabled:opacity-40 transition-colors flex items-center justify-center shrink-0"
            title="Use my location"
            aria-label="Use my location"
          >
            {loadingGPS ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
          </button>
        </form>

        {/* Secondary controls row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {/* Layer toggles */}
          <button
            onClick={() => setShowBins(v => !v)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0',
              showBins ? 'bg-green-500 text-white border-green-500' : 'bg-bg-primary text-token-secondary border-token-default hover:border-token-strong',
            ].join(' ')}
          >
            🗑️ Bins {bins.length > 0 && `(${filteredBins.length})`}
          </button>
          <button
            onClick={() => setShowCenters(v => !v)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0',
              showCenters ? 'bg-blue-500 text-white border-blue-500' : 'bg-bg-primary text-token-secondary border-token-default hover:border-token-strong',
            ].join(' ')}
          >
            ♻️ Centers {centers.length > 0 && `(${centers.length})`}
          </button>

          <div className="h-4 w-px bg-token-default shrink-0" />

          {/* Type filters */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0',
              typeFilter ? 'bg-bg-tertiary text-token-primary border-token-strong' : 'bg-bg-primary text-token-secondary border-token-default hover:border-token-strong',
            ].join(' ')}
          >
            <Filter size={12} /> Filter {typeFilter ? '·' + BIN_TYPE_META[typeFilter]?.label : ''}
            {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {typeFilter && (
            <button
              onClick={() => setTypeFilter(null)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs text-red-500 hover:bg-[var(--danger-subtle)] transition-colors shrink-0"
            >
              <X size={11} /> Clear
            </button>
          )}

          {/* Mobile: view toggle */}
          <div className="ml-auto flex items-center gap-1 md:hidden shrink-0">
            <button
              onClick={() => setViewMode('map')}
              className={`w-8 h-8 rounded-md flex items-center justify-center text-xs transition-colors ${viewMode === 'map' ? 'bg-bg-secondary text-token-primary' : 'text-token-tertiary hover:bg-bg-overlay'}`}
              aria-label="Map view"
            >
              <MapIcon size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-8 h-8 rounded-md flex items-center justify-center text-xs transition-colors ${viewMode === 'list' ? 'bg-bg-secondary text-token-primary' : 'text-token-tertiary hover:bg-bg-overlay'}`}
              aria-label="List view"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {/* Type filter chips */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                {Object.values(BIN_TYPE).map(type => (
                  <TypeChip
                    key={type}
                    type={type}
                    active={typeFilter === type}
                    onClick={() => setTypeFilter(t => t === type ? null : type)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main content: map + sidebar ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar (desktop: always visible; mobile: only in list view) ── */}
        <div className={[
          'flex flex-col border-r border-token-default bg-bg-primary',
          'w-full md:w-80 shrink-0',
          viewMode === 'list' ? 'flex' : 'hidden md:flex',
        ].join(' ')}>

          {/* Sidebar header */}
          <div className="px-4 py-3 border-b border-token-default">
            {locationLabel ? (
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-token-primary truncate">{locationLabel}</p>
                  <p className="text-xs text-token-tertiary mt-0.5">
                    {bins.length} bins · {stats.available} available · {stats.attention > 0 ? `${stats.attention} need attention` : 'all clear'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-token-tertiary">Search or use GPS to find nearby bins</p>
            )}
          </div>

          {/* Status legend */}
          <div className="px-4 py-2 border-b border-token-subtle">
            <button
              onClick={() => setShowLegend(v => !v)}
              className="flex items-center gap-1.5 w-full text-xs text-token-tertiary hover:text-token-primary transition-colors"
            >
              <Layers size={12} />
              Status legend
              {showLegend ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
            </button>
            <AnimatePresence>
              {showLegend && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2">
                    {Object.values(BIN_STATUS).map(s => <LegendItem key={s} status={s} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bin list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Loader2 size={20} className="animate-spin text-green-500" />
                <p className="text-xs text-token-tertiary">Loading bins…</p>
              </div>
            )}

            {!isLoading && binsError && (
              <div className="p-4 text-center">
                <p className="text-xs text-red-500 mb-2">{binsError}</p>
                <button onClick={handleLocate} className="text-xs text-token-link hover:underline">Try again</button>
              </div>
            )}

            {!isLoading && !binsError && sortedBins.length === 0 && locationLabel && (
              <div className="p-6 text-center">
                <p className="text-sm text-token-tertiary">No bins found in this area</p>
                <p className="text-xs text-token-disabled mt-1">Try searching a different location</p>
              </div>
            )}

            {!isLoading && !binsError && !locationLabel && (
              <div className="p-6 text-center">
                <Navigation size={24} className="text-token-disabled mx-auto mb-2" />
                <p className="text-sm text-token-tertiary">Search or allow location access</p>
                <p className="text-xs text-token-disabled mt-1">Bins will appear here</p>
              </div>
            )}

            {!isLoading && sortedBins.map(bin => (
              <BinListItem
                key={bin.id}
                bin={bin}
                userLocation={userLocation}
                isSelected={selectedBin?.id === bin.id}
                onClick={() => {
                  setSelectedBin(bin)
                  setFlyTarget({ lat: bin.lat, lon: bin.lon })
                  if (viewMode === 'list') setViewMode('map')
                }}
              />
            ))}
          </div>

          {/* Demo data notice */}
          {bins.length > 0 && bins[0]?.dataSource === 'mock' && (
            <div className="px-4 py-2.5 border-t border-token-default bg-amber-50 dark:bg-amber-900/10">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                <span className="font-semibold">Demo data</span> — Fill levels are simulated.
                Real IoT sensors connect via <code className="text-xs">binService.js</code>.
              </p>
            </div>
          )}
        </div>

        {/* ── Map panel ── */}
        <div className={[
          'flex-1 relative',
          viewMode === 'map' ? 'flex' : 'hidden md:flex',
        ].join(' ')}>
          {/* Map */}
          <div className="absolute inset-0">
            <BinMap
              bins={showBins ? filteredBins : []}
              centers={showCenters ? centers : []}
              userLocation={userLocation}
              flyTarget={flyTarget}
              selectedBin={selectedBin}
              showBins={showBins}
              showCenters={showCenters}
              tileTheme={isDark ? 'dark' : 'light'}
              onBinClick={setSelectedBin}
              onCenterClick={setSelectedCenter}
              onMapClick={() => { setSelectedBin(null); setSelectedCenter(null) }}
            />
          </div>

          {/* Loading overlay */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-bg-primary border border-token-default shadow-md text-sm text-token-secondary"
              >
                <Loader2 size={14} className="animate-spin text-green-500" />
                Loading bins…
              </motion.div>
            )}
          </AnimatePresence>

          {/* FAB — Report waste */}
          <button
            onClick={() => navigate('/app/report')}
            className="absolute bottom-6 right-6 z-10 flex items-center gap-2 px-4 py-3 rounded-full bg-green-500 hover:bg-green-600 text-white text-sm font-semibold shadow-lg transition-colors"
            aria-label="Report a waste issue"
          >
            <Flag size={16} />
            <span className="hidden sm:inline">Report Issue</span>
          </button>

          {/* Refresh button */}
          {locationLabel && (
            <button
              onClick={() => userLocation && loadBins(userLocation.lat, userLocation.lon)}
              disabled={isLoading}
              className="absolute bottom-6 left-6 z-10 w-10 h-10 rounded-full bg-bg-primary border border-token-default text-token-tertiary hover:text-token-primary hover:border-token-strong shadow-sm transition-colors flex items-center justify-center disabled:opacity-40"
              aria-label="Refresh bin data"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* ── Bin detail sheet (modal) ── */}
      {(selectedBin || selectedCenter) && (
        <BinDetailSheet
          bin={selectedBin || selectedCenter}
          userLocation={userLocation}
          onClose={() => { setSelectedBin(null); setSelectedCenter(null) }}
          onReportFull={(binId) => {
            setBins(prev => prev.map(b =>
              b.id === binId
                ? { ...b, crowdReports: (b.crowdReports || 0) + 1, status: BIN_STATUS.FULL }
                : b
            ))
          }}
        />
      )}
    </div>
  )
}
