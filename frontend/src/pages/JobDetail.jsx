import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { jobsApi } from '../api/client'
import StatusBadge, { STATUS_CONFIG } from '../components/StatusBadge'
import { ArrowLeft, MapPin, DollarSign, Link as LinkIcon, Trash2, RefreshCw, Edit, Save, X, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import Toast from '../components/Toast'

// Parse the ai_match_explanation — it may be structured JSON {strengths, gaps} or plain text
function parseExplanation(raw) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed.strengths || parsed.gaps) return parsed
  } catch {}
  // Legacy plain text — return as a single item under strengths
  return { strengths: [raw], gaps: [] }
}

function StrengthsGaps({ explanation, score }) {
  const data = parseExplanation(explanation)
  if (!data) return null

  const { strengths = [], gaps = [] } = data
  const isWeak = score < 50

  // Show the dominant side first
  const sections = [
    {
      key: 'strengths',
      label: 'Strengths',
      items: strengths,
      style: 'bg-emerald-950/30 border-emerald-800/40',
      labelStyle: 'text-emerald-400',
      dotStyle: 'bg-emerald-500',
      textStyle: 'text-emerald-100/90',
    },
    {
      key: 'gaps',
      label: 'Gaps',
      items: gaps,
      style: 'bg-red-950/30 border-red-800/40',
      labelStyle: 'text-red-400',
      dotStyle: 'bg-red-500',
      textStyle: 'text-red-100/90',
    },
  ]

  // If weak match, show gaps first
  const ordered = isWeak ? [...sections].reverse() : sections

  return (
    <div className="space-y-2">
      {ordered.map(({ key, label, items, style, labelStyle, dotStyle, textStyle }) =>
        items.length === 0 ? null : (
          <div key={key} className={`rounded-lg border p-2.5 ${style}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${labelStyle}`}>{label}</p>
            <ul className="space-y-1">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotStyle}`} />
                  <span className={`text-[11px] leading-relaxed ${textStyle}`}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </div>
  )
}

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)

  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesVal, setNotesVal] = useState('')
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [descVal, setDescVal] = useState('')

  const [analyzing, setAnalyzing] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((type, message, duration = 4000) => {
    setToast({ type, message, duration })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  const fetchJob = async () => {
    try {
      const { data } = await jobsApi.get(id)
      setJob(data)
      setNotesVal(data.notes || '')
      setDescVal(data.job_description || '')
    } catch {
      navigate('/jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchJob() }, [id])

  const handleDelete = async () => {
    if (confirm('Delete this application permanently?')) {
      await jobsApi.delete(id)
      navigate('/jobs')
    }
  }

  const handleStatusChange = async (e) => {
    const { data } = await jobsApi.update(id, { status: e.target.value })
    setJob(data)
  }

  const handleSaveNotes = async () => {
    const { data } = await jobsApi.update(id, { notes: notesVal })
    setJob(data)
    setIsEditingNotes(false)
  }

  const handleSaveDesc = async () => {
    const { data } = await jobsApi.update(id, { job_description: descVal })
    setJob(data)
    setIsEditingDesc(false)
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    showToast('loading', 'Analyzing your resume against this role…')
    try {
      const { data } = await jobsApi.analyze(id)
      setJob(data)
      showToast('success', `Match analysis complete — ${Math.round(data.ai_match_score)}% match score!`, 5000)
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Match analysis failed.', 6000)
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-zinc-900 dark:border-zinc-50 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/10'
    if (score >= 60) return 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/10'
    return 'text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/10'
  }

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Strong Match'
    if (score >= 60) return 'Moderate Match'
    return 'Weak Match'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12 select-none">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={dismissToast}
        />
      )}

      {/* Back link */}
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
        <ArrowLeft size={12} /> Applications
      </Link>

      {/* Header Card */}
      <div className="card p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {job.company_logo_url ? (
              <img src={job.company_logo_url} alt="" className="w-10 h-10 rounded border border-zinc-200 dark:border-zinc-800 object-contain bg-white p-1 shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shrink-0">
                {job.company_name[0]}
              </div>
            )}
            <div>
              <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50">{job.job_title}</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{job.company_name}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                {job.location && <span className="flex items-center gap-1"><MapPin size={10} />{job.location}</span>}
                {job.salary_min && (
                  <span className="flex items-center gap-1">
                    <DollarSign size={10} />
                    {job.salary_min.toLocaleString()}{job.salary_max ? ` – ${job.salary_max.toLocaleString()}` : ''} {job.currency}
                  </span>
                )}
                {job.work_type && <span className="capitalize">{job.work_type}</span>}
                {job.job_url && (
                  <a href={job.job_url} target="_blank" rel="noreferrer" className="text-brand-500 hover:text-brand-600 flex items-center gap-1">
                    <LinkIcon size={10} />Posting
                  </a>
                )}
              </div>
            </div>
          </div>
          <select
            value={job.status}
            onChange={handleStatusChange}
            className="select py-1 px-2 text-[11px] w-auto border-zinc-200 dark:border-zinc-700 font-medium"
          >
            {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left: Notes & Description */}
        <div className="lg:col-span-2 space-y-3">
          {/* Notes */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Notes</h3>
              {!isEditingNotes ? (
                <button onClick={() => setIsEditingNotes(true)} className="btn-ghost p-0.5"><Edit size={12} /></button>
              ) : (
                <div className="flex items-center gap-1">
                  <button onClick={handleSaveNotes} className="btn-ghost p-0.5 text-emerald-600 dark:text-emerald-400"><Save size={12} /></button>
                  <button onClick={() => { setNotesVal(job.notes || ''); setIsEditingNotes(false) }} className="btn-ghost p-0.5 text-red-600 dark:text-red-400"><X size={12} /></button>
                </div>
              )}
            </div>
            <div className="card-body">
              {isEditingNotes ? (
                <textarea className="input resize-none w-full" rows={4} value={notesVal} onChange={e => setNotesVal(e.target.value)} />
              ) : (
                <div className="whitespace-pre-wrap text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {job.notes || <span className="text-zinc-400 dark:text-zinc-600 italic">No notes.</span>}
                </div>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Job Description</h3>
              {!isEditingDesc ? (
                <button onClick={() => setIsEditingDesc(true)} className="btn-ghost p-0.5"><Edit size={12} /></button>
              ) : (
                <div className="flex items-center gap-1">
                  <button onClick={handleSaveDesc} className="btn-ghost p-0.5 text-emerald-600 dark:text-emerald-400"><Save size={12} /></button>
                  <button onClick={() => { setDescVal(job.job_description || ''); setIsEditingDesc(false) }} className="btn-ghost p-0.5 text-red-600 dark:text-red-400"><X size={12} /></button>
                </div>
              )}
            </div>
            <div className="card-body">
              {isEditingDesc ? (
                <textarea className="input resize-none w-full" rows={8} value={descVal} onChange={e => setDescVal(e.target.value)} />
              ) : (
                <div className="whitespace-pre-wrap text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {job.job_description || <span className="text-zinc-400 dark:text-zinc-600 italic">No description. Add one to enable AI matching.</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: AI Match & Actions */}
        <div className="space-y-3">
          {/* AI Match */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-1.5">
                <Zap size={11} className="text-zinc-500" />
                <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Match Analysis</h3>
              </div>
            </div>
            <div className="card-body">
              {job.ai_match_score !== null ? (
                <div className="space-y-3">
                  {/* Score block */}
                  <div className={`flex items-center justify-between p-3 rounded border ${getScoreColor(job.ai_match_score)}`}>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">Score</p>
                      <p className="text-2xl font-bold">{Math.round(job.ai_match_score)}%</p>
                    </div>
                    <span className="text-[11px] font-medium opacity-80">{getScoreLabel(job.ai_match_score)}</span>
                  </div>

                  {/* Explanation */}
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2">
                    <p className="font-semibold text-zinc-500 dark:text-zinc-400 mb-2 text-[10px] uppercase tracking-wider">Assessment</p>
                    <StrengthsGaps explanation={job.ai_match_explanation} score={job.ai_match_score} />
                  </div>

                  <button onClick={handleAnalyze} disabled={analyzing} className="btn-secondary w-full justify-center text-[11px]">
                    <RefreshCw size={10} className={analyzing ? 'animate-spin' : ''} /> {analyzing ? 'Recalculating…' : 'Recalculate'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Run AI analysis to compare your resume against this role.
                  </p>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing || !job.job_description}
                    className="btn-primary w-full justify-center text-[11px]"
                  >
                    {analyzing ? (
                      <><RefreshCw size={10} className="animate-spin" /> Analyzing…</>
                    ) : (
                      <><Zap size={10} /> Calculate Match</>
                    )}
                  </button>
                  {!job.job_description && (
                    <p className="text-[10px] text-red-600 dark:text-red-400">Add a job description first.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Actions</h3>
            </div>
            <div className="card-body">
              <button onClick={handleDelete} className="btn-danger w-full justify-center text-[11px]">
                <Trash2 size={11} /> Delete Application
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
