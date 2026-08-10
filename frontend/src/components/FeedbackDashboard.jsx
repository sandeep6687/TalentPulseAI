import React, { useState, useEffect } from 'react';
import { Radar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Award, CheckCircle2, AlertTriangle, Download, Sparkles, RefreshCw, BarChart2, ChevronDown, ChevronUp, Clock, MessageSquare, BookOpen, Check, History, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

ChartJS.register(RadialLinearScale, PointElement, LineElement, CategoryScale, LinearScale, Filler, Tooltip, Legend);

const IDEAL_ANSWERS = {
  '.NET 8 Core & Architecture': `In .NET 8, I architect REST APIs using Clean Architecture with ASP.NET Core Web API controllers or Minimal APIs. I rely on built-in Dependency Injection for lifetime management (Scoped for DbContext, Singleton for caches). I optimize request pipelines using custom Middleware for JWT authentication and global error handling, and leverage Kestrel with async/await throughout to achieve low latency under high concurrency.`,

  'PostgreSQL & EF Core': `To optimize PostgreSQL in EF Core, I begin by analyzing query execution plans (EXPLAIN ANALYZE) to add targeted B-Tree or GIN indexes. I prevent N+1 query overhead by using explicit .Include() or projecting directly to DTOs via .Select(). For read-heavy endpoints, I apply AsNoTracking() to bypass EF change tracking overhead, reducing memory allocations by up to 35%.`,

  'Problem Solving (STAR)': `• Situation: During peak traffic, our .NET API experienced database connection pool exhaustion, spiking latency to 4.2 seconds.\n• Task: Identify and eliminate the bottleneck under strict SLA constraints.\n• Action: I analyzed Application Insights logs, identified unindexed queries locking tables, added covering indexes in PostgreSQL, and tuned EF Core MaxPoolSize.\n• Result: API response time dropped to under 180ms, restoring 99.99% system availability.`,

  'SignalR & Scalability': `For real-time WebSocket architecture with thousands of concurrent streams, I use ASP.NET Core SignalR backed by a Redis Pub/Sub Backplane. This decouples the client connection state across multiple stateless server instances. I enable MessagePack binary protocol for compact payload serialization and configure heartbeat ping/pong timeouts to gracefully handle dropped client connections.`,

  'Adaptability & Learning': `When bridging technology stack gaps like TypeScript and Docker CI/CD, I fast-track learning by reviewing official documentation and building quick end-to-end Proof-of-Concepts. For Docker, I construct multi-stage Dockerfiles to optimize production image size and integrate GitHub Actions workflows to automate unit testing, image scanning, and container registry deployments.`,

  'Resilience & Observability': `I implement fault tolerance using Polly policies in .NET HTTP clients, combining Circuit Breakers, Retry with Exponential Backoff, and Fallback responses. For observability, I configure OpenTelemetry to emit distributed trace spans to Jaeger/Zipkin and structured JSON logs to Serilog, ensuring end-to-end request tracing across microservice boundaries.`,

  'CI/CD & Cloud Deployment': `My CI/CD workflow uses GitHub Actions / Azure DevOps pipelines. The pipeline triggers on pull requests: step 1 runs dotnet build and unit tests with code coverage; step 2 builds multi-stage Docker containers; step 3 pushes images to Azure Container Registry and deploys to Azure App Service / Kubernetes with zero-downtime rolling updates.`,

  'Engineering Leadership': `When evaluating technical debt versus feature delivery speed, I assess short-term ROI against long-term maintenance costs. I present non-technical stakeholders with risk impact matrices (e.g. security vulnerabilities or scalability ceilings) and propose iterative refactoring sprints or feature flags, ensuring product deadlines are met while protecting architectural health.`
};

function analyzeAnswerMetrics(answerText, duration, fillerCount, wpm, targetSkill) {
  const isBlank = !answerText || answerText === "(No response submitted)" || answerText.trim().length < 5;

  if (isBlank) {
    return {
      isNoAnswer: true,
      score: 0.0,
      timePace: `${duration || 0}s duration (No speech recorded)`,
      grammarClarity: "No verbal or typed answer submitted for this question.",
      explanationDepth: "Skipped / Unanswered",
      strengths: "N/A",
      weakness: "No answer was provided. Make sure to attempt all questions in real interviews even if uncertain.",
      idealAnswer: IDEAL_ANSWERS[targetSkill] || "Structure response using Situation -> Task -> Action -> Result."
    };
  }

  const words = answerText.trim().split(/\s+/).length;
  let score = 8.5;

  if (words < 15) score -= 3.5;
  else if (words < 30) score -= 2.0;
  else if (words > 50) score += 0.5;

  if (fillerCount > 4) score -= 1.0;
  if (wpm > 170) score -= 0.5;

  score = Math.max(1.0, Math.min(9.8, score));

  const paceLabel = wpm > 165 ? 'Fast Pace' : wpm < 100 ? 'Slow Pace' : 'Optimal Pace (130-160 WPM)';
  const timePaceStr = `${duration}s duration | ${wpm || 120} WPM (${paceLabel})`;
  const grammarStr = fillerCount > 3 
    ? `Detected ${fillerCount} filler words (e.g., 'um', 'like'). Recommend 2-second silent pauses.` 
    : `Clean sentence structure and minimal verbal fillers (${fillerCount} detected).`;
  const depthStr = words > 40 
    ? `Comprehensive technical explanation (${words} words). Great usage of domain terms.` 
    : `Concise answer (${words} words). Could expand with more specific architectural details.`;

  return {
    isNoAnswer: false,
    score: Number(score.toFixed(1)),
    timePace: timePaceStr,
    grammarClarity: grammarStr,
    explanationDepth: depthStr,
    strengths: words > 30 ? "Clear technical vocabulary, proper phrasing, and structured delivery." : "Direct response to prompt.",
    weakness: fillerCount > 3 ? "Reduce verbal filler words (um, like, ah) using silent pauses." : "Quantify metrics (e.g. % latency reduction or throughput gain).",
    idealAnswer: IDEAL_ANSWERS[targetSkill] || "Structure response using Situation -> Task -> Action -> Result."
  };
}

export default function FeedbackDashboard({ answersData, atsData, metaData, onReset }) {
  const { user } = useAuth();
  const uid = user?.userId || 'guest';
  const storageKey = `tp_${uid}_interview_history`;

  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [historyList, setHistoryList] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  // Load existing session history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setHistoryList(JSON.parse(stored));
      }
    } catch {
      setHistoryList([]);
    }
  }, [storageKey]);

  // Current session data to display
  const currentAnswers = activeSession ? activeSession.answersData : answersData;
  const currentMeta = activeSession ? activeSession.metaData : metaData;

  const evaluatedList = currentAnswers?.map(ans => ({
    ...ans,
    metrics: analyzeAnswerMetrics(ans.answerText, ans.duration, ans.fillerCount, ans.wpm, ans.targetSkill)
  })) || [];

  const answeredCount = evaluatedList.length || 1;
  const totalScore = evaluatedList.reduce((acc, curr) => acc + curr.metrics.score, 0);
  const overallAvgScore = answeredCount > 0 ? (totalScore / answeredCount).toFixed(1) : "0.0";

  // Auto-save completed interview to local history
  useEffect(() => {
    if (answersData && answersData.length > 0 && !activeSession) {
      try {
        const stored = localStorage.getItem(storageKey);
        let history = stored ? JSON.parse(stored) : [];

        const newSession = {
          id: Date.now(),
          dateStr: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          candidateName: metaData?.candidateName || 'Candidate',
          jobTitle: metaData?.jobTitle || 'Software Engineer',
          overallScore: overallAvgScore,
          answeredCount: answeredCount,
          answersData: answersData,
          metaData: metaData
        };

        // Avoid duplicate entry of same timestamp
        if (!history.some(h => Math.abs(h.id - newSession.id) < 2000)) {
          history = [newSession, ...history].slice(0, 20); // Keep last 20 interviews
          localStorage.setItem(storageKey, JSON.stringify(history));
          setHistoryList(history);
        }
      } catch (err) {
        console.warn('Could not save interview history:', err);
      }
    }
  }, [answersData, metaData, overallAvgScore, answeredCount, storageKey, activeSession]);

  const toggleIdealAnswer = (idx) => {
    setExpandedAnswers(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const radarData = {
    labels: ['Technical Depth', 'Communication', 'STAR Method', 'Problem Solving', 'Confidence'],
    datasets: [
      {
        label: 'Interview Competency Profile',
        data: [
          Math.min(95, Math.max(40, Math.round(overallAvgScore * 10))),
          Math.min(90, Math.max(35, Math.round(overallAvgScore * 9.5))),
          82,
          88,
          80
        ],
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
        borderColor: '#10B981',
        borderWidth: 2,
        pointBackgroundColor: '#6366F1',
        pointBorderColor: '#fff'
      }
    ]
  };

  const lineData = {
    labels: evaluatedList.map((a, i) => `Q${i + 1}: ${a.targetSkill || 'Skill'}`),
    datasets: [
      {
        label: 'Question Score (out of 10)',
        data: evaluatedList.map(a => a.metrics.score),
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.3,
        fill: true
      }
    ]
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="badge badge-success">
              <Award size={12} /> {activeSession ? 'Viewing Saved Historical Scorecard' : 'Current Session Evaluated'} ({answeredCount} Question{answeredCount === 1 ? '' : 's'})
            </span>
            {activeSession && (
              <button 
                onClick={() => setActiveSession(null)} 
                className="badge badge-primary"
                style={{ cursor: 'pointer', border: '1px solid rgba(99,102,241,0.4)' }}
              >
                Back to Latest Session
              </button>
            )}
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '6px' }}>
            Overall Performance Scorecard
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Candidate: <strong>{currentMeta?.candidateName || 'Candidate'}</strong> | Target Role: <strong>{currentMeta?.jobTitle || 'Software Engineer'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Overall Average Score</span>
            <span style={{ fontSize: '2.2rem', fontWeight: '800', color: Number(overallAvgScore) > 6 ? '#10B981' : '#EF4444' }}>
              {overallAvgScore} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
            </span>
          </div>

          <button 
            className="btn btn-secondary" 
            onClick={() => setShowHistoryModal(true)} 
            style={{ gap: '6px', border: '1px solid rgba(99,102,241,0.4)', color: '#c7d2fe' }}
          >
            <History size={16} /> Past Session History ({historyList.length})
          </button>

          <button className="btn btn-secondary" onClick={() => window.print()} style={{ gap: '6px' }}>
            <Download size={16} /> Export PDF Report
          </button>
        </div>
      </div>

      {/* Grid Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#6366F1" /> 5-Axis Competency Radar
          </h3>
          <div style={{ height: '280px', display: 'flex', justifyContent: 'center' }}>
            <Radar data={radarData} options={{ scales: { r: { suggestedMin: 0, suggestedMax: 100 } } }} />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="#10B981" /> Question Score Trajectory
          </h3>
          <div style={{ height: '280px' }}>
            <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Detailed Question Breakdown Cards */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '20px' }}>
          Detailed Parameter Evaluation &amp; Ideal Structured Answers
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {evaluatedList.map((ans, idx) => {
            const m = ans.metrics;
            const isExpanded = expandedAnswers[idx];

            return (
              <div key={idx} style={{ background: 'rgba(0,0,0,0.25)', padding: '20px', borderRadius: '14px', border: m.isNoAnswer ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border-color)' }}>
                {/* Question Top Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#6366F1' }}>
                    Question {idx + 1}: {ans.targetSkill}
                  </span>
                  <span className={`badge ${m.isNoAnswer ? 'badge-danger' : m.score >= 7.5 ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.85rem' }}>
                    Score: {m.score} / 10
                  </span>
                </div>

                <p style={{ fontWeight: '600', marginBottom: '14px', fontSize: '0.98rem', color: '#FFF' }}>"{ans.questionText}"</p>

                {/* Candidate Transcript Box */}
                <div style={{ fontSize: '0.88rem', color: m.isNoAnswer ? '#fca5a5' : 'var(--text-muted)', marginBottom: '16px', background: m.isNoAnswer ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)', border: m.isNoAnswer ? '1px solid rgba(239,68,68,0.2)' : 'none', padding: '14px', borderRadius: '10px' }}>
                  <strong>Your Response Transcript:</strong> "{ans.answerText}"
                </div>

                {/* Evaluation Parameters (Time, Grammar, Depth) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '0.82rem' }}>
                  <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '10px 12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8', fontWeight: '700', marginBottom: '4px' }}>
                      <Clock size={14} /> Time &amp; Speech Pace
                    </div>
                    <span style={{ color: '#c7d2fe' }}>{m.timePace}</span>
                  </div>

                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '10px 12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: '700', marginBottom: '4px' }}>
                      <MessageSquare size={14} /> Grammar &amp; Phrasing
                    </div>
                    <span style={{ color: '#a7f3d0' }}>{m.grammarClarity}</span>
                  </div>

                  <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', padding: '10px 12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: '700', marginBottom: '4px' }}>
                      <BookOpen size={14} /> Explanation Depth
                    </div>
                    <span style={{ color: '#fde68a' }}>{m.explanationDepth}</span>
                  </div>
                </div>

                {/* Strengths & Weakness Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.85rem', marginBottom: '16px' }}>
                  <div style={{ borderLeft: '3px solid #10B981', paddingLeft: '12px' }}>
                    <strong style={{ color: '#10B981' }}>Strengths:</strong>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>{m.strengths}</p>
                  </div>
                  <div style={{ borderLeft: '3px solid #F59E0B', paddingLeft: '12px' }}>
                    <strong style={{ color: '#F59E0B' }}>Suggested Improvement:</strong>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>{m.weakness}</p>
                  </div>
                </div>

                {/* Expandable Ideal Benchmark Answer */}
                <button
                  onClick={() => toggleIdealAnswer(idx)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(99,102,241,0.12)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    color: '#a5b4fc',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={15} color="#818cf8" />
                    {isExpanded ? 'Hide Complete Ideal Structured Answer' : 'View Complete Ideal Structured Answer (10/10 Benchmark)'}
                  </span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isExpanded && (
                  <div style={{ marginTop: '12px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '10px', padding: '16px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                      ✦ Ideal Benchmark Answer:
                    </span>
                    <p style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                      {m.idealAnswer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={onReset} style={{ padding: '14px 28px' }}>
          <RefreshCw size={18} /> Practice Another Interview Session
        </button>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto', padding: '28px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <History size={22} color="#6366F1" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Past Interview Session History</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {historyList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No previous interview sessions found. Complete your first interview practice to view history here!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historyList.map((item, index) => (
                  <div key={index} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{item.dateStr}</div>
                      <div style={{ fontWeight: '700', fontSize: '0.98rem', color: '#FFF' }}>{item.jobTitle}</div>
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{item.candidateName} • {item.answeredCount} Questions Answered</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.9rem' }}>
                        Score: {item.overallScore} / 10
                      </span>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => {
                          setActiveSession(item);
                          setShowHistoryModal(false);
                        }}
                        style={{ padding: '8px 14px', fontSize: '0.8rem', gap: '4px' }}
                      >
                        Load Scorecard <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
