import { useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  BIN_STATUS, BIN_STATUS_META, BIN_TYPE_META,
} from '../../services/binService'

// ── Fix Leaflet default icon (Vite build issue) ───────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Tile layers (light + dark) ─────────────────────────────────────────────────
export const TILE_LAYERS = {
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  dark: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
}

// ── Custom SVG marker factory ─────────────────────────────────────────────────
/**
 * Creates a Leaflet DivIcon with:
 * - outer circle in type color
 * - status ring (pulsing if full/maintenance)
 * - emoji or text center
 *
 * All markers are pure SVG — no external images required.
 */
function makeBinMarker(bin, isSelected = false) {
  const typeMeta   = BIN_TYPE_META[bin.type]   || { color: '#6B7280', emoji: '🗑️' }
  const statusMeta = BIN_STATUS_META[bin.status] || BIN_STATUS_META[BIN_STATUS.UNKNOWN]
  const color      = typeMeta.color
  const size       = isSelected ? 40 : 34

  // Ring color based on status
  const ringColor = {
    [BIN_STATUS.AVAILABLE]:   color,
    [BIN_STATUS.NEARLY_FULL]: '#F59E0B',
    [BIN_STATUS.FULL]:        '#EF4444',
    [BIN_STATUS.MAINTENANCE]: '#8B5CF6',
    [BIN_STATUS.OFFLINE]:     '#6B7280',
    [BIN_STATUS.UNKNOWN]:     '#9CA3AF',
  }[bin.status] || color

  // Pulse animation for full/maintenance
  const pulse = bin.status === BIN_STATUS.FULL || bin.status === BIN_STATUS.MAINTENANCE
  const pulseStyle = pulse
    ? `@keyframes binPulse{0%,100%{box-shadow:0 0 0 0 ${ringColor}60}50%{box-shadow:0 0 0 6px ${ringColor}00}}`
    : ''

  // Opacity for offline/unknown
  const opacity = bin.status === BIN_STATUS.OFFLINE ? 0.5
    : bin.status === BIN_STATUS.UNKNOWN ? 0.7
    : 1.0

  const html = `
    <style>${pulseStyle}</style>
    <div style="
      width:${size}px; height:${size}px;
      border-radius:50%;
      background:${color};
      border: 3px solid ${ringColor};
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      display:flex; align-items:center; justify-content:center;
      font-size:${size * 0.42}px; line-height:1;
      opacity:${opacity};
      cursor:pointer;
      transition: transform 150ms;
      ${pulse ? `animation: binPulse 1.8s ease-in-out infinite;` : ''}
      ${isSelected ? `transform: scale(1.15); box-shadow: 0 4px 16px rgba(0,0,0,0.4), 0 0 0 3px white;` : ''}
    ">
      ${typeMeta.emoji}
    </div>
  `

  return new L.DivIcon({
    html,
    className:  '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor:[0, -(size / 2 + 4)],
  })
}

// ── User location marker ──────────────────────────────────────────────────────
const userLocationIcon = new L.DivIcon({
  html: `
    <div style="position:relative; width:20px; height:20px;">
      <div style="
        position:absolute; inset:0; border-radius:50%;
        background:rgba(59,130,246,0.2);
        animation: userPing 2s ease-out infinite;
      "></div>
      <div style="
        position:absolute; inset:4px; border-radius:50%;
        background:#3B82F6; border:2.5px solid white;
        box-shadow:0 2px 6px rgba(59,130,246,0.6);
      "></div>
    </div>
    <style>@keyframes userPing{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.4);opacity:0}}</style>
  `,
  className:  '',
  iconSize:   [20, 20],
  iconAnchor: [10, 10],
})

// ── Recycling center marker ───────────────────────────────────────────────────
function makeOSMMarker() {
  return new L.DivIcon({
    html: `
      <div style="
        width:28px; height:28px; border-radius:50%;
        background:#3B82F6; border:2.5px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
        display:flex; align-items:center; justify-content:center;
        font-size:13px; cursor:pointer;
      ">♻️</div>
    `,
    className:  '',
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
  })
}

// ── FlyTo helper ──────────────────────────────────────────────────────────────
function FlyTo({ target, zoom = 15 }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], zoom, { duration: 1.1 })
  }, [target, zoom, map])
  return null
}

// ── Map click dismiss ─────────────────────────────────────────────────────────
function MapClickDismiss({ onMapClick }) {
  useMapEvents({ click: onMapClick })
  return null
}

// ── Main BinMap component ─────────────────────────────────────────────────────
/**
 * @param {Array}        bins           - bin objects from binService
 * @param {Array}        centers        - OSM recycling centers
 * @param {object|null}  userLocation   - { lat, lon } or null
 * @param {object|null}  flyTarget      - { lat, lon } to fly to
 * @param {object|null}  selectedBin    - currently selected bin (gets larger marker)
 * @param {boolean}      showBins       - toggle bin layer
 * @param {boolean}      showCenters    - toggle OSM centers layer
 * @param {string}       tileTheme      - 'light' | 'dark'
 * @param {function}     onBinClick     - (bin) => void
 * @param {function}     onCenterClick  - (center) => void
 * @param {function}     onMapClick     - () => void (dismiss selection)
 */
export default function BinMap({
  bins         = [],
  centers      = [],
  userLocation = null,
  flyTarget    = null,
  selectedBin  = null,
  showBins     = true,
  showCenters  = true,
  tileTheme    = 'light',
  onBinClick,
  onCenterClick,
  onMapClick,
}) {
  const defaultCenter = userLocation
    ? [userLocation.lat, userLocation.lon]
    : [51.505, -0.09] // London fallback

  const tile = TILE_LAYERS[tileTheme] || TILE_LAYERS.light

  return (
    <MapContainer
      center={defaultCenter}
      zoom={userLocation ? 15 : 12}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url={tile.url}
        attribution={tile.attribution}
        maxZoom={19}
      />

      {/* Zoom control positioned top-right to avoid nav overlap */}
      <ZoomControl />

      {/* Fly to location */}
      {flyTarget && <FlyTo target={flyTarget} />}

      {/* Dismiss on map click */}
      {onMapClick && <MapClickDismiss onMapClick={onMapClick} />}

      {/* User location dot */}
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lon]}
          icon={userLocationIcon}
          zIndexOffset={1000}
        />
      )}

      {/* Bin markers */}
      {showBins && bins.map(bin => (
        <Marker
          key={bin.id}
          position={[bin.lat, bin.lon]}
          icon={makeBinMarker(bin, selectedBin?.id === bin.id)}
          zIndexOffset={selectedBin?.id === bin.id ? 900 : 100}
          eventHandlers={{
            click: (e) => {
              e.originalEvent.stopPropagation()
              onBinClick?.(bin)
            },
          }}
        />
      ))}

      {/* OSM recycling center markers */}
      {showCenters && centers.map(center => (
        <Marker
          key={center.id}
          position={[center.lat, center.lon]}
          icon={makeOSMMarker()}
          zIndexOffset={50}
          eventHandlers={{
            click: (e) => {
              e.originalEvent.stopPropagation()
              onCenterClick?.(center)
            },
          }}
        />
      ))}
    </MapContainer>
  )
}

// ── Inline zoom control component ─────────────────────────────────────────────
function ZoomControl() {
  const map = useMap()
  return (
    <div
      style={{
        position:  'absolute',
        top:       12,
        right:     12,
        zIndex:    1000,
        display:   'flex',
        flexDirection: 'column',
        gap:       4,
      }}
    >
      {[{ label: '+', action: () => map.zoomIn() }, { label: '−', action: () => map.zoomOut() }].map(({ label, action }) => (
        <button
          key={label}
          onClick={action}
          style={{
            width:        32,
            height:       32,
            borderRadius: 6,
            background:   'var(--surface-raised)',
            border:       '1px solid var(--border-default)',
            color:        'var(--text-primary)',
            fontSize:     18,
            fontWeight:   500,
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            boxShadow:    '0 1px 4px rgba(0,0,0,0.12)',
          }}
          aria-label={label === '+' ? 'Zoom in' : 'Zoom out'}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
