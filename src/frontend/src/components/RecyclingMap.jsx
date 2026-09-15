/**
 * RecyclingMap — legacy component (kept for Scanner page "Find Bins" tab)
 * Rewritten to use CSS design tokens instead of old theme object API.
 * For the full map experience, see pages/app/MapPage.jsx
 */
import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useEffect as _ue } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Search, Loader2, Navigation } from 'lucide-react'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const makeIcon = (color) => new L.DivIcon({
  html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)">♻️</div>`,
  className: '', iconSize: [30, 30], iconAnchor: [15, 15],
})

const userIcon = new L.DivIcon({
  html: '<div style="background:#3B82F6;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.25)"></div>',
  className: '', iconSize: [14, 14], iconAnchor: [7, 7],
})

const CAT_COLOR = {
  recycling: '#22C55E', waste_disposal: '#6B7280',
  transfer_station: '#F59E0B', reuse: '#8B5CF6',
}
const CAT_LABEL = {
  recycling: 'Recycling Point', waste_disposal: 'Waste Disposal',
  transfer_station: 'Transfer Station', reuse: 'Reuse / Charity',
}

function FlyTo({ pos }) {
  const map = useMap()
  useEffect(() => { if (pos) map.flyTo(pos, 14, { duration: 1.2 }) }, [pos, map])
  return null
}

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'BinIQ/1.0' } })
  const data = await res.json()
  if (!data.length) throw new Error('Location not found')
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name }
}

async function fetchCenters(lat, lon, radius = 5000) {
  const q = `[out:json][timeout:20];(node["amenity"="recycling"](around:${radius},${lat},${lon});node["recycling_type"="centre"](around:${radius},${lat},${lon});node["amenity"="waste_disposal"](around:${radius},${lat},${lon});way["amenity"="recycling"](around:${radius},${lat},${lon}););out center body;`
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(q)}`,
  })
  if (!res.ok) throw new Error(`Overpass error ${res.status}`)
  const json = await res.json()
  return (json.elements || []).map(el => {
    const tags = el.tags || {}
    const elat = el.lat ?? el.center?.lat
    const elon = el.lon ?? el.center?.lon
    if (!elat || !elon) return null
    const amenity = tags.amenity || ''
    let category = 'recycling'
    if (amenity === 'waste_disposal') category = 'waste_disposal'
    const name = tags.name || tags.operator || tags.brand || CAT_LABEL[category]
    const types = Object.keys(tags).filter(k => k.startsWith('recycling:') && tags[k] === 'yes').map(k => k.replace('recycling:', ''))
    return { id: el.id, lat: elat, lon: elon, name, category, types: types.slice(0, 5), opening_hours: tags.opening_hours || '', phone: tags.phone || '' }
  }).filter(Boolean).slice(0, 50)
}

export default function RecyclingMap() {
  const [query,   setQuery]   = useState('')
  const [pos,     setPos]     = useState(null)
  const [label,   setLabel]   = useState('')
  const [centers, setCenters] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const search = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true); setError(null); setCenters([])
    try {
      const { lat, lon, display } = await geocode(query)
      setPos([lat, lon]); setLabel(display)
      const results = await fetchCenters(lat, lon)
      setCenters(results)
      if (!results.length) setError('No recycling locations found within 5 km.')
    } catch (e) {
      setError(e.message || 'Search failed.')
    } finally { setLoading(false) }
  }

  const useGPS = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return }
    setLoading(true); setError(null); setCenters([])
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        setPos([lat, lon]); setLabel('Your location')
        try {
          const results = await fetchCenters(lat, lon)
          setCenters(results)
          if (!results.length) setError('No recycling locations found within 5 km.')
        } catch (e) { setError(e.message) }
        finally { setLoading(false) }
      },
      () => { setError('Location access denied.'); setLoading(false) },
      { timeout: 10000 }
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-token-primary mb-1">Find Nearby Recycling Locations</h2>
        <p className="text-xs text-token-tertiary mb-3">Search any city or address — powered by OpenStreetMap</p>
        <form onSubmit={search} className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-token-disabled pointer-events-none" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. Mumbai, London, New York…"
              className="input-base pl-9"
            />
          </div>
          <button type="submit" disabled={loading || !query.trim()}
            className="px-4 rounded-md bg-green-500 hover:bg-green-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Search
          </button>
          <button type="button" onClick={useGPS} disabled={loading}
            className="w-10 rounded-md border border-token-default text-token-tertiary hover:text-token-primary hover:bg-bg-overlay disabled:opacity-50 flex items-center justify-center transition-colors"
            title="Use GPS"
          >
            <Navigation size={15} />
          </button>
        </form>
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-md text-sm bg-[var(--danger-subtle)] text-red-600 dark:text-red-400 border border-[var(--danger-border)]">
          {error}
        </div>
      )}

      <div className="rounded-lg overflow-hidden border border-token-default" style={{ height: 380 }}>
        <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }} zoomControl>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {pos && (
            <>
              <FlyTo pos={pos} />
              <Marker position={pos} icon={userIcon}>
                <Popup><b>Search location</b><br /><span style={{ fontSize: 11 }}>{label}</span></Popup>
              </Marker>
            </>
          )}
          {centers.map(c => (
            <Marker key={c.id} position={[c.lat, c.lon]} icon={makeIcon(CAT_COLOR[c.category] || '#22C55E')}>
              <Popup>
                <div style={{ minWidth: 170 }}>
                  <p style={{ fontWeight: 700, marginBottom: 3 }}>{c.name}</p>
                  <p style={{ color: '#6B7280', fontSize: 12, marginBottom: 3 }}>{CAT_LABEL[c.category]}</p>
                  {c.types.length > 0 && <p style={{ fontSize: 11 }}>Accepts: {c.types.join(', ')}</p>}
                  {c.opening_hours && <p style={{ fontSize: 11, color: '#6B7280' }}>Hours: {c.opening_hours}</p>}
                  <a href={`https://www.google.com/maps?q=${c.lat},${c.lon}`} target="_blank" rel="noreferrer"
                    style={{ color: '#22C55E', fontSize: 11, display: 'block', marginTop: 5 }}>
                    Get directions →
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {centers.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <p className="text-xs font-semibold text-token-tertiary">
            {centers.length} location{centers.length !== 1 ? 's' : ''} near {query || 'your location'}
          </p>
          {centers.map(c => (
            <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary border border-token-default">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                style={{ background: (CAT_COLOR[c.category] || '#22C55E') + '20', color: CAT_COLOR[c.category] || '#22C55E' }}>
                ♻️
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-token-primary truncate">{c.name}</p>
                <p className="text-xs text-token-tertiary">{CAT_LABEL[c.category]}</p>
                {c.types.length > 0 && <p className="text-xs text-token-disabled truncate">Accepts: {c.types.join(', ')}</p>}
              </div>
              <a href={`https://www.google.com/maps?q=${c.lat},${c.lon}`} target="_blank" rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-md font-semibold shrink-0 bg-[var(--brand-subtle)] text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                Directions
              </a>
            </div>
          ))}
        </div>
      )}

      {!pos && !loading && (
        <p className="text-center text-sm text-token-tertiary py-4">
          Enter a location above to find nearby recycling points
        </p>
      )}
    </div>
  )
}
