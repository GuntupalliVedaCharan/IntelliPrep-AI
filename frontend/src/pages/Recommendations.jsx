import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { dashboardAPI } from '../services/api';

const typeIcons = {
  article: '📄',
  video: '🎬',
  course: '📚',
  documentation: '📖',
};

export default function Recommendations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI
      .recommendations()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Loading recommendations..." />
      </Layout>
    );
  }

  const { weakTopics, resources, aiRecommendations, message } = data;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Learning Resources</h1>
        <p className="text-slate-500 mt-1">
          Personalized study materials based on your interview performance
        </p>
      </div>

      {message && (
        <div className="card bg-primary-50 border-primary-200 mb-6">
          <p className="text-primary-800 text-sm">{message}</p>
        </div>
      )}

      {weakTopics?.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold text-slate-900 mb-3">Topics to Focus On</h2>
          <div className="flex flex-wrap gap-2">
            {weakTopics.map((topic) => (
              <span
                key={topic}
                className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {resources?.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-slate-900 mb-4">Recommended Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource, i) => (
              <a
                key={i}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card hover:shadow-md transition-shadow flex gap-4"
              >
                <span className="text-2xl">{typeIcons[resource.resource_type] || '📄'}</span>
                <div>
                  <p className="font-medium text-slate-900">{resource.title}</p>
                  <p className="text-sm text-slate-500">{resource.topic}</p>
                  <span className="text-xs text-primary-600 capitalize mt-1 inline-block">
                    {resource.resource_type}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {aiRecommendations?.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-900 mb-4">AI-Suggested Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiRecommendations.map((rec, i) => (
              <a
                key={i}
                href={rec.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card hover:shadow-md transition-shadow flex gap-4 border-primary-100"
              >
                <span className="text-2xl">{typeIcons[rec.type] || '📄'}</span>
                <div>
                  <p className="font-medium text-slate-900">{rec.title}</p>
                  <p className="text-sm text-slate-500">{rec.topic}</p>
                  {rec.reason && (
                    <p className="text-xs text-slate-400 mt-1">{rec.reason}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
