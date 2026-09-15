import { useState, useCallback, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Navigation, MapPin, Loader2, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom red report pin marker
const reportPinIcon = new L.DivIcon({
  html: `
    <div style="
      width: 32px; height: 32px; border-radius: 50% 50% 50% 0;
      background: #EF4444; border: 3px solid white;
      transform: rotate(-45deg); transform-origin: center bottom;
      box-shadow: 0 3px 10px rgba(239,68,68,0.5);
      cursor: grab;
    "></div>
  `,
  className:  '',
  iconSize:   [32, 32],
  iconAnchor: [16, 32],
})

// Reverse geocode using Nominatim
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'BinIQ/1.0' },
    })
    const data = await res.json()
    if (data.display_name) {
      // Short version: road + suburb/city
      const parts = data.address || {}
      const short = [
        parts.road || parts.pedestrian || parts.footway,
        parts.suburb || parts.neighbourhood || parts.city_district || parts.town || parts.city,
      ].filter(Boolean).join(', ')
      return short || data.display_name.split(',').slice(0, 2).join(',').trim()
    }
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`
  }
}

// Component to fly map to a position
function FlyTo({ pos }) {
  const map = useMap()
  useEffect(() => {
    if (pos) map.flyTo([pos.lat, pos.lon], 16, { duration: 1.0 })
  }, [pos, map])
  return null
}

// Clickable map — moves pin on click
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lon: e.latlng.lng })
    },
  })
  return null
}

/**
 * LocationPicker — GPS auto-fill + map with draggable/clickable pin.
 *
 * @param {object}   value      - { lat, lon, address } or null
 * @param {function} onChange   - called with { lat, lon, address }
 * @param {string}   [error]
 * @param {boolean}  [disabled]
 */
export default function LocationPicker({ value, onChange, error, disabled = false }) {
  const [locating,    setLocating]    = useState(false)
  const [locError,    setLocError]    = useState(null)
  const [geocoding,   setGeocoding]   = useState(false)
  const [flyTarget,   setFlyTarget]   = useState(null)

  // Auto-locate on mount if no value set
  useEffect(() => {
    if (!value) handleLocate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLocate = useCallback(async () => {
    if (disabled) return
    setLocating(true)
    setLocError(null)
    try {
      await new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return }
        navigator.geolocation.getCurrentPosition(
          async ({ coords: { latitude: lat, longitude: lon } }) => {
            setGeocoding(true)
            const address = await reverseGeocode(lat, lon)
            setGeocoding(false)
            const loc = { lat, lon, address }
            onChange(loc)
            setFlyTarget(loc)
            resolve()
          },
          (err) => reject(new Error(err.code === 1 ? 'Location access denied' : 'Could not get location')),
          { timeout: 10000, maximumAge: 30000 }
        )
      })
    } catch (err) {
      setLocError(err.message)
    } finally {
      setLocating(false)
    }
  }, [disabled, onChange])

  const handleMapClick = useCallback(async (pos) => {
    if (disabled) return
    setGeocoding(true)
    const address = await reverseGeocode(pos.lat, pos.lon)
    setGeocoding(false)
    onChange({ ...pos, address })
  }, [disabled, onChange])

  const handleDrag = useCallback(async (e) => {
    if (disabled) return
    const { lat, lng: lon } = e.target.getLatLng()
    setGeocoding(true)
    const address = await reverseGeocode(lat, lon)
    setGeocoding(false)
    onChange({ lat, lon, address })
  }, [disabled, onChange])

  const defaultCenter = value
    ? [value.lat, value.lon]
    : [51.505, -0.09]  // London fallback

  return (
    <div className="space-y-3">
      {/* Address display + GPS button */}
      <div className="flex items-center gap-2">
        <div className={[
          'flex-1 flex items-center gap-2 h-10 px-3 rounded-md border text-sm',
          error ? 'border-red-400 bg-[var(--danger-subtle)]' : 'border-token-default bg-bg-primary',
          'text-token-primary',
        ].join(' ')}>
          <MapPin size={15} className={error ? 'text-red-400 shrink-0' : 'text-token-tertiary shrink-0'} />
          <span className={[
            'flex-1 truncate',
            value?.address ? '' : 'text-token-disabled',
          ].join(' ')}>
            {geocoding ? (
              <span className="flex items-center gap-1.5 text-token-tertiary">
                <Loader2 size={13} className="animate-spin" />
                Getting address…
              </span>
            ) : value?.address || 'No location set'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleLocate}
          disabled={disabled || locating}
          className="h-10 px-3 rounded-md border border-token-default text-token-secondary hover:text-token-primary hover:bg-bg-overlay transition-colors flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 shrink-0"
          aria-label="Use my location"
        >
          {locating
            ? <Loader2 size={15} className="animate-spin" />
            : <Navigation size={15} />}
          <span className="hidden sm:inline">
            {locating ? 'Locating…' : 'Use GPS'}
          </span>
        </button>
      </div>

      {/* Location error */}
      {locError && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle size={12} />
          {locError} — drag the pin to set location manually
        </p>
      )}

      {/* Validation error */}
      {error && !locError && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertTriangle size={12} />
          {error}
        </p>
      )}

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-token-default" style={{ height: 240 }}>
        <MapContainer
          center={defaultCenter}
          zoom={value ? 16 : 13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {flyTarget && <FlyTo pos={flyTarget} />}
          {!disabled && <ClickHandler onMapClick={handleMapClick} />}

          {value && (
            <Marker
              position={[value.lat, value.lon]}
              icon={reportPinIcon}
              draggable={!disabled}
              eventHandlers={{ dragend: handleDrag }}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-token-tertiary">
        {disabled ? 'Location locked' : 'Tap the map or drag the pin to adjust the exact location'}
      </p>
    </div>
  )
}
