/**
 * BinIQ — Municipal Route Optimization Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Clean routing abstraction for municipal waste collection trucks.
 * Solves Traveling Salesperson Problem (TSP) using Nearest Neighbor + 2-opt
 * with OSRM (Open Source Routing Machine) street-level driving geometry and
 * reliable deterministic geometric fallback.
 *
 * Fuel & Emissions Methodology:
 * - Average urban refuse collection vehicle (RCV) fuel consumption: 0.35 L/km (35 L/100km).
 * - Diesel emissions conversion factor: 2.68 kg CO₂e/L (EPA & DEFRA UK GHG Standards).
 * - Service dwell time per collection stop: 5.0 minutes.
 * - Average municipal truck speed in urban traffic: 24 km/h (0.4 km/min).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { distanceKm } from './binService'

// Municipal constants based on real urban fleet benchmarks
export const FLEET_METRICS = {
  FUEL_CONSUMPTION_L_PER_KM: 0.35, // Refuse truck diesel consumption
  DIESEL_CO2_KG_PER_L: 2.68,        // EPA standard diesel carbon factor
  AVG_URBAN_SPEED_KMH: 24,          // Urban collection speed
  STOP_SERVICE_TIME_MIN: 5.0,       // Service / bin tipping duration per stop
}

/**
 * Solves TSP using Nearest Neighbor heuristic starting from depot,
 * followed by 2-Opt local search refinement.
 */
export function solveTSP(startPoint, waypoints) {
  if (!waypoints || waypoints.length === 0) return []
  if (waypoints.length === 1) return [waypoints[0]]

  const unvisited = [...waypoints]
  const tour = []
  let current = startPoint

  // Nearest Neighbor pass
  while (unvisited.length > 0) {
    let nearestIdx = 0
    let nearestDist = Infinity

    for (let i = 0; i < unvisited.length; i++) {
      const d = distanceKm(current.lat, current.lon, unvisited[i].lat, unvisited[i].lon)
      if (d < nearestDist) {
        nearestDist = d
        nearestIdx = i
      }
    }

    const nextStop = unvisited.splice(nearestIdx, 1)[0]
    tour.push(nextStop)
    current = nextStop
  }

  // 2-Opt local optimization pass
  let improved = true
  let iterations = 0
  const maxIterations = 50

  const calculateTourDistance = (t) => {
    let sum = distanceKm(startPoint.lat, startPoint.lon, t[0].lat, t[0].lon)
    for (let i = 0; i < t.length - 1; i++) {
      sum += distanceKm(t[i].lat, t[i].lon, t[i + 1].lat, t[i + 1].lon)
    }
    sum += distanceKm(t[t.length - 1].lat, t[t.length - 1].lon, startPoint.lat, startPoint.lon)
    return sum
  }

  while (improved && iterations < maxIterations) {
    improved = false
    iterations++
    for (let i = 0; i < tour.length - 1; i++) {
      for (let k = i + 1; k < tour.length; k++) {
        const currentDist = calculateTourDistance(tour)
        // 2-opt swap
        const newTour = [
          ...tour.slice(0, i),
          ...tour.slice(i, k + 1).reverse(),
          ...tour.slice(k + 1),
        ]
        const newDist = calculateTourDistance(newTour)
        if (newDist < currentDist - 0.001) {
          tour.splice(0, tour.length, ...newTour)
          improved = true
          break
        }
      }
      if (improved) break
    }
  }

  return tour
}

/**
 * Calculates straight-line baseline distance if stops were visited in arbitrary arrival order
 */
function calculateBaselineDistance(depot, stops) {
  if (stops.length === 0) return 0
  let dist = distanceKm(depot.lat, depot.lon, stops[0].lat, stops[0].lon)
  for (let i = 0; i < stops.length - 1; i++) {
    dist += distanceKm(stops[i].lat, stops[i].lon, stops[i + 1].lat, stops[i + 1].lon)
  }
  dist += distanceKm(stops[stops.length - 1].lat, stops[stops.length - 1].lon, depot.lat, depot.lon)
  return dist
}

/**
 * Fetches real driving route from OSRM demo API with fallback to geometric calculation
 */
export async function optimizeMunicipalRoute(depot, items) {
  const isInIndia = (point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lon)
    && point.lat >= 6 && point.lat <= 37 && point.lon >= 68 && point.lon <= 98
  if (!isInIndia(depot) || items.some(item => !isInIndia(item))) {
    throw new Error('Municipal route optimization supports destinations within India only')
  }
  if (!items || items.length === 0) {
    return {
      stops: [],
      coordinates: [],
      totalDistanceKm: 0,
      estimatedDurationMin: 0,
      dieselLiters: 0,
      carbonKg: 0,
      baselineDistanceKm: 0,
      distanceSavedKm: 0,
      fuelSavedLiters: 0,
      co2SavedKg: 0,
      routingSource: 'none',
    }
  }

  // Baseline distance (arbitrary/un-optimized order)
  const baselineDistanceKm = calculateBaselineDistance(depot, items)

  // 1. Solve optimal sequence with TSP
  const orderedStops = solveTSP(depot, items)

  // Add sequence number & ETA calculation
  let cumulativeDistanceKm = 0
  let cumulativeDurationMin = 0
  let prevPoint = depot

  const enrichedStops = orderedStops.map((stop, index) => {
    const legDistance = distanceKm(prevPoint.lat, prevPoint.lon, stop.lat, stop.lon)
    const legDriveTimeMin = (legDistance / FLEET_METRICS.AVG_URBAN_SPEED_KMH) * 60
    cumulativeDistanceKm += legDistance
    cumulativeDurationMin += legDriveTimeMin + FLEET_METRICS.STOP_SERVICE_TIME_MIN
    prevPoint = stop

    return {
      ...stop,
      sequence: index + 1,
      legDistanceKm: parseFloat(legDistance.toFixed(2)),
      estimatedArrivalMin: Math.round(cumulativeDurationMin),
    }
  })

  // 2. Build full coordinate sequence: Depot -> Stop 1 -> ... -> Stop N -> Depot
  const allPoints = [depot, ...enrichedStops, depot]
  const geometricCoords = allPoints.map(p => [p.lat, p.lon])

  let routeCoordinates = geometricCoords
  let totalDistanceKm = cumulativeDistanceKm + distanceKm(prevPoint.lat, prevPoint.lon, depot.lat, depot.lon)
  let totalDurationMin = cumulativeDurationMin + ((distanceKm(prevPoint.lat, prevPoint.lon, depot.lat, depot.lon) / FLEET_METRICS.AVG_URBAN_SPEED_KMH) * 60)
  let routingSource = 'geometric_tsp'

  // 3. Attempt street-level routing via OSRM
  try {
    const coordsParam = allPoints.map(p => `${p.lon},${p.lat}`).join(';')
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const res = await fetch(osrmUrl, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        const route = data.routes[0]
        // OSRM returns [lon, lat], Leaflet polyline requires [lat, lon]
        routeCoordinates = route.geometry.coordinates.map(([lon, lat]) => [lat, lon])
        totalDistanceKm = route.distance / 1000 // Convert meters to km
        const drivingDurationMin = route.duration / 60 // Convert seconds to mins
        totalDurationMin = drivingDurationMin + (items.length * FLEET_METRICS.STOP_SERVICE_TIME_MIN)
        routingSource = 'osrm'
      }
    }
  } catch {
    // Graceful fallback to geometric TSP routing
    routingSource = 'geometric_tsp'
  }

  // Defensible calculations
  const distanceSavedKm = Math.max(0, baselineDistanceKm - totalDistanceKm)
  const dieselLiters = totalDistanceKm * FLEET_METRICS.FUEL_CONSUMPTION_L_PER_KM
  const carbonKg = dieselLiters * FLEET_METRICS.DIESEL_CO2_KG_PER_L
  const fuelSavedLiters = distanceSavedKm * FLEET_METRICS.FUEL_CONSUMPTION_L_PER_KM
  const co2SavedKg = fuelSavedLiters * FLEET_METRICS.DIESEL_CO2_KG_PER_L

  return {
    depot,
    stops: enrichedStops,
    coordinates: routeCoordinates,
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
    estimatedDurationMin: Math.round(totalDurationMin),
    dieselLiters: parseFloat(dieselLiters.toFixed(2)),
    carbonKg: parseFloat(carbonKg.toFixed(2)),
    baselineDistanceKm: parseFloat(baselineDistanceKm.toFixed(2)),
    distanceSavedKm: parseFloat(distanceSavedKm.toFixed(2)),
    fuelSavedLiters: parseFloat(fuelSavedLiters.toFixed(2)),
    co2SavedKg: parseFloat(co2SavedKg.toFixed(2)),
    routingSource,
  }
}
