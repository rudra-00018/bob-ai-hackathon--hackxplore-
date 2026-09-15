import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, Sparkles } from 'lucide-react'

/**
 * BoundingBoxOverlay Component
 * 
 * Renders spatial bounding boxes over an image preview for multi-object detections.
 * Supports normalized [ymin, xmin, ymax, xmax] (0..1 or 0..100) or [x, y, width, height] format.
 * 
 * @param {string} imageUrl - Source image URL or base64 data
 * @param {Array} detections - List of detected objects with bounding boxes
 * @param {string|null} selectedId - Currently focused detection ID
 * @param {Function} onSelectDetection - Callback when user taps or hovers a detection
 */
export default function BoundingBoxOverlay({
  imageUrl,
  detections = [],
  selectedId = null,
  onSelectDetection,
}) {
  const [hoveredId, setHoveredId] = useState(null)

  if (!imageUrl) return null

  const activeId = selectedId || hoveredId

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-token-default shadow-md select-none group">
      {/* Background Image */}
      <img
        src={imageUrl}
        alt="Scanned Waste Sample"
        className="w-full h-auto max-h-[420px] object-contain mx-auto block"
      />

      {/* Bounding Boxes Layer */}
      {detections.map((det, index) => {
        // Parse bounding coordinates
        // Supports: [ymin, xmin, ymax, xmax] normalized (0..1 or 0..100)
        let top = 0, left = 0, width = 0, height = 0

        if (Array.isArray(det.box)) {
          if (det.box.length === 4) {
            let [y1, x1, y2, x2] = det.box
            // If values are <= 1, convert to percentage
            if (y1 <= 1 && y2 <= 1 && x1 <= 1 && x2 <= 1) {
              y1 *= 100
              y2 *= 100
              x1 *= 100
              x2 *= 100
            }
            top = Math.min(y1, y2)
            left = Math.min(x1, x2)
            width = Math.abs(x2 - x1)
            height = Math.abs(y2 - y1)
          }
        } else if (det.box && typeof det.box === 'object') {
          top = det.box.top || det.box.y || 0
          left = det.box.left || det.box.x || 0
          width = det.box.width || det.box.w || 0
          height = det.box.height || det.box.h || 0
        }

        const isSelected = activeId === (det.id || `det-${index}`)
        const color = det.color || (det.recyclable ? '#3B82F6' : '#EF4444')
        const emoji = det.emoji || (det.recyclable ? '♻️' : '🗑️')

        return (
          <motion.div
            key={det.id || index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, delay: index * 0.08 }}
            onClick={() => onSelectDetection && onSelectDetection(det.id || `det-${index}`)}
            onMouseEnter={() => setHoveredId(det.id || `det-${index}`)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              top: `${top}%`,
              left: `${left}%`,
              width: `${width}%`,
              height: `${height}%`,
              borderColor: color,
            }}
            className={[
              'absolute border-2 rounded-lg cursor-pointer transition-all duration-150',
              isSelected
                ? 'ring-4 ring-white/60 bg-white/10 shadow-lg z-20'
                : 'hover:bg-white/5 opacity-85 hover:opacity-100 z-10',
            ].join(' ')}
          >
            {/* Box Tag Pill */}
            <div
              style={{ backgroundColor: color }}
              className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-md flex items-center gap-1 whitespace-nowrap z-30"
            >
              <span>{emoji}</span>
              <span className="capitalize">{det.label || det.category}</span>
              {det.confidence && (
                <span className="text-[9px] opacity-90 font-mono bg-black/30 px-1 py-0.2 rounded ml-0.5">
                  {Math.round(det.confidence > 1 ? det.confidence : det.confidence * 100)}%
                </span>
              )}
            </div>

            {/* Corner Markers */}
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border border-black rounded-sm" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border border-black rounded-sm" />
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border border-black rounded-sm" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-black rounded-sm" />
          </motion.div>
        )
      })}

      {/* Top Banner Tag */}
      {detections.length > 0 && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-semibold z-20 border border-white/20">
          <Sparkles size={13} className="text-purple-400" />
          <span>{detections.length} Items Detected</span>
        </div>
      )}
    </div>
  )
}
