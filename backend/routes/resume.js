const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { extractTextFromFile } = require('../utils/resumeParser');
const { analyzeResume } = require('../services/ollama');

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOCX, and TXT files are allowed'));
  },
});

function handleResumeUpload(req, res, next) {
  upload.single('resume')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Resume file must be 5MB or smaller' });
    }

    return res.status(400).json({ error: err.message || 'Resume upload failed' });
  });
}

router.post('/upload', auth, handleResumeUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const parsedText = await extractTextFromFile(req.file.path, req.file.mimetype);
    if (!parsedText || parsedText.trim().length < 50) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Could not extract enough text from resume' });
    }

    const analysis = await analyzeResume(parsedText);

    const [result] = await pool.query(
      'INSERT INTO resumes (user_id, filename, parsed_text, analysis_json) VALUES (?, ?, ?, ?)',
      [req.user.id, req.file.originalname, parsedText, JSON.stringify(analysis)]
    );

    res.status(201).json({
      resume: {
        id: result.insertId,
        filename: req.file.originalname,
        analysis,
        created_at: new Date(),
      },
    });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Resume upload failed' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const [resumes] = await pool.query(
      'SELECT id, filename, analysis_json, created_at FROM resumes WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    const parsed = resumes.map((r) => ({
      ...r,
      analysis: typeof r.analysis_json === 'string' ? JSON.parse(r.analysis_json) : r.analysis_json,
      analysis_json: undefined,
    }));

    res.json({ resumes: parsed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const [resumes] = await pool.query(
      'SELECT id, filename, parsed_text, analysis_json, created_at FROM resumes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (resumes.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resume = resumes[0];
    resume.analysis =
      typeof resume.analysis_json === 'string'
        ? JSON.parse(resume.analysis_json)
        : resume.analysis_json;
    delete resume.analysis_json;

    res.json({ resume });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM resumes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    res.json({ message: 'Resume deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

module.exports = router;
