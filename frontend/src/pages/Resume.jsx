import { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { resumeAPI } from '../services/api';

export default function Resume() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selectedResume, setSelectedResume] = useState(null);
  const fileInputRef = useRef(null);

  const fetchResumes = () => {
    resumeAPI
      .list()
      .then((res) => setResumes(res.data.resumes))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const res = await resumeAPI.upload(file);
      setResumes((prev) => [res.data.resume, ...prev]);
      setSelectedResume(res.data.resume);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this resume?')) return;
    try {
      await resumeAPI.delete(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
      if (selectedResume?.id === id) setSelectedResume(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Loading resumes..." />
      </Layout>
    );
  }

  const analysis = selectedResume?.analysis;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Resume Analysis</h1>
        <p className="text-slate-500 mt-1">Upload your resume for AI-powered skill extraction</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div
            className="card border-dashed border-2 border-slate-300 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleUpload}
              className="hidden"
            />
            {uploading ? (
              <LoadingSpinner message="Analyzing resume with AI..." />
            ) : (
              <>
                <div className="text-4xl mb-2">📄</div>
                <p className="font-medium text-slate-700">Upload Resume</p>
                <p className="text-xs text-slate-400 mt-1">PDF, DOCX, or TXT (max 5MB)</p>
              </>
            )}
          </div>

          {resumes.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-slate-900 mb-3">Your Resumes</h3>
              <div className="space-y-2">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedResume?.id === resume.id
                        ? 'bg-primary-50 border border-primary-200'
                        : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedResume(resume)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{resume.filename}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(resume.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(resume.id);
                      }}
                      className="text-red-500 hover:text-red-700 text-sm ml-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {!selectedResume ? (
            <div className="card text-center py-16">
              <p className="text-slate-500">
                {resumes.length === 0
                  ? 'Upload a resume to see AI analysis'
                  : 'Select a resume to view analysis'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {analysis?.summary && (
                <div className="card">
                  <h3 className="font-semibold text-slate-900 mb-2">Summary</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{analysis.summary}</p>
                </div>
              )}

              {analysis?.skills?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-slate-900 mb-3">Skills Identified</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis?.experience?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-slate-900 mb-3">Experience</h3>
                  <div className="space-y-3">
                    {analysis.experience.map((exp, i) => (
                      <div key={i} className="border-l-2 border-primary-200 pl-4">
                        <p className="font-medium text-slate-900">{exp.role}</p>
                        <p className="text-sm text-slate-500">
                          {exp.company} · {exp.duration}
                        </p>
                        {exp.highlights?.map((h, j) => (
                          <p key={j} className="text-sm text-slate-600 mt-1">• {h}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis?.projects?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-slate-900 mb-3">Projects</h3>
                  <div className="space-y-3">
                    {analysis.projects.map((proj, i) => (
                      <div key={i}>
                        <p className="font-medium text-slate-900">{proj.name}</p>
                        <p className="text-sm text-slate-600">{proj.description}</p>
                        {proj.technologies?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {proj.technologies.map((t) => (
                              <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis?.education?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-slate-900 mb-3">Education</h3>
                  {analysis.education.map((edu, i) => (
                    <div key={i}>
                      <p className="font-medium text-slate-900">{edu.degree}</p>
                      <p className="text-sm text-slate-500">
                        {edu.institution} · {edu.year}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {analysis?.suggestedTopics?.length > 0 && (
                <div className="card bg-amber-50 border-amber-200">
                  <h3 className="font-semibold text-amber-900 mb-2">Suggested Interview Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.suggestedTopics.map((topic) => (
                      <span
                        key={topic}
                        className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
