import { useState, useMemo } from 'react'
import {
  FileDown, FileSpreadsheet, Printer, ShieldCheck,
  CheckCircle, AlertTriangle, Layers, Info, X, Sparkles,
  Building, Calendar, UserCheck
} from 'lucide-react'
import Button from '../ui/Button'
import {
  buildESGReportData,
  exportESGReportToCSV,
  exportESGReportToPDF,
  DATA_PROVENANCE
} from '../../services/esgReportService'

export default function MunicipalReportExportModal({
  isOpen,
  onClose,
  municipalityData,
  reports = [],
  bins = [],
  users = [],
}) {
  const [period, setPeriod] = useState('Current Operating Period (YTD)')
  const [officerName, setOfficerName] = useState('Director of Municipal ESG & Operations')
  const [jurisdiction, setJurisdiction] = useState('Metropolitan Sanitation & ESG Authority')
  const [isExporting, setIsExporting] = useState(false)

  const reportData = useMemo(() => {
    return buildESGReportData({
      municipalityData,
      reports,
      bins,
      users,
      periodLabel: period,
      officerName,
      jurisdiction,
    })
  }, [municipalityData, reports, bins, users, period, officerName, jurisdiction])

  if (!isOpen) return null

  const handleExportPDF = () => {
    setIsExporting(true)
    try {
      exportESGReportToPDF(reportData)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCSV = () => {
    setIsExporting(true)
    try {
      exportESGReportToCSV(reportData)
    } finally {
      setIsExporting(false)
    }
  }

  const { meta, executiveKPIs, wasteStreams, operations, iotFleet } = reportData

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-raised border border-token-default rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-token-default flex items-center justify-between sticky top-0 bg-surface-raised/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <FileDown size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-token-primary flex items-center gap-2">
                Municipal ESG & Operations Report
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold border border-blue-500/30">
                  EPA WARM Standard
                </span>
              </h2>
              <p className="text-xs text-token-tertiary">
                Export verifiable municipal performance & environmental impact audit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-token-tertiary hover:text-token-primary hover:bg-bg-tertiary rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Data Provenance Transparency Banner */}
          <div className="p-3.5 rounded-xl bg-bg-secondary border border-token-default space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-token-primary">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>Verified Data Integrity & Provenance Guarantee</span>
            </div>
            <p className="text-token-secondary leading-relaxed">
              This report automatically differentiates between primary measured telemetry, EPA WARM life-cycle calculations, and simulated demo sensor streams. No fabricated statistics are generated.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-center">
                <span className="block font-bold text-blue-400 text-[11px]">[MEASURED]</span>
                <span className="text-[10px] text-token-tertiary">{operations.totalReports} Reports / Scans</span>
              </div>
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="block font-bold text-emerald-400 text-[11px]">[CALCULATED]</span>
                <span className="text-[10px] text-token-tertiary">{wasteStreams.totalCalculatedCarbonKg} kg CO₂ Avoided</span>
              </div>
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-center">
                <span className="block font-bold text-amber-400 text-[11px]">[SIMULATED]</span>
                <span className="text-[10px] text-token-tertiary">{iotFleet.totalBins} Demo IoT Bins</span>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-token-secondary mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} /> Reporting Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-bg-secondary border border-token-default text-token-primary focus:border-blue-500 focus:outline-none"
              >
                <option value="Current Operating Period (YTD)">Current Operating Period (YTD)</option>
                <option value="Current Month (September 2026)">Current Month (September 2026)</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="Quarterly Audit (Q3 2026)">Quarterly Audit (Q3 2026)</option>
                <option value="All Historical Database Records">All Historical Database Records</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-token-secondary mb-1.5 flex items-center gap-1.5">
                <Building size={13} /> Municipal Authority
              </label>
              <input
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-bg-secondary border border-token-default text-token-primary focus:border-blue-500 focus:outline-none"
                placeholder="e.g. City Sanitation & Waste Authority"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-token-secondary mb-1.5 flex items-center gap-1.5">
                <UserCheck size={13} /> Sign-off Officer Title
              </label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-bg-secondary border border-token-default text-token-primary focus:border-blue-500 focus:outline-none"
                placeholder="e.g. Director of Municipal ESG & Operations"
              />
            </div>
          </div>

          {/* Live Data Summary Preview */}
          <div className="border border-token-default rounded-xl p-4 bg-bg-tertiary/40 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-token-tertiary">
              Audit Summary Preview ({meta.reportId})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-lg bg-surface-raised border border-token-subtle">
                <div className="text-[10px] text-token-tertiary uppercase font-medium">Reports Processed</div>
                <div className="text-base font-bold text-token-primary mt-0.5">{operations.totalReports}</div>
                <div className="text-[10px] text-emerald-500 font-semibold">{operations.resolutionRate}% resolved</div>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-raised border border-token-subtle">
                <div className="text-[10px] text-token-tertiary uppercase font-medium">Avg Resolution</div>
                <div className="text-base font-bold text-token-primary mt-0.5">
                  {operations.avgResolutionHours !== null ? `${operations.avgResolutionHours}h` : 'N/A'}
                </div>
                <div className="text-[10px] text-blue-400 font-semibold">{operations.sla24hCompliance}% &lt;24h SLA</div>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-raised border border-token-subtle">
                <div className="text-[10px] text-token-tertiary uppercase font-medium">Diversion Rate</div>
                <div className="text-base font-bold text-token-primary mt-0.5">{wasteStreams.overallDiversionRate}%</div>
                <div className="text-[10px] text-emerald-500 font-semibold">{wasteStreams.totalCalculatedCarbonKg} kg CO₂e</div>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-raised border border-token-subtle">
                <div className="text-[10px] text-token-tertiary uppercase font-medium">IoT Fleet Bins</div>
                <div className="text-base font-bold text-token-primary mt-0.5">{iotFleet.totalBins} bins</div>
                <div className="text-[10px] text-amber-400 font-semibold">{iotFleet.criticalBins} critical full</div>
              </div>
            </div>
          </div>

          {/* Included Sections Checkmarks */}
          <div className="space-y-1.5 text-xs text-token-secondary">
            <span className="font-semibold text-token-primary block mb-1">Included Audit Sections:</span>
            <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5"><CheckCircle size={13} className="text-emerald-500 shrink-0" /> 1. Executive KPIs & Municipal Period Details</div>
              <div className="flex items-center gap-1.5"><CheckCircle size={13} className="text-emerald-500 shrink-0" /> 2. EPA WARM Material Diversion & CO₂ Factors</div>
              <div className="flex items-center gap-1.5"><CheckCircle size={13} className="text-emerald-500 shrink-0" /> 3. Citizen Reports Funnel & Turnaround SLA</div>
              <div className="flex items-center gap-1.5"><CheckCircle size={13} className="text-emerald-500 shrink-0" /> 4. IoT Sensor Telemetry Register (Simulated)</div>
              <div className="flex items-center gap-1.5"><CheckCircle size={13} className="text-emerald-500 shrink-0" /> 5. Operational Observations & Routing Directives</div>
              <div className="flex items-center gap-1.5"><CheckCircle size={13} className="text-emerald-500 shrink-0" /> 6. Scientific Methodology Appendix & Verification Hash</div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-token-default bg-surface-raised flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="md"
              onClick={handleExportCSV}
              disabled={isExporting}
              icon={<FileSpreadsheet size={16} />}
              className="flex-1 sm:flex-initial"
            >
              Export CSV Spreadsheet
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleExportPDF}
              disabled={isExporting}
              icon={<Printer size={16} />}
              className="flex-1 sm:flex-initial"
            >
              Generate Printable PDF
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
