import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { interviewAPI, resumeAPI } from '../services/api';

export default function InterviewSetup() {
  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState('');
  const [interviewType, setInterviewType] = useState('mixed');
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    resumeAPI
      .list()
      .then((res) => {
        setResumes(res.data.resumes);
        if (res.data.resumes.length > 0) setResumeId(String(res.data.resumes[0].id));
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, []);

  const handleStart = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await interviewAPI.start({
        resumeId: resumeId ? parseInt(resumeId) : null,
        interviewType,
        questionCount,
      });
      navigate(`/interview/${res.data.interview.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Start Mock Interview</h1>
          <p className="text-slate-500 mt-1">AI generates personalized questions based on your profile</p>
        </div>

        <form onSubmit={handleStart} className="card space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="label">Based on Resume (optional)</label>
            <select
              className="input-field"
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
            >
              <option value="">General interview (no resume)</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.filename}
                </option>
              ))}
            </select>
            {resumes.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">Upload a resume for personalized questions</p>
            )}
          </div>

          <div>
            <label className="label">Interview Type</label>
            <div className="grid grid-cols-3 gap-2">
              {['technical', 'hr', 'mixed'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setInterviewType(type)}
                  className={`py-2.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                    interviewType === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Number of Questions: {questionCount}</label>
            <input
              type="range"
              min={3}
              max={10}
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              className="w-full accent-primary-600"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>3</span>
              <span>10</span>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Generating questions with AI...' : 'Start Interview'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
