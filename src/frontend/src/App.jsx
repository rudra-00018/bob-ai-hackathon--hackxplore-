import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import { ToastContainer } from './components/ui/Toast'
import { PageSpinner } from './components/ui/Spinner'
import { AdminGate, NotFoundPage } from './components/ui/EmptyState'

// ── Lazy page imports for code splitting ──────────────────────────────────────
const LandingPage       = lazy(() => import('./pages/LandingPage'))
const Login             = lazy(() => import('./pages/Login'))
const Municipality      = lazy(() => import('./pages/Municipality'))

const DashboardPage     = lazy(() => import('./pages/app/DashboardPage'))
const ScannerPage       = lazy(() => import('./pages/app/ScannerPage'))
const MapPage           = lazy(() => import('./pages/app/MapPage'))
const InsightsPage      = lazy(() => import('./pages/app/InsightsPage'))
const AssistantPage     = lazy(() => import('./pages/app/AssistantPage'))
const ProfilePage       = lazy(() => import('./pages/app/ProfilePage'))
const ReportPage        = lazy(() => import('./pages/app/ReportPage'))
const ReportDetailPage  = lazy(() => import('./pages/app/ReportDetailPage'))
const NotificationsPage = lazy(() => import('./pages/app/NotificationsPage'))

// ── Route Guards ──────────────────────────────────────────────────────────────

/**
 * Requires authentication. Shows a full-page spinner while session is loading.
 * Municipality users are bounced to /municipality when accessing citizen routes.
 */
function ProtectedRoute({ children, requireRole }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <PageSpinner label="Loading BinIQ…" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'municipality' && !requireRole) {
    return <Navigate to="/municipality" replace />
  }

  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/app" replace />
  }

  return children
}

/**
 * Redirects already-authenticated users away from public pages (login, signup, landing).
 */
function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <PageSpinner label="Loading…" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={user.role === 'municipality' ? '/municipality' : '/app'} replace />
  }

  return children
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <ToastContainer />

      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-bg-primary">
            <PageSpinner label="Loading BinIQ…" />
          </div>
        }
      >
        <Routes>
          {/* ── Landing (public) ── */}
          <Route
            path="/"
            element={<PublicRoute><LandingPage /></PublicRoute>}
          />

          {/* ── Auth pages ── */}
          <Route path="/login"  element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Login /></PublicRoute>} />

          {/* ── Citizen app ── */}
          <Route path="/app" element={
            <ProtectedRoute>
              <AppLayout><DashboardPage /></AppLayout>
            </ProtectedRoute>
          }/>
          <Route path="/app/scanner" element={
            <ProtectedRoute>
              <AppLayout><ScannerPage /></AppLayout>
            </ProtectedRoute>
          }/>
          <Route path="/app/map" element={
            <ProtectedRoute>
              <AppLayout><MapPage /></AppLayout>
            </ProtectedRoute>
          }/>
          <Route path="/app/report" element={
            <ProtectedRoute>
              <AppLayout><ReportPage /></AppLayout>
            </ProtectedRoute>
          }/>
          <Route path="/app/report/:id" element={
            <ProtectedRoute>
              <AppLayout><ReportDetailPage /></AppLayout>
            </ProtectedRoute>
          }/>
          <Route path="/app/insights" element={
            <ProtectedRoute>
              <AppLayout><InsightsPage /></AppLayout>
            </ProtectedRoute>
          }/>
          <Route path="/app/assistant" element={
            <ProtectedRoute>
              <AppLayout><AssistantPage /></AppLayout>
            </ProtectedRoute>
          }/>
          <Route path="/app/profile" element={
            <ProtectedRoute>
              <AppLayout><ProfilePage /></AppLayout>
            </ProtectedRoute>
          }/>
          <Route path="/app/notifications" element={
            <ProtectedRoute>
              <AppLayout><NotificationsPage /></AppLayout>
            </ProtectedRoute>
          }/>

          {/* Legacy redirects */}
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />

          {/* ── Municipality ── */}
          <Route path="/municipality" element={
            <ProtectedRoute requireRole="municipality">
              <AppLayout><Municipality /></AppLayout>
            </ProtectedRoute>
          }/>

          {/* ── Restricted future routes (Phase 2+) ── */}
          {['/admin', '/admin/reports', '/admin/bins', '/admin/analytics', '/ops'].map(path => (
            <Route key={path} path={path} element={
              <ProtectedRoute>
                <AppLayout>
                  <AdminGate routeName={
                    path === '/admin'            ? 'Admin Dashboard'          :
                    path === '/ops'              ? 'Operations Dashboard'     :
                    path === '/admin/analytics'  ? 'Analytics Dashboard'      :
                    path === '/admin/bins'       ? 'Bin Management'           :
                                                   'Reports Management'
                  }/>
                </AppLayout>
              </ProtectedRoute>
            } />
          ))}

          {/* ── 404 ── */}
          <Route path="*" element={
            <AppLayout><NotFoundPage /></AppLayout>
          }/>
        </Routes>
      </Suspense>
    </>
  )
}
