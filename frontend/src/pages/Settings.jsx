import { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/client'
import { Sparkles, User, Bell, FileText, UploadCloud, Info } from 'lucide-react'
import Toast from '../components/Toast'

export default function Settings() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    profile_summary: user?.profile_summary || '',
    dark_mode: user?.dark_mode ?? false,
    email_notifications: user?.email_notifications ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Toast state: { type: 'loading' | 'success' | 'error', message: string } | null
  const [toast, setToast] = useState(null)

  const showToast = useCallback((type, message, duration = 4000) => {
    setToast({ type, message, duration })
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    showToast('loading', 'Saving your profile…')
    try {
      const { data } = await authApi.update(form)
      updateUser(data)
      showToast('success', 'Profile saved successfully!', 4000)
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to save. Please try again.', 5000)
    } finally {
      setSaving(false)
    }
  }

  const handleCvUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      showToast('error', 'Only PDF files are supported.', 5000)
      return
    }

    setUploading(true)
    showToast('loading', 'Uploading and parsing your resume…')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data } = await authApi.uploadCv(formData)
      updateUser(data)
      setForm(p => ({
        ...p,
        profile_summary: data.profile_summary || '',
      }))
      showToast('success', 'Resume parsed! AI summary has been generated below.', 5000)
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to parse resume. Please try again.', 5000)
    } finally {
      setUploading(false)
    }
  }

  const handleCvRemove = async () => {
    try {
      const { data } = await authApi.update({ resume_text: null })
      updateUser(data)
      showToast('success', 'Resume removed.', 3000)
    } catch {
      showToast('error', 'Failed to remove CV.', 4000)
    }
  }

  const profileWordCount = form.profile_summary.trim().split(/\s+/).filter(Boolean).length
  const isAiReady = user?.resume_text || user?.profile_summary

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={dismissToast}
        />
      )}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">Preferences</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Manage your profile, resume, and AI matching preferences.</p>
      </div>

      <div className={`flex items-start gap-3 rounded-3xl border p-4 transition-all sm:p-5 ${
        isAiReady
          ? 'border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-950/10'
          : 'border-brand-500/20 bg-brand-50/70 dark:bg-brand-500/10'
      }`}>
        <Sparkles size={18} className={isAiReady ? 'mt-0.5 shrink-0 text-emerald-400' : 'mt-0.5 shrink-0 text-brand-400'} />
        <div>
          <p className={`text-sm font-semibold ${isAiReady ? 'text-emerald-700 dark:text-emerald-300' : 'text-brand-700 dark:text-brand-300'}`}>
            {isAiReady ? 'AI Matching Enabled' : 'Enable AI Job Matching'}
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {isAiReady
              ? 'Your resume/profile is active. The AI uses both your full CV text and any additional notes you write below for maximum matching accuracy.'
              : 'Upload a Resume/CV or fill in your Profile Notes below to unlock AI match scoring.'}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <div className="card p-5 space-y-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-zinc-400" />
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Resume / CV</h2>
            </div>
            <span className="w-fit rounded-full border border-brand-500/20 bg-brand-500/10 px-2.5 py-1 text-[10px] font-medium text-brand-700 dark:text-brand-300">
              Recommended
            </span>
          </div>

          <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Upload your resume (PDF). We will extract the full text and use it verbatim for AI job matching — no information is left behind. An AI summary will also be auto-generated in the field below.
          </p>

          {user?.resume_text ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-50/70 p-4 dark:bg-emerald-950/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-500">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Resume active for matching</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {user.resume_text.length.toLocaleString()} characters extracted from your CV
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCvRemove}
                className="btn-secondary w-full sm:w-auto"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-zinc-50/70 p-6 text-center transition-all hover:border-brand-500/40 hover:bg-brand-50/60 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80">
              <input
                type="file"
                accept=".pdf"
                onChange={handleCvUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud size={30} className={`text-zinc-500 transition-transform duration-300 group-hover:-translate-y-0.5 ${uploading ? 'animate-bounce text-brand-400' : 'group-hover:text-brand-400'}`} />
              <p className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {uploading ? 'Extracting and summarizing…' : 'Upload your resume (PDF)'}
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {uploading ? 'AI is reading your resume, this takes a few seconds' : 'Drag and drop, or click to browse'}
              </p>
            </div>
          )}
        </div>

        <div className="card p-5 space-y-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <User size={16} className="text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Profile</h2>
          </div>

          <div>
            <label className="label">Full Name</label>
            <input
              className="input max-w-xl"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="label">Email Address</label>
            <input
              className="input max-w-xl cursor-not-allowed bg-zinc-100 text-zinc-500 dark:bg-zinc-900"
              value={user?.email || ''}
              disabled
            />
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Email is managed by Google OAuth and cannot be changed.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">
                <Sparkles size={12} className="inline mr-1 text-brand-400" />
                AI Profile Notes <span className="text-brand-400">(Supplements your Resume)</span>
              </label>
              <span className={`text-[10px] font-medium ${profileWordCount >= 20 ? 'text-emerald-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {profileWordCount} words
              </span>
            </div>

            <div className="mb-3 flex items-start gap-2 rounded-2xl border border-brand-500/15 bg-brand-500/5 px-3 py-3">
              <Info size={13} className="text-brand-400 mt-0.5 shrink-0" />
              <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                This field <span className="font-medium text-zinc-800 dark:text-zinc-200">adds to</span> your uploaded CV during AI matching — it is not a replacement. Use it to specify job preferences, desired role level, preferred work style, or anything your resume doesn't cover.
              </p>
            </div>

            <textarea
              className="input min-h-[11rem] resize-y"
              rows={7}
              placeholder={`Add preferences and context your resume may not cover. For example:\n\nI'm looking for senior-level remote or hybrid roles at product-driven companies. I prefer teams that value autonomy, fast iteration, and strong engineering culture. Open to startups (Series A+) or mid-sized tech companies.`}
              value={form.profile_summary}
              onChange={e => set('profile_summary', e.target.value)}
            />
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Be specific about role preferences, seniority, location, and work style for the most accurate AI matching results.
            </p>
          </div>
        </div>

        <div className="card p-5 space-y-4 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={16} className="text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h2>
          </div>

          <label className="group flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div>
              <p className="text-sm font-semibold text-zinc-900 transition-colors group-hover:text-zinc-700 dark:text-zinc-100 dark:group-hover:text-zinc-50">Email Notifications</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Receive follow-up reminders and weekly summaries.</p>
            </div>
            <button
              type="button"
              onClick={() => set('email_notifications', !form.email_notifications)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                form.email_notifications ? 'bg-brand-500' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                form.email_notifications ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full justify-center"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
