import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, TrendingUp, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import StatsCard from '../components/StatsCard'
import StatusBadge from '../components/StatusBadge'
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
    <div className="space-y-4 select-none">
      {/* Header Info */}
      <div>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
          Welcome back, {user?.name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs">
          Pipeline overview and operational status for your active job hunt.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard icon={Briefcase}   label="Total Applied"   value={stats?.total}         color="brand" />
        <StatsCard icon={Clock}       label="In Progress"     value={stats?.interviewing}  color="amber" />
        <StatsCard icon={CheckCircle} label="Offers"          value={stats?.offer}         color="emerald" />
        <StatsCard icon={TrendingUp}  label="Response Rate"   value={`${responseRate}%`}   color="blue"
          sub={`${responsesCount} response${responsesCount === 1 ? '' : 's'} logged`} />
      </div>

      {/* Row Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Pie Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Status Breakdown</h3>
          </div>
          <div className="card-body py-3">
            {pieData.length > 0 ? (
              <>
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={2} dataKey="value">
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
                <div className="space-y-1 mt-2">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                        {d.name}
                      </span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-zinc-400 dark:text-zinc-600 text-xs">
                No active records.
              </div>
            )}
          </div>
        </div>

        {/* Dense Table/List of Recent Applications */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Recent Applications</h3>
            <Link to="/jobs" className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-0.5">
              Open Board <ArrowRight size={10} />
            </Link>
          </div>
          <div className="card-body p-0">
            {recentJobs.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-zinc-450 dark:text-zinc-650 text-xs gap-2">
                <Briefcase size={20} className="opacity-20" />
                <p>No applications logged yet.</p>
                <Link to="/jobs" className="btn-primary text-[10px] py-1">Add Job Application</Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {recentJobs.map(job => (
                  <Link key={job.id} to={`/jobs/${job.id}`}
                    className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/35 transition-colors group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {job.company_logo_url ? (
                        <img src={job.company_logo_url} alt={job.company_name}
                          className="w-6 h-6 rounded border border-zinc-200 bg-white object-contain p-0.5"
                          onError={e => { e.target.style.display = 'none' }} />
                      ) : (
                        <div className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 shrink-0">
                          {job.company_name[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-brand-500 transition-colors">
                          {job.job_title}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{job.company_name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={job.status} />
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 hidden sm:block">
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
