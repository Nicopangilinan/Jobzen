import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/client'
import { CheckCircle, AlertCircle, Sparkles, User, Bell, FileText, UploadCloud } from 'lucide-react'

export default function Settings() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    profile_summary: user?.profile_summary || '',
    dark_mode: user?.dark_mode ?? false,
    email_notifications: user?.email_notifications ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const { data } = await authApi.update(form)
      updateUser(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCvUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported.')
      return
    }
    
    setUploading(true)
    setUploadError(null)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const { data } = await authApi.uploadCv(formData)
      updateUser(data)
      setForm(p => ({
        ...p,
        profile_summary: data.profile_summary || '',
      }))
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Failed to parse resume. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleCvRemove = async () => {
    try {
      const { data } = await authApi.update({ resume_text: null })
      updateUser(data)
    } catch (err) {
      setError('Failed to remove CV.')
    }
  }

  const profileWordCount = form.profile_summary.trim().split(/\s+/).filter(Boolean).length

  // Update banner calculation to consider resume_text
  const isAiReady = user?.resume_text || user?.profile_summary

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your profile and preferences.</p>
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
              ? 'Your profile/resume is set. Open any job and click "Calculate Match Score" to analyze fit.'
              : 'Upload a Resume/CV or fill in your Profile Summary below to unlock AI match scoring.'}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </div>
        )}
        {saved && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-emerald-400 flex items-center gap-2">
            <CheckCircle size={15} /> Changes saved successfully!
          </div>
        )}

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
            Upload your resume (PDF) to unlock high-fidelity AI matching. We will extract details from your CV for match scores and auto-generate the profile summary below.
          </p>

          {uploadError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400 flex items-center gap-2">
              <AlertCircle size={14} /> {uploadError}
            </div>
          )}

          {user?.resume_text ? (
            <div className="flex items-center justify-between p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-300">Resume parsed successfully</p>
                  <p className="text-[10px] text-slate-550 mt-0.5">
                    {user.resume_text.length.toLocaleString()} characters of experience history active for matching
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
                {uploading ? 'Extracting skills and summary...' : 'Upload your resume (PDF)'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {uploading ? 'This will take a few seconds' : 'Drag and drop or click to browse'}
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
                Profile Summary <span className="text-brand-400">(for AI Matching)</span>
              </label>
              <span className={`text-[10px] font-medium ${profileWordCount >= 50 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {profileWordCount} / 50+ words recommended
              </span>
            </div>
            <textarea
              className="input resize-none"
              rows={6}
              placeholder={`Describe your skills, experience, and what you're looking for. Example:\n\nI am a full-stack software engineer with 5 years of experience in React, Python (FastAPI/Django), and PostgreSQL. I'm looking for senior-level remote roles at product-driven companies. I have a strong background in building scalable APIs and developer tooling.`}
              value={form.profile_summary}
              onChange={e => set('profile_summary', e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              Be specific about your tech stack, years of experience, and job preferences for best results.
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

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
