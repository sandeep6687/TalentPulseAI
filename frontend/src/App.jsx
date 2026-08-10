import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ResumeUploader from './components/ResumeUploader';
import ATSScorecard from './components/ATSScorecard';
import InterviewRoom from './components/InterviewRoom';
import FeedbackDashboard from './components/FeedbackDashboard';
import ResumeJDCompare from './components/ResumeJDCompare';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';

const appStorageKey = (userId, field) => `tp_app_${userId}_${field}`;

function AppShell() {
  const { user, loading } = useAuth();
  const uid = user?.userId || 'guest';
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'

  const [activeTab, setActiveTab] = useState('ats');
  const [atsData, setAtsData] = useState(null);
  const [metaData, setMetaData] = useState(null);
  const [answersData, setAnswersData] = useState(null);

  useEffect(() => {
    const savedTab = localStorage.getItem(appStorageKey(uid, 'activeTab')) || 'ats';
    const savedAts = localStorage.getItem(appStorageKey(uid, 'atsData'));
    const savedMeta = localStorage.getItem(appStorageKey(uid, 'metaData'));
    const savedAnswers = localStorage.getItem(appStorageKey(uid, 'answersData'));

    setActiveTab(savedTab);
    setAtsData(savedAts ? JSON.parse(savedAts) : null);
    setMetaData(savedMeta ? JSON.parse(savedMeta) : null);
    setAnswersData(savedAnswers ? JSON.parse(savedAnswers) : null);
  }, [uid]);

  useEffect(() => {
    localStorage.setItem(appStorageKey(uid, 'activeTab'), activeTab);
  }, [activeTab, uid]);

  useEffect(() => {
    if (atsData) {
      localStorage.setItem(appStorageKey(uid, 'atsData'), JSON.stringify(atsData));
    } else {
      localStorage.removeItem(appStorageKey(uid, 'atsData'));
    }
  }, [atsData, uid]);

  useEffect(() => {
    if (metaData) {
      localStorage.setItem(appStorageKey(uid, 'metaData'), JSON.stringify(metaData));
    } else {
      localStorage.removeItem(appStorageKey(uid, 'metaData'));
    }
  }, [metaData, uid]);

  useEffect(() => {
    if (answersData) {
      localStorage.setItem(appStorageKey(uid, 'answersData'), JSON.stringify(answersData));
    } else {
      localStorage.removeItem(appStorageKey(uid, 'answersData'));
    }
  }, [answersData, uid]);

  const handleAnalyzeComplete = (atsResult, meta) => {
    setAtsData(atsResult);
    setMetaData(meta);
  };

  const handleStartInterview = () => setActiveTab('interview');

  const handleFinishInterview = (answers) => {
    setAnswersData(answers);
    setActiveTab('analytics');
  };

  const handleReset = () => {
    setAtsData(null);
    setMetaData(null);
    setAnswersData(null);
    setActiveTab('ats');
    localStorage.removeItem(appStorageKey(uid, 'atsData'));
    localStorage.removeItem(appStorageKey(uid, 'metaData'));
    localStorage.removeItem(appStorageKey(uid, 'answersData'));
    localStorage.setItem(appStorageKey(uid, 'activeTab'), 'ats');
  };

  // Loading splash while checking session cookie
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.3)', borderTop: '3px solid #6366F1', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading TalentPulse AI...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in → show auth pages
  if (!user) {
    if (authView === 'register') {
      return <RegisterPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthView('register')} />;
  }

  // Logged in → main app
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main style={{ flex: 1, paddingTop: '16px' }}>
        {activeTab === 'ats' && (
          <>
            <ResumeUploader onAnalyzeComplete={handleAnalyzeComplete} />
            {atsData && (
              <ATSScorecard
                atsData={atsData}
                metaData={metaData}
                onStartInterview={handleStartInterview}
              />
            )}
          </>
        )}

        {activeTab === 'compare' && (
          <ResumeJDCompare
            resumeText={metaData?.resumeText}
            jdText={metaData?.jdText}
          />
        )}

        {activeTab === 'interview' && (
          <InterviewRoom
            atsData={atsData}
            metaData={metaData}
            onFinishInterview={handleFinishInterview}
          />
        )}

        {activeTab === 'analytics' && (
          <FeedbackDashboard
            answersData={answersData}
            atsData={atsData}
            metaData={metaData}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
