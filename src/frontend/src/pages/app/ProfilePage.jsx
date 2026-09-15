/**
 * ProfilePage — display and edit the logged-in user's profile.
 *
 * Uses existing:
 *  - AuthContext  (user, refreshUser)
 *  - authApi      (me, updateProfile)
 *  - Card, Input, Button, Alert, PageLayout — existing design system
 *  - Toast        — existing notification system
 *  - Green BinIQ theme via existing CSS vars
 */

import { useState, useEffect, useCallback } from 'react'
import {
  User, Mail, Lock, Shield, Zap, Coins,
  Flame, CheckCircle, Loader2, Edit3, Key,
  LogOut, AlertCircle,
} from 'lucide-react'

import { PageLayout, PageHeader } from '../../components/layout/AppLayout'
import { Card, CardHeader, CardDivider } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { PasswordInput, InputGroup } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'
import toast from '../../components/ui/Toast'

import { useAuth } from '../../context/AuthContext'
import { authApi, historyApi } from '../../services/api'

// ── Avatar initials helper ────────────────────────────────────────────────────
function AvatarCircle({ username, size = 'lg' }) {
  const initials = (username || '?')
    .split(/[\s_-]/)
    .map(w => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')

  const dim = size === 'lg' ? 'w-24 h-24 text-3xl' : 'w-12 h-12 text-base'

  return (
    <div
      className={`${dim} rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center font-bold text-white shrink-0 select-none shadow-lg`}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

// ── Read-only stat pill ───────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, color = 'text-token-primary' }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl bg-gradient-to-br from-bg-secondary to-bg-tertiary border border-token-subtle min-w-[90px] shadow-sm">
      <Icon size={20} className={color} aria-hidden="true" />
      <span className={`text-xl font-bold tabular-nums ${color}`}>{value ?? '—'}</span>
      <span className="text-[10px] text-token-tertiary font-semibold uppercase tracking-wide">{label}</span>
    </div>
  )
}

// ── Section divider ───────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-token-tertiary mb-3">
      {children}
    </p>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth()

  // ── Profile form state ──────────────────────────────────────────────────
  const [username,        setUsername]        = useState('')
  const [email,           setEmail]           = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // ── UI state ────────────────────────────────────────────────────────────
  const [saving,        setSaving]        = useState(false)
  const [profileError,  setProfileError]  = useState(null)
  const [profileSuccess,setProfileSuccess]= useState(false)
  const [pwError,       setPwError]       = useState(null)
  const [pwSuccess,     setPwSuccess]     = useState(false)
  const [savingPw,      setSavingPw]      = useState(false)
  const [stats,         setStats]         = useState(null)
  const [statsLoading,  setStatsLoading]  = useState(true)

  // ── Seed form from auth context ─────────────────────────────────────────
  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setEmail(user.email || '')
    }
  }, [user])

  // ── Load stats ──────────────────────────────────────────────────────────
  useEffect(() => {
    setStatsLoading(true)
    historyApi.stats()
      .then(data => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [])

  // ── Save profile (username + email) ────────────────────────────────────
  const handleSaveProfile = useCallback(async (e) => {
    e.preventDefault()
    setProfileError(null)
    setProfileSuccess(false)

    const trimmedUsername = username.trim()
    const trimmedEmail    = email.trim().toLowerCase()

    // Client-side validation
    if (!trimmedUsername) {
      setProfileError('Username cannot be empty.')
      return
    }
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      setProfileError('Username must be 3–30 characters.')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setProfileError('Username can only contain letters, numbers, and underscores.')
      return
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setProfileError('Please enter a valid email address.')
      return
    }

    // Check if anything actually changed
    if (trimmedUsername === user?.username && trimmedEmail === user?.email) {
      setProfileError('No changes to save.')
      return
    }

    setSaving(true)
    try {
      const updated = await authApi.updateProfile({
        username: trimmedUsername,
        email:    trimmedEmail,
      })
      await refreshUser()
      setProfileSuccess(true)
      toast.success('Profile updated successfully!')
      setTimeout(() => setProfileSuccess(false), 4000)
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [username, email, user, refreshUser])

  // ── Change password ─────────────────────────────────────────────────────
  const handleChangePassword = useCallback(async (e) => {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)

    if (!currentPassword) {
      setPwError('Please enter your current password.')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.')
      return
    }
    if (newPassword === currentPassword) {
      setPwError('New password must be different from the current one.')
      return
    }

    setSavingPw(true)
    try {
      await authApi.updateProfile({
        current_password: currentPassword,
        new_password:     newPassword,
      })
      setPwSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password changed successfully!')
      setTimeout(() => setPwSuccess(false), 4000)
    } catch (err) {
      setPwError(err.message || 'Failed to change password. Please try again.')
    } finally {
      setSavingPw(false)
    }
  }, [currentPassword, newPassword, confirmPassword])

  if (!user) return null

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : null

  return (
    <PageLayout>
      <PageHeader
        title="Profile & Settings"
        subtitle="Manage your account information and preferences"
      />

      <div className="space-y-6 max-w-2xl">

        {/* ── Identity card ─────────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center gap-4">
            <AvatarCircle username={user.username} size="lg" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-token-primary truncate">
                {user.username}
              </h2>
              <p className="text-sm text-token-tertiary truncate">{user.email}</p>
              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold
                bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                <Shield size={10} aria-hidden="true" />
                {user.role === 'municipality' ? 'Municipality Officer' : 'Citizen'}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-5 flex flex-wrap gap-3">
            {statsLoading ? (
              <div className="flex items-center gap-2 text-xs text-token-tertiary">
                <Loader2 size={14} className="animate-spin" />
                Loading stats…
              </div>
            ) : (
              <>
                <StatPill icon={Zap}    label="XP"     value={stats?.xp ?? user.xp}         color="text-blue-500" />
                <StatPill icon={Coins}  label="Coins"  value={stats?.coins ?? user.coins}    color="text-amber-500" />
                <StatPill icon={Flame}  label="Streak" value={stats?.streak ?? user.streak}  color="text-orange-500" />
                <StatPill icon={CheckCircle} label="Scans" value={stats?.total ?? '—'}       color="text-green-500" />
              </>
            )}
          </div>

          {memberSince && (
            <p className="mt-4 text-xs text-token-disabled">
              Member since {memberSince}
            </p>
          )}
        </Card>

        {/* ── Edit profile form ──────────────────────────────────────────── */}
        <Card>
          <CardHeader
            title="Account Information"
            description="Update your display name and email address."
          />

          <form onSubmit={handleSaveProfile} noValidate>
            <div className="space-y-4">

              <InputGroup label="Username" required>
                <div className="relative">
                  <User
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-token-tertiary pointer-events-none"
                    aria-hidden="true"
                  />
                  <Input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setProfileError(null) }}
                    placeholder="Your username"
                    autoComplete="username"
                    className="pl-9"
                    disabled={saving}
                    error={profileError && profileError.toLowerCase().includes('username') ? profileError : undefined}
                  />
                </div>
              </InputGroup>

              <InputGroup label="Email address" required>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-token-tertiary pointer-events-none"
                    aria-hidden="true"
                  />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setProfileError(null) }}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="pl-9"
                    disabled={saving}
                    error={profileError && profileError.toLowerCase().includes('email') ? profileError : undefined}
                  />
                </div>
              </InputGroup>

              {/* General error */}
              {profileError && !profileError.toLowerCase().includes('username') && !profileError.toLowerCase().includes('email') && (
                <Alert variant="danger">{profileError}</Alert>
              )}

              {/* Success */}
              {profileSuccess && (
                <Alert variant="success">Profile updated successfully!</Alert>
              )}
            </div>

            <div className="flex justify-end mt-5">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={saving}
                disabled={saving}
                icon={saving ? <Loader2 size={15} className="animate-spin" /> : <Edit3 size={15} />}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>

        {/* ── Change password form ───────────────────────────────────────── */}
        <Card>
          <CardHeader
            title="Change Password"
            description="Choose a strong password with at least 6 characters."
          />

          <form onSubmit={handleChangePassword} noValidate>
            <div className="space-y-4">

              <InputGroup label="Current password" required>
                <PasswordInput
                  value={currentPassword}
                  onChange={e => { setCurrentPassword(e.target.value); setPwError(null) }}
                  placeholder="Your current password"
                  autoComplete="current-password"
                  disabled={savingPw}
                />
              </InputGroup>

              <InputGroup label="New password" required>
                <PasswordInput
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setPwError(null) }}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  disabled={savingPw}
                />
              </InputGroup>

              <InputGroup label="Confirm new password" required>
                <PasswordInput
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setPwError(null) }}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  disabled={savingPw}
                  error={
                    confirmPassword && newPassword && confirmPassword !== newPassword
                      ? 'Passwords do not match'
                      : undefined
                  }
                />
              </InputGroup>

              {pwError && <Alert variant="danger">{pwError}</Alert>}
              {pwSuccess && <Alert variant="success">Password changed successfully!</Alert>}
            </div>

            <div className="flex justify-end mt-5">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={savingPw}
                disabled={savingPw}
                icon={savingPw ? <Loader2 size={15} className="animate-spin" /> : <Key size={15} />}
              >
                {savingPw ? 'Updating…' : 'Change Password'}
              </Button>
            </div>
          </form>
        </Card>

        {/* ── Danger zone ───────────────────────────────────────────────── */}
        <Card>
          <SectionLabel>Account</SectionLabel>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-token-primary">Sign out</p>
              <p className="text-xs text-token-tertiary mt-0.5">
                You will be redirected to the login page.
              </p>
            </div>
            <Button
              variant="danger-ghost"
              size="sm"
              icon={<LogOut size={14} />}
              onClick={logout}
            >
              Sign out
            </Button>
          </div>
        </Card>

      </div>
    </PageLayout>
  )
}
