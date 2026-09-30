const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3';
const DEFAULT_TIMEOUT_MS = getPositiveNumber(Number(process.env.OLLAMA_TIMEOUT_MS), 180000);
const DEFAULT_NUM_PREDICT = getPositiveNumber(Number(process.env.OLLAMA_NUM_PREDICT), 900);

function getPositiveNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function callOllama(prompt, systemPrompt = '', options = {}) {
  const timeout = getPositiveNumber(Number(options.timeoutMs), DEFAULT_TIMEOUT_MS);
  const numPredict = getPositiveNumber(Number(options.numPredict), DEFAULT_NUM_PREDICT);

  try {
    const response = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      {
        model: MODEL,
        prompt,
        system: systemPrompt,
        format: options.json === false ? undefined : 'json',
        stream: false,
        options: {
          temperature: options.temperature ?? 0.2,
          num_predict: numPredict,
        },
      },
      { timeout }
    );
    return response.data.response.trim();
  } catch (err) {
    const isTimeout = err.code === 'ECONNABORTED' || err.message.includes('timeout');
    const detail = isTimeout
      ? `timeout after ${timeout}ms using model ${MODEL}`
      : err.message;
    console.error('Ollama error:', detail);
    throw new Error('AI service unavailable. Ensure Ollama is running with llama3 model.');
  }
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error('Failed to parse AI response');
  return JSON.parse(match[0]);
}

function extractArray(value, key) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value[key])) return value[key];
  return [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function findMatches(text, patterns) {
  const lowerText = text.toLowerCase();
  return patterns.filter((item) => lowerText.includes(item.toLowerCase()));
}

function fallbackAnalyzeResume(resumeText) {
  const normalized = resumeText.replace(/\s+/g, ' ').trim();
  const knownSkills = [
    'JavaScript',
    'React',
    'Node.js',
    'Express',
    'Python',
    'Java',
    'C++',
    'SQL',
    'MySQL',
    'MongoDB',
    'HTML',
    'CSS',
    'Tailwind',
    'Git',
    'REST API',
    'Machine Learning',
    'Data Structures',
    'Algorithms',
  ];
  const skills = unique(findMatches(normalized, knownSkills)).slice(0, 12);
  const finalSkills = skills.length > 0 ? skills : ['Communication', 'Problem Solving', 'Teamwork'];

  const words = normalized.split(' ');
  const summaryText = words.slice(0, 45).join(' ');
  const suggestedTopics = unique([
    ...finalSkills.slice(0, 5),
    'Behavioral Interview',
    'Problem Solving',
  ]).slice(0, 8);

  return {
    skills: finalSkills,
    projects: [],
    education: [],
    experience: [],
    summary:
      summaryText.length > 0
        ? `Resume uploaded successfully. Key profile signals include ${finalSkills.join(', ')}. ${summaryText}`
        : 'Resume uploaded successfully. Review the extracted skills and prepare examples from your projects and experience.',
    suggestedTopics,
    source: 'local-fallback',
  };
}

function fallbackGenerateQuestions(resumeAnalysis, interviewType, count = 5) {
  const skills = resumeAnalysis.skills?.length
    ? resumeAnalysis.skills
    : ['problem solving', 'communication'];
  const technicalQuestions = [
    `Explain a project where you used ${skills[0]}. What problem did it solve?`,
    `How would you debug a difficult issue in a ${skills[1] || skills[0]} based application?`,
    'Describe the difference between a good solution and a scalable solution.',
    'Walk me through how you would design a small REST API for a real product feature.',
    'What data structure or algorithm have you used recently, and why was it appropriate?',
  ];
  const hrQuestions = [
    'Tell me about yourself and the kind of role you are looking for.',
    'Describe a time you handled a challenging deadline.',
    'Tell me about a mistake you made and what you learned from it.',
    'How do you communicate when you are blocked on a task?',
    'Why should we consider you for this position?',
  ];

  let pool = [];
  if (interviewType === 'technical') pool = technicalQuestions;
  else if (interviewType === 'hr') pool = hrQuestions;
  else pool = technicalQuestions.flatMap((q, index) => [q, hrQuestions[index]]).filter(Boolean);

  return Array.from({ length: count }, (_, index) => {
    const question = pool[index % pool.length];
    return {
      question,
      category: question.includes('Tell me') || question.includes('Why') ? 'Behavioral' : skills[index % skills.length],
      difficulty: index < 2 ? 'easy' : index < 5 ? 'medium' : 'hard',
    };
  });
}

function fallbackEvaluateAnswer(answer) {
  const length = answer.trim().split(/\s+/).filter(Boolean).length;
  const score = Math.max(35, Math.min(85, 45 + length * 2));

  return {
    score,
    strengths: length >= 25 ? ['Gives a reasonably detailed response'] : ['Provides a direct response'],
    weaknesses:
      length >= 25
        ? ['Could be stronger with clearer structure and measurable examples']
        : ['Answer is too brief and needs concrete examples'],
    suggestions: ['Use the STAR format and include specific impact, tools, and decisions.'],
    idealPoints: ['Context', 'Action taken', 'Reasoning', 'Result or measurable impact'],
    source: 'local-fallback',
  };
}

async function analyzeResume(resumeText) {
  const systemPrompt =
    'You are an expert resume analyzer and career coach. Always respond with valid JSON only, no markdown.';

  const prompt = `Analyze this resume and extract structured information.

Resume:
${resumeText.slice(0, 3500)}

Respond with this exact JSON structure:
{
  "skills": ["skill1", "skill2"],
  "projects": [{"name": "Project Name", "description": "brief description", "technologies": ["tech1"]}],
  "education": [{"degree": "Degree", "institution": "School", "year": "2024"}],
  "experience": [{"role": "Job Title", "company": "Company", "duration": "1 year", "highlights": ["achievement"]}],
  "summary": "2-3 sentence professional summary",
  "suggestedTopics": ["topic areas to focus on for interviews"]
}`;

  try {
    const response = await callOllama(prompt, systemPrompt, { numPredict: 900 });
    return extractJSON(response);
  } catch (err) {
    console.warn('Using fallback resume analysis:', err.message);
    return fallbackAnalyzeResume(resumeText);
  }
}

async function generateQuestions(resumeAnalysis, interviewType, count = 5) {
  const systemPrompt =
    'You are an expert technical interviewer. Always respond with valid JSON only, no markdown.';

  const prompt = `Generate ${count} personalized interview questions based on this candidate profile.

Interview Type: ${interviewType}
Skills: ${(resumeAnalysis.skills || []).join(', ')}
Projects: ${JSON.stringify(resumeAnalysis.projects || [])}
Experience: ${JSON.stringify(resumeAnalysis.experience || [])}

Generate a mix appropriate for ${interviewType} interviews.
Respond with this exact JSON structure:
{
  "questions": [
    {
      "question": "question text",
      "category": "topic category e.g. JavaScript, System Design, Behavioral",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

  try {
    const response = await callOllama(prompt, systemPrompt, {
      numPredict: Math.max(450, count * 140),
    });
    const questions = extractArray(extractJSON(response), 'questions');
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI returned no questions');
    }
    return questions.slice(0, count);
  } catch (err) {
    console.warn('Using fallback interview questions:', err.message);
    return fallbackGenerateQuestions(resumeAnalysis, interviewType, count);
  }
}

async function evaluateAnswer(question, answer, category) {
  const systemPrompt =
    'You are an expert interview evaluator. Always respond with valid JSON only, no markdown. Be constructive and specific.';

  const prompt = `Evaluate this interview answer.

Question: ${question}
Category: ${category}
Candidate Answer: ${answer}

Respond with JSON:
{
  "score": 75,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1"],
  "suggestions": ["specific improvement suggestion"],
  "idealPoints": ["key points a strong answer should cover"]
}

Score 0-100. Be fair but rigorous.`;

  try {
    const response = await callOllama(prompt, systemPrompt, { numPredict: 650 });
    return extractJSON(response);
  } catch (err) {
    console.warn('Using fallback answer evaluation:', err.message);
    return fallbackEvaluateAnswer(answer);
  }
}

async function generateRecommendations(weakTopics) {
  const systemPrompt =
    'You are a career coach. Always respond with valid JSON only, no markdown.';

  const prompt = `Suggest learning resources for these weak interview topics: ${weakTopics.join(', ')}

Respond with this exact JSON structure:
{
  "resources": [
    {
      "topic": "topic name",
      "title": "resource title",
      "url": "https://example.com",
      "type": "article|video|course|documentation",
      "reason": "why this helps"
    }
  ]
}`;

  const response = await callOllama(prompt, systemPrompt, { numPredict: 900 });
  return extractArray(extractJSON(response), 'resources').slice(0, 6);
}

module.exports = {
  analyzeResume,
  generateQuestions,
  evaluateAnswer,
  generateRecommendations,
};
