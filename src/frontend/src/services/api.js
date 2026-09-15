/**
 * BinIQ API Service
 * Central axios instance with auth, error handling, and request/response interceptors.
 */
import axios from 'axios'

// ── Constants ────────────────────────────────────────────────────────────────
const TOKEN_KEY = 'biniq_token'
const BASE_URL  = import.meta.env.VITE_API_URL || '/api'

// ── Axios instance ────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
})

// ── Token helpers ─────────────────────────────────────────────────────────────
export const tokenStorage = {
  get:    ()      => localStorage.getItem(TOKEN_KEY),
  set:    (token) => localStorage.setItem(TOKEN_KEY, token),
  remove: ()      => localStorage.removeItem(TOKEN_KEY),
}

// ── Attach token on every request ────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.get()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Global response error handling ───────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 — token expired or invalid → clear auth and reload to login
    if (error.response?.status === 401) {
      tokenStorage.remove()
      // Only redirect if we're not already on an auth page
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(normalizeError(error))
  }
)

// ── Error normalizer ─────────────────────────────────────────────────────────
/**
 * Converts any axios error into a consistent shape:
 * { message: string, status: number|null, code: string }
 */
export function normalizeError(error) {
  if (axios.isAxiosError(error)) {
    const status  = error.response?.status ?? null
    const detail  = error.response?.data?.detail
    const message = Array.isArray(detail)
      ? detail.map(d => d.msg || d).join(', ')
      : detail || error.message || 'An unexpected error occurred'

    const normalized = new Error(message)
    normalized.status = status
    normalized.code   = error.code ?? 'UNKNOWN'
    normalized.isApiError = true
    return normalized
  }

  // Network error (no response)
  if (!error.response) {
    const normalized = new Error('Network error — please check your connection')
    normalized.status = null
    normalized.code   = 'NETWORK_ERROR'
    normalized.isApiError = true
    return normalized
  }

  return error
}

// ── Auth endpoints ────────────────────────────────────────────────────────────
export const authApi = {
  login:   (email, password) =>
    api.post('/auth/login', { email, password }).then(r => r.data),

  signup:  (username, email, password, role = 'user') =>
    api.post('/auth/signup', { username, email, password, role }).then(r => r.data),

  me:      () =>
    api.get('/auth/me').then(r => r.data),

  logout:  () => {
    tokenStorage.remove()
    delete api.defaults.headers.common['Authorization']
  },

  updateProfile: (data) =>
    api.patch('/auth/profile', data).then(r => r.data),
}

// ── Prediction endpoints ──────────────────────────────────────────────────────
export const predictApi = {
  uploadFile: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/predict', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  uploadBase64: (base64) =>
    api.post('/predict/base64', { image: base64 }).then(r => r.data),

  classify: (file) => predictApi.uploadFile(file),
  classifyBase64: (base64) => predictApi.uploadBase64(base64),

  detectMulti: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/predict?mode=multi', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}

// ── History / stats endpoints ─────────────────────────────────────────────────
export const historyApi = {
  list:  (limit = 50) =>
    api.get(`/history?limit=${limit}`).then(r => r.data),

  stats: () =>
    api.get('/stats').then(r => r.data),
}

// ── Chat endpoint ─────────────────────────────────────────────────────────────
export const chatApi = {
  send: (message) =>
    api.post('/chat', { message }).then(r => r.data),
}

// ── Recycling centers ─────────────────────────────────────────────────────────
export const mapsApi = {
  centers: (lat, lon, radius = 5000) =>
    api.get(`/recycling-centers?lat=${lat}&lon=${lon}&radius=${radius}`).then(r => r.data),
}

// ── Reports endpoints ─────────────────────────────────────────────────────────
export const reportsApi = {
  create: (data) =>
    api.post('/reports', data).then(r => r.data),

  listMine: () =>
    api.get('/reports/mine').then(r => r.data),

  getById: (id) =>
    api.get(`/reports/${id}`).then(r => r.data),

  updateStatus: (id, status, note = '') =>
    api.patch(`/reports/${id}/status`, { status, note }).then(r => r.data),

  withdraw: (id) =>
    api.patch(`/reports/${id}/status`, { status: 'rejected', note: 'Withdrawn by user.' }).then(r => r.data),

  upvote: (id) =>
    api.post(`/reports/${id}/upvote`).then(r => r.data),

  delete: (id) =>
    api.delete(`/reports/${id}`).then(r => r.data),

  municipalityList: (status) =>
    api.get(`/municipality/reports${status ? `?status=${status}` : ''}`).then(r => r.data),
}

// ── Notifications endpoints ──────────────────────────────────────────────────
export const notificationsApi = {
  list: () =>
    api.get('/notifications').then(r => r.data),

  markRead: (id) =>
    api.patch(`/notifications/${id}/read`).then(r => r.data),

  markAllRead: () =>
    api.post('/notifications/read-all').then(r => r.data),

  delete: (id) =>
    api.delete(`/notifications/${id}`).then(r => r.data),

  clearAll: () =>
    api.delete('/notifications').then(r => r.data),

  unreadCount: () =>
    api.get('/notifications/unread-count').then(r => r.data),
}

// ── Municipality endpoints ────────────────────────────────────────────────────
export const municipalityApi = {
  dashboard: () =>
    api.get('/municipality/dashboard').then(r => r.data),

  users: () =>
    api.get('/municipality/users').then(r => r.data),

  reports: (status) =>
    api.get(`/municipality/reports${status ? `?status=${status}` : ''}`).then(r => r.data),
}

// ── Sustainability & Civic endpoints ─────────────────────────────────────────
export const sustainabilityApi = {
  insights: () =>
    api.get('/sustainability/insights').then(r => r.data),
}

export const civicApi = {
  getImpact: () =>
    api.get('/civic/impact').then(r => r.data),
}

// ── IoT Sensor Telemetry endpoints ──────────────────────────────────────────
export const iotApi = {
  sendTelemetry: (payload) =>
    api.post('/iot/telemetry', payload).then(r => r.data),

  getHistory: (limit = 25, binId = null) =>
    api.get(`/iot/telemetry/history?limit=${limit}${binId ? `&bin_id=${binId}` : ''}`).then(r => r.data),
}

// ── Bins endpoints ────────────────────────────────────────────────────────────
export const binsApi = {
  list: () =>
    api.get('/bins').then(r => r.data),
}

// ── Health ────────────────────────────────────────────────────────────────────
export const systemApi = {
  health: () =>
    api.get('/health').then(r => r.data),

  classes: () =>
    api.get('/classes').then(r => r.data),
}

export default api


