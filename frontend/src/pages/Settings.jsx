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
    <div className="max-w-2xl space-y-6 animate-fade-in">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={dismissToast}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your profile and AI matching preferences.</p>
      </div>

      {/* AI Feature Banner */}
      <div className={`rounded-xl border p-4 flex items-start gap-3 transition-all ${
        isAiReady
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-brand-500/5 border-brand-500/20'
      }`}>
        <Sparkles size={18} className={isAiReady ? 'text-emerald-400 mt-0.5 shrink-0' : 'text-brand-400 mt-0.5 shrink-0'} />
        <div>
          <p className={`text-sm font-medium ${isAiReady ? 'text-emerald-300' : 'text-brand-300'}`}>
            {isAiReady ? 'AI Matching Enabled' : 'Enable AI Job Matching'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAiReady
              ? 'Your resume/profile is active. The AI uses both your full CV text and any additional notes you write below for maximum matching accuracy.'
              : 'Upload a Resume/CV or fill in your Profile Notes below to unlock AI match scoring.'}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Resume Card */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-300">Resume / CV</h2>
            </div>
            <span className="text-[10px] bg-brand-500/10 text-brand-300 font-medium px-2 py-0.5 rounded-full border border-brand-500/20">
              Recommended
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Upload your resume (PDF). We will extract the full text and use it verbatim for AI job matching — no information is left behind. An AI summary will also be auto-generated in the field below.
          </p>

          {user?.resume_text ? (
            <div className="flex items-center justify-between p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-300">Resume active for matching</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {user.resume_text.length.toLocaleString()} characters extracted from your CV
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCvRemove}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors p-1.5 hover:bg-red-500/10 rounded-lg"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="relative group border border-dashed border-slate-700 hover:border-brand-500/50 rounded-xl p-6 transition-all bg-surface-900/50 hover:bg-surface-900/80 flex flex-col items-center justify-center text-center cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                onChange={handleCvUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud size={28} className={`text-slate-500 transition-transform duration-300 group-hover:-translate-y-0.5 ${uploading ? 'animate-bounce text-brand-400' : 'group-hover:text-brand-400'}`} />
              <p className="text-sm font-medium text-slate-300 mt-3">
                {uploading ? 'Extracting and summarizing…' : 'Upload your resume (PDF)'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {uploading ? 'AI is reading your resume, this takes a few seconds' : 'Drag and drop, or click to browse'}
              </p>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User size={15} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-300">Profile</h2>
          </div>

          <div>
            <label className="label">Full Name</label>
            <input
              className="input max-w-md"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="label">Email Address</label>
            <input
              className="input max-w-md bg-surface-800 text-slate-500 cursor-not-allowed"
              value={user?.email || ''}
              disabled
            />
            <p className="text-xs text-slate-500 mt-1">Email is managed by Google OAuth and cannot be changed.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">
                <Sparkles size={12} className="inline mr-1 text-brand-400" />
                AI Profile Notes <span className="text-brand-400">(Supplements your Resume)</span>
              </label>
              <span className={`text-[10px] font-medium ${profileWordCount >= 20 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {profileWordCount} words
              </span>
            </div>

            {/* Info callout */}
            <div className="flex items-start gap-2 bg-brand-500/5 border border-brand-500/15 rounded-lg px-3 py-2.5 mb-2">
              <Info size={13} className="text-brand-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                This field <span className="text-slate-200 font-medium">adds to</span> your uploaded CV during AI matching — it is not a replacement. Use it to specify job preferences, desired role level, preferred work style, or anything your resume doesn't cover (e.g. <em>"I'm only looking for senior remote roles in product-led companies"</em>). If no CV is uploaded, this is used alone.
              </p>
            </div>

            <textarea
              className="input resize-none"
              rows={6}
              placeholder={`Add preferences and context your resume may not cover. For example:\n\nI'm looking for senior-level remote or hybrid roles at product-driven companies. I prefer teams that value autonomy, fast iteration, and strong engineering culture. Open to startups (Series A+) or mid-sized tech companies.`}
              value={form.profile_summary}
              onChange={e => set('profile_summary', e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              Be specific about role preferences, seniority, location, and work style for the most accurate AI matching results.
            </p>
          </div>
        </div>

        {/* Notifications Card */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={15} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-300">Notifications</h2>
          </div>

          <label className="flex items-center justify-between gap-4 cursor-pointer group">
            <div>
              <p className="text-sm text-slate-200 group-hover:text-slate-100 transition-colors">Email Notifications</p>
              <p className="text-xs text-slate-500 mt-0.5">Receive follow-up reminders and weekly summaries.</p>
            </div>
            <button
              type="button"
              onClick={() => set('email_notifications', !form.email_notifications)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                form.email_notifications ? 'bg-brand-500' : 'bg-surface-600'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                form.email_notifications ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full justify-center py-2.5"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
