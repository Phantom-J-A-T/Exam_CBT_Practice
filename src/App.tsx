import { useState, useEffect, FormEvent } from 'react';
import { 
  BookOpen, Award, Trophy, Flame, User, Info, 
  HelpCircle, ChevronLeft, ChevronRight, RotateCcw, 
  CheckCircle2, Calculator, Settings, X, LogOut, Check, Sparkles
} from 'lucide-react';

import { SubjectType, Question, ExamSession, UserStats, LeaderboardEntry } from './types';
import { getAllQuestions, getQuestionsForSubject } from './data/questions';
import { getUpdatedLeaderboard } from './data/leaderboard';

// Components
import Dashboard from './components/Dashboard';
import LeaderboardView from './components/LeaderboardView';
import ExamTimer from './components/ExamTimer';
import CbtCalculator from './components/CbtCalculator';
import CbtTutor from './components/CbtTutor';

const SUBJECT_LABELS: Record<SubjectType, string> = {
  maths: 'Mathematics',
  english: 'English Language',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology'
};

const SUBJECT_DESCRIPTIONS: Record<SubjectType, string> = {
  maths: 'Equations, Calculus, Geometry, Trigonometry, and sequences targeted at UTME standards.',
  english: 'Comprehension passages, Lexis & structure, Grammatical Concord, and oral patterns.',
  physics: 'Newtonian mechanics, optical waves, electricity, parallel circuits, and modern nuclear physics.',
  chemistry: 'Atomic structures, gas laws, balancing reactions, organic IUPAC naming, and acids/bases.',
  biology: 'Energy metabolism, circulatory systems, cellular mitosis/meiosis, inheritance genetics, and ecosystems.'
};

const SUBJECT_THEMES: Record<SubjectType, string> = {
  maths: 'border-l-indigo-500 text-indigo-600 bg-indigo-50/40 hover:bg-indigo-50',
  english: 'border-l-teal-500 text-teal-600 bg-teal-50/40 hover:bg-teal-50',
  physics: 'border-l-amber-500 text-amber-600 bg-amber-50/40 hover:bg-amber-50',
  chemistry: 'border-l-blue-500 text-blue-600 bg-blue-50/40 hover:bg-blue-50',
  biology: 'border-l-pink-500 text-pink-600 bg-pink-50/40 hover:bg-pink-50'
};

const INITIAL_STATS: UserStats = {
  maths_scores: [],
  english_scores: [],
  physics_scores: [],
  chemistry_scores: [],
  biology_scores: [],
  testsCompleted: 0,
  totalQuestionsAnswered: 0,
  totalCorrectAnswers: 0,
  studyStreakDays: 1,
  lastActiveTimestamp: Date.now()
};

export default function App() {
  // --- OFFLINE PERSISTENCE STATES ---
  const [userProfile, setUserProfile] = useState<{ name: string; school: string; state: string } | null>(null);
  const [stats, setStats] = useState<UserStats>(INITIAL_STATS);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'exams' | 'leaderboard'>('exams');

  // --- COMPONENT LEVEL STATE ---
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [onboardForm, setOnboardForm] = useState({ name: '', school: '', state: 'Lagos' });
  const [selectedSubject, setSelectedSubject] = useState<SubjectType | null>(null);
  const [examMode, setExamMode] = useState<'simulation' | 'study' | null>(null);
  const [cbtSession, setCbtSession] = useState<ExamSession | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isAlertActive, setIsAlertActive] = useState(false);
  
  // Review Mode state
  const [isReviewing, setIsReviewing] = useState(false);
  const [isTutoringActive, setIsTutoringActive] = useState(false);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [showExitSessionDialog, setShowExitSessionDialog] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showResetStatsDialog, setShowResetStatsDialog] = useState(false);

  // --- LOAD LOCAL PROFILE & STATISTICS ---
  useEffect(() => {
    const savedProfile = localStorage.getItem('naija_cbt_profile');
    const savedStats = localStorage.getItem('naija_cbt_stats');

    if (savedProfile) {
      const profileData = JSON.parse(savedProfile);
      setUserProfile(profileData);
      setIsOnboarding(false);
    }

    if (savedStats) {
      setStats(JSON.parse(savedStats));
    } else {
      setStats(INITIAL_STATS);
      localStorage.setItem('naija_cbt_stats', JSON.stringify(INITIAL_STATS));
    }
  }, []);

  // Compute calculated values
  const userAverageScore = (() => {
    const subjects: SubjectType[] = ['maths', 'english', 'physics', 'chemistry', 'biology'];
    let sum = 0;
    let count = 0;
    subjects.forEach(sub => {
      const scores = stats[`${sub}_scores` as keyof UserStats] as number[];
      if (scores && scores.length > 0) {
        sum += scores.reduce((a, b) => a + b, 0);
        count += scores.length;
      }
    });
    return count > 0 ? sum / count : 0;
  })();

  const leaderboardEntries = userProfile 
    ? getUpdatedLeaderboard(userAverageScore, stats.testsCompleted, userProfile.name, userProfile.school)
    : [];

  // Save profile helper
  const saveProfile = (name: string, school: string, state: string) => {
    const freshProfile = { name, school, state };
    setUserProfile(freshProfile);
    localStorage.setItem('naija_cbt_profile', JSON.stringify(freshProfile));
    setIsOnboarding(false);

    // Update study streak on onboarding
    setStats(prev => {
      const updated = {
        ...prev,
        lastActiveTimestamp: Date.now()
      };
      localStorage.setItem('naija_cbt_stats', JSON.stringify(updated));
      return updated;
    });
  };

  // Reset profile to default
  const handleSignOut = () => {
    setShowSignOutDialog(true);
  };

  const confirmSignOut = () => {
    localStorage.removeItem('naija_cbt_profile');
    localStorage.removeItem('naija_cbt_stats');
    setUserProfile(null);
    setStats(INITIAL_STATS);
    setIsOnboarding(true);
    setOnboardForm({ name: '', school: '', state: 'Lagos' });
    setSelectedSubject(null);
    setCbtSession(null);
    setIsReviewing(false);
    setShowSignOutDialog(false);
  };

  // Reset metrics
  const handleResetStats = () => {
    setShowResetStatsDialog(true);
  };

  const confirmResetStats = () => {
    const fresh: UserStats = {
      maths_scores: [],
      english_scores: [],
      physics_scores: [],
      chemistry_scores: [],
      biology_scores: [],
      testsCompleted: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      studyStreakDays: 1,
      lastActiveTimestamp: Date.now()
    };
    setStats(fresh);
    localStorage.setItem('naija_cbt_stats', JSON.stringify(fresh));
    setShowResetStatsDialog(false);
  };

  // --- START EXAM SESSION ---
  const handleStartSession = (subject: SubjectType, mode: 'simulation' | 'study') => {
    const questions = getQuestionsForSubject(subject);
    setSessionQuestions(questions);
    setCurrentQuestionIndex(0);
    setExamMode(mode);

    const initialSession: ExamSession = {
      id: `session_${Date.now()}`,
      subject,
      totalQuestions: questions.length,
      answeredQuestions: {},
      flaggedQuestions: [],
      timeSpentSeconds: 0,
      timeRemainingSeconds: 40 * 60, // 40 minutes standard for subject CBT
      score: 0,
      percentage: 0,
      timestamp: Date.now(),
      completed: false
    };

    setCbtSession(initialSession);
    setIsReviewing(false);
  };

  // Timer tick update
  const handleTimeTick = (secondsLeft: number) => {
    if (!cbtSession) return;
    setCbtSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        timeRemainingSeconds: secondsLeft,
        timeSpentSeconds: (40 * 60) - secondsLeft
      };
    });
  };

  // Time-out action
  const handleTimeout = () => {
    handleSubmitSession(true);
  };

  // Select Option Answer
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (!cbtSession || isReviewing) return;
    setCbtSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        answeredQuestions: {
          ...prev.answeredQuestions,
          [questionId]: optionIndex
        }
      };
    });
  };

  // Toggle Flag question
  const handleToggleFlag = (questionId: string) => {
    if (!cbtSession || isReviewing) return;
    setCbtSession(prev => {
      if (!prev) return null;
      const flagged = [...prev.flaggedQuestions];
      const isFlagged = flagged.includes(questionId);
      
      return {
        ...prev,
        flaggedQuestions: isFlagged 
          ? flagged.filter(id => id !== questionId)
          : [...flagged, questionId]
      };
    });
  };

  // --- SUBMIT COMPLETED EXAMINATION ---
  const handleSubmitSession = (forced: boolean = false) => {
    if (!cbtSession) return;
    if (!forced) {
      const answeredCount = Object.keys(cbtSession.answeredQuestions).length;
      if (answeredCount < cbtSession.totalQuestions) {
        setShowSubmissionDialog(true);
        return;
      }
    }

    setShowSubmissionDialog(false);

    // Calculate score
    let correctCount = 0;
    sessionQuestions.forEach(q => {
      const selected = cbtSession.answeredQuestions[q.id];
      if (selected === q.correctOptionIndex) {
        correctCount++;
      }
    });

    const percentage = Math.round((correctCount / sessionQuestions.length) * 100);

    const completedSession: ExamSession = {
      ...cbtSession,
      completed: true,
      score: correctCount,
      percentage: percentage
    };

    setCbtSession(completedSession);
    setIsReviewing(true);

    // Update global persistent statistics
    setStats(prev => {
      const subjectScoresKey = `${cbtSession.subject}_scores` as keyof UserStats;
      const scores = [...(prev[subjectScoresKey] as number[]), percentage];

      const currentSec = Date.now();
      const diffSec = currentSec - prev.lastActiveTimestamp;
      let streak = prev.studyStreakDays;

      // Simple streak increment logic (if active yesterday/within 36h)
      if (diffSec > 12 * 60 * 60 * 1000 && diffSec < 36 * 60 * 60 * 1000) {
        streak++;
      } else if (diffSec >= 36 * 60 * 60 * 1000) {
        streak = 1;
      }

      const updated: UserStats = {
        ...prev,
        [subjectScoresKey]: scores,
        testsCompleted: prev.testsCompleted + 1,
        totalQuestionsAnswered: prev.totalQuestionsAnswered + sessionQuestions.length,
        totalCorrectAnswers: prev.totalCorrectAnswers + correctCount,
        studyStreakDays: streak,
        lastActiveTimestamp: currentSec
      };

      localStorage.setItem('naija_cbt_stats', JSON.stringify(updated));
      return updated;
    });
  };

  // Onboarding Submit
  const handleOnboardSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!onboardForm.name.trim()) return;
    saveProfile(
      onboardForm.name.trim(),
      onboardForm.school.trim() || 'Government Secondary School',
      onboardForm.state
    );
  };

  // Quick navigation helpers
  const handlePrevQuestion = () => {
    setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex(prev => Math.min(sessionQuestions.length - 1, prev + 1));
  };

  const handleExitSession = () => {
    if (!isReviewing) {
      setShowExitSessionDialog(true);
    } else {
      setCbtSession(null);
      setSelectedSubject(null);
      setExamMode(null);
      setIsReviewing(false);
      setIsTutoringActive(false);
    }
  };

  const confirmExitSession = () => {
    setCbtSession(null);
    setSelectedSubject(null);
    setExamMode(null);
    setIsReviewing(false);
    setIsTutoringActive(false);
    setShowExitSessionDialog(false);
  };

  const handleRetakeExam = () => {
    if (!cbtSession) return;
    
    const resetSession: ExamSession = {
      id: `session_${Date.now()}`,
      subject: cbtSession.subject,
      totalQuestions: sessionQuestions.length,
      answeredQuestions: {},
      flaggedQuestions: [],
      timeSpentSeconds: 0,
      timeRemainingSeconds: 40 * 60, // 40 minutes standard for subject CBT
      score: 0,
      percentage: 0,
      timestamp: Date.now(),
      completed: false
    };

    setCbtSession(resetSession);
    setIsReviewing(false);
    setCurrentQuestionIndex(0);
    setIsTutoringActive(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      {/* --- ONBOARDING PORTAL --- */}
      {isOnboarding ? (
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950 relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
          
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4 text-white">
                <BookOpen size={28} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">CBT Practice Portal</h1>
              <p className="text-xs text-slate-500 mt-2">
                Simulated practice exams for Mathematics, English, Physics, Chemistry, and Biology. Works 100% offline in remote areas across Nigeria.
              </p>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider" htmlFor="userName">Student Full Name</label>
                <input
                  id="userName"
                  type="text"
                  required
                  placeholder="e.g. Amina Musa or Chidi Obi"
                  className="w-full text-sm border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-2.5 outline-none font-medium placeholder-slate-400 text-slate-800"
                  value={onboardForm.name}
                  onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider" htmlFor="userSchool">Your School (Secondary College)</label>
                <input
                  id="userSchool"
                  type="text"
                  placeholder="e.g. Queen's College, Lagos"
                  className="w-full text-sm border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-2.5 outline-none font-medium placeholder-slate-400 text-slate-800"
                  value={onboardForm.school}
                  onChange={(e) => setOnboardForm({ ...onboardForm, school: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider" htmlFor="userState">State in Nigeria</label>
                <select
                  id="userState"
                  className="w-full text-sm border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-2.5 outline-none font-medium text-slate-800"
                  value={onboardForm.state}
                  onChange={(e) => setOnboardForm({ ...onboardForm, state: e.target.value })}
                >
                  {['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'].map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors font-mono tracking-wider cursor-pointer text-xs uppercase"
              >
                ENTER EXAM HUB ⚡
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>⚡ JAMB / WAEC Approved</span>
              <span>100% Client-Side data</span>
            </div>
          </div>
        </div>
      ) : (
        /* --- CORE APPLICATION DASHBOARD --- */
        <>
          {/* Header */}
          <header className={`bg-slate-900 border-b border-slate-800 shadow-sm px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all ${isAlertActive ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900' : ''}`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-md shadow-indigo-900/40">
                <BookOpen size={20} />
              </div>
              <div>
                <h1 className="text-base font-black text-white leading-none tracking-tight">CBT Practice Portal</h1>
                <p className="text-[10px] text-indigo-300 font-mono font-medium tracking-wide flex items-center gap-1 mt-1 uppercase">
                  <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  Active Candidate: {userProfile?.name} • {userProfile?.school}
                </p>
              </div>
            </div>

            {/* Main Tabs Navigation */}
            {!cbtSession && (
              <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveTab('exams')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    activeTab === 'exams' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Exams Launcher
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  My Progress
                </button>
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    activeTab === 'leaderboard' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Scoreboard
                </button>
              </div>
            )}

            {/* Right Controls */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCalculator(!showCalculator)}
                title="Toggle calculator tool"
                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                  showCalculator 
                    ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-md' 
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Calculator size={18} />
              </button>

              <button
                onClick={handleSignOut}
                title="Change candidate profile"
                className="bg-slate-800 hover:bg-rose-950 hover:text-rose-200 border border-slate-700 p-2 rounded-lg text-slate-300 transition-colors cursor-pointer"
              >
                <LogOut size={18} />
              </button>
            </div>
          </header>

          {/* Floating Calculator */}
          {showCalculator && (
            <div className="fixed bottom-6 right-6 z-50 animate-bounce-once">
              <CbtCalculator onClose={() => setShowCalculator(false)} />
            </div>
          )}

          {/* MAIN PAGE AREA */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8">
            {/* If there is an active exam sessions going on, prioritize displaying that */}
            {cbtSession ? (
              isTutoringActive ? (
                <CbtTutor
                  subject={cbtSession.subject}
                  sessionQuestions={sessionQuestions}
                  answeredQuestions={cbtSession.answeredQuestions}
                  onClose={() => setIsTutoringActive(false)}
                  onRetake={handleRetakeExam}
                />
              ) : (
                <div className="space-y-6">
                  {/* Active Exam Header */}
                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold uppercase px-2.5 py-1 rounded-full font-mono">
                      {SUBJECT_LABELS[cbtSession.subject]} • {examMode === 'simulation' ? 'STRICT TIMED MOCK' : 'SELF-STUDY MODE'}
                    </span>
                    <h2 className="text-xl font-bold font-sans text-slate-900 mt-2">
                      {isReviewing ? 'CBT Result & Answers Review' : 'Practice Exam-Hall Simulation'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Always select the single best option. Use left and right buttons or the grid block to navigate.
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Display Real Countdown Timer during exam mode */}
                    {examMode === 'simulation' && !isReviewing && (
                      <ExamTimer 
                        timeRemainingSeconds={cbtSession.timeRemainingSeconds}
                        onTimeTick={handleTimeTick}
                        onTimeout={handleTimeout}
                        isActive={!isReviewing}
                        onAlertTriggered={setIsAlertActive}
                      />
                    )}

                    <button
                      onClick={handleExitSession}
                      className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 hover:text-rose-600 transition-colors text-xs font-mono tracking-wide cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw size={14} />
                      {isReviewing ? 'EXIT SESSION' : 'QUIT PRACTICE'}
                    </button>
                  </div>
                </div>

                {/* Main Exam Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* LEFT & CENTER COLUMN: QUESTION FIELD */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Question Card */}
                    <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between min-h-96">
                      
                      {/* Question Details header */}
                      <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                        <span className="text-xs text-slate-400 font-bold font-mono">
                          QUESTION {currentQuestionIndex + 1} OF {sessionQuestions.length}
                        </span>
                        
                        <span className="text-xs text-slate-500 font-semibold bg-slate-50 px-2.5 py-1 rounded-md">
                          Topic: {sessionQuestions[currentQuestionIndex]?.topic}
                        </span>
                      </div>

                      {/* Question Text */}
                      <div className="my-6">
                        <p className="text-sm md:text-base leading-relaxed text-slate-800 font-sans font-medium whitespace-pre-line">
                          {sessionQuestions[currentQuestionIndex]?.questionText}
                        </p>
                      </div>

                      {/* Multiple Choice Options List */}
                      <div className="space-y-3">
                        {sessionQuestions[currentQuestionIndex]?.options.map((option, idx) => {
                          const optionLetters = ['A', 'B', 'C', 'D'];
                          const isSelected = cbtSession.answeredQuestions[sessionQuestions[currentQuestionIndex].id] === idx;
                          const isCorrect = sessionQuestions[currentQuestionIndex].correctOptionIndex === idx;
                          
                          // Styling condition based on states (answering vs reviewing)
                          let optionStyle = 'border-slate-100 hover:bg-slate-50 hover:border-slate-350 bg-white';
                          
                          if (!isReviewing) {
                            if (isSelected) {
                              optionStyle = 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500 text-slate-900';
                            }
                          } else { // Review mode
                            if (isSelected && isCorrect) {
                              optionStyle = 'border-emerald-500 bg-emerald-50/60 text-slate-900 ring-1 ring-emerald-500';
                            } else if (isSelected && !isCorrect) {
                              optionStyle = 'border-rose-500 bg-rose-50/60 text-rose-900 ring-1 ring-rose-500';
                            } else if (isCorrect) {
                              optionStyle = 'border-emerald-500 bg-emerald-50/60 text-slate-900 ring-1 ring-emerald-500 font-semibold animate-pulse';
                            }
                          }

                          return (
                            <button
                              key={idx}
                              onClick={() => handleSelectOption(sessionQuestions[currentQuestionIndex].id, idx)}
                              disabled={isReviewing}
                              className={`w-full text-left p-4 rounded-xl border text-slate-700 text-xs md:text-sm font-medium transition-all flex items-center gap-3 ${optionStyle} ${!isReviewing ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {optionLetters[idx]}
                              </span>
                              <span className="flex-1">{option}</span>
                              
                              {isReviewing && isCorrect && (
                                <span className="text-[10px] bg-emerald-600 text-white py-0.5 px-2 rounded font-mono uppercase font-bold">Passed</span>
                              )}
                              {isReviewing && isSelected && !isCorrect && (
                                <span className="text-[10px] bg-rose-600 text-white py-0.5 px-2 rounded font-mono uppercase font-bold">Wrong</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* EXPLANATIONS CONTAINER (Review mode or study mode feedback) */}
                      {isReviewing && (
                        <div className="mt-8 p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
                          <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles size={14} className="text-indigo-600 animate-pulse" />
                            CBT Explains (UTME Syllabus Guide)
                          </h4>
                          <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
                            {sessionQuestions[currentQuestionIndex]?.explanation}
                          </p>
                        </div>
                      )}

                      {/* Action controllers */}
                      <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-8 gap-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handlePrevQuestion}
                            disabled={currentQuestionIndex === 0}
                            className={`flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-slate-600 transition-colors text-xs font-semibold ${
                              currentQuestionIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'
                            }`}
                          >
                            <ChevronLeft size={16} />
                            PREV
                          </button>

                          <button
                            onClick={handleNextQuestion}
                            disabled={currentQuestionIndex === sessionQuestions.length - 1}
                            className={`flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-slate-600 transition-colors text-xs font-semibold ${
                              currentQuestionIndex === sessionQuestions.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'
                            }`}
                          >
                            NEXT
                            <ChevronRight size={16} />
                          </button>
                        </div>

                        {!isReviewing && (
                          <button
                            onClick={() => handleToggleFlag(sessionQuestions[currentQuestionIndex].id)}
                            className={`text-xs px-3 py-2 rounded-lg font-semibold transition-colors border cursor-pointer ${
                              cbtSession.flaggedQuestions.includes(sessionQuestions[currentQuestionIndex].id)
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            🚩 {cbtSession.flaggedQuestions.includes(sessionQuestions[currentQuestionIndex].id) ? 'FLAGGED (REVIEW)' : 'FLAG FOR REV'}
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (isReviewing) {
                              handleExitSession();
                            } else {
                              handleSubmitSession(false);
                            }
                          }}
                          className={`text-xs font-bold py-2.5 px-5 rounded-lg shadow-sm font-mono tracking-wider cursor-pointer ${
                            isReviewing 
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {isReviewing ? 'DASHBOARD' : 'SUBMIT EXAM'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: EXAMINATION NAV BLOCK */}
                  <div className="space-y-6">
                    {/* Score summary in review mode */}
                    {isReviewing && (
                      <div className="bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950 rounded-xl p-5 text-white text-center shadow-lg border border-slate-800">
                        <Award className="mx-auto text-yellow-400 mb-2" size={32} />
                        <h3 className="font-bold text-sm tracking-widest uppercase text-slate-400">YOUR PERFORMANCE</h3>
                        
                        <div className="text-5xl font-extrabold font-mono text-indigo-300 my-3">
                          {cbtSession.percentage}%
                        </div>

                        <p className="text-xs text-slate-300 mt-1">
                          You solved <span className="font-bold text-white">{cbtSession.score}</span> correct out of <span className="font-bold text-white">{sessionQuestions.length}</span> questions.
                        </p>

                        <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-indigo-200 flex justify-between items-center font-mono">
                          <span>Subject: {SUBJECT_LABELS[cbtSession.subject]}</span>
                          <span>Time Spent: {Math.floor(cbtSession.timeSpentSeconds / 60)}m</span>
                        </div>

                        {/* ENTER DYNAMIC AI TUTORING ACTION */}
                        <button
                          onClick={() => setIsTutoringActive(true)}
                          className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-500 shadow-sm"
                        >
                          <Sparkles size={13} className="text-amber-300 fill-amber-300" />
                          ENTER AI STUDY ROOM
                        </button>
                      </div>
                    )}

                    {/* Navigation Block representation */}
                    <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
                      <h3 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4">
                        Question Matrix Grid
                      </h3>

                      <div className="grid grid-cols-5 gap-2">
                        {sessionQuestions.map((q, idx) => {
                          const isAnswered = cbtSession.answeredQuestions[q.id] !== undefined;
                          const isFlagged = cbtSession.flaggedQuestions.includes(q.id);
                          const isActive = currentQuestionIndex === idx;

                          let gridStyle = 'border-slate-200 text-slate-600 hover:border-slate-400';
                          
                          if (isAnswered) {
                            gridStyle = 'bg-slate-800 text-white border-slate-800 hover:bg-slate-750';
                          }

                          if (isFlagged) {
                            gridStyle = 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-250';
                          }

                          if (isActive) {
                            gridStyle += ' ring-2 ring-indigo-600 ring-offset-2 scale-105';
                          }

                          return (
                            <button
                              key={q.id}
                              onClick={() => setCurrentQuestionIndex(idx)}
                              className={`w-full h-9 rounded-md border text-xs font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${gridStyle}`}
                            >
                              {(idx + 1).toString().padStart(2, '0')}
                            </button>
                          );
                        })}
                      </div>

                      {/* Key Indicators */}
                      <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-50 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 bg-slate-100 border border-slate-300 rounded"></span>
                          <span>Unvisited</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 bg-slate-800 rounded"></span>
                          <span>Solved</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 bg-amber-100 border border-amber-300 rounded"></span>
                          <span>Flagged</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
              /* --- OUT OF SESSION: NORMAL MODE PAGES --- */
              <>
                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                  <Dashboard 
                    stats={stats} 
                    onResetStats={handleResetStats}
                    onSelectSubject={(subj) => {
                      setSelectedSubject(subj);
                      setActiveTab('exams');
                    }}
                  />
                )}

                {/* Scoreboard Tab */}
                {activeTab === 'leaderboard' && (
                  <LeaderboardView entries={leaderboardEntries} />
                )}

                {/* Simulated Mock Launcher Tab */}
                {activeTab === 'exams' && (
                  <div className="space-y-6">
                    
                    {/* Intro card & banner */}
                    <div className="bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800">
                      <div className="absolute -top-1/4 -right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl"></div>
                      
                      <div className="max-w-2xl">
                        <span className="text-[10px] font-extrabold uppercase font-mono bg-indigo-600 text-white rounded-full px-3 py-1 tracking-wide">
                          Nigerian Syllabus Integrated Exam Hub
                        </span>
                        
                        <h2 className="text-2xl md:text-3xl font-black mt-4 tracking-tight leading-tight">
                          Select a Subject & Master Your Pace
                        </h2>
                        
                        <p className="text-slate-300 text-xs md:text-sm mt-2 leading-relaxed font-sans">
                          Practicing under exact test constraints reduces failure rates. Every exam counts towards your cumulative ranking on the national merit scoreboard.
                        </p>
                      </div>
                    </div>

                    {/* Subject selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(['maths', 'english', 'physics', 'chemistry', 'biology'] as SubjectType[]).map(subject => {
                        const styleClass = SUBJECT_THEMES[subject];
                        const countOfTests = (stats[`${subject}_scores` as keyof UserStats] as number[]).length;
                        
                        return (
                          <div 
                            key={subject}
                            className={`bg-white rounded-xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                              selectedSubject === subject ? 'ring-2 ring-indigo-600 scale-[1.01]' : ''
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-slate-900 border-l-4 pl-2.5 leading-snug select-none text-base">
                                  {SUBJECT_LABELS[subject]}
                                </h3>
                                
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded">
                                  {countOfTests} exams done
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 leading-relaxed font-sans mb-6">
                                {SUBJECT_DESCRIPTIONS[subject]}
                              </p>
                            </div>

                            {selectedSubject === subject ? (
                              <div className="space-y-2 animate-fade-in">
                                <button
                                  onClick={() => handleStartSession(subject, 'simulation')}
                                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold tracking-wider py-2.5 px-3 rounded-lg shadow-sm transition-colors cursor-pointer"
                                >
                                  LAUNCH TIMED EXAM (CBT) ⏱️
                                </button>
                                <button
                                  onClick={() => handleStartSession(subject, 'study')}
                                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold tracking-wider py-2 px-3 rounded-lg transition-colors cursor-pointer"
                                >
                                  UNTIMED PRACTICE (REVISION)
                                </button>
                                <button
                                  onClick={() => setSelectedSubject(null)}
                                  className="w-full text-[10px] font-mono font-bold text-slate-400 hover:text-slate-600 transition-colors py-1 cursor-pointer text-center"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setSelectedSubject(subject)}
                                className={`w-full py-2.5 rounded-lg text-xs font-mono font-black tracking-wider border-2 hover:border-indigo-600/30 text-indigo-700 border-indigo-50 hover:bg-indigo-50 transition-colors uppercase cursor-pointer text-center`}
                              >
                                SELECT CBT SUBJECT
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </>
      )}

      {/* SUBMISSION VERIFICATION DIALOG */}
      {showSubmissionDialog && cbtSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="text-yellow-500">⏳</span>
              Unfinished Answers!
            </h3>
            
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              You have answered <span className="font-bold text-slate-900">{Object.keys(cbtSession.answeredQuestions).length}</span> questions out of <span className="font-bold text-slate-900">{cbtSession.totalQuestions}</span>. Are you sure you want to grade and submit your exam paper now?
            </p>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowSubmissionDialog(false)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={() => handleSubmitSession(true)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-xs font-bold text-white shadow-sm cursor-pointer"
              >
                Yes, Submit Anyhow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXIT ACTIVE EXAMINATION DIALOG */}
      {showExitSessionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="text-rose-500">🛑</span>
              Exit Active Practice?
            </h3>
            
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to stop? Your current progress on this mock exam will be lost and your scores will not be recorded.
            </p>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowExitSessionDialog(false)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 cursor-pointer"
              >
                Continue Practice
              </button>
              <button
                onClick={confirmExitSession}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-xs font-bold text-white shadow-sm cursor-pointer"
              >
                Yes, Quit Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIGN OUT PROFILE DIALOG */}
      {showSignOutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="text-amber-500">👤</span>
              Change Candidate Profile?
            </h3>
            
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              This will log you out of the CBT Hub. Your offline record of scores and current study streak will be reset.
            </p>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowSignOutDialog(false)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 cursor-pointer"
              >
                Stay Logged In
              </button>
              <button
                onClick={confirmSignOut}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 rounded-lg text-xs font-bold text-white shadow-sm cursor-pointer"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET STATISTICS DIALOG */}
      {showResetStatsDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="text-rose-500">♻️</span>
              Reset Exam Progress?
            </h3>
            
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              This will permanently delete all your registered scores, test analytics, and streak counts. This action cannot be undone.
            </p>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowResetStatsDialog(false)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 cursor-pointer"
              >
                Keep Stats
              </button>
              <button
                onClick={confirmResetStats}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-xs font-bold text-white shadow-sm cursor-pointer"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
