# CloudCompiler: Online Code Editor & Compiler with Built-in AI Assistance

A high-performance, deployable online code editor and compiler built with a modern React + Monaco frontend, Node.js + Express backend, and a secure sandboxed execution runner powered by Piston.

---

## Sandboxed Runner Architecture: Piston vs. Judge0 CE

For running untrusted user code safely, **Piston** is chosen as the default sandboxed execution runner because it is lightweight, open source, stateless, and exceptionally easy to self-host inside a standard Docker container without heavy multi-service infrastructure. In contrast, **Judge0 CE (Community Edition)** is an enterprise-grade competitive programming and execution engine built on `isolate` and PostgreSQL/Redis with a job queue, making it ideal for strict time/memory competitive grading and multi-file submissions; however, Judge0 CE has a significantly heavier deployment footprint requiring multiple daemon containers and root cgroup v1/v2 configurations, whereas Piston provides sub-second startup times, REST-native packaging, and seamless containerization that can be hosted effortlessly on free or low-resource VMs.

---

## Monorepo Structure

```
├── client/                 # React 18 + Vite + TypeScript + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/     # Editor, OutputPanel, LanguageSelector, AI Assistant
│   │   ├── config/         # Client-side configuration and languages
│   │   ├── types/          # Shared frontend interfaces
│   │   ├── App.tsx         # Main application container
│   │   └── main.tsx        # Application bootstrap
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── server/                 # Express + TypeScript Backend API
│   ├── src/
│   │   ├── config/         # Config loader & extensible language configuration
│   │   ├── controllers/    # Route controllers (health, execution, AI, snippets)
│   │   ├── middlewares/    # Rate limiters, request validation, error handler
│   │   ├── routes/         # Express router definitions
│   │   ├── services/       # Execution engine & pluggable AI service
│   │   ├── utils/          # Structured logging and secret sanitizer
│   │   ├── app.ts          # Express application initialization
│   │   └── index.ts        # Server entrypoint
│   ├── tests/              # API and sandbox integration tests
│   ├── Dockerfile          # Production server container
│   ├── tsconfig.json
│   └── package.json
├── docker-compose.yml      # Orchestrates Server and Piston sandbox container
├── .env.example            # Environment variable template
└── README.md               # Project documentation and setup guide
```

---

## Quickstart & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- **Docker & Docker Compose** *(Optional for local development; if Docker is not running, the backend automatically falls back to Piston's public API endpoint for local testing)*

### 1. Clone & Install Dependencies
From the repository root:
```bash
# Install dependencies across all workspaces
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` in the root and in `server/`:
```bash
cp .env.example .env
cp .env.example server/.env
```

Set your AI provider key if you want to test AI features:
```env
AI_PROVIDER=gemini
AI_API_KEY=your_gemini_api_key
AI_MODEL=gemini-1.5-flash
```

### 3. Run Locally (Development Mode)

#### Option A: Running with Docker (Self-Hosted Sandbox)
```bash
# Start Piston execution engine and server in background
docker compose up -d

# In another terminal, start client
npm run dev:client
```

#### Option B: Running without Docker (Direct Node.js + Piston API fallback)
```bash
# Terminal 1: Start backend server (runs on http://localhost:5000)
npm run dev:server

# Terminal 2: Start frontend client (runs on http://localhost:5173)
npm run dev:client
```

---

## Verification & Testing

Verify that the backend is healthy:
```bash
curl http://localhost:5000/health
```

Run test suite:
```bash
npm run test
```
