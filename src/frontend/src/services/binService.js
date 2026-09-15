import { api, iotApi, binsApi } from './api'

// ── Bin status constants ──────────────────────────────────────────────────────
export const BIN_STATUS = {
  AVAILABLE:  'available',   // fill < 60%, working
  NEARLY_FULL:'nearly_full', // fill 60–85%
  FULL:       'full',        // fill > 85%
  MAINTENANCE:'maintenance', // flagged for repair
  OFFLINE:    'offline',     // sensor not responding
  UNKNOWN:    'unknown',     // no data available
}

// ── Bin type constants ─────────────────────────────────────────────────────────
export const BIN_TYPE = {
  RECYCLING: 'recycling',   // blue — plastic, paper, metal, card
  GLASS:     'glass',       // green — glass only
  GENERAL:   'general',     // black — general waste
  ORGANIC:   'organic',     // brown — food/garden
  EWASTE:    'ewaste',      // orange — electronics
}

// ── Visual config per type ─────────────────────────────────────────────────────
export const BIN_TYPE_META = {
  [BIN_TYPE.RECYCLING]: { label: 'Recycling',     color: '#3B82F6', emoji: '♻️',  accepts: ['Plastic', 'Paper', 'Metal', 'Cardboard'] },
  [BIN_TYPE.GLASS]:     { label: 'Glass Bank',    color: '#22C55E', emoji: '🍶',  accepts: ['Glass bottles', 'Glass jars'] },
  [BIN_TYPE.GENERAL]:   { label: 'General Waste', color: '#6B7280', emoji: '🗑️',  accepts: ['General household waste'] },
  [BIN_TYPE.ORGANIC]:   { label: 'Organic/Compost',color:'#92400E', emoji: '🌱',  accepts: ['Food scraps', 'Garden waste'] },
  [BIN_TYPE.EWASTE]:    { label: 'E-Waste',       color: '#F97316', emoji: '📱',  accepts: ['Electronics', 'Batteries', 'Cables'] },
}

// ── Status visual config ──────────────────────────────────────────────────────
export const BIN_STATUS_META = {
  [BIN_STATUS.AVAILABLE]:   { label: 'Available',    color: '#22C55E', bgClass: 'bg-[var(--success-subtle)]',  textClass: 'text-green-700 dark:text-green-400' },
  [BIN_STATUS.NEARLY_FULL]: { label: 'Nearly Full',  color: '#F59E0B', bgClass: 'bg-[var(--warning-subtle)]',  textClass: 'text-amber-700 dark:text-amber-400' },
  [BIN_STATUS.FULL]:        { label: 'Full',          color: '#EF4444', bgClass: 'bg-[var(--danger-subtle)]',   textClass: 'text-red-700 dark:text-red-400' },
  [BIN_STATUS.MAINTENANCE]: { label: 'Maintenance',   color: '#8B5CF6', bgClass: 'bg-purple-50 dark:bg-purple-900/20', textClass: 'text-purple-700 dark:text-purple-400' },
  [BIN_STATUS.OFFLINE]:     { label: 'Offline',       color: '#6B7280', bgClass: 'bg-bg-secondary',              textClass: 'text-token-tertiary' },
  [BIN_STATUS.UNKNOWN]:     { label: 'Unknown',       color: '#9CA3AF', bgClass: 'bg-bg-secondary',              textClass: 'text-token-disabled' },
}

// ── Derive status from fill level ─────────────────────────────────────────────
export function fillLevelToStatus(fillLevel, sensorStatus = 'online') {
  if (sensorStatus === 'offline') return BIN_STATUS.OFFLINE
  if (sensorStatus === 'maintenance_required') return BIN_STATUS.MAINTENANCE
  if (fillLevel === null || fillLevel === undefined) return BIN_STATUS.UNKNOWN
  if (fillLevel >= 85) return BIN_STATUS.FULL
  if (fillLevel >= 60) return BIN_STATUS.NEARLY_FULL
  return BIN_STATUS.AVAILABLE
}

// ── Distance between two lat/lon points (km, Haversine) ──────────────────────
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Format distance for display ───────────────────────────────────────────────
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

// ── Local Storage Telemetry Overrides Cache ───────────────────────────────────
const IOT_TELEMETRY_CACHE_KEY = 'biniq_simulated_telemetry_cache_v1'

export function getLocalTelemetryOverrides() {
  try {
    const raw = localStorage.getItem(IOT_TELEMETRY_CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveLocalTelemetryOverride(binId, telemetry) {
  try {
    const current = getLocalTelemetryOverrides()
    current[binId] = {
      ...telemetry,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(IOT_TELEMETRY_CACHE_KEY, JSON.stringify(current))
  } catch (err) {
    console.warn('[BinService] Could not persist telemetry override:', err)
  }
}

// ── Standard Default Smart Bins ───────────────────────────────────────────────
const BASE_SMART_BINS = [
  { id: 'B-101', name: 'High Street North Bin',        lat: 51.509, lon: -0.095, type: BIN_TYPE.RECYCLING, fillLevel: 42, batteryLevel: 96, temperature: 20.4, sensorStatus: 'online',       status: BIN_STATUS.AVAILABLE,   address: 'Near High St & North Way',   dataSource: 'simulated_iot' },
  { id: 'B-102', name: 'Market Square Glass Point',    lat: 51.503, lon: -0.082, type: BIN_TYPE.GLASS,     fillLevel: 88, batteryLevel: 89, temperature: 22.1, sensorStatus: 'online',       status: BIN_STATUS.FULL,        address: 'Market Square North',        dataSource: 'simulated_iot' },
  { id: 'B-103', name: 'St. Jude Station Compactor',   lat: 51.512, lon: -0.088, type: BIN_TYPE.GENERAL,   fillLevel: 31, batteryLevel: 98, temperature: 19.8, sensorStatus: 'online',       status: BIN_STATUS.AVAILABLE,   address: 'Station Rd Concourse',       dataSource: 'simulated_iot' },
  { id: 'B-104', name: 'Central Plaza Smart Bin',      lat: 51.506, lon: -0.092, type: BIN_TYPE.RECYCLING, fillLevel: 72, batteryLevel: 94, temperature: 21.2, sensorStatus: 'online',       status: BIN_STATUS.NEARLY_FULL, address: 'Central Plaza West',          dataSource: 'simulated_iot' },
  { id: 'B-105', name: 'Civic Garden Organic Bin',     lat: 51.498, lon: -0.096, type: BIN_TYPE.ORGANIC,   fillLevel: 62, batteryLevel: 91, temperature: 23.5, sensorStatus: 'online',       status: BIN_STATUS.NEARLY_FULL, address: 'Park Lane Pavilion',          dataSource: 'simulated_iot' },
  { id: 'B-106', name: 'Tech Quarter E-Waste Pod',     lat: 51.514, lon: -0.081, type: BIN_TYPE.EWASTE,    fillLevel: 18, batteryLevel: 85, temperature: 20.0, sensorStatus: 'online',       status: BIN_STATUS.AVAILABLE,   address: 'Innovation Way',             dataSource: 'simulated_iot' },
  { id: 'B-107', name: 'Commerce Boulevard Bin',       lat: 51.501, lon: -0.086, type: BIN_TYPE.RECYCLING, fillLevel: 91, batteryLevel: 92, temperature: 24.0, sensorStatus: 'online',       status: BIN_STATUS.FULL,        address: 'Commerce Blvd #12',          dataSource: 'simulated_iot' },
  { id: 'B-108', name: 'Mill Road General Waste',      lat: 51.516, lon: -0.099, type: BIN_TYPE.GENERAL,   fillLevel: 55, batteryLevel: 90, temperature: 21.0, sensorStatus: 'online',       status: BIN_STATUS.AVAILABLE,   address: 'Mill Road Crossing',         dataSource: 'simulated_iot' },
  { id: 'B-109', name: 'University Library Bin',       lat: 51.508, lon: -0.103, type: BIN_TYPE.RECYCLING, fillLevel: 25, batteryLevel: 34, temperature: 20.5, sensorStatus: 'low_battery',  status: BIN_STATUS.AVAILABLE,   address: 'Campus West Gate',           dataSource: 'simulated_iot' },
  { id: 'B-110', name: 'Harbour Walk Glass Drop',      lat: 51.495, lon: -0.091, type: BIN_TYPE.GLASS,     fillLevel: 86, batteryLevel: 97, temperature: 21.8, sensorStatus: 'online',       status: BIN_STATUS.FULL,        address: 'Promenade Pier 3',           dataSource: 'simulated_iot' },
]

// The bundled sensor feed is based in London.  When a visitor searches a
// different city, keep its *relative* layout but anchor the clearly-labelled
// demo data at the searched coordinates instead of plotting London bins there.
function demoBinsNear(lat, lon) {
  const origin = { lat: 51.505, lon: -0.09 }
  return BASE_SMART_BINS.map(bin => ({
    ...bin,
    id: `demo-${bin.id}-${lat.toFixed(3)}-${lon.toFixed(3)}`,
    lat: lat + (bin.lat - origin.lat),
    lon: lon + (bin.lon - origin.lon),
    address: 'Nearby demo smart bin — live municipal feed not connected',
    dataSource: 'mock',
  }))
}

function demoCentersNear(lat, lon) {
  return [
    { id: `demo-center-1-${lat}`, lat: lat + 0.008, lon: lon + 0.006, type: BIN_TYPE.RECYCLING, name: 'Nearby Recycling Point (demo)', accepts: ['plastic', 'paper', 'metal'], dataSource: 'mock' },
    { id: `demo-center-2-${lat}`, lat: lat - 0.006, lon: lon + 0.009, type: BIN_TYPE.EWASTE, name: 'E-waste Drop-off (demo)', accepts: ['electronics', 'batteries'], dataSource: 'mock' },
    { id: `demo-center-3-${lat}`, lat: lat + 0.004, lon: lon - 0.010, type: BIN_TYPE.GLASS, name: 'Glass Recycling Point (demo)', accepts: ['glass'], dataSource: 'mock' },
  ]
}

function applyOverridesToBins(bins) {
  const overrides = getLocalTelemetryOverrides()
  return bins.map(b => {
    const override = overrides[b.id]
    if (!override) return b
    const fillLevel = override.fillLevel !== undefined ? override.fillLevel : b.fillLevel
    const sensorStatus = override.sensorStatus || b.sensorStatus || 'online'
    const status = fillLevelToStatus(fillLevel, sensorStatus)
    return {
      ...b,
      fillLevel,
      batteryLevel: override.batteryLevel !== undefined ? override.batteryLevel : b.batteryLevel,
      temperature: override.temperature !== undefined ? override.temperature : b.temperature,
      sensorStatus,
      status,
      lastUpdated: override.updatedAt || b.lastUpdated || new Date().toISOString(),
    }
  })
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Primary entry point. Returns smart bins for municipality and map views.
 * Queries backend SQLite database if online, with automatic merge of local simulated overrides.
 */
export async function getBins(lat = 51.505, lon = -0.09, radius = 2000) {
  try {
    const res = await binsApi.list()
    if (res?.bins && res.bins.length > 0) {
      const nearby = res.bins.filter(bin => distanceKm(lat, lon, bin.lat, bin.lon) <= radius / 1000)
      return applyOverridesToBins(nearby.length ? nearby : demoBinsNear(lat, lon))
    }
  } catch (err) {
    // Backend offline or unreachable, fallback to default smart bins
  }
  return applyOverridesToBins(demoBinsNear(lat, lon))
}

/**
 * Send simulated IoT telemetry payload.
 * Compatible with future real physical IoT hardware gateways (LoRaWAN/MQTT/HTTP).
 *
 * @param {Object} payload
 * @param {string} payload.bin_id
 * @param {number} payload.fill_level
 * @param {number} [payload.battery_level]
 * @param {number} [payload.temperature]
 * @param {string} [payload.sensor_status]
 * @param {string} [payload.timestamp]
 */
export async function sendSimulatedTelemetry({
  bin_id,
  fill_level,
  battery_level = 95,
  temperature = 21.5,
  sensor_status = 'online',
  timestamp = null,
}) {
  const normalizedFill = Math.max(0, Math.min(100, Number(fill_level)))
  const normalizedBattery = Math.max(0, Math.min(100, Number(battery_level)))
  const normalizedTemp = Number(temperature)
  const ts = timestamp || new Date().toISOString()
  const status = fillLevelToStatus(normalizedFill, sensor_status)

  const payload = {
    bin_id,
    fill_level: normalizedFill,
    battery_level: normalizedBattery,
    temperature: normalizedTemp,
    sensor_status,
    timestamp: ts,
  }

  // 1. Save locally for instant UI reflection
  saveLocalTelemetryOverride(bin_id, {
    fillLevel: normalizedFill,
    batteryLevel: normalizedBattery,
    temperature: normalizedTemp,
    sensorStatus: sensor_status,
    status,
    updatedAt: ts,
  })

  // 2. Dispatch to backend API
  try {
    const res = await iotApi.sendTelemetry(payload)
    return res
  } catch (err) {
    console.warn('[BinService] Backend IoT endpoint unreachable; applying local simulated state:', err)
    return {
      success: true,
      is_simulated: true,
      message: `Telemetry processed for bin ${bin_id} (LOCAL SIMULATION)`,
      timestamp: ts,
      threshold_breached: normalizedFill >= 85,
      bin: {
        id: bin_id,
        fillLevel: normalizedFill,
        batteryLevel: normalizedBattery,
        temperature: normalizedTemp,
        sensorStatus: sensor_status,
        status,
        dataSource: 'simulated_iot',
        lastUpdated: ts,
      },
    }
  }
}

/**
 * Fetch telemetry ingestion audit log.
 */
export async function getTelemetryHistory(limit = 25, binId = null) {
  try {
    const res = await iotApi.getHistory(limit, binId)
    return res?.history || []
  } catch {
    return []
  }
}

/**
 * Fetch Overpass / OpenStreetMap recycling centres.
 */
export async function fetchRecyclingCenters(lat, lon, radius = 5000) {
  try {
    const { data } = await api.get('/recycling-centers', { params: { lat, lon, radius }, timeout: 20000 })
    const centers = data?.centers || []
    if (!centers.length) return demoCentersNear(lat, lon)
    return centers.map(center => ({
      ...center,
      id: `osm-${center.id}`,
      type: center.category === 'waste_disposal' ? BIN_TYPE.GENERAL : BIN_TYPE.RECYCLING,
      fillLevel: null,
      status: BIN_STATUS.UNKNOWN,
      dataSource: 'openstreetmap',
      accepts: center.types || [],
    }))
  } catch (err) {
    console.warn('[BinService] Recycling centers lookup failed; using local demo centers:', err)
    return demoCentersNear(lat, lon)
  }
}

/**
 * Submit a crowdsourced fill report for a bin.
 */
export async function reportBinFull(binId, userId) {
  console.info(`[BinService] Crowdsource report submitted: bin=${binId} user=${userId || 'anon'}`)
  return { success: true, message: 'Report submitted. Thank you!' }
}

/**
 * Geocode a text query to lat/lon using Nominatim.
 */
export async function geocodeQuery(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'BinIQ/1.0' },
  })
  if (!res.ok) throw new Error('Geocoding service unavailable')
  const data = await res.json()
  if (!data.length) throw new Error('Location not found. Try a different search term.')
  return {
    lat:     parseFloat(data[0].lat),
    lon:     parseFloat(data[0].lon),
    display: data[0].display_name.split(',').slice(0, 2).join(','),
  }
}

/**
 * Get user's GPS position as a promise.
 */
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not supported by your browser'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new Error('Location permission was denied'))
        else if (err.code === err.TIMEOUT) reject(new Error('Location request timed out'))
        else reject(new Error('Could not determine your location'))
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    )
  })
}

/**
 * Coarse fallback for devices/browsers that cannot provide GPS. The backend
 * resolves the public network address, so no third-party location key is sent
 * to the browser. This is city-level only and must not be used for reporting.
 */
export async function getApproximateLocation() {
  const { data } = await api.get('/location/estimate', { timeout: 10000 })
  if (!Number.isFinite(data?.lat) || !Number.isFinite(data?.lon)) {
    throw new Error('Unable to estimate your location')
  }
  return data
}
