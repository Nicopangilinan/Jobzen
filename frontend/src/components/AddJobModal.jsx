import { useState } from 'react'
import { X, Building2, Link, MapPin, DollarSign, Calendar, FileText } from 'lucide-react'
import { jobsApi } from '../api/client'

const STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'withdrawn']
const WORK_TYPES = ['remote', 'hybrid', 'onsite', 'unknown']

export default function AddJobModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    company_name: '', job_title: '', job_url: '', location: '',
    salary_min: '', salary_max: '', currency: 'USD',
    work_type: 'remote', status: 'applied', notes: '', job_description: '',
  })
  const [saving, setSaving] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [error, setError] = useState(null)

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }))

  const handleAutoFill = async () => {
    if (!form.job_url || !form.job_url.trim().startsWith('http')) {
      setError('Enter a valid URL starting with http:// or https://')
      return
    }
    setScraping(true)
    setError(null)
    try {
      const { data } = await jobsApi.scrape(form.job_url)
      setForm(p => ({
        ...p,
        company_name: data.company_name || p.company_name,
        job_title: data.job_title || p.job_title,
        location: data.location || p.location,
        salary_min: data.salary_min !== null ? data.salary_min.toString() : p.salary_min,
        salary_max: data.salary_max !== null ? data.salary_max.toString() : p.salary_max,
        currency: data.currency || p.currency,
        work_type: data.work_type || p.work_type,
        job_description: data.job_description || p.job_description,
      }))
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to auto-fill from URL.')
    } finally {
      setScraping(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.company_name.trim() || !form.job_title.trim()) {
      setError('Company name and job title are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = { ...form,
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max) : null,
      }
      const { data } = await jobsApi.create(payload)
      onCreated(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-700">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">New Application</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X size={14} /></button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded p-2 text-xs text-red-700 dark:text-red-400">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Company *</label>
              <input className="input" placeholder="Google, Meta…" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Job Title *</label>
              <input className="input" placeholder="Software Engineer" value={form.job_title} onChange={e => set('job_title', e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Job URL</label>
              {form.job_url && (
                <button
                  type="button"
                  onClick={handleAutoFill}
                  disabled={scraping}
                  className="text-[10px] text-brand-500 hover:text-brand-600 font-medium transition-colors disabled:opacity-50"
                >
                  {scraping ? 'Extracting…' : 'Auto-fill details ↗'}
                </button>
              )}
            </div>
            <input className="input" placeholder="https://…" value={form.job_url} onChange={e => set('job_url', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="Remote, New York…" value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
            <div>
              <label className="label">Work Type</label>
              <select className="select" value={form.work_type} onChange={e => set('work_type', e.target.value)}>
                {WORK_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Min Salary</label>
              <input className="input" type="number" placeholder="50000" value={form.salary_min} onChange={e => set('salary_min', e.target.value)} />
            </div>
            <div>
              <label className="label">Max Salary</label>
              <input className="input" type="number" placeholder="80000" value={form.salary_max} onChange={e => set('salary_max', e.target.value)} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="select" value={form.currency} onChange={e => set('currency', e.target.value)}>
                {['USD','EUR','GBP','PHP','SGD','MYR','AUD'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Status</label>
              <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date Applied</label>
              <input className="input" type="date" value={form.date_applied ?? ''} onChange={e => set('date_applied', e.target.value || null)} />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} placeholder="Internal notes…" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Job Description</label>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500">Enables AI matching</span>
            </div>
            <textarea className="input resize-none" rows={3} placeholder="Paste the job description here…" value={form.job_description} onChange={e => set('job_description', e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
