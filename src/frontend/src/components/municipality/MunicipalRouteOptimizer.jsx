import { useState, useEffect, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Truck, Navigation, MapPin, Clock, Fuel, Leaf,
  CheckCircle, AlertTriangle, RefreshCw, Send,
  ChevronRight, Layers, ExternalLink, Download, Plus, X,
} from 'lucide-react'
import { optimizeMunicipalRoute, FLEET_METRICS } from '../../services/routeService'
import { BIN_TYPE_META } from '../../services/binService'
import { REPORT_TYPE_META, REPORT_STATUS_META } from '../../services/reportService'
import Button from '../ui/Button'
import { Badge } from '../ui/Badge'
import toast from '../ui/Toast'

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Custom Leaflet Icons ──────────────────────────────────────────────────────

// Municipal Central Depot Icon
const depotIcon = new L.DivIcon({
  html: `
    <div style="position:relative; width:36px; height:36px;">
      <div style="
        position:absolute; inset:-4px; border-radius:50%;
        background:rgba(59,130,246,0.3);
        animation: depotPulse 2s ease-out infinite;
      "></div>
      <div style="
        position:absolute; inset:0; border-radius:10px;
        background:#1E40AF; border:2.5px solid white;
        box-shadow:0 3px 10px rgba(0,0,0,0.4);
        display:flex; align-items:center; justify-content:center;
        color:white; font-size:16px; font-weight:bold;
      ">🏢</div>
    </div>
    <style>@keyframes depotPulse{0%{transform:scale(1);opacity:0.8}100%{transform:scale(1.8);opacity:0}}</style>
  `,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

// Numbered Stop Icon (1, 2, 3...)
function createStopIcon(sequence, isReport = false) {
  const bgColor = isReport ? '#DC2626' : '#2563EB'
  const emoji = isReport ? '📋' : '🗑️'

  return new L.DivIcon({
    html: `
      <div style="
        display:flex; align-items:center; justify-content:center;
        position:relative; width:32px; height:32px; border-radius:50%;
        background:${bgColor}; border:2.5px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
        color:white; font-size:12px; font-weight:800;
        cursor:pointer; transition:transform 150ms;
      ">
        <span style="font-family:sans-serif;">${sequence}</span>
        <div style="
          position:absolute; top:-6px; right:-6px; width:16px; height:16px;
          border-radius:50%; background:#111827; border:1.5px solid white;
          font-size:9px; display:flex; align-items:center; justify-content:center;
        ">${emoji}</div>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

// Map Auto-Fit Component
function FitBounds({ coordinates }) {
  const map = useMap()
  useEffect(() => {
    if (coordinates && coordinates.length > 1) {
      const bounds = L.latLngBounds(coordinates)
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
    }
  }, [coordinates, map])
  return null
}

// Bounding box guard for Indian municipal operations. It prevents accidental
// routing to demo/foreign coordinates while still supporting every Indian city.
const isInIndia = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon)
  && lat >= 6 && lat <= 37 && lon >= 68 && lon <= 98

export default function MunicipalRouteOptimizer({ bins = [], reports = [] }) {
  const [selectedItems, setSelectedItems] = useState({})
  const [optimizing, setOptimizing] = useState(false)
  const [routeResult, setRouteResult] = useState(null)
  const [activeStop, setActiveStop] = useState(null)
  const [dispatched, setDispatched] = useState(false)
  const [customStops, setCustomStops] = useState([])
  const [destination, setDestination] = useState({ name: '', address: '', lat: '', lon: '' })

  // 1. Filter candidates: Full Bins (>= 85% or full status) and Active Reports
  const candidateStops = useMemo(() => {
    const list = []

    // High-priority bins
    bins.forEach(b => {
      const isFull = b.status === 'full' || (b.fillLevel !== null && b.fillLevel >= 85) || b.status === 'nearly_full'
      if (isFull && isInIndia(b.lat, b.lon)) {
        list.push({
          id: b.id,
          sourceType: 'bin',
          name: `${BIN_TYPE_META[b.type]?.label || 'Smart'} Bin`,
          address: b.address || `Bin #${b.id}`,
          lat: b.lat,
          lon: b.lon,
          fillLevel: b.fillLevel ?? 90,
          status: b.status,
          urgency: 'high',
          emoji: BIN_TYPE_META[b.type]?.emoji || '🗑️',
        })
      }
    })

    // Active action-requiring reports
    reports.forEach(r => {
      const isActive = r.status === 'submitted' || r.status === 'under_review' || r.status === 'accepted' || r.status === 'in_progress'
      if (isActive && isInIndia(r.location?.lat, r.location?.lon)) {
        list.push({
          id: r.id,
          sourceType: 'report',
          name: `${REPORT_TYPE_META[r.reportType]?.label || 'Waste'} Report`,
          address: r.location?.address || `Report #${r.id.slice(0, 8)}`,
          lat: r.location.lat,
          lon: r.location.lon,
          status: r.status,
          urgency: r.aiResult?.urgency || 'medium',
          emoji: REPORT_TYPE_META[r.reportType]?.emoji || '📋',
        })
      }
    })

    return [...list, ...customStops]
  }, [bins, reports, customStops])

  // Central Depot: dynamically set to center of bounding area or default city coordinates
  const depot = useMemo(() => {
    if (candidateStops.length > 0) {
      const avgLat = candidateStops.reduce((sum, s) => sum + s.lat, 0) / candidateStops.length
      const avgLon = candidateStops.reduce((sum, s) => sum + s.lon, 0) / candidateStops.length
      return {
        lat: parseFloat((avgLat + 0.008).toFixed(6)),
        lon: parseFloat((avgLon - 0.006).toFixed(6)),
        name: 'Central Municipal Depot & Transfer Station',
      }
    }
    return {
      lat: 28.6139,
      lon: 77.2090,
      name: 'Central Municipal Depot, New Delhi',
    }
  }, [candidateStops])

  // Initialize all candidates as selected by default
  useEffect(() => {
    const initial = {}
    candidateStops.forEach(s => { initial[s.id] = true })
    setSelectedItems(initial)
  }, [candidateStops])

  // Trigger Route Optimization
  const handleOptimize = useCallback(async () => {
    const activeCandidates = candidateStops.filter(s => selectedItems[s.id])
    if (activeCandidates.length === 0) {
      toast.error('Select at least one collection stop to optimize')
      return
    }

    setOptimizing(true)
    setDispatched(false)
    try {
      const result = await optimizeMunicipalRoute(depot, activeCandidates)
      setRouteResult(result)
      toast.success(`Optimized ${result.stops.length} stops (${result.totalDistanceKm} km)`)
    } catch (err) {
      toast.error('Route calculation failed: ' + err.message)
    } finally {
      setOptimizing(false)
    }
  }, [candidateStops, selectedItems, depot])

  // Auto-run on first load when candidate stops arrive
  useEffect(() => {
    if (candidateStops.length > 0 && !routeResult) {
      handleOptimize()
    }
  }, [candidateStops, handleOptimize, routeResult])

  // Toggle item in route
  const toggleItem = (id) => {
    setSelectedItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const addDestination = (event) => {
    event.preventDefault()
    const lat = Number(destination.lat)
    const lon = Number(destination.lon)
    if (!destination.name.trim() || !isInIndia(lat, lon)) {
      toast.error('Enter a destination name and valid coordinates within India')
      return
    }
    const stop = {
      id: `manual-${Date.now()}`,
      sourceType: 'destination',
      name: destination.name.trim(),
      address: destination.address.trim() || 'Manual destination, India',
      lat, lon, urgency: 'medium', emoji: '📍',
    }
    setCustomStops(prev => [...prev, stop])
    setSelectedItems(prev => ({ ...prev, [stop.id]: true }))
    setDestination({ name: '', address: '', lat: '', lon: '' })
    toast.success('Indian destination added to the route')
  }

  const removeDestination = (id) => {
    setCustomStops(prev => prev.filter(stop => stop.id !== id))
    setSelectedItems(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setRouteResult(null)
    toast.success('Destination removed')
  }

  // Quick selection helpers
  const selectAll = () => {
    const next = {}
    candidateStops.forEach(s => { next[s.id] = true })
    setSelectedItems(next)
  }

  const selectBinsOnly = () => {
    const next = {}
    candidateStops.forEach(s => { next[s.id] = s.sourceType === 'bin' })
    setSelectedItems(next)
  }

  const selectReportsOnly = () => {
    const next = {}
    candidateStops.forEach(s => { next[s.id] = s.sourceType === 'report' })
    setSelectedItems(next)
  }

  // Dispatch driver action
  const handleDispatch = () => {
    setDispatched(true)
    toast.success('Route dispatched to Municipal Fleet Truck #4 (Driver notified)')
  }

  // Export Manifest as CSV/Text
  const handleExportManifest = () => {
    if (!routeResult || routeResult.stops.length === 0) return
    const rows = [
      ['Stop #', 'Type', 'Location / Name', 'Address', 'Latitude', 'Longitude', 'Est. Arrival (Min)'],
      ['0 (Start)', 'Depot', depot.name, 'Depot Base', depot.lat, depot.lon, '0'],
      ...routeResult.stops.map(s => [
        s.sequence,
        s.sourceType.toUpperCase(),
        s.name,
        `"${s.address.replace(/"/g, '""')}"`,
        s.lat,
        s.lon,
        s.estimatedArrivalMin,
      ]),
      [`${routeResult.stops.length + 1} (End)`, 'Depot', depot.name, 'Depot Return', depot.lat, depot.lon, routeResult.estimatedDurationMin],
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `municipal_route_manifest_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Manifest CSV downloaded')
  }

  return (
    <div className="space-y-6">
      {/* ── Top Header & KPI Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-token-primary">
              Municipal Route Optimizer
            </h2>
            <Badge variant="neutral" className="gap-1">
              <Truck size={12} /> Refuse Truck #4
            </Badge>
          </div>
          <p className="text-xs text-token-tertiary mt-0.5">
            India-only collection routing for priority bins, reports, and manually added destinations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportManifest}
            disabled={!routeResult}
            icon={<Download size={14} />}
          >
            Export Manifest
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOptimize}
            loading={optimizing}
            icon={!optimizing ? <RefreshCw size={14} /> : undefined}
          >
            Re-Optimize Route
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      {routeResult && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-3.5 bg-surface-card border border-token-default space-y-1">
            <div className="flex items-center justify-between text-token-tertiary text-xs">
              <span>Collection Stops</span>
              <MapPin size={14} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-token-primary tabular-nums">
              {routeResult.stops.length}
            </p>
            <p className="text-[11px] text-token-secondary">
              + 2 depot transitions
            </p>
          </div>

          <div className="card p-3.5 bg-surface-card border border-token-default space-y-1">
            <div className="flex items-center justify-between text-token-tertiary text-xs">
              <span>Total Distance</span>
              <Navigation size={14} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-token-primary tabular-nums">
              {routeResult.totalDistanceKm} <span className="text-xs font-normal text-token-tertiary">km</span>
            </p>
            <p className="text-[11px] text-green-600 dark:text-green-400 font-medium">
              Saved {routeResult.distanceSavedKm} km vs unoptimized
            </p>
          </div>

          <div className="card p-3.5 bg-surface-card border border-token-default space-y-1">
            <div className="flex items-center justify-between text-token-tertiary text-xs">
              <span>Est. Shift Time</span>
              <Clock size={14} className="text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-token-primary tabular-nums">
              {Math.floor(routeResult.estimatedDurationMin / 60)}h {routeResult.estimatedDurationMin % 60}m
            </p>
            <p className="text-[11px] text-token-secondary">
              Incl. 5m dwell per stop
            </p>
          </div>

          <div className="card p-3.5 bg-surface-card border border-token-default space-y-1">
            <div className="flex items-center justify-between text-token-tertiary text-xs">
              <span>Diesel Saved</span>
              <Fuel size={14} className="text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">
              {routeResult.fuelSavedLiters} <span className="text-xs font-normal text-token-tertiary">L</span>
            </p>
            <p className="text-[11px] text-green-600 dark:text-green-400">
              Avoids {routeResult.co2SavedKg} kg CO₂e
            </p>
          </div>
        </div>
      )}

      {/* ── Main Workspace: Map & Manifest Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left Map Canvas (2 Columns) ── */}
        <div className="lg:col-span-2 card p-0 overflow-hidden border border-token-default relative flex flex-col" style={{ minHeight: 480 }}>
          {/* Transparency Ribbon */}
          <div className="px-4 py-2 bg-bg-secondary border-b border-token-default flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-semibold text-token-primary">
                {routeResult?.routingSource === 'osrm'
                  ? '⚡ Live Street-Level Route (OSRM Driving Engine)'
                  : '📐 Geometric 2-Opt TSP Engine (24 km/h refuse truck model)'}
              </span>
            </div>
            <span className="text-token-tertiary text-[11px]">
              {FLEET_METRICS.FUEL_CONSUMPTION_L_PER_KM} L/km refuse baseline
            </span>
          </div>

          {/* Leaflet Map */}
          <div className="flex-1 relative" style={{ minHeight: 440 }}>
            <MapContainer
              center={[depot.lat, depot.lon]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {/* Depot Marker */}
              <Marker position={[depot.lat, depot.lon]} icon={depotIcon}>
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-blue-600">🏢 {depot.name}</p>
                    <p className="text-gray-500">Route Origin & Return Base</p>
                  </div>
                </Popup>
              </Marker>

              {/* Waypoint Markers */}
              {routeResult?.stops.map((stop) => (
                <Marker
                  key={stop.id}
                  position={[stop.lat, stop.lon]}
                  icon={createStopIcon(stop.sequence, stop.sourceType === 'report')}
                  eventHandlers={{ click: () => setActiveStop(stop) }}
                >
                  <Popup>
                    <div className="text-xs space-y-1 max-w-[200px]">
                      <p className="font-bold text-token-primary">
                        Stop #{stop.sequence}: {stop.name}
                      </p>
                      <p className="text-token-tertiary">{stop.address}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-medium text-blue-600">
                          ETA: +{stop.estimatedArrivalMin} min
                        </span>
                        <span>({stop.legDistanceKm} km leg)</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Polyline Trajectory */}
              {routeResult?.coordinates && routeResult.coordinates.length > 1 && (
                <>
                  {/* Outer glow stroke */}
                  <Polyline
                    positions={routeResult.coordinates}
                    pathOptions={{ color: '#2563EB', weight: 6, opacity: 0.35 }}
                  />
                  {/* Inner crisp line */}
                  <Polyline
                    positions={routeResult.coordinates}
                    pathOptions={{ color: '#1D4ED8', weight: 3.5, opacity: 0.95, dashArray: '6, 6' }}
                  />
                  <FitBounds coordinates={routeResult.coordinates} />
                </>
              )}
            </MapContainer>
          </div>
        </div>

        {/* ── Right Stop Manifest & Selection Panel (1 Column) ── */}
        <div className="card p-4 border border-token-default space-y-4 flex flex-col" style={{ maxHeight: 600 }}>
          <form onSubmit={addDestination} className="p-3 rounded-lg bg-bg-secondary border border-token-default space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-token-primary">Add Indian destination</h3>
              <span className="text-[10px] text-token-tertiary">India coordinates only</span>
            </div>
            <input required value={destination.name} onChange={e => setDestination(prev => ({ ...prev, name: e.target.value }))} placeholder="Destination name" className="w-full px-2 py-1.5 text-xs rounded border border-token-default bg-surface-card" />
            <input value={destination.address} onChange={e => setDestination(prev => ({ ...prev, address: e.target.value }))} placeholder="Address / locality" className="w-full px-2 py-1.5 text-xs rounded border border-token-default bg-surface-card" />
            <div className="grid grid-cols-2 gap-2">
              <input required type="number" step="any" value={destination.lat} onChange={e => setDestination(prev => ({ ...prev, lat: e.target.value }))} placeholder="Latitude" className="w-full px-2 py-1.5 text-xs rounded border border-token-default bg-surface-card" />
              <input required type="number" step="any" value={destination.lon} onChange={e => setDestination(prev => ({ ...prev, lon: e.target.value }))} placeholder="Longitude" className="w-full px-2 py-1.5 text-xs rounded border border-token-default bg-surface-card" />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="w-full" icon={<Plus size={13} />}>Add destination</Button>
            {customStops.length > 0 && (
              <div className="pt-1 space-y-1">
                {customStops.map(stop => (
                  <div key={stop.id} className="flex items-center gap-2 text-[11px] text-token-secondary">
                    <MapPin size={11} className="text-blue-500 shrink-0" />
                    <span className="truncate flex-1">{stop.name}</span>
                    <button type="button" onClick={() => removeDestination(stop.id)} className="p-0.5 text-red-500 hover:text-red-600" aria-label={`Remove ${stop.name}`}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </form>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-token-primary">
                Stop Manifest Sequence
              </h3>
              <span className="text-xs text-token-tertiary">
                {candidateStops.filter(s => selectedItems[s.id]).length} of {candidateStops.length} selected
              </span>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-1.5 mt-2 flex-wrap text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="px-2 py-1 rounded bg-bg-secondary border border-token-default hover:border-token-strong"
              >
                All
              </button>
              <button
                type="button"
                onClick={selectBinsOnly}
                className="px-2 py-1 rounded bg-bg-secondary border border-token-default hover:border-token-strong"
              >
                Bins ({candidateStops.filter(s => s.sourceType === 'bin').length})
              </button>
              <button
                type="button"
                onClick={selectReportsOnly}
                className="px-2 py-1 rounded bg-bg-secondary border border-token-default hover:border-token-strong"
              >
                Reports ({candidateStops.filter(s => s.sourceType === 'report').length})
              </button>
            </div>
          </div>

          {/* Ordered Manifest List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-token-subtle">
            {routeResult?.stops.map((stop) => (
              <div
                key={stop.id}
                onClick={() => setActiveStop(stop)}
                className={`pt-2 flex items-start gap-2.5 p-2 rounded-lg transition-colors cursor-pointer ${
                  activeStop?.id === stop.id ? 'bg-[var(--brand-subtle)] border border-green-500/30' : 'hover:bg-bg-overlay'
                }`}
              >
                {/* Sequence badge */}
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white ${
                  stop.sourceType === 'report' ? 'bg-red-600' : 'bg-blue-600'
                }`}>
                  {stop.sequence}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-token-primary truncate">
                      {stop.emoji} {stop.name}
                    </p>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                      +{stop.estimatedArrivalMin}m
                    </span>
                  </div>
                  <p className="text-[11px] text-token-tertiary truncate mt-0.5">
                    {stop.address}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-token-disabled">
                    <span>Leg: {stop.legDistanceKm} km</span>
                    {stop.fillLevel !== undefined && (
                      <span className="text-amber-500 font-medium">Fill: {stop.fillLevel}%</span>
                    )}
                    {stop.sourceType === 'destination' && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeDestination(stop.id) }} className="text-red-500 hover:text-red-600 font-medium">Remove</button>
                    )}
                  </div>
                </div>

                {/* Checkbox toggle */}
                <input
                  type="checkbox"
                  checked={!!selectedItems[stop.id]}
                  onChange={(e) => {
                    e.stopPropagation()
                    toggleItem(stop.id)
                  }}
                  className="rounded border-token-default mt-1"
                  aria-label={`Toggle stop ${stop.name}`}
                />
              </div>
            ))}
          </div>

          {/* Dispatch Driver Action */}
          <div className="pt-2 border-t border-token-default space-y-2">
            {!dispatched ? (
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={handleDispatch}
                icon={<Send size={15} />}
              >
                Dispatch Truck & Driver
              </Button>
            ) : (
              <div className="p-3 rounded-lg bg-green-500/15 border border-green-500/30 flex items-center justify-center gap-2 text-green-800 dark:text-green-300 text-xs font-semibold">
                <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                Truck #4 Dispatched (Active Tour)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
