import React, { useState, useEffect } from 'react'
import {
  Cpu,
  Radio,
  Sliders,
  Send,
  CheckCircle2,
  AlertTriangle,
  Battery,
  Thermometer,
  RefreshCw,
  Clock,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import Button from '../ui/Button'
import {
  BIN_TYPE_META,
  BIN_STATUS_META,
  BIN_STATUS,
  sendSimulatedTelemetry,
  getTelemetryHistory,
  fillLevelToStatus,
} from '../../services/binService'

export default function IoTSensorSimulator({ bins = [], onBinUpdated, onNavigateToRoute }) {
  const [selectedBinId, setSelectedBinId] = useState('B-104')
  const [fillLevel, setFillLevel] = useState(94)
  const [batteryLevel, setBatteryLevel] = useState(95)
  const [temperature, setTemperature] = useState(21.5)
  const [sensorStatus, setSensorStatus] = useState('online')
  const [isSending, setIsSending] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Find active selected bin
  const selectedBin = bins.find(b => b.id === selectedBinId) || bins[0] || {
    id: 'B-104',
    name: 'Central Plaza Smart Bin',
    fillLevel: 72,
    batteryLevel: 94,
    temperature: 21.2,
    sensorStatus: 'online',
    type: 'recycling',
    address: 'Central Plaza West',
  }

  // Synchronize controls when selecting a different bin
  useEffect(() => {
    if (selectedBin) {
      setFillLevel(selectedBin.fillLevel !== null && selectedBin.fillLevel !== undefined ? selectedBin.fillLevel : 75)
      setBatteryLevel(selectedBin.batteryLevel || 95)
      setTemperature(selectedBin.temperature || 21.5)
      setSensorStatus(selectedBin.sensorStatus || 'online')
    }
  }, [selectedBinId])

  // Load telemetry stream history
  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const logs = await getTelemetryHistory(15)
      setHistory(logs)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  // Projected status calculation
  const projectedStatus = fillLevelToStatus(fillLevel, sensorStatus)
  const projectedMeta = BIN_STATUS_META[projectedStatus] || BIN_STATUS_META[BIN_STATUS.AVAILABLE]
  const isEligibleForCollection = fillLevel >= 85 || projectedStatus === BIN_STATUS.FULL

  // Construct standard IoT Gateway JSON Packet preview
  const jsonPayload = {
    bin_id: selectedBinId,
    fill_level: Number(fillLevel),
    battery_level: Number(batteryLevel),
    temperature: Number(temperature),
    sensor_status: sensorStatus,
    timestamp: new Date().toISOString(),
  }

  // Handle telemetry dispatch
  const handleSendTelemetry = async () => {
    setIsSending(true)
    try {
      const oldFill = selectedBin?.fillLevel ?? 0
      const res = await sendSimulatedTelemetry({
        bin_id: selectedBinId,
        fill_level: fillLevel,
        battery_level: batteryLevel,
        temperature: temperature,
        sensor_status: sensorStatus,
      })

      setLastResult({
        binId: selectedBinId,
        oldFill,
        newFill: fillLevel,
        status: projectedStatus,
        thresholdBreached: isEligibleForCollection,
        timestamp: new Date().toLocaleTimeString(),
      })

      // Reload history and notify parent component
      loadHistory()
      if (onBinUpdated) {
        onBinUpdated()
      }
    } catch (err) {
      console.error('Failed to send telemetry:', err)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner with Clear Simulated Label ── */}
      <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-500 dark:text-blue-400 border border-blue-500/30 shrink-0">
              <Radio size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-token-primary">
                  Enterprise IoT Sensor Simulator
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  🔬 SIMULATED IoT DATA
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  POST /api/iot/telemetry
                </span>
              </div>
              <p className="text-xs text-token-secondary mt-1 max-w-2xl">
                Demonstrates how smart-bin hardware (ultrasonic fill level, temperature, and battery telemetry) integrates with the municipal platform. No physical sensors required — payload formats mirror standard LoRaWAN / NB-IoT sensor gateways.
              </p>
            </div>
          </div>

          {onNavigateToRoute && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onNavigateToRoute}
              icon={<ArrowRight size={14} />}
              className="shrink-0 text-xs"
            >
              Open Route Optimizer
            </Button>
          )}
        </div>
      </div>

      {/* ── Main Simulator Grid ── */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Bin Selector & Sensor Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Bin Selection */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-token-tertiary flex items-center gap-1.5">
                <Cpu size={14} /> 1. Select Target Smart Bin
              </label>
              <span className="text-xs text-token-tertiary font-mono">
                {bins.length} Active Simulated Nodes
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {bins.map(b => {
                const isSelected = b.id === selectedBinId
                const typeMeta = BIN_TYPE_META[b.type] || BIN_TYPE_META.recycling
                const statusMeta = BIN_STATUS_META[b.status] || BIN_STATUS_META[BIN_STATUS.AVAILABLE]
                const fill = b.fillLevel !== null ? `${b.fillLevel}%` : 'N/A'

                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBinId(b.id)}
                    className={[
                      'p-2.5 rounded-lg border text-left transition-all relative overflow-hidden',
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500'
                        : 'border-token-default bg-bg-secondary hover:border-token-strong hover:bg-bg-tertiary',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-token-primary">
                      <span>{b.id}</span>
                      <span>{typeMeta.emoji}</span>
                    </div>
                    <div className="text-[11px] text-token-tertiary truncate mt-0.5">
                      {b.address || b.name}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-token-subtle text-[10px]">
                      <span className="font-semibold text-token-secondary">Fill: {fill}</span>
                      <span
                        className="font-semibold uppercase tracking-wider"
                        style={{ color: statusMeta.color }}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* 2. Sensor Parameter Controls */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-token-default">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-blue-500" />
                <h3 className="text-sm font-bold text-token-primary">
                  2. Adjust Telemetry Parameters for <span className="text-blue-500">{selectedBinId}</span>
                </h3>
              </div>
              <Badge variant="subtle" size="sm">
                Target Node: {selectedBin?.address || selectedBinId}
              </Badge>
            </div>

            <div className="space-y-5">
              {/* Fill Level Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-token-primary flex items-center gap-1.5">
                    <span>🗑️</span> Fill Level
                  </span>
                  <span
                    className="text-sm font-extrabold font-mono px-2 py-0.5 rounded"
                    style={{
                      color: projectedMeta.color,
                      backgroundColor: `${projectedMeta.color}18`,
                    }}
                  >
                    {fillLevel}% ({projectedMeta.label})
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={fillLevel}
                  onChange={(e) => setFillLevel(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-bg-tertiary accent-blue-500"
                />

                {/* Preset Quick Buttons */}
                <div className="flex gap-1.5 mt-2.5 flex-wrap">
                  {[
                    { label: '🟢 Empty (10%)', val: 10 },
                    { label: '🟡 Half (50%)', val: 50 },
                    { label: '🟠 High (72%)', val: 72 },
                    { label: '🚨 Critical Trigger (94%)', val: 94 },
                  ].map(p => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setFillLevel(p.val)}
                      className={[
                        'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                        fillLevel === p.val
                          ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                          : 'border-token-default bg-bg-secondary text-token-secondary hover:border-token-strong',
                      ].join(' ')}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Collection eligibility callout */}
                {isEligibleForCollection && (
                  <div className="mt-2.5 p-2 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>
                      <strong>Fill level ≥ 85%:</strong> Bin will transition to <strong>FULL</strong> and become eligible for Route Optimizer collection circuit.
                    </span>
                  </div>
                )}
              </div>

              {/* Battery & Temperature Grid */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-token-subtle">
                {/* Battery Level */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-token-primary flex items-center gap-1.5">
                      <Battery size={14} className="text-emerald-500" /> Battery Level
                    </span>
                    <span className="text-xs font-mono font-semibold text-token-secondary">
                      {batteryLevel}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="1"
                    value={batteryLevel}
                    onChange={(e) => setBatteryLevel(Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-bg-tertiary accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-token-tertiary mt-1">
                    <span>5% (Low)</span>
                    <span>100% (Full)</span>
                  </div>
                </div>

                {/* Temperature */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-token-primary flex items-center gap-1.5">
                      <Thermometer size={14} className="text-amber-500" /> Temperature
                    </span>
                    <span className="text-xs font-mono font-semibold text-token-secondary">
                      {temperature.toFixed(1)} °C
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="0.5"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-bg-tertiary accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-token-tertiary mt-1">
                    <span>10 °C</span>
                    <span>50 °C</span>
                  </div>
                </div>
              </div>

              {/* Sensor Health Status */}
              <div className="pt-2 border-t border-token-subtle">
                <label className="text-xs font-bold text-token-primary block mb-1.5">
                  Sensor Health & Connectivity Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'online', label: '🟢 Online', desc: 'Healthy' },
                    { key: 'low_battery', label: '🟡 Low Battery', desc: '< 20%' },
                    { key: 'maintenance_required', label: '🟣 Maintenance', desc: 'Fault' },
                    { key: 'offline', label: '⚪ Offline', desc: 'No Signal' },
                  ].map(s => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSensorStatus(s.key)}
                      className={[
                        'p-2 rounded-lg border text-left transition-colors',
                        sensorStatus === s.key
                          ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                          : 'border-token-default bg-bg-secondary hover:border-token-strong',
                      ].join(' ')}
                    >
                      <div className="text-xs font-semibold text-token-primary">{s.label}</div>
                      <div className="text-[10px] text-token-tertiary">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-6 pt-4 border-t border-token-default flex items-center justify-between gap-4">
              <div className="text-xs text-token-tertiary">
                Dispatches REST packet to <code className="font-mono text-token-primary">/api/iot/telemetry</code>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleSendTelemetry}
                disabled={isSending}
                icon={isSending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              >
                {isSending ? 'Transmitting Telemetry…' : 'Send Simulated Telemetry'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Live JSON Packet Inspector & Ingestion Confirmation (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Live Telemetry Packet Inspector */}
          <Card>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-token-default">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-500" />
                <h3 className="text-sm font-bold text-token-primary">
                  Telemetry Payload Preview
                </h3>
              </div>
              <span className="text-[10px] font-mono text-token-tertiary uppercase">
                application/json
              </span>
            </div>

            <pre className="p-3.5 rounded-lg bg-bg-tertiary text-token-primary font-mono text-xs overflow-x-auto border border-token-subtle leading-relaxed">
              <code>{JSON.stringify(jsonPayload, null, 2)}</code>
            </pre>

            <div className="mt-3 flex items-center gap-2 text-xs text-token-tertiary">
              <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
              <span>Compatible with real hardware gateways via HTTP / MQTT / LoRaWAN</span>
            </div>
          </Card>

          {/* 2. Last Ingestion Result / Success Confirmation */}
          {lastResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Telemetry Processed Successfully
                  </h4>
                  <p className="text-xs text-token-secondary">
                    Bin <strong className="text-token-primary">{lastResult.binId}</strong> fill level updated from{' '}
                    <span className="line-through text-token-tertiary">{lastResult.oldFill}%</span> to{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">{lastResult.newFill}%</strong>.
                  </p>
                  <div className="pt-2 flex items-center gap-2 flex-wrap text-xs">
                    <Badge variant={lastResult.status === 'full' ? 'danger' : 'success'} size="sm">
                      Status: {lastResult.status.toUpperCase()}
                    </Badge>
                    {lastResult.thresholdBreached && (
                      <Badge variant="warning" size="sm">
                        🚨 Eligible for Collection Route
                      </Badge>
                    )}
                    <span className="text-[10px] text-token-tertiary">
                      {lastResult.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Demo Guide Card */}
          <Card className="bg-bg-secondary">
            <h4 className="text-xs font-bold uppercase tracking-wider text-token-tertiary mb-2 flex items-center gap-1.5">
              <Layers size={14} /> Quick Demo Scenario
            </h4>
            <ol className="text-xs text-token-secondary space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Select <strong className="text-token-primary">B-104 (Central Plaza West)</strong>.
              </li>
              <li>
                Notice current fill level is <strong className="text-token-primary">72% (Nearly Full)</strong>.
              </li>
              <li>
                Click <strong className="text-blue-500">Critical Trigger (94%)</strong> preset button.
              </li>
              <li>
                Click <strong className="text-token-primary">"Send Simulated Telemetry"</strong>.
              </li>
              <li>
                Switch to <strong className="text-token-primary">Route Optimizer</strong> tab — see B-104 automatically queued as a priority collection stop!
              </li>
            </ol>
          </Card>
        </div>
      </div>

      {/* ── Telemetry Event Stream (Audit Log) ── */}
      <Card padded={false} className="overflow-hidden">
        <div className="px-6 py-4 border-b border-token-default flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-token-secondary" />
            <h3 className="text-sm font-bold text-token-primary">
              Live Ingested Telemetry Stream (Audit Log)
            </h3>
          </div>
          <button
            type="button"
            onClick={loadHistory}
            className="text-xs text-blue-500 hover:text-blue-600 inline-flex items-center gap-1 font-medium"
          >
            <RefreshCw size={12} className={historyLoading ? 'animate-spin' : ''} /> Refresh Stream
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-center py-8 text-xs text-token-tertiary">
            No telemetry logs recorded yet. Send simulated telemetry above to view live stream events.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-token-default bg-bg-secondary text-token-tertiary uppercase font-semibold">
                  <th className="text-left px-4 py-2.5">Time</th>
                  <th className="text-left px-4 py-2.5">Bin ID</th>
                  <th className="text-center px-4 py-2.5">Fill Level</th>
                  <th className="text-center px-4 py-2.5">Battery</th>
                  <th className="text-center px-4 py-2.5">Temp</th>
                  <th className="text-left px-4 py-2.5">Sensor Status</th>
                  <th className="text-right px-4 py-2.5">Source</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 8).map((log, idx) => (
                  <tr
                    key={log.id || idx}
                    className="border-b border-token-subtle hover:bg-bg-overlay transition-colors"
                  >
                    <td className="px-4 py-2 text-token-tertiary font-mono whitespace-nowrap">
                      {new Date(log.receivedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2 font-bold text-token-primary whitespace-nowrap">
                      {log.binId}
                    </td>
                    <td className="px-4 py-2 text-center whitespace-nowrap">
                      <span
                        className={[
                          'font-mono font-bold px-2 py-0.5 rounded',
                          log.fillLevel >= 85
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                            : log.fillLevel >= 60
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                        ].join(' ')}
                      >
                        {log.fillLevel}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center text-token-secondary font-mono">
                      {log.batteryLevel}%
                    </td>
                    <td className="px-4 py-2 text-center text-token-secondary font-mono">
                      {log.temperature ? `${log.temperature}°C` : '—'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="capitalize text-token-secondary font-medium">
                        {log.sensorStatus || 'online'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        SIMULATED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
