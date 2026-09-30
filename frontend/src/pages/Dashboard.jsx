import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ScoreBadge from '../components/ScoreBadge';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function StatCard({ label, value, sub }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-slate-900 mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI
      .stats()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Loading dashboard..." />
      </Layout>
    );
  }

  const { stats, scoreHistory, categoryScores, weakTopics, recentInterviews } = data;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-slate-500 mt-1">Track your interview preparation progress</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Interviews" value={stats.total_interviews} />
        <StatCard label="Completed" value={stats.completed_interviews} />
        <StatCard
          label="Average Score"
          value={stats.average_score ? `${stats.average_score}%` : null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {scoreHistory?.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-4">Score Trend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={scoreHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="completed_at"
                  tickFormatter={(v) => new Date(v).toLocaleDateString()}
                  fontSize={12}
                />
                <YAxis domain={[0, 100]} fontSize={12} />
                <Tooltip
                  labelFormatter={(v) => new Date(v).toLocaleString()}
                  formatter={(v) => [`${v}%`, 'Score']}
                />
                <Line type="monotone" dataKey="overall_score" stroke="#4f46e5" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {categoryScores?.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-4">Performance by Category</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryScores} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} fontSize={12} />
                <YAxis type="category" dataKey="category" width={100} fontSize={11} />
                <Tooltip formatter={(v) => [`${v}%`, 'Avg Score']} />
                <Bar dataKey="avg_score" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-slate-900">Recent Interviews</h2>
            <Link to="/interview" className="text-sm text-primary-600 hover:text-primary-700">
              Start New
            </Link>
          </div>
          {recentInterviews?.length === 0 ? (
            <p className="text-slate-500 text-sm">No interviews yet. Start your first mock interview!</p>
          ) : (
            <div className="space-y-3">
              {recentInterviews?.map((interview) => (
                <Link
                  key={interview.id}
                  to={`/interview/${interview.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{interview.title}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(interview.created_at).toLocaleDateString()} · {interview.interview_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {interview.overall_score && <ScoreBadge score={interview.overall_score} />}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        interview.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {interview.status.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-slate-900">Weak Topics</h2>
            <Link to="/recommendations" className="text-sm text-primary-600 hover:text-primary-700">
              View Resources
            </Link>
          </div>
          {weakTopics?.length === 0 ? (
            <p className="text-slate-500 text-sm">Complete interviews to identify areas for improvement.</p>
          ) : (
            <div className="space-y-2">
              {weakTopics?.map((topic) => (
                <div
                  key={topic.topic}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <span className="text-sm font-medium text-red-800">{topic.topic}</span>
                  <span className="text-xs text-red-600">{topic.occurrence_count}x flagged</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
