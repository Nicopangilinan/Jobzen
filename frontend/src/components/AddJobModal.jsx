import { useState } from 'react'
import { X } from 'lucide-react'
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
    <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-end justify-center p-2 sm:items-center sm:p-4">
        <div className="card flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden border border-zinc-200 dark:border-zinc-700" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:px-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">New Application</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Capture job details, notes, and the description for AI matching.</p>
            </div>
            <button onClick={onClose} className="btn-ghost h-10 w-10 rounded-2xl p-0"><X size={16} /></button>
          </div>

          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="space-y-4">
                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">{error}</div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="label mb-0">Job URL</label>
                    {form.job_url && (
                      <button
                        type="button"
                        onClick={handleAutoFill}
                        disabled={scraping}
                        className="text-xs font-medium text-brand-500 transition-colors hover:text-brand-600 disabled:opacity-50"
                      >
                        {scraping ? 'Extracting…' : 'Auto-fill details ↗'}
                      </button>
                    )}
                  </div>
                  <input className="input" placeholder="https://…" value={form.job_url} onChange={e => set('job_url', e.target.value)} />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  <textarea className="input min-h-[7rem] resize-y" rows={3} placeholder="Internal notes…" value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="label mb-0">Job Description</label>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Enables AI matching</span>
                  </div>
                  <textarea className="input min-h-[10rem] resize-y" rows={5} placeholder="Paste the job description here…" value={form.job_description} onChange={e => set('job_description', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 sm:flex-row sm:justify-end sm:px-5">
              <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto sm:min-w-[9rem]">
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
