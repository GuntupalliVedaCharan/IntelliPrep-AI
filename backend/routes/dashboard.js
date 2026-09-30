const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { generateRecommendations } = require('../services/ollama');

const router = express.Router();

router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [interviewStats] = await pool.query(
      `SELECT
         COUNT(*) as total_interviews,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_interviews,
         AVG(overall_score) as average_score
       FROM interviews WHERE user_id = ?`,
      [userId]
    );

    const [scoreHistory] = await pool.query(
      `SELECT id, title, overall_score, interview_type, completed_at
       FROM interviews
       WHERE user_id = ? AND status = 'completed' AND overall_score IS NOT NULL
       ORDER BY completed_at ASC
       LIMIT 10`,
      [userId]
    );

    const [categoryScores] = await pool.query(
      `SELECT q.category, AVG(a.score) as avg_score, COUNT(a.id) as answer_count
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       JOIN interviews i ON i.id = q.interview_id
       WHERE i.user_id = ?
       GROUP BY q.category
       ORDER BY avg_score ASC`,
      [userId]
    );

    const [weakTopics] = await pool.query(
      'SELECT topic, occurrence_count, last_seen FROM weak_topics WHERE user_id = ? ORDER BY occurrence_count DESC LIMIT 10',
      [userId]
    );

    const [recentInterviews] = await pool.query(
      `SELECT id, title, interview_type, status, overall_score, created_at
       FROM interviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    res.json({
      stats: {
        total_interviews: interviewStats[0].total_interviews || 0,
        completed_interviews: interviewStats[0].completed_interviews || 0,
        average_score: interviewStats[0].average_score
          ? parseFloat(interviewStats[0].average_score).toFixed(1)
          : null,
      },
      scoreHistory,
      categoryScores: categoryScores.map((c) => ({
        category: c.category,
        avg_score: parseFloat(c.avg_score).toFixed(1),
        answer_count: c.answer_count,
      })),
      weakTopics,
      recentInterviews,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/recommendations', auth, async (req, res) => {
  try {
    const [weakTopics] = await pool.query(
      'SELECT topic FROM weak_topics WHERE user_id = ? ORDER BY occurrence_count DESC LIMIT 5',
      [req.user.id]
    );

    const topics = weakTopics.map((t) => t.topic);

    let dbResources = [];
    if (topics.length > 0) {
      const placeholders = topics.map(() => '?').join(',');
      const [resources] = await pool.query(
        `SELECT topic, title, url, resource_type FROM learning_resources
         WHERE topic IN (${placeholders})
         ORDER BY topic`,
        topics
      );
      dbResources = resources;
    }

    let aiResources = [];
    if (topics.length > 0) {
      try {
        aiResources = await generateRecommendations(topics);
      } catch {
        // Ollama unavailable — DB resources still returned
      }
    }

    if (topics.length === 0) {
      const [defaultResources] = await pool.query(
        'SELECT topic, title, url, resource_type FROM learning_resources LIMIT 8'
      );
      return res.json({
        weakTopics: [],
        resources: defaultResources,
        message: 'Complete interviews to get personalized recommendations',
      });
    }

    res.json({
      weakTopics: topics,
      resources: dbResources,
      aiRecommendations: aiResources,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

module.exports = router;
