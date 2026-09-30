import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ScoreBadge from '../components/ScoreBadge';
import { interviewAPI } from '../services/api';

export default function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState(false);

  const fetchInterview = () => {
    interviewAPI
      .get(id)
      .then((res) => {
        setInterview(res.data.interview);
        setQuestions(res.data.questions);
        const firstUnanswered = res.data.questions.findIndex((q) => !q.answer);
        setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load interview'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInterview();
  }, [id]);

  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter((q) => q.answer).length;
  const allAnswered = answeredCount === questions.length;

  const handleSubmitAnswer = async () => {
    if (!answerText.trim() || !currentQuestion) return;
    setEvaluating(true);
    setError('');
    try {
      const res = await interviewAPI.answer(id, {
        questionId: currentQuestion.id,
        answerText,
      });

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === currentQuestion.id
            ? {
                ...q,
                answer: {
                  answer_text: answerText,
                  score: res.data.evaluation.score,
                  feedback: res.data.evaluation,
                },
              }
            : q
        )
      );
      setAnswerText('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to evaluate answer');
    } finally {
      setEvaluating(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await interviewAPI.complete(id);
      fetchInterview();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete interview');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Loading interview..." />
      </Layout>
    );
  }

  if (error && !interview) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-red-600">{error}</p>
          <Link to="/interview" className="btn-primary mt-4 inline-block">
            Back to Setup
          </Link>
        </div>
      </Layout>
    );
  }

  const isCompleted = interview?.status === 'completed';

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{interview?.title}</h1>
            <p className="text-sm text-slate-500">
              Question {currentIndex + 1} of {questions.length} · {answeredCount} answered
            </p>
          </div>
          {interview?.overall_score && <ScoreBadge score={interview.overall_score} />}
        </div>

        <div className="w-full bg-slate-200 rounded-full h-2 mb-6">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
        )}

        {currentQuestion && (
          <div className="card mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {currentQuestion.category}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded capitalize ${
                  currentQuestion.difficulty === 'hard'
                    ? 'bg-red-100 text-red-700'
                    : currentQuestion.difficulty === 'easy'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {currentQuestion.difficulty}
              </span>
            </div>

            <p className="text-lg font-medium text-slate-900 mb-4">{currentQuestion.question_text}</p>

            {currentQuestion.answer ? (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-500 mb-1">Your Answer</p>
                  <p className="text-slate-700">{currentQuestion.answer.answer_text}</p>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-semibold text-slate-900">AI Feedback</span>
                    <ScoreBadge score={currentQuestion.answer.score} />
                  </div>

                  {currentQuestion.answer.feedback?.strengths?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-green-700 mb-1">Strengths</p>
                      <ul className="text-sm text-slate-600 space-y-1">
                        {currentQuestion.answer.feedback.strengths.map((s, i) => (
                          <li key={i}>✓ {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {currentQuestion.answer.feedback?.weaknesses?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-red-700 mb-1">Areas to Improve</p>
                      <ul className="text-sm text-slate-600 space-y-1">
                        {currentQuestion.answer.feedback.weaknesses.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {currentQuestion.answer.feedback?.suggestions?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-primary-700 mb-1">Suggestions</p>
                      <ul className="text-sm text-slate-600 space-y-1">
                        {currentQuestion.answer.feedback.suggestions.map((s, i) => (
                          <li key={i}>→ {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              !isCompleted && (
                <div className="space-y-4">
                  <textarea
                    className="input-field min-h-[150px] resize-y"
                    placeholder="Type your answer here..."
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                  />
                  <button
                    onClick={handleSubmitAnswer}
                    className="btn-primary w-full py-2.5"
                    disabled={evaluating || !answerText.trim()}
                  >
                    {evaluating ? 'AI is evaluating your answer...' : 'Submit Answer'}
                  </button>
                </div>
              )
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setCurrentIndex((i) => Math.max(0, i - 1));
              setAnswerText('');
            }}
            className="btn-secondary"
            disabled={currentIndex === 0}
          >
            Previous
          </button>

          <div className="flex gap-1">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => {
                  setCurrentIndex(i);
                  setAnswerText('');
                }}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                  i === currentIndex
                    ? 'bg-primary-600 text-white'
                    : q.answer
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => {
                setCurrentIndex((i) => i + 1);
                setAnswerText('');
              }}
              className="btn-secondary"
            >
              Next
            </button>
          ) : allAnswered && !isCompleted ? (
            <button onClick={handleComplete} className="btn-primary" disabled={completing}>
              {completing ? 'Completing...' : 'Finish Interview'}
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
            >
              {isCompleted ? 'Back to Dashboard' : 'Exit'}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
