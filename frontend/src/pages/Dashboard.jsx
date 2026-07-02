import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, TrendingUp, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import StatsCard from '../components/StatsCard'
import StatusBadge from '../components/StatusBadge'
import ExpiredBadge from '../components/ExpiredBadge'
import { jobsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'

const CHART_COLORS = {
  applied: '#0066cc',
  interviewing: '#d97706',
  offer: '#059669',
  rejected: '#dc2626',
  withdrawn: '#71717a',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentJobs, setRecentJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      jobsApi.stats(),
      jobsApi.list({ limit: 5 }), // dense list of 5 instead of 6
    ]).then(([s, j]) => {
      setStats(s.data)
      setRecentJobs(j.data)
    }).catch(err => {
      console.error("Dashboard fetch error:", err)
    }).finally(() => setLoading(false))
  }, [])

  const pieData = stats ? [
    { name: 'Applied',      value: stats.applied,      color: CHART_COLORS.applied },
    { name: 'Interviewing', value: stats.interviewing,  color: CHART_COLORS.interviewing },
    { name: 'Offer',        value: stats.offer,         color: CHART_COLORS.offer },
    { name: 'Rejected',     value: stats.rejected,      color: CHART_COLORS.rejected },
  ].filter(d => d.value > 0) : []

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-zinc-900 dark:border-zinc-50 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const responseRate = stats?.response_rate ?? 0
  const responsesCount = (stats?.interviewing ?? 0) + (stats?.offer ?? 0) + (stats?.rejected ?? 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200/80 bg-gradient-to-br from-white via-zinc-50 to-brand-50/60 p-5 shadow-sm shadow-zinc-950/5 dark:border-zinc-800/80 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
              Weekly Snapshot
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">
              Welcome back, {user?.name?.split(' ')[0] || 'User'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Pipeline overview and operational status for your active job hunt.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">Response rate</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{responseRate}%</p>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">Responses</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{responsesCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard icon={Briefcase}   label="Total Applied"   value={stats?.total}         color="brand" />
        <StatsCard icon={Clock}       label="In Progress"     value={stats?.interviewing}  color="amber" />
        <StatsCard icon={CheckCircle} label="Offers"          value={stats?.offer}         color="emerald" />
        <StatsCard icon={TrendingUp}  label="Response Rate"   value={`${responseRate}%`}   color="blue"
          sub={`${responsesCount} response${responsesCount === 1 ? '' : 's'} logged`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Status Breakdown</h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">See where the strongest momentum is building.</p>
            </div>
          </div>
          <div className="card-body pt-4">
            {pieData.length > 0 ? (
              <>
                <div className="h-[220px] w-full sm:h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={78} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v, n) => [v, n]}
                        contentStyle={{
                          background: 'var(--tw-colors-zinc-900, #18181b)',
                          border: '1px solid var(--tw-colors-zinc-800, #27272a)',
                          borderRadius: '4px',
                          color: '#f4f4f5',
                          fontSize: '10px',
                          padding: '4px 8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950/50">
                      <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                        <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                        {d.name}
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-zinc-400 dark:text-zinc-600">
                No active records.
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Recent Applications</h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Latest activity across your current pipeline.</p>
            </div>
            <Link to="/jobs" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              Open Board <ArrowRight size={10} />
            </Link>
          </div>
          <div className="card-body p-0">
            {recentJobs.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-zinc-400 dark:text-zinc-600">
                <Briefcase size={24} className="opacity-20" />
                <p>No applications logged yet.</p>
                <Link to="/jobs" className="btn-primary">Add Job Application</Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {recentJobs.map(job => (
                  <Link key={job.id} to={`/jobs/${job.id}`}
                    className="group flex flex-col gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/35 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      {job.company_logo_url ? (
                        <img src={job.company_logo_url} alt={job.company_name}
                          className="h-10 w-10 rounded-2xl border border-zinc-200 bg-white object-contain p-1"
                          onError={e => { e.target.style.display = 'none' }} />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-sm font-bold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
                          {job.company_name[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900 transition-colors group-hover:text-brand-500 dark:text-zinc-100">
                          {job.job_title}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{job.company_name}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={job.status} />
                        {job.is_active === false && <ExpiredBadge compact />}
                      </div>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
