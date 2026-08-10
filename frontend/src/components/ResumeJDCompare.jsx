import React, { useMemo } from 'react';
import { GitCompare, CheckCircle2, AlertTriangle, Search } from 'lucide-react';

// Extract significant words from text
function extractKeywords(text) {
  const stopWords = new Set(['the','a','an','and','or','of','in','to','for','with','on','at','by','from','is','are','be','as','that','this','it','we','our','your','its','have','has','will','can','not','but','more','than','any','all','was','were','been','their','they','which','who','how','what','when','where','also','both','each','into','about','up','out','if','do','does','did','been','would','could','should']);
  const words = text
    .replace(/[^a-zA-Z0-9#+.\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
  return words;
}

// Highlight keywords in text for display
function HighlightedText({ text, matchedWords, missingWords }) {
  const matchSet = new Set(matchedWords.map(w => w.toLowerCase()));
  const missingSet = new Set(missingWords.map(w => w.toLowerCase()));

  const words = text.split(/(\s+)/);
  return (
    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-code)', fontSize: '0.82rem', lineHeight: '1.7', margin: 0 }}>
      {words.map((word, i) => {
        const clean = word.replace(/[^a-zA-Z0-9#+.]/g, '').toLowerCase();
        if (matchSet.has(clean)) {
          return <mark key={i} style={{ background: 'rgba(16,185,129,0.25)', color: '#34D399', borderRadius: '3px', padding: '0 2px' }}>{word}</mark>;
        }
        if (missingSet.has(clean)) {
          return <mark key={i} style={{ background: 'rgba(245,158,11,0.2)', color: '#FCD34D', borderRadius: '3px', padding: '0 2px' }}>{word}</mark>;
        }
        return <span key={i}>{word}</span>;
      })}
    </pre>
  );
}

export default function ResumeJDCompare({ resumeText, jdText }) {
  const { matchedKeywords, missingFromResume, resumeOnly } = useMemo(() => {
    if (!resumeText || !jdText) return { matchedKeywords: [], missingFromResume: [], resumeOnly: [] };

    const resumeWords = new Set(extractKeywords(resumeText).map(w => w.toLowerCase()));
    const jdWords = new Set(extractKeywords(jdText).map(w => w.toLowerCase()));

    // Important tech / role keywords from JD
    const jdUnique = [...jdWords].filter(w => w.length > 3);
    const matched = jdUnique.filter(w => resumeWords.has(w));
    const missing = jdUnique.filter(w => !resumeWords.has(w));
    const resumeOnlyList = [...resumeWords].filter(w => !jdWords.has(w) && w.length > 3);

    return {
      matchedKeywords: matched.slice(0, 30),
      missingFromResume: missing.slice(0, 20),
      resumeOnly: resumeOnlyList.slice(0, 15)
    };
  }, [resumeText, jdText]);

  const matchPct = matchedKeywords.length + missingFromResume.length > 0
    ? Math.round((matchedKeywords.length / (matchedKeywords.length + missingFromResume.length)) * 100)
    : 0;

  if (!resumeText || !jdText) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Search size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
        <h3 style={{ color: 'var(--text-muted)' }}>No data to compare yet</h3>
        <p style={{ color: 'var(--text-subtle)', marginTop: '8px' }}>
          Upload your resume and a job description in the ATS Checker tab first, then come back here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header Stats Bar */}
      <div className="glass-panel" style={{ padding: '20px 28px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GitCompare size={22} color="#6366F1" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Resume vs JD Comparison</h2>
        </div>

        {/* Match Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: `conic-gradient(#10B981 ${matchPct * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
            borderRadius: '50%', width: '52px', height: '52px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#10B981' }}>{matchPct}%</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Keyword Match</div>
            <div style={{ fontSize: '1rem', fontWeight: '700' }}>{matchedKeywords.length} / {matchedKeywords.length + missingFromResume.length} keywords</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', gap: '24px', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10B981' }}>{matchedKeywords.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>✓ Matched</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#F59E0B' }}>{missingFromResume.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⚠ Missing</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', fontSize: '0.8rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ background: 'rgba(16,185,129,0.25)', border: '1px solid #10B981', borderRadius: '4px', padding: '2px 8px', color: '#34D399' }}>word</span>
          Matched keyword
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid #F59E0B', borderRadius: '4px', padding: '2px 8px', color: '#FCD34D' }}>word</span>
          Missing / gap keyword
        </span>
      </div>

      {/* Side-by-side panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Resume Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📄 Your Resume
            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>Highlighted</span>
          </h3>
          <div style={{ maxHeight: '500px', overflowY: 'auto', color: '#E2E8F0' }}>
            <HighlightedText
              text={resumeText}
              matchedWords={matchedKeywords}
              missingWords={[]}
            />
          </div>
        </div>

        {/* JD Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎯 Job Description
            <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Gaps Marked</span>
          </h3>
          <div style={{ maxHeight: '500px', overflowY: 'auto', color: '#E2E8F0' }}>
            <HighlightedText
              text={jdText}
              matchedWords={matchedKeywords}
              missingWords={missingFromResume}
            />
          </div>
        </div>
      </div>

      {/* Keywords Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} color="#10B981" /> Keywords You Have
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {matchedKeywords.map((kw, i) => (
              <span key={i} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34D399', borderRadius: '6px', padding: '4px 10px', fontSize: '0.78rem', fontWeight: '600' }}>
                ✓ {kw}
              </span>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} color="#F59E0B" /> Missing from Your Resume
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {missingFromResume.map((kw, i) => (
              <span key={i} style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: '#FCD34D', borderRadius: '6px', padding: '4px 10px', fontSize: '0.78rem', fontWeight: '600' }}>
                + {kw}
              </span>
            ))}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '12px' }}>
            💡 Use the <strong style={{ color: '#6366F1' }}>Generate ATS Resume</strong> feature to add these naturally.
          </p>
        </div>
      </div>
    </div>
  );
}
