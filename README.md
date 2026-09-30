# IntelliPrep AI

A full-stack AI-powered interview preparation platform that analyzes resumes, generates personalized mock interviews, evaluates answers with AI, and tracks learning progress.

## Features

- **User Authentication** — Secure registration and login with JWT
- **Resume Analysis** — Upload PDF/DOCX/TXT resumes; AI extracts skills, projects, education, and experience
- **Mock Interviews** — Personalized technical, HR, or mixed interview questions via Ollama (Llama 3)
- **AI Evaluation** — Scores, strengths, weaknesses, and improvement suggestions for each answer
- **Performance Dashboard** — Score trends, category breakdowns, and weak topic tracking
- **Learning Resources** — Curated and AI-recommended study materials

## Tech Stack

| Layer    | Technologies                          |
|----------|---------------------------------------|
| Frontend | React, Tailwind CSS, Axios, React Router, Recharts |
| Backend  | Node.js, Express.js                   |
| AI       | Ollama (Llama 3)                      |
| Database | MySQL                                 |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MySQL](https://dev.mysql.com/downloads/) / MySQL Workbench
- [Ollama](https://ollama.com/) with Llama 3 model

## Setup

### 1. Database

Open MySQL Workbench and run the schema script:

```bash
mysql -u root -p < backend/database/schema.sql
```

Or paste the contents of `backend/database/schema.sql` into MySQL Workbench and execute.

### 2. Ollama

Install Ollama and pull the Llama 3 model:

```bash
ollama pull llama3
ollama serve
```

Ollama runs at `http://localhost:11434` by default.

### 3. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secret
npm install
npm run dev
```

The API runs at `http://localhost:5000`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Environment Variables

Create `backend/.env` from `.env.example`:

| Variable         | Description                    | Default                    |
|------------------|--------------------------------|----------------------------|
| PORT             | Server port                    | 5000                       |
| DB_HOST          | MySQL host                     | localhost                  |
| DB_USER          | MySQL username                 | root                       |
| DB_PASSWORD      | MySQL password                 | —                          |
| DB_NAME          | Database name                  | intelliprep                |
| JWT_SECRET       | Secret for JWT signing         | —                          |
| OLLAMA_BASE_URL  | Ollama API URL                 | http://localhost:11434     |
| OLLAMA_MODEL     | Model name                     | llama3                     |

## API Endpoints

| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | /api/auth/register              | Register user            |
| POST   | /api/auth/login                 | Login                    |
| GET    | /api/auth/me                    | Current user profile     |
| POST   | /api/resumes/upload             | Upload & analyze resume  |
| GET    | /api/resumes                    | List resumes             |
| POST   | /api/interviews/start           | Start mock interview     |
| GET    | /api/interviews/:id             | Get interview details    |
| POST   | /api/interviews/:id/answer      | Submit & evaluate answer |
| POST   | /api/interviews/:id/complete    | Complete interview       |
| GET    | /api/dashboard/stats            | Dashboard statistics     |
| GET    | /api/dashboard/recommendations  | Learning resources       |

## Project Structure

```
ai proj/
├── backend/
│   ├── config/db.js          # MySQL connection pool
│   ├── database/schema.sql   # Database schema
│   ├── middleware/auth.js    # JWT authentication
│   ├── routes/               # API route handlers
│   ├── services/ollama.js    # Ollama AI integration
│   ├── utils/resumeParser.js # PDF/DOCX text extraction
│   └── server.js             # Express entry point
└── frontend/
    └── src/
        ├── components/       # Reusable UI components
        ├── context/          # Auth context
        ├── pages/            # Route pages
        └── services/api.js   # Axios API client
```

## Usage Flow

1. Register or log in
2. Upload your resume on the **Resume** page
3. Review AI-extracted skills and experience
4. Start a **Mock Interview** (technical, HR, or mixed)
5. Answer questions and receive AI feedback
6. View progress on the **Dashboard**
7. Explore **Learning Resources** for weak topics

## License

MIT
