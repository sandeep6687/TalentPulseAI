import React, { useState } from 'react';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Wand2 } from 'lucide-react';
import ATSResumeGenerator from './ATSResumeGenerator';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function ATSScorecard({ atsData, metaData, onStartInterview }) {
  const [showGenerator, setShowGenerator] = useState(false);
  if (!atsData) return null;

  const chartData = {
    labels: ['Technical Depth', 'Frameworks Fit', 'Architecture', 'Soft Skills', 'Domain Fit'],
    datasets: [
      {
        label: 'Candidate Competency Fit %',
        data: [
          atsData.skillBreakdown?.TechnicalDepth || 85,
          atsData.skillBreakdown?.FrameworksFit || 78,
          atsData.skillBreakdown?.Architecture || 70,
          atsData.skillBreakdown?.SoftSkills || 88,
          atsData.skillBreakdown?.DomainFit || 82
        ],
        backgroundColor: 'rgba(99, 102, 241, 0.25)',
        borderColor: '#6366F1',
        borderWidth: 2,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#6366F1'
      }
    ]
  };

  const chartOptions = {
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        pointLabels: { color: '#94A3B8', font: { size: 12, weight: '600' } },
        ticks: { color: '#64748B', backdropColor: 'transparent', stepSize: 20 },
        suggestedMin: 0,
        suggestedMax: 100
      }
    },
    plugins: {
      legend: { labels: { color: '#F1F5F9' } }
    }
  };

  return (<>
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', padding: '24px' }}>
      {/* Left Column: ATS Score & Skill Radar */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <span className="badge badge-primary"><ShieldCheck size={12} /> Gemini ATS Analysis</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '6px' }}>
              ATS Resume Match Score
            </h2>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(16,185,129,0.2))',
            border: '2px solid #6366F1',
            borderRadius: '50%',
            width: '84px',
            height: '84px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#FFF' }}>{atsData.matchScore}%</span>
            <span style={{ fontSize: '0.65rem', color: '#34D399', fontWeight: '700' }}>MATCH</span>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>
          {atsData.summary}
        </p>

        {/* Skill Alignment Radar Chart */}
        <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
          <Radar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Right Column: Missing Keywords & Tailored Interview Trigger */}
      <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#F59E0B" /> Missing JD Keywords & Skill Gaps
          </h3>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            The AI engine detected key JD qualifications that are missing or under-represented in your resume:
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
            {atsData.missingKeywords?.map((kw, i) => (
              <span key={i} className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                + {kw}
              </span>
            ))}
          </div>

          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#10B981', marginBottom: '6px' }}>
              🎯 Tailored Mock Interview Ready
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              We have generated 5 custom interview questions targeting your specific skill gaps ({atsData.missingKeywords?.[0] || 'System Architecture'}) and role expectations for {metaData.jobTitle || 'Software Engineer'}.
            </p>
          </div>
        </div>

        <button 
          className="btn btn-primary"
          onClick={onStartInterview}
          style={{ width: '100%', padding: '16px', fontSize: '1.05rem', marginTop: '20px' }}
        >
          Launch Tailored AI Mock Interview <ArrowRight size={20} />
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => setShowGenerator(true)}
          style={{ width: '100%', padding: '14px', fontSize: '0.95rem', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Wand2 size={16} color="#6366F1" /> Generate ATS-Optimized Resume
        </button>
      </div>
    </div>

    {showGenerator && (
      <ATSResumeGenerator
        resumeText={metaData?.resumeText || ''}
        jdText={metaData?.jdText || ''}
        missingKeywords={atsData?.missingKeywords || []}
        onClose={() => setShowGenerator(false)}
      />
    )}
  </>);
}
