# 🎯 TalentPulse AI — Real-Time AI Mock Interview & ATS Intelligence

TalentPulse AI is a full-stack platform that combines an **ATS Resume Checker**, **Automated Mock Interview Scheduler**, **Web Speech Voice Interview Room**, and **5-Axis Competency Feedback Analytics**.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 18, Vite, Chart.js (Radar & Line charts), Web Speech API, Glassmorphism Dark UI.
- **Backend API**: .NET 8 Web API (C#), SignalR WebSockets Hub, Entity Framework Core 8.
- **Database**: PostgreSQL 16 (Relational schemas for Users, Resumes, JDs, ATS Scorecards, Q&A transcripts).
- **AI Integration**: Google Gemini 1.5 Flash API (Native JSON schema enforcement, low latency).

---

## 📁 Directory Structure

```
talent-pulse-ai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ResumeUploader.jsx
│   │   │   ├── ATSScorecard.jsx
│   │   │   ├── InterviewRoom.jsx
│   │   │   └── FeedbackDashboard.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── Controllers/
│   │   ├── ResumesController.cs
│   │   └── InterviewsController.cs
│   ├── Services/
│   │   └── AIEngineService.cs
│   ├── Models/
│   │   └── DomainModels.cs
│   ├── Data/
│   │   └── AppDbContext.cs
│   ├── Hubs/
│   │   └── InterviewHub.cs
│   ├── TalentPulseApi.csproj
│   ├── Program.cs
│   └── appsettings.json
├── vercel.json
└── README.md
```

---

## 🚀 Running Locally (Project-Based Learning)

### 1. Launch Backend API (.NET 8)
```bash
cd backend
dotnet restore
dotnet run
```
*API will run at `http://localhost:5000` with Swagger UI at `http://localhost:5000/swagger`.*

### 2. Launch Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
*Frontend will run at `http://localhost:3000`.*

---

## 🌐 Production Deployment Guide

### Deploying Frontend to Vercel / Netlify
1. Push `talent-pulse-ai` repository to GitHub.
2. Connect repository on **Vercel** or **Netlify**.
3. Set Build Command: `cd frontend && npm install && npm run build`.
4. Output Directory: `frontend/dist`.

### Deploying Backend to Azure / Render / Railway
1. Set Environment Variable `ConnectionStrings__DefaultConnection` pointing to your PostgreSQL instance.
2. Set `Gemini__ApiKey` to your Google Gemini API Key.
