import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Play, CheckCircle2, Clock, Sparkles, AlertCircle, ArrowRight, PlusCircle, Award, StopCircle } from 'lucide-react';

const INITIAL_QUESTIONS = [
  {
    id: 'q1',
    order: 1,
    category: 'TECHNICAL',
    question: `Can you describe your hands-on experience building high-throughput REST APIs and microservices using C# and .NET 8?`,
    targetSkill: '.NET 8 Core & Architecture'
  },
  {
    id: 'q2',
    order: 2,
    category: 'DATABASE',
    question: `How do you optimize complex PostgreSQL queries, handle index strategies, and prevent N+1 query problems in Entity Framework Core?`,
    targetSkill: 'PostgreSQL & EF Core'
  },
  {
    id: 'q3',
    order: 3,
    category: 'BEHAVIORAL',
    question: `Tell me about a challenging bug or production outage you faced in a React/.NET app. Walk me through your diagnosis using the STAR method.`,
    targetSkill: 'Problem Solving (STAR)'
  },
  {
    id: 'q4',
    order: 4,
    category: 'SYSTEM DESIGN',
    question: `How would you design a real-time WebSocket architecture (using SignalR) for thousands of concurrent candidate interview streams?`,
    targetSkill: 'SignalR & Scalability'
  },
  {
    id: 'q5',
    order: 5,
    category: 'GAP REMEDIATION',
    question: `Your resume shows strong React experience, but the JD requires TypeScript and Docker CI/CD pipelines. How do you bridge tech stack gaps quickly?`,
    targetSkill: 'Adaptability & Learning'
  }
];

const BONUS_QUESTIONS = [
  {
    id: 'q6',
    order: 6,
    category: 'ADVANCED MICROSERVICES',
    question: `How do you implement fault tolerance, circuit breakers (e.g. Polly), and distributed tracing in a microservices environment?`,
    targetSkill: 'Resilience & Observability'
  },
  {
    id: 'q7',
    order: 7,
    category: 'DEVOPS & CLOUD',
    question: `Walk me through your hands-on workflow setting up automated CI/CD pipelines, containerizing services with Docker, and deploying to cloud infrastructure.`,
    targetSkill: 'CI/CD & Cloud Deployment'
  },
  {
    id: 'q8',
    order: 8,
    category: 'LEADERSHIP & TRADE-OFFS',
    question: `Describe a situation where you had to negotiate critical technical trade-offs (e.g., tech debt vs rapid release) with non-technical stakeholders or product management.`,
    targetSkill: 'Engineering Leadership'
  }
];

export default function InterviewRoom({ atsData, metaData, onFinishInterview }) {
  const [questions, setQuestions] = useState(INITIAL_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [answers, setAnswers] = useState([]);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [showCompletionChoice, setShowCompletionChoice] = useState(false);
  const [hasContinued, setHasContinued] = useState(false);

  const recognitionRef = useRef(null);
  const shouldRecordRef = useRef(false);

  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    setTranscript('');
    setTimerSeconds(0);
    setFillerCount(0);
    setIsRecording(true);
    shouldRecordRef.current = true;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentText);

        const fillers = (currentText.match(/\b(um|uh|like|ah|so|you know)\b/gi) || []).length;
        setFillerCount(fillers);

        const words = currentText.trim().split(/\s+/).length;
        if (timerSeconds > 0) {
          setWpm(Math.round((words / timerSeconds) * 60));
        }
      };

      recognition.onend = () => {
        if (shouldRecordRef.current) {
          try {
            recognition.start();
          } catch {
            // Silently ignore if already active
          }
        } else {
          setIsRecording(false);
        }
      };

      recognition.onerror = (err) => {
        if (err.error !== 'no-speech') {
          console.warn('Speech recognition warning:', err.error);
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.error('Mic start error:', e);
      }
    } else {
      setTranscript("");
    }
  };

  const stopRecording = () => {
    shouldRecordRef.current = false;
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Silently catch
      }
    }
  };

  const currentQ = questions[currentIndex];

  const handleNext = () => {
    stopRecording();
    const userText = transcript.trim();
    const finalAnswerText = userText ? userText : "(No response submitted)";

    const newAnswers = [...answers, {
      questionId: currentQ.id,
      questionText: currentQ.question,
      targetSkill: currentQ.targetSkill,
      answerText: finalAnswerText,
      duration: timerSeconds || 0,
      fillerCount: fillerCount || 0,
      wpm: wpm || 0
    }];
    setAnswers(newAnswers);
    setTranscript('');

    if (currentIndex === 4 && !hasContinued) {
      setShowCompletionChoice(true);
    } else if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onFinishInterview(newAnswers);
    }
  };

  const handleEarlyFinish = () => {
    stopRecording();
    const userText = transcript.trim();
    let finalAnswers = [...answers];

    finalAnswers.push({
      questionId: currentQ.id,
      questionText: currentQ.question,
      targetSkill: currentQ.targetSkill,
      answerText: userText ? userText : "(No response submitted)",
      duration: timerSeconds || 0,
      fillerCount: fillerCount || 0,
      wpm: wpm || 0
    });

    onFinishInterview(finalAnswers);
  };

  const handleChooseFinish = () => {
    setShowCompletionChoice(false);
    onFinishInterview(answers);
  };

  const handleChooseContinue = () => {
    setShowCompletionChoice(false);
    setHasContinued(true);
    setQuestions(prev => [...prev, ...BONUS_QUESTIONS]);
    setCurrentIndex(5);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Top Header Card */}
      <div className="glass-panel" style={{ padding: '20px 28px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span className="badge badge-primary"><Sparkles size={12} /> Live AI Interview Room</span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginTop: '4px' }}>
            Question {currentIndex + 1} of {questions.length}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
            <Clock size={18} color="#6366F1" />
            <span style={{ fontFamily: 'var(--font-code)', fontSize: '1.1rem', fontWeight: '700', color: '#FFF' }}>
              {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <span className="badge badge-success">{currentQ.category}</span>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px' }}>
        <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Target Skill: {currentQ.targetSkill}
        </span>

        <h3 style={{ fontSize: '1.35rem', fontWeight: '700', marginTop: '8px', marginBottom: '24px', lineHeight: '1.4' }}>
          "{currentQ.question}"
        </h3>

        {/* Speech Metrics HUD */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Speech Pace</span>
            <p style={{ fontSize: '1.2rem', fontWeight: '800', color: wpm > 160 ? '#EF4444' : '#10B981' }}>
              {wpm || 0} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>WPM</span>
            </p>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filler Words</span>
            <p style={{ fontSize: '1.2rem', fontWeight: '800', color: fillerCount > 4 ? '#F59E0B' : '#6366F1' }}>
              {fillerCount} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>words</span>
            </p>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mic Status</span>
            <p style={{ fontSize: '1.2rem', fontWeight: '800', color: isRecording ? '#EF4444' : 'var(--text-subtle)' }}>
              {isRecording ? 'LIVE MIC (STREAMING)' : 'PAUSED'}
            </p>
          </div>
        </div>

        {/* Real-time Voice Answer Area */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
              Your Response Transcript (Live voice streaming or type below)
            </label>
            <button 
              className={`btn ${isRecording ? 'mic-recording' : 'btn-secondary'}`}
              onClick={toggleRecording}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              {isRecording ? 'Stop Recording' : 'Start Voice Mic'}
            </button>
          </div>

          <textarea 
            rows={6} 
            value={transcript} 
            onChange={e => setTranscript(e.target.value)}
            placeholder="Click 'Start Voice Mic' and speak into your microphone. Your spoken words will stream live into this box..."
            style={{ width: '100%', padding: '14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.95rem', lineHeight: '1.5' }}
          />
        </div>

        {/* Action Bar: Early Stop Option + Next Question */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleEarlyFinish}
            title="Stop interview now and generate AI feedback report for answered questions"
            style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '12px 18px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <StopCircle size={16} color="#ef4444" /> End &amp; Get Early Feedback
          </button>

          <button className="btn btn-primary" onClick={handleNext} style={{ padding: '14px 28px' }}>
            {currentIndex < questions.length - 1 ? 'Submit & Next Question' : 'Complete Interview & View Analytics'} <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Decision Modal after 5 Questions */}
      {showCompletionChoice && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '32px', borderRadius: '20px', textAlign: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg, #10B981, #6366F1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Award size={32} color="#FFF" />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
              Core 5 Questions Completed!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
              Great job! You have answered the 5 core interview questions. Would you like to view your overall scorecard now, or continue practicing with 3 additional advanced questions?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleChooseContinue}
                style={{ width: '100%', padding: '14px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
              >
                <PlusCircle size={18} /> Continue Practice (+3 Advanced Questions)
              </button>

              <button 
                className="btn btn-secondary" 
                onClick={handleChooseFinish}
                style={{ width: '100%', padding: '14px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7' }}
              >
                <Award size={18} /> Complete &amp; View Analytics Scorecard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
