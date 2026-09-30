const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { generateQuestions, evaluateAnswer } = require('../services/ollama');

const router = express.Router();

async function updateWeakTopics(userId, category) {
  if (!category) return;
  await pool.query(
    `INSERT INTO weak_topics (user_id, topic, occurrence_count)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE occurrence_count = occurrence_count + 1, last_seen = CURRENT_TIMESTAMP`,
    [userId, category]
  );
}

router.post('/start', auth, async (req, res) => {
  try {
    const { resumeId, interviewType = 'mixed', questionCount = 5 } = req.body;

    let analysis = null;
    if (resumeId) {
      const [resumes] = await pool.query(
        'SELECT analysis_json FROM resumes WHERE id = ? AND user_id = ?',
        [resumeId, req.user.id]
      );
      if (resumes.length === 0) {
        return res.status(404).json({ error: 'Resume not found' });
      }
      analysis =
        typeof resumes[0].analysis_json === 'string'
          ? JSON.parse(resumes[0].analysis_json)
          : resumes[0].analysis_json;
    } else {
      analysis = {
        skills: ['General Programming', 'Problem Solving'],
        projects: [],
        experience: [],
        suggestedTopics: ['Data Structures', 'Algorithms'],
      };
    }

    const questions = await generateQuestions(analysis, interviewType, questionCount);
    const title = `${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} Mock Interview`;

    const [interviewResult] = await pool.query(
      'INSERT INTO interviews (user_id, resume_id, title, interview_type, status) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, resumeId || null, title, interviewType, 'in_progress']
    );

    const interviewId = interviewResult.insertId;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await pool.query(
        'INSERT INTO questions (interview_id, question_text, category, difficulty, order_index) VALUES (?, ?, ?, ?, ?)',
        [interviewId, q.question, q.category || 'General', q.difficulty || 'medium', i]
      );
    }

    const [savedQuestions] = await pool.query(
      'SELECT id, question_text, category, difficulty, order_index FROM questions WHERE interview_id = ? ORDER BY order_index',
      [interviewId]
    );

    res.status(201).json({
      interview: {
        id: interviewId,
        title,
        interview_type: interviewType,
        status: 'in_progress',
        questions: savedQuestions,
      },
    });
  } catch (err) {
    console.error('Start interview error:', err);
    res.status(500).json({ error: err.message || 'Failed to start interview' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const [interviews] = await pool.query(
      `SELECT id, title, interview_type, status, overall_score, created_at, completed_at
       FROM interviews WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ interviews });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const [interviews] = await pool.query(
      'SELECT * FROM interviews WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (interviews.length === 0) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const interview = interviews[0];

    const [questions] = await pool.query(
      `SELECT q.id, q.question_text, q.category, q.difficulty, q.order_index,
              a.id as answer_id, a.answer_text, a.score, a.feedback_json
       FROM questions q
       LEFT JOIN answers a ON a.question_id = q.id
       WHERE q.interview_id = ?
       ORDER BY q.order_index`,
      [req.params.id]
    );

    const formattedQuestions = questions.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      category: q.category,
      difficulty: q.difficulty,
      order_index: q.order_index,
      answer: q.answer_id
        ? {
            id: q.answer_id,
            answer_text: q.answer_text,
            score: q.score,
            feedback:
              typeof q.feedback_json === 'string'
                ? JSON.parse(q.feedback_json)
                : q.feedback_json,
          }
        : null,
    }));

    res.json({ interview, questions: formattedQuestions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interview' });
  }
});

router.post('/:id/answer', auth, async (req, res) => {
  try {
    const { questionId, answerText } = req.body;
    if (!questionId || !answerText?.trim()) {
      return res.status(400).json({ error: 'Question ID and answer are required' });
    }

    const [interviews] = await pool.query(
      'SELECT id FROM interviews WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (interviews.length === 0) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const [questions] = await pool.query(
      'SELECT * FROM questions WHERE id = ? AND interview_id = ?',
      [questionId, req.params.id]
    );
    if (questions.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const question = questions[0];
    const evaluation = await evaluateAnswer(
      question.question_text,
      answerText,
      question.category
    );

    const [existing] = await pool.query('SELECT id FROM answers WHERE question_id = ?', [questionId]);

    if (existing.length > 0) {
      await pool.query(
        'UPDATE answers SET answer_text = ?, score = ?, feedback_json = ? WHERE question_id = ?',
        [answerText, evaluation.score, JSON.stringify(evaluation), questionId]
      );
    } else {
      await pool.query(
        'INSERT INTO answers (question_id, answer_text, score, feedback_json) VALUES (?, ?, ?, ?)',
        [questionId, answerText, evaluation.score, JSON.stringify(evaluation)]
      );
    }

    if (evaluation.score < 60) {
      await updateWeakTopics(req.user.id, question.category);
    }

    res.json({ evaluation });
  } catch (err) {
    console.error('Answer error:', err);
    res.status(500).json({ error: err.message || 'Failed to evaluate answer' });
  }
});

router.post('/:id/complete', auth, async (req, res) => {
  try {
    const [interviews] = await pool.query(
      'SELECT id FROM interviews WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (interviews.length === 0) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const [scores] = await pool.query(
      `SELECT AVG(a.score) as avg_score
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       WHERE q.interview_id = ?`,
      [req.params.id]
    );

    const overallScore = scores[0]?.avg_score ? parseFloat(scores[0].avg_score).toFixed(2) : null;

    await pool.query(
      'UPDATE interviews SET status = ?, overall_score = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', overallScore, req.params.id]
    );

    res.json({ overall_score: overallScore, status: 'completed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete interview' });
  }
});

module.exports = router;
